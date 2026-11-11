'use strict';

const { parseMisraCheckerRef } = require('./misraRules');

/**
 * @typedef {{
 *   ruleKey: string,
 *   confidence: 'high' | 'medium' | 'low',
 *   title: string,
 *   rationale: string,
 *   startOffset: number,
 *   endOffset: number,
 *   originalText: string,
 *   proposedText: string,
 *   applyable: boolean,
 * }} PossibleFixSuggestion
 */

/**
 * @param {string} text
 * @param {number} from
 * @param {(ch: string, i: number) => boolean} [skip]
 */
function skipWs(text, from, skip) {
  let i = from;
  while (i < text.length) {
    if (skip && skip(text[i], i)) {
      i++;
      continue;
    }
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }
    break;
  }
  return i;
}

/**
 * Advance past a C string / char literal starting at quote index.
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
 * Advance past // or /* comment starting at i.
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
 * Find matching '}' for '{' at openIndex.
 * @param {string} text
 * @param {number} openIndex
 * @returns {number} index of matching '}' or -1
 */
function matchBrace(text, openIndex) {
  if (text[openIndex] !== '{') {
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
 * @param {string} text
 * @param {number} line0
 * @returns {number} offset of line start
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
 * Indentation of the line containing offset.
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
 * @param {RegExp} re
 * @param {number} from
 * @param {number} to
 * @returns {number}
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
 * Parse an if / else-if / else chain starting at `if` keyword index.
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
  // skip condition parens
  let depth = 0;
  for (; i < text.length; i++) {
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
        i++;
        break;
      }
    }
  }
  i = skipWs(text, i);
  if (text[i] !== '{') {
    // single-statement then — too risky for autofix
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
      // else if (...) { ... }
      j += 2;
      j = skipWs(text, j);
      if (text[j] !== '(') {
        return null;
      }
      let d = 0;
      for (; j < text.length; j++) {
        const ch = text[j];
        if (ch === '"' || ch === "'") {
          j = skipString(text, j) - 1;
          continue;
        }
        if (ch === '/' && (text[j + 1] === '/' || text[j + 1] === '*')) {
          j = skipComment(text, j) - 1;
          continue;
        }
        if (ch === '(') {
          d++;
        } else if (ch === ')') {
          d--;
          if (d === 0) {
            j++;
            break;
          }
        }
      }
      j = skipWs(text, j);
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
    // final else
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
 * @param {string} text
 * @param {number} focusLine0
 */
function findIfNearLine(text, focusLine0) {
  const focusOff = offsetOfLine(text, focusLine0);
  const windowStart = offsetOfLine(text, Math.max(0, focusLine0 - 40));
  const windowEnd = offsetOfLine(text, focusLine0 + 40);
  const searchEnd = Math.min(text.length, Math.max(focusOff + 200, windowEnd));
  const ifAt = findLastMatchInRange(text, /\bif\b/g, windowStart, Math.min(searchEnd, focusOff + 80));
  return ifAt;
}

/**
 * @param {object} ctx
 * @param {string} ctx.text
 * @param {number} ctx.focusLine
 * @param {string} [ctx.payload]
 * @returns {PossibleFixSuggestion | null}
 */
function suggestRule157(ctx) {
  const { text, focusLine, payload } = ctx;
  const hint = String(payload || '').toLowerCase();
  if (hint && !/else|15\.7|terminat|final/.test(hint) && !/missing_else/.test(hint)) {
    // still attempt — Coverity label may be enough via rule id
  }

  const ifAt = findIfNearLine(text, focusLine);
  if (ifAt < 0) {
    return null;
  }
  const chain = parseIfChain(text, ifAt);
  if (!chain || chain.hasFinalElse) {
    return null;
  }

  const indent = lineIndentAt(text, chain.start);
  const insert = ` else {\n${indent}  /* no other cases */\n${indent}}`;
  const originalText = text.slice(chain.start, chain.end);
  const proposedText = originalText + insert;

  return {
    ruleKey: 'Rule 15.7',
    confidence: 'high',
    title: 'Add final else clause',
    rationale:
      'Rule 15.7 requires if … else if chains to end with a final else (even if empty) so every path is explicit.',
    startOffset: chain.start,
    endOffset: chain.end,
    originalText,
    proposedText,
    applyable: true,
  };
}

/**
 * @param {string} line
 */
function looksPointerish(line) {
  return (
    /\*/.test(line) ||
    /\bNULL\b/i.test(line) ||
    /\b(?:ptr|pointer|p[A-Z]\w*)\b/.test(line) ||
    /\w+_(?:ptr|p)\b/i.test(line)
  );
}

/**
 * @param {object} ctx
 * @returns {PossibleFixSuggestion | null}
 */
function tryFix119Line(line, payloadL) {
  let proposed = line;
  let changed = false;

  // (T *)0  or (T*)0 → NULL
  const castNull = proposed.replace(/\(\s*[\w\s]+?\*\s*\)\s*0\b/g, 'NULL');
  if (castNull !== proposed) {
    proposed = castNull;
    changed = true;
  }

  if (
    !changed &&
    (looksPointerish(line) || /null|pointer|11\.9/.test(payloadL))
  ) {
    const next = proposed
      .replace(/=\s*0(\s*;)/g, '= NULL$1')
      .replace(/(==|!=)\s*0\b/g, '$1 NULL');
    if (next !== proposed) {
      proposed = next;
      changed = true;
    }
  }

  if (!changed || proposed === line) {
    return null;
  }
  return {
    proposed,
    confidence:
      /\(\s*[\w\s]+?\*\s*\)\s*0/.test(line) && /NULL/.test(proposed)
        ? 'high'
        : 'medium',
  };
}

function suggestRule119(ctx) {
  const { text, focusLine, payload } = ctx;
  const payloadL = String(payload || '').toLowerCase();

  // Coverity column may land on the `0`; also try nearby lines.
  for (const line0 of [focusLine, focusLine - 1, focusLine + 1]) {
    if (line0 < 0) {
      continue;
    }
    const start = offsetOfLine(text, line0);
    if (start >= text.length) {
      continue;
    }
    let end = text.indexOf('\n', start);
    if (end < 0) {
      end = text.length;
    }
    const line = text.slice(start, end);
    const hit = tryFix119Line(line, payloadL);
    if (!hit) {
      continue;
    }
    return {
      ruleKey: 'Rule 11.9',
      confidence: hit.confidence,
      title: 'Use NULL for null pointer constant',
      rationale:
        'Rule 11.9: the only allowed form of the null pointer constant is NULL (not a plain 0).',
      startOffset: start,
      endOffset: end,
      originalText: line,
      proposedText: hit.proposed,
      applyable: true,
    };
  }
  return null;
}

/**
 * @param {object} ctx
 * @returns {PossibleFixSuggestion | null}
 */
function suggestRule177(ctx) {
  const { text, focusLine } = ctx;
  const start = offsetOfLine(text, focusLine);
  let end = text.indexOf('\n', start);
  if (end < 0) {
    end = text.length;
  }
  const line = text.slice(start, end);
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
    return null;
  }
  if (/^\(void\)/.test(trimmed)) {
    return null;
  }
  if (/^\s*(?:if|while|for|switch|return|sizeof|typeof|_Generic)\b/.test(line)) {
    return null;
  }
  // Assignment / init keeps the return value — skip.
  if (/^\s*[^=\n]+=(?!=)/.test(line)) {
    return null;
  }
  // Must look like a call statement ending with );
  if (!/\b[A-Za-z_]\w*\s*\(/.test(trimmed) || !/\)\s*;\s*$/.test(trimmed)) {
    return null;
  }
  // Avoid declarations that look like calls (rare): type name(...);
  if (/^\s*(?:static|extern|inline|const|volatile|struct|enum|union)\b/.test(line)) {
    return null;
  }

  const indent = line.match(/^\s*/)?.[0] || '';
  const body = line.slice(indent.length);
  const proposed = `${indent}(void)${body}`;

  return {
    ruleKey: 'Rule 17.7',
    confidence: 'high',
    title: 'Discard return value with (void)',
    rationale:
      'Rule 17.7: the return value of a non-void function must be used; cast to void when intentionally ignored.',
    startOffset: start,
    endOffset: end,
    originalText: line,
    proposedText: proposed,
    applyable: true,
  };
}

