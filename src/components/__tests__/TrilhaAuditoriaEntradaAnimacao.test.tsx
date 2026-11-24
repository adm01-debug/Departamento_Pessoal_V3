import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRILHA_CLASSE_ENTRADA, estiloEntrada, trilhaSaidaVariants } from '../desligamentos/trilhaReveal';

/**
 * FLUIDEZ DA ENTRADA DA TRILHA DE AUDITORIA — verificada com o Framer REAL.
 *
 * `trilhaReveal.test.ts` prova o CONTRATO dos valores. Este arquivo prova o
 * EFEITO no DOM, na combinação exata que o componente usa:
 *
 *   <motion.li initial={false} exit="collapsed" variants={trilhaSaidaVariants}
 *              className="… trilha-evento-entrada" style={estiloEntrada(atraso)}>
 *
 * 1) ENTRADA — o Framer não escreve NADA de animação no nó. `opacity`,
 *    `transform` e `height` inline continuam vazios no mount: quem anima é o
 *    keyframe CSS, avaliado pelo compositor. É essa ausência que impede a
 *    entrada de voltar a ser dirigida pela main thread (o rAF da Motion não
 *    recebe quadro enquanto a aba termina de montar, e a animação trava). Se
 *    alguém reintroduzir `initial={{ opacity: 0, y: -4 }}` ou um variant de
 *    entrada, os três `expect` abaixo falham no primeiro render.
 *
 * 2) SAÍDA — o MESMO nó continua sendo recolhido pelo Framer (`height: 0` +
 *    fade): é o que faz o vizinho subir suave quando o filtro remove um evento,
 *    em vez de pular. `initial={false}` não desliga a saída — o teste remove um
 *    item do `AnimatePresence` e confirma que ele fica vivo durante o
 *    recolhimento e só então é desmontado.
 *
 * Nada aqui depende de Supabase, empresa, filtros ou dados.
 */
describe('trilhaReveal — entrada no CSS, saída no Framer', () => {
  it('no mount, o Framer NÃO escreve opacity/transform/height inline', () => {
    const { container } = render(
      <AnimatePresence>
        <motion.li
          initial={false}
          exit="collapsed"
          variants={trilhaSaidaVariants}
          className={TRILHA_CLASSE_ENTRADA}
          style={estiloEntrada(210)}
        >
          <span>linha</span>
        </motion.li>
      </AnimatePresence>
    );

    const li = container.querySelector('li') as HTMLElement;
    expect(li.className).toContain(TRILHA_CLASSE_ENTRADA);
    expect(li.style.getPropertyValue('--trilha-entrada-delay')).toBe('210ms');
    expect(li.style.getPropertyValue('--trilha-entrada-offset')).toBe('-8px');
    expect(li.style.getPropertyValue('--trilha-entrada-duracao')).toBe('620ms');
    expect(li.style.getPropertyValue('--trilha-entrada-curva')).toBe('cubic-bezier(0.2, 0, 0, 1)');

    // O que NÃO pode existir: qualquer estilo de animação escrito pela Motion.
    expect(li.style.opacity).toBe('');
    expect(li.style.transform).toBe('');
    expect(li.style.height).toBe('');
  });

  it('na saída o mesmo nó recolhe (Framer) e só então é desmontado', async () => {
    function Lista() {
      const [visivel, setVisivel] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setVisivel(false)}>
            remover
          </button>
          <ul>
            <AnimatePresence>
              {visivel && (
                <motion.li
                  key="evento"
                  initial={false}
                  exit="collapsed"
                  variants={trilhaSaidaVariants}
                  className={TRILHA_CLASSE_ENTRADA}
                  style={estiloEntrada(0)}
                >
                  <span>linha</span>
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        </>
      );
    }

    const { container } = render(<Lista />);
    const li = container.querySelector('li') as HTMLElement;
    expect(li.style.opacity).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'remover' }));

    // O nó continua montado enquanto o recolhimento roda (é o que segura o
    // espaço e faz o vizinho subir suave). Nesse intervalo a Motion escreve o
    // estilo de saída — prova de que o variant `collapsed` está ligado.
    await waitFor(() => expect(li.getAttribute('style')).toMatch(/opacity/), { timeout: 1000 });
    expect(container.querySelector('li')).toBe(li);

    await waitFor(() => expect(container.querySelector('li')).toBeNull(), { timeout: 2000 });
  });
});
