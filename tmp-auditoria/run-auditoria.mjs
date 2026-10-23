import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Executor da auditoria: sobe o Vite, espera a porta 8080 e roda o script
 * informado (ou a agenda, por padrão). O servidor é encerrado ao final.
 * Uso: node tmp-auditoria/run-auditoria.mjs ./auditar-calendario.mjs
 */
const alvo = process.argv[2] ?? './auditar-agenda.mjs';
const servidor = spawn('cmd', ['/c', 'npm run dev'], { stdio: 'ignore' });

const esperarServidor = async () => {
  for (let tentativa = 0; tentativa < 90; tentativa += 1) {
    try {
      const resposta = await fetch('http://localhost:8080/');
      if (resposta.ok) return;
    } catch {
      /* ainda subindo */
    }
    await delay(1000);
  }
  throw new Error('dev server não respondeu em 90 s');
};

const encerrar = () => {
  try {
    spawn('cmd', ['/c', `taskkill /PID ${servidor.pid} /T /F`], { stdio: 'ignore' });
  } catch {
    /* melhor esforço */
  }
};

try {
  await esperarServidor();
  await delay(1500);
  await import(alvo);
} finally {
  encerrar();
}

