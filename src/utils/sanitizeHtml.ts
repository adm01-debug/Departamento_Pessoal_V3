/**
 * Hardened HTML sanitizer — centralized wrapper on DOMPurify.
 *
 * Rationale:
 * Multiple routes render server-generated or user-influenced HTML (contratos,
 * descrições ricas, previews de e-mail). Each ad-hoc `DOMPurify.sanitize(...)`
 * call risked drifting configuration (e.g., someone whitelisting `<iframe>` or
 * event handlers). This module locks the policy in one place and adds
 * defense-in-depth on top of DOMPurify's defaults.
 *
 * Layers of defense:
 *  1. Explicit `FORBID_TAGS` for high-risk elements (script/iframe/object/etc.).
 *  2. Explicit `FORBID_ATTR` for every `on*` handler surface.
 *  3. `ALLOWED_URI_REGEXP` restricts href/src to http(s)/mailto/tel/#anchors —
 *     blocking `javascript:`, `data:` and `vbscript:` at the attribute level.
 *  4. `afterSanitizeAttributes` hook forces `target=_blank` anchors to also
 *     carry `rel="noopener noreferrer"` (tabnabbing mitigation).
 *  5. Optional `allowStyle` flag for trusted templates (e.g., contrato PDF-like)
 *     — still parsed by DOMPurify, so `expression()`, `url(javascript:)` and
 *     other CSS attack vectors are filtered.
 */
import DOMPurify from 'dompurify';

// Register the anchor-hardening hook exactly once per document lifecycle.
let hookRegistered = false;
function ensureAnchorHook(): void {
  if (hookRegistered || typeof window === 'undefined') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;
    // (1) Tabnabbing hardening on target=_blank anchors.
    if (node.tagName === 'A' && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
    // (2) CSS-level XSS: DOMPurify keeps `style` values verbatim. Strip any
    //     value containing a URL-injection scheme or CSS `expression()`.
    //     Applies only when the style attribute survived (contract preset).
    if (node.hasAttribute('style')) {
      const raw = node.getAttribute('style') ?? '';
      const lowered = raw.toLowerCase();
      if (
        lowered.includes('javascript:') ||
        lowered.includes('vbscript:') ||
        lowered.includes('data:text/html') ||
        lowered.includes('expression(') ||
        lowered.includes('behavior:') ||
        lowered.includes('-moz-binding')
      ) {
        node.removeAttribute('style');
      }
    }
  });
  hookRegistered = true;
}

/** Protocols we allow inside href/src. Everything else is stripped. */
const SAFE_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|[#/](?!\/)|\?|[a-z0-9\-_.]+(?:$|[?#/]))/i;

const BASE_FORBID_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'base',
  'meta',
  'link',
  'style', // block <style> element even when style *attributes* are allowed
];

// All known HTML event handler attributes. Belt-and-suspenders — DOMPurify
// already filters most, but pinning the list here makes the policy auditable.
const EVENT_HANDLER_ATTRS = [
  'onabort','onauxclick','onblur','oncancel','oncanplay','oncanplaythrough','onchange',
  'onclick','onclose','oncontextmenu','oncopy','oncuechange','oncut','ondblclick','ondrag',
  'ondragend','ondragenter','ondragleave','ondragover','ondragstart','ondrop','ondurationchange',
  'onemptied','onended','onerror','onfocus','onformdata','oninput','oninvalid','onkeydown',
  'onkeypress','onkeyup','onload','onloadeddata','onloadedmetadata','onloadstart','onmousedown',
  'onmouseenter','onmouseleave','onmousemove','onmouseout','onmouseover','onmouseup','onpaste',
  'onpause','onplay','onplaying','onpointercancel','onpointerdown','onpointerenter','onpointerleave',
  'onpointermove','onpointerout','onpointerover','onpointerup','onprogress','onratechange','onreset',
  'onresize','onscroll','onsecuritypolicyviolation','onseeked','onseeking','onselect','onslotchange',
  'onstalled','onsubmit','onsuspend','ontimeupdate','ontoggle','onvolumechange','onwaiting',
  'onwebkitanimationend','onwebkitanimationiteration','onwebkitanimationstart','onwebkittransitionend',
  'onwheel',
];

export interface SanitizeOptions {
  /** Allow the `style` attribute (needed for template-generated documents). */
  allowStyle?: boolean;
  /** Extra tags to explicitly forbid on top of the baseline. */
  extraForbidTags?: string[];
}

/**
 * Sanitize an untrusted HTML string using the hardened profile.
 * Returns an empty string for non-string inputs (defensive contract).
 */
export function sanitizeHtml(dirty: unknown, options: SanitizeOptions = {}): string {
  if (typeof dirty !== 'string' || dirty.length === 0) return '';
  ensureAnchorHook();

  const forbidTags = options.extraForbidTags
    ? [...BASE_FORBID_TAGS, ...options.extraForbidTags]
    : BASE_FORBID_TAGS;

  const forbidAttr = options.allowStyle
    ? EVENT_HANDLER_ATTRS
    : [...EVENT_HANDLER_ATTRS, 'style'];

  return DOMPurify.sanitize(dirty, {
    FORBID_TAGS: forbidTags,
    FORBID_ATTR: forbidAttr,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
    ADD_ATTR: options.allowStyle ? ['style', 'target'] : ['target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    KEEP_CONTENT: true,
    IN_PLACE: false,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

/**
 * Preset for contract-like documents rendered via `dangerouslySetInnerHTML`.
 * Permits inline `style` (required by the PDF-mirroring template) but still
 * blocks scripts, handlers, unsafe URIs and dangerous elements.
 */
export function sanitizeContractHtml(dirty: unknown): string {
  return sanitizeHtml(dirty, { allowStyle: true });
}

/**
 * Sanitize free-form plain text before it is echoed back into the DOM as text.
 * Not strictly required by React (which escapes by default), but useful for
 * places where the value ends up in URLs, exports, or downstream templates.
 */
export function sanitizePlainText(dirty: unknown, maxLength = 500): string {
  if (typeof dirty !== 'string') return '';
  // Strip everything — no HTML allowed at all — then hard-cap length.
  const stripped = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as string;
  return stripped.trim().slice(0, maxLength);
}
