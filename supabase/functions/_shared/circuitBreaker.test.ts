import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { CircuitBreaker, pushBreaker } from './circuitBreaker.ts';

Deno.test('circuito comeca fechado e permanece fechado sob sucesso', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  assertEquals(b.estado(), 'CLOSED');
  if (!b.permite()) throw new Error('deveria permitir');
  b.registrarSucesso();
  if (!b.permite()) throw new Error('deveria permitir');
  assertEquals(b.estado(), 'CLOSED');
});

Deno.test('abre no limiar de falhas e recusa chamadas enquanto aberto', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  for (let i = 0; i < 3; i++) b.registrarFalha(1_000);
  assertEquals(b.estado(), 'OPEN');
  assertEquals(b.permite(1_500), false);
});

Deno.test('falha isolada nao abre o circuito (acumulado zera no primeiro sucesso)', () => {
  const b = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
  b.registrarFalha(1_000);
  b.registrarFalha(1_000);
  b.registrarSucesso();
  b.registrarFalha(1_000);
  b.registrarFalha(1_000);
  assertEquals(b.estado(), 'CLOSED');
});

Deno.test('apos resetTimeoutMs libera uma sonda (HALF_OPEN)', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(1_000);
  assertEquals(b.permite(1_500), false);
  assertEquals(b.permite(2_500), true);
  assertEquals(b.estado(), 'HALF_OPEN');
  // Segunda sonda concorrente tambem passa: o isolate nao tem mutex, e a
  // contagem de sucessos (nao de tentativas) e o que fecha o circuito.
  assertEquals(b.permite(2_500), true);
});

Deno.test('HALF_OPEN fecha so depois de successThreshold sucessos', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(1_000);
  b.permite(5_000);
  b.registrarSucesso();
  assertEquals(b.estado(), 'HALF_OPEN');
  b.registrarSucesso();
  assertEquals(b.estado(), 'CLOSED');
  assertEquals(b.permite(6_000), true);
});

Deno.test('uma falha em HALF_OPEN reabre o circuito na hora', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, successThreshold: 2 });
  b.registrarFalha(1_000);
  b.permite(5_000);
  assertEquals(b.estado(), 'HALF_OPEN');
  b.registrarFalha(5_000);
  assertEquals(b.estado(), 'OPEN');
  assertEquals(b.permite(5_999), false);
});

Deno.test('reset fecha o circuito e limpa o contador', () => {
  const b = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
  b.registrarFalha();
  b.reset();
  assertEquals(b.estado(), 'CLOSED');
  assertEquals(b.permite(), true);
});

Deno.test('breaker compartilhado do push usa limiar conservador', () => {
  assertEquals(pushBreaker.estado(), 'CLOSED');
});