'use strict';

/**
 * @param {string} text
 * @param {number} from
 */
function skipWs(text, from) {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  return i;
}

/**
 * @param {string} text
 * @param {number} i
 */
function skipString(text, i) {
  const q = text[i];
  if (q !== '"' && q !== "'") {
    return i;
  }
  i++;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === q) {
      return i + 1;
    }
    i++;
  }
  return text.length;
}

/**
 * @param {string} text
 * @param {number} i
 */
function skipComment(text, i) {
  if (text[i] === '/' && text[i + 1] === '/') {
    i += 2;
    while (i < text.length && text[i] !== '\n') {
      i++;
    }
    return i;
  }
  if (text[i] === '/' && text[i + 1] === '*') {
    i += 2;
    while (i < text.length - 1) {
      if (text[i] === '*' && text[i + 1] === '/') {
        return i + 2;
      }
      i++;
    }
    return text.length;
  }
  return i;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {(i: number) => number} [advance]
 */
function nextCodeIndex(text, i) {
  while (i < text.length) {
    if (text[i] === '"' || text[i] === "'") {
      i = skipString(text, i);
      continue;
    }
    if (text[i] === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      i = skipComment(text, i);
      continue;
    }
    break;
  }
  return i;
}

/**
 * @param {string} text
 * @param {number} openIndex
 * @returns {number}
 */
function matchBrace(text, openIndex) {
  if (text[openIndex] !== '{') {
    return -1;
  }
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    i = nextCodeIndex(text, i);
    if (i >= text.length) {
      break;
    }
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipString(text, i) - 1;
      continue;
    }
    if (ch === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      i = skipComment(text, i) - 1;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Match closing ')' for '(' at openIndex.
 * @param {string} text
 * @param {number} openIndex
 */
function matchParen(text, openIndex) {
  if (text[openIndex] !== '(') {
    return -1;
  }
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipString(text, i) - 1;
      continue;
    }
    if (ch === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      i = skipComment(text, i) - 1;
      continue;
    }
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * @param {string} text
 * @param {number} line0
 */
function offsetOfLine(text, line0) {
  if (line0 <= 0) {
    return 0;
  }
  let line = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      if (line === line0) {
        return i + 1;
      }
    }
  }
  return text.length;
}

/**
 * @param {string} text
 * @param {number} offset
 */
function lineAtOffset(text, offset) {
  let line = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * @param {string} text
 * @param {number} offset
 */
function lineIndentAt(text, offset) {
  let start = offset;
  while (start > 0 && text[start - 1] !== '\n') {
    start--;
  }
  let i = start;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
    i++;
  }
  return text.slice(start, i) || '  ';
}

/**
 * @param {string} text
 * @param {number} line0
 * @returns {{ start: number, end: number, text: string } | null}
 */
function lineSlice(text, line0) {
  if (line0 < 0) {
    return null;
  }
  const start = offsetOfLine(text, line0);
  if (start >= text.length) {
    return null;
  }
  let end = text.indexOf('\n', start);
  if (end < 0) {
    end = text.length;
  }
  return { start, end, text: text.slice(start, end) };
}

/**
 * @param {string} text
 * @param {number} focusLine0
 * @param {number} [radius]
 * @returns {{ start: number, end: number, text: string, line0: number }[]}
 */
function nearbyLines(text, focusLine0, radius = 1) {
  /** @type {{ start: number, end: number, text: string, line0: number }[]} */
  const out = [];
  for (let d = 0; d <= radius; d++) {
    const order = d === 0 ? [0] : [-d, d];
    for (const delta of order) {
      const line0 = focusLine0 + delta;
      const sl = lineSlice(text, line0);
      if (sl) {
        out.push({ ...sl, line0 });
      }
    }
  }
  return out;
}

/**
 * @param {string} text
 * @param {RegExp} re
 * @param {number} from
 * @param {number} to
 */
function findLastMatchInRange(text, re, from, to) {
  const slice = text.slice(from, to);
  let last = -1;
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  const r = new RegExp(re.source, flags);
  let m;
  while ((m = r.exec(slice))) {
    last = from + m.index;
  }
  return last;
}

/**
 * Parse if / else-if / else chain starting at `if` keyword.
 * @param {string} text
 * @param {number} ifIndex
 * @returns {{ start: number, end: number, hasFinalElse: boolean } | null}
 */