/** @type {Record<string, (ctx: object) => PossibleFixSuggestion | null>} */
const STRATEGIES = {
  'Rule 15.7': suggestRule157,
  'Rule 11.9': suggestRule119,
  'Rule 17.7': suggestRule177,
};

/**
 * @param {object} opts
 * @param {string} [opts.checkerId]
 * @param {string} [opts.typeTitle]
 * @param {string} opts.documentText
 * @param {number} opts.focusLine 0-based
 * @param {Array<{ label?: string, rawPayload?: string }>} [opts.events]
 * @returns {PossibleFixSuggestion | null}
 */
function suggestPossibleFix(opts) {
  const ref =
    parseMisraCheckerRef(opts.checkerId) || parseMisraCheckerRef(opts.typeTitle);
  if (!ref || ref.kind !== 'Rule') {
    return null;
  }
  const key = `Rule ${ref.number}`;
  const strategy = STRATEGIES[key];
  if (!strategy) {
    return null;
  }

  const events = opts.events || [];
  const payloads = events
    .map((e) => [e.label, e.rawPayload].filter(Boolean).join(' '))
    .join('\n');

  return strategy({
    text: opts.documentText || '',
    focusLine: Math.max(0, opts.focusLine | 0),
    payload: payloads,
    events,
  });
}

/**
 * Supported rule keys for UI messaging.
 */
function supportedPossibleFixRules() {
  return Object.keys(STRATEGIES);
}

module.exports = {
  suggestPossibleFix,
  supportedPossibleFixRules,
  parseIfChain,
  matchBrace,
  suggestRule157,
  suggestRule119,
  suggestRule177,
  offsetOfLine,
  lineAtOffset,
};
