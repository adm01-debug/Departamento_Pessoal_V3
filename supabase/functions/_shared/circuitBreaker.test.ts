import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { breakerDoPushService, CircuitBreaker, hostDoEndpoint, resetarBreakersDePush } from './circuitBreaker.ts';

function permiteOuFalha(b: CircuitBreaker, agora?: number): number {
  const g = agora === undefined ? b.permite() : b.permite(agora);
  if (g === null) throw new Error('breaker recusou a chamada');
  return g;
}

Deno.test('circuito comeca fechado e permanece fechado sob sucesso', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  assertEquals(b.estado(), 'CLOSED');
  b.registrarSucesso(permiteOuFalha(b));
  assertEquals(b.estado(), 'CLOSED');
});

Deno.test('abre no limiar de falhas e recusa chamadas enquanto aberto', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  for (let i = 0; i < 3; i++) b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  assertEquals(b.estado(), 'OPEN');
  assertEquals(b.permite(1_500), null);
});

Deno.test('falha isolada nao abre o circuito (acumulado zera no primeiro sucesso)', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  b.registrarSucesso(permiteOuFalha(b, 1_000));
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  assertEquals(b.estado(), 'CLOSED');
});

Deno.test('apos resetTimeoutMs libera uma sonda (HALF_OPEN)', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  assertEquals(b.permite(1_500), null);
  assertNotEquals(b.permite(2_500), null);
  assertEquals(b.estado(), 'HALF_OPEN');
  assertNotEquals(b.permite(2_500), null);
});

Deno.test('HALF_OPEN fecha so depois de successThreshold sucessos', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  b.registrarSucesso(permiteOuFalha(b, 5_000));
  assertEquals(b.estado(), 'HALF_OPEN');
  b.registrarSucesso(permiteOuFalha(b, 5_000));
  assertEquals(b.estado(), 'CLOSED');
  assertNotEquals(b.permite(6_000), null);
});

Deno.test('uma falha em HALF_OPEN reabre o circuito na hora', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(permiteOuFalha(b, 1_000), 1_000);
  permiteOuFalha(b, 5_000);
  assertEquals(b.estado(), 'HALF_OPEN');
  b.registrarFalha(permiteOuFalha(b, 5_000), 5_000);
  assertEquals(b.estado(), 'OPEN');
  assertEquals(b.permite(5_999), null);
});

// O envio do dreno roda em paralelo: resultados de chamadas iniciadas antes da
// transicao de estado nao podem fechar um circuito recem-aberto.
Deno.test('resultado de permissao antiga e ignorado apos o circuito abrir', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000, successThreshold: 2 });
  const antiga = permiteOuFalha(b);
  b.registrarFalha(antiga);
  assertEquals(b.estado(), 'OPEN');
  b.registrarSucesso(antiga);
  assertEquals(b.estado(), 'OPEN');
  b.registrarFalha(antiga);
  assertEquals(b.estado(), 'OPEN');
});

Deno.test('reset fecha o circuito e limpa o contador', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
  b.registrarFalha(permiteOuFalha(b));
  b.reset();
  assertEquals(b.estado(), 'CLOSED');
  assertNotEquals(b.permite(), null);
});

// O dreno envia em paralelo para as assinaturas do mesmo provedor: o sucesso de
// um dispositivo nao pode invalidar as falhas dos envios que ainda estao em voo,
// senao cinco falhas do provedor degradado nunca abrem o circuito.
Deno.test('sucesso em circuito fechado nao descarta as falhas paralelas', () => {
  const b = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60_000, successThreshold: 2 });
  const permissoes = Array.from({ length: 6 }, () => permiteOuFalha(b));
  b.registrarSucesso(permissoes[0]);
  for (const g of permissoes.slice(1)) b.registrarFalha(g);
  assertEquals(b.estado(), 'OPEN');
});

Deno.test('hostDoEndpoint extrai o host e devolve null para URL invalida', () => {
  assertEquals(hostDoEndpoint('https://fcm.googleapis.com/fcm/send/abc'), 'fcm.googleapis.com');
  assertEquals(hostDoEndpoint('nao-e-url'), null);
});

Deno.test('breaker do push e por provedor: FCM caido nao bloqueia o Mozilla', () => {
  resetarBreakersDePush();
  const fcm = breakerDoPushService('https://fcm.googleapis.com/fcm/send/abc');
  const mozilla = breakerDoPushService('https://updates.push.services.mozilla.com/wpush/v2/def');

  for (let i = 0; i < 5; i++) {
    const g = fcm.permite();
    if (g === null) throw new Error('fcm deveria permitir antes do limiar');
    fcm.registrarFalha(g);
  }
  assertEquals(fcm.estado(), 'OPEN');
  assertEquals(mozilla.estado(), 'CLOSED');
  assertNotEquals(mozilla.permite(), null);

  // Mesmo host devolve sempre a mesma instancia; hosts diferentes, nao.
  assertEquals(breakerDoPushService('https://fcm.googleapis.com/fcm/send/xyz'), fcm);
  assertNotEquals(mozilla, fcm);
  resetarBreakersDePush();
});

Deno.test('endpoint invalido cai no breaker geral em vez de criar host novo', () => {
  resetarBreakersDePush();
  assertEquals(breakerDoPushService('nao-e-url'), breakerDoPushService('tambem-nao'));
  resetarBreakersDePush();
});

// Teto de hosts: quem chega depois do 20o nao pode compartilhar o circuito geral
// (um provedor degradado bloquearia todos os provedores novos).
Deno.test('acima do teto de hosts o mais antigo sai e o novo tem circuito proprio', () => {
  resetarBreakersDePush();
  const geral = breakerDoPushService('nao-e-url');
  for (let i = 1; i <= 20; i++) breakerDoPushService(`https://h${i}.example/push`);

  const excedente = breakerDoPushService('https://h21.example/push');
  assertNotEquals(excedente, geral);
  assertEquals(breakerDoPushService('https://h21.example/push'), excedente);
  resetarBreakersDePush();
});