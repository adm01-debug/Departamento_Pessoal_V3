/**
 * Notification payloads are stored and delivered as plain text.
 *
 * Removing angle brackets character-by-character avoids incomplete tag
 * replacement (including malformed/nested tags). C0/C1 controls and DEL are
 * also rejected so the same value is safe for push, e-mail and audit sinks.
 */
export function toNotificationPlainText(input: string): string {
  return Array.from(input)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127 && character !== '<' && character !== '>';
    })
    .join('')
    .trim();
}