function parseIfChain(text, ifIndex) {
  if (!/^\bif\b/.test(text.slice(ifIndex))) {
    return null;
  }
  let i = ifIndex + 2;
  i = skipWs(text, i);
  if (text[i] !== '(') {
    return null;
  }
  const condEnd = matchParen(text, i);
  if (condEnd < 0) {
    return null;
  }
  i = skipWs(text, condEnd + 1);
  if (text[i] !== '{') {
    return null;
  }
  let end = matchBrace(text, i);
  if (end < 0) {
    return null;
  }

  let hasFinalElse = false;
  while (true) {
    let j = skipWs(text, end + 1);
    if (!/^\belse\b/.test(text.slice(j))) {
      break;
    }
    j += 4;
    j = skipWs(text, j);
    if (/^\bif\b/.test(text.slice(j))) {
      j += 2;
      j = skipWs(text, j);
      if (text[j] !== '(') {
        return null;
      }
      const pe = matchParen(text, j);
      if (pe < 0) {
        return null;
      }
      j = skipWs(text, pe + 1);
      if (text[j] !== '{') {
        return null;
      }
      end = matchBrace(text, j);
      if (end < 0) {
        return null;
      }
      hasFinalElse = false;
      continue;
    }
    if (text[j] !== '{') {
      return null;
    }
    end = matchBrace(text, j);
    if (end < 0) {
      return null;
    }
    hasFinalElse = true;
    break;
  }

  return { start: ifIndex, end: end + 1, hasFinalElse };
}

/**
 * True if absolute offset sits inside a // or /* comment or string/char literal.
 * @param {string} text
 * @param {number} absOffset
 */
function isInsideCommentOrString(text, absOffset) {
  let i = 0;
  while (i < absOffset && i < text.length) {
    if (text[i] === '"' || text[i] === "'") {
      const end = skipString(text, i);
      if (absOffset < end) {
        return true;
      }
      i = end;
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '/') {
      const end = skipComment(text, i);
      if (absOffset < end) {
        return true;
      }
      i = end;
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '*') {
      const end = skipComment(text, i);
      if (absOffset < end) {
        return true;
      }
      i = end;
      continue;
    }
    i++;
  }
  return false;
}

/**
 * Find keyword near focus line (search upward preferred).
 * Skips matches inside comments and string literals.
 * @param {string} text
 * @param {number} focusLine0
 * @param {RegExp} re word boundary regex with /g
 * @param {{ up?: number, down?: number }} [win]
 */
function findKeywordNearLine(text, focusLine0, re, win = {}) {
  const up = win.up ?? 40;
  const down = win.down ?? 5;
  const windowStart = offsetOfLine(text, Math.max(0, focusLine0 - up));
  const focusOff = offsetOfLine(text, focusLine0);
  const windowEnd = offsetOfLine(text, focusLine0 + down);
  const searchEnd = Math.min(text.length, Math.max(focusOff + 120, windowEnd));
  const slice = text.slice(windowStart, searchEnd);
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  const r = new RegExp(re.source, flags);
  let last = -1;
  let m;
  while ((m = r.exec(slice))) {
    const abs = windowStart + m.index;
    if (isInsideCommentOrString(text, abs)) {
      continue;
    }
    // Prefer real `if`, not the `if` inside `else if`.
    if (/^if\b/.test(m[0]) || re.source.includes('\\bif\\b')) {
      const before = text.slice(Math.max(0, abs - 8), abs);
      if (/\belse\s*$/.test(before)) {
        continue;
      }
    }
    last = abs;
  }
  return last;
}

/**
 * Export for tests.
 */
function isElseIfKeyword(text, ifIndex) {
  const before = text.slice(Math.max(0, ifIndex - 8), ifIndex);
  return /\belse\s*$/.test(before);
}

/**
 * Build a standard suggestion object.
 * @param {object} p
 * @returns {import('./possibleFix').PossibleFixSuggestion}
 */
function makeFix(p) {
  return {
    ruleKey: p.ruleKey,
    confidence: p.confidence || 'medium',
    title: p.title,
    rationale: p.rationale || '',
    startOffset: p.startOffset,
    endOffset: p.endOffset,
    originalText: p.originalText,
    proposedText: p.proposedText,
    applyable: p.applyable !== false,
    referenceOnly: p.referenceOnly === true,
  };
}

/**
 * Single-line rewrite helper over nearby lines.
 * @param {object} ctx
 * @param {(line: string) => string | null} transform
 * @param {object} meta
 * @param {number} [radius]
 */
function rewriteNearbyLine(ctx, transform, meta, radius = 1) {
  for (const ln of nearbyLines(ctx.text, ctx.focusLine, radius)) {
    const proposed = transform(ln.text);
    if (proposed == null || proposed === ln.text) {
      continue;
    }
    return makeFix({
      ...meta,
      startOffset: ln.start,
      endOffset: ln.end,
      originalText: ln.text,
      proposedText: proposed,
    });
  }
  return null;
}

module.exports = {
  skipWs,
  skipString,
  skipComment,
  matchBrace,
  matchParen,
  offsetOfLine,
  lineAtOffset,
  lineIndentAt,
  lineSlice,
  nearbyLines,
  findLastMatchInRange,
  parseIfChain,
  findKeywordNearLine,
  isInsideCommentOrString,
  isElseIfKeyword,
  makeFix,
  rewriteNearbyLine,
};
