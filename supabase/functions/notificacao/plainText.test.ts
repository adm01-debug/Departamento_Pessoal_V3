import { assertEquals, assertFalse } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { toNotificationPlainText } from './plainText.ts';

Deno.test('notification text removes complete and malformed markup', () => {
  const adversarial = [
    '<script>alert(1)</script>',
    '<<script>alert(1)//<</script>',
    '<img src=x onerror=alert(1)>mensagem',
    '<svg/onload=alert(1)',
    'texto > quebra < parcial',
  ];

  for (const input of adversarial) {
    const output = toNotificationPlainText(input);
    assertFalse(output.includes('<'));
    assertFalse(output.includes('>'));
  }
});

Deno.test('notification text removes control characters and preserves Unicode text', () => {
  assertEquals(
    toNotificationPlainText('\u0000  Olá, férias 👩🏽‍💻\n\u007f\u0085\u009f'),
    'Olá, férias 👩🏽‍💻',
  );
});
