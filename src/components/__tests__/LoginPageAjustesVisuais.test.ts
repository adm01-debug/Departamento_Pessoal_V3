import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Prova OBJETIVA dos três ajustes de usabilidade do login:
 *
 *  1. os campos de e-mail e senha começam VAZIOS (o exemplo vive em
 *     `placeholder`, nunca em `value`/`defaultValue`) e o placeholder usa o
 *     cinza do token com opacidade reduzida;
 *  2. o banner de "sessão expirada" não usa mais `text-warning-foreground`
 *     (token quase preto, 240 20% 6%) sobre `bg-warning/10` — texto claro
 *     `text-foreground` (≈ #E2E8F0 no tema escuro);
 *  3. o link "Esqueci minha senha" fica na MESMA baseline do rótulo "Senha"
 *     (`items-baseline`) em cinza no repouso, com o amarelo da marca apenas
 *     no hover/foco.
 *
 * É um teste de FONTE (o mesmo padrão de `DashboardEntrada.test.ts`): o
 * comportamento de digitar/limpar é nativo do `placeholder` e foi medido no
 * navegador, o que aqui se trava é a regressão do código.
 */
const raiz = process.cwd();
const pagina = fs.readFileSync(path.resolve(raiz, 'src/pages/LoginPage.tsx'), 'utf8');
const css = fs.readFileSync(path.resolve(raiz, 'src/index.css'), 'utf8');

/** Recorta a tag `<Input …/>` que contém o `id` pedido. */
const inputPorId = (id: string) => {
  const inicio = pagina.indexOf(`id="${id}"`);
  expect(inicio, `input #${id} não encontrado`).toBeGreaterThan(-1);
  const fim = pagina.indexOf('/>', inicio);
  return pagina.slice(inicio, fim);
};

const campoEmail = inputPorId('email');
const campoSenha = inputPorId('password');

describe('Login — campos começam vazios e usam placeholder', () => {
  it('estado inicial do e-mail e da senha é string vazia', () => {
    expect(pagina).toContain("const [email, setEmail] = useState('');");
    expect(pagina).toContain("const [password, setPassword] = useState('');");
  });

  it('nenhum valor estático é passado para os inputs', () => {
    expect(campoEmail).toContain('value={email}');
    expect(campoSenha).toContain('value={password}');
    for (const campo of [campoEmail, campoSenha]) {
      expect(campo).not.toMatch(/value="/);
      expect(campo).not.toMatch(/defaultValue=/);
    }
    // O e-mail de exemplo existe SÓ como placeholder, nunca como valor.
    const ocorrencias = pagina.split('ti@promobrindes.com.br').length - 1;
    expect(ocorrencias).toBeGreaterThanOrEqual(2); // login + recuperação
    expect(pagina).not.toMatch(/value=\{?["']ti@promobrindes\.com\.br/);
  });

  it('o exemplo virou placeholder real nos dois campos', () => {
    expect(campoEmail).toContain('placeholder="ti@promobrindes.com.br"');
    expect(campoSenha).toContain('placeholder="••••••••"');
  });

  it('placeholder em cinza neutro com opacidade reduzida', () => {
    expect(campoEmail).toContain('placeholder:text-muted-foreground/90');
    expect(campoSenha).toContain('placeholder:text-muted-foreground/90');
  });

  it('autofill do navegador é neutralizado pela classe `campo-login`', () => {
    expect(campoEmail).toContain('campo-login');
    expect(campoSenha).toContain('campo-login');
    expect(css).toContain('.campo-login:-webkit-autofill');
    expect(css).toContain('-webkit-text-fill-color: hsl(var(--foreground))');
    expect(css).toContain('box-shadow: 0 0 0 1000px hsl(var(--background)) inset');
  });

  it('o token `--warning-foreground` não foi alterado (correção é no consumo)', () => {
    expect(css).toContain('--warning-foreground: 240 20% 6%;');
  });
});

describe('Login — contraste do aviso de sessão expirada', () => {
  const blocoAviso = pagina.slice(pagina.indexOf('bg-warning/10 border border-warning/30'));

  it('usa texto claro do tema, não o `warning-foreground` quase preto', () => {
    const classeDoAviso = pagina
      .slice(pagina.lastIndexOf('className=', pagina.indexOf('bg-warning/10 border border-warning/30')))
      .split('>')[0];
    expect(classeDoAviso).toContain('text-foreground');
    expect(classeDoAviso).not.toContain('text-warning-foreground');
    expect(blocoAviso.length).toBeGreaterThan(0);
  });

  it('mantém a leitura semântica âmbar no ícone e no fundo', () => {
    expect(blocoAviso).toContain('bg-warning/10');
    expect(blocoAviso).toContain('border-warning/30');
    expect(blocoAviso).toContain('text-warning');
  });

  it('o texto do aviso continua vindo da regra de negócio', () => {
    expect(pagina).toContain("idle_timeout: 'Sessão expirada por inatividade. Faça login novamente.'");
    expect(blocoAviso).toContain('{securityNotice}');
  });
});

describe('Login — alinhamento e cor do "Esqueci minha senha"', () => {
  const linhaDoLink = pagina.slice(pagina.indexOf('items-baseline justify-between'));
  const classeDoLink = pagina
    .slice(pagina.lastIndexOf('className=', pagina.indexOf('Esqueci minha senha')))
    .split('>')[0];

  it('rótulo e link compartilham a baseline', () => {
    expect(linhaDoLink.length).toBeGreaterThan(0);
    expect(pagina).toContain('flex items-baseline justify-between');
    expect(pagina).not.toContain(
      'flex items-center justify-between">\n                      <Label htmlFor="password"'
    );
  });

  it('repouso em cinza, amarelo da marca + sublinhado só no hover/foco', () => {
    expect(classeDoLink).toContain('text-muted-foreground');
    expect(classeDoLink).toContain('hover:text-primary');
    expect(classeDoLink).toContain('hover:underline');
    expect(classeDoLink).toContain('focus-visible:text-primary');
    expect(classeDoLink).not.toContain('text-primary hover:underline font-body');
  });

  it('o link continua disparando o modo de recuperação', () => {
    // Formato tolerante à quebra de linha do Prettier: o que se trava é o efeito
    // do clique (entrar no modo de recuperação e limpar o erro anterior).
    expect(pagina).toMatch(/onClick=\{\(\) => \{\s*setForgotMode\(true\);\s*setError\(''\);\s*\}\}/);
  });
});
