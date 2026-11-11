'use strict';

const {
  skipWs,
  matchBrace,
  matchParen,
  offsetOfLine,
  lineIndentAt,
  lineSlice,
  nearbyLines,
  parseIfChain,
  findKeywordNearLine,
  makeFix,
  rewriteNearbyLine,
} = require('./possibleFixHelpers');

/** @typedef {import('./possibleFix').PossibleFixSuggestion} PossibleFixSuggestion */

/**
 * @param {object} ctx
 * @returns {PossibleFixSuggestion | null}
 */
function suggestRule71(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\b0[0-7]+\b/.test(line)) {
        return null;
      }
      // Skip 0x hex and 0b binary
      return line.replace(/\b0([0-7]+)\b/g, (_, digits) => {
        const dec = parseInt(digits, 8);
        return String(dec);
      });
    },
    {
      ruleKey: 'Rule 7.1',
      confidence: 'high',
      title: 'Replace octal literal with decimal',
      rationale: 'Rule 7.1 forbids octal constants (leading 0). Prefer decimal or 0x… hex.',
    }
  );
}

function suggestRule72(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      // Unsigned types / U-less hex or large constants
      if (!/\b(?:uint|unsigned|UINT)/.test(line) && !/u\b/i.test(ctx.payload || '')) {
        // still try hex without U
      }
      let next = line.replace(
        /\b(0[xX][0-9A-Fa-f]+)\b(?![uUlL])/g,
        (m) => `${m}U`
      );
      // decimal assigned to unsigned-looking left side
      if (/\b(?:u?int\d*_t|unsigned)\b/.test(line)) {
        next = next.replace(
          /=\s*(\d+)\b(?![uUlL.])/g,
          (full, n) => full.replace(n, `${n}U`)
        );
      }
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 7.2',
      confidence: 'medium',
      title: 'Add unsigned suffix U',
      rationale: 'Rule 7.2: a “u” or “U” suffix shall be applied to all unsigned constants.',
    }
  );
}

function suggestRule73(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const next = line.replace(/\b(\d+)l\b/g, '$1L').replace(/\b(\d+)ll\b/g, '$1LL');
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 7.3',
      confidence: 'high',
      title: 'Use uppercase L suffix',
      rationale: 'Rule 7.3: lowercase l is forbidden (looks like 1); use L / LL.',
    }
  );
}

function suggestRule74(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/=\s*"/.test(line) && !/=\s*L?"/.test(line)) {
        return null;
      }
      // char *p = "..." → const char *p = "..."
      const next = line.replace(
        /\b((?:static\s+|extern\s+)?)(char\s*\*)/g,
        (m, lead, typ) => {
          if (/\bconst\b/.test(m)) {
            return m;
          }
          return `${lead || ''}const ${typ}`;
        }
      );
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 7.4',
      confidence: 'high',
      title: 'Make string pointer const',
      rationale: 'Rule 7.4: a string literal shall not be assigned to a non-const pointer.',
    }
  );
}

function suggestRule82(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      // int foo(); → int foo(void);  (declaration / empty param list)
      const next = line.replace(
        /\b([A-Za-z_]\w*)\s*\(\s*\)(\s*[;{])/g,
        '$1(void)$2'
      );
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 8.2',
      confidence: 'medium',
      title: 'Use explicit (void) parameter list',
      rationale: 'Rule 8.2: function types shall be in prototype form with named params or (void).',
    }
  );
}

function suggestRule810(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\binline\b/.test(line) || /\bstatic\s+inline\b/.test(line)) {
        return null;
      }
      return line.replace(/\binline\b/, 'static inline');
    },
    {
      ruleKey: 'Rule 8.10',
      confidence: 'high',
      title: 'Declare inline as static inline',
      rationale: 'Rule 8.10: an inline function shall be declared with the static storage class.',
    }
  );
}

function suggestRule814(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\brestrict\b/.test(line)) {
        return null;
      }
      return line.replace(/\s*\brestrict\b/g, '');
    },
    {
      ruleKey: 'Rule 8.14',
      confidence: 'high',
      title: 'Remove restrict qualifier',
      rationale: 'Rule 8.14: the restrict type qualifier shall not be used.',
    }
  );
}

function suggestRule119(ctx) {
  const payloadL = String(ctx.payload || '').toLowerCase();
  for (const ln of nearbyLines(ctx.text, ctx.focusLine, 1)) {
    let proposed = ln.text;
    let changed = false;
    const castNull = proposed.replace(/\(\s*[\w\s]+?\*\s*\)\s*0\b/g, 'NULL');
    if (castNull !== proposed) {
      proposed = castNull;
      changed = true;
    }
    if (
      !changed &&
      (/\*/.test(ln.text) ||
        /\b(?:ptr|pointer|NULL)\b/i.test(ln.text) ||
        /null|pointer|11\.9/.test(payloadL))
    ) {
      const next = proposed
        .replace(/=\s*0(\s*;)/g, '= NULL$1')
        .replace(/(==|!=)\s*0\b/g, '$1 NULL');
      if (next !== proposed) {
        proposed = next;
        changed = true;
      }
    }
    if (!changed) {
      continue;
    }
    return makeFix({
      ruleKey: 'Rule 11.9',
      confidence: /\(.*\*\)\s*0/.test(ln.text) ? 'high' : 'medium',
      title: 'Use NULL for null pointer constant',
      rationale:
        'Rule 11.9: the only allowed form of the null pointer constant is NULL.',
      startOffset: ln.start,
      endOffset: ln.end,
      originalText: ln.text,
      proposedText: proposed,
    });
  }
  return null;
}

function suggestRule123(ctx) {
  // Comma operator in statements — split at comma outside parens (simple)
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const t = line.trim();
      if (!/,/.test(t) || /for\s*\(/.test(t) || /#\s*define/.test(t)) {
        return null;
      }
      // Very conservative: a = 1, b = 2;
      const m = line.match(/^(\s*)(.+),\s*(.+;\s*)$/);
      if (!m) {
        return null;
      }
      const indent = m[1];
      return `${indent}${m[2].trim()};\n${indent}${m[3].trim()}`;
    },
    {
      ruleKey: 'Rule 12.3',
      confidence: 'low',
      title: 'Avoid comma operator — split statements',
      rationale: 'Rule 12.3: the comma operator should not be used.',
    },
    0
  );
}

function suggestRule134(ctx) {
  // if (x = y) → x = y; if (x)
  const text = ctx.text;
  const ifAt = findKeywordNearLine(text, ctx.focusLine, /\bif\b/g, { up: 5, down: 2 });
  if (ifAt < 0) {
    return null;
  }
  let i = skipWs(text, ifAt + 2);
  if (text[i] !== '(') {
    return null;
  }
  const close = matchParen(text, i);
  if (close < 0) {
    return null;
  }
  const cond = text.slice(i + 1, close).trim();
  // assignment as controlling expression (not ==)
  const am = cond.match(/^(.+?)=(?!=)(.+)$/);
  if (!am) {
    return null;
  }
  const lhs = am[1].trim();
  const rhs = am[2].trim();
  // unwrap extra parens from if ((x = y))
  const lhsClean = lhs.replace(/^\(+/, '').trim();
  const rhsClean = rhs.replace(/\)+$/, '').trim();
  const indent = lineIndentAt(text, ifAt);
  const after = skipWs(text, close + 1);
  let stmtEnd;
  let body = '';
  if (text[after] === '{') {
    const be = matchBrace(text, after);
    if (be < 0) {
      return null;
    }
    stmtEnd = be + 1;
    body = text.slice(after, stmtEnd);
  } else {
    // single statement to ;
    const semi = text.indexOf(';', after);
    if (semi < 0) {
      return null;
    }
    stmtEnd = semi + 1;
    body = `{\n${indent}  ${text.slice(after, stmtEnd).trim()}\n${indent}}`;
  }
  const originalText = text.slice(ifAt, stmtEnd);
  const proposedText = `${lhsClean} = ${rhsClean};\n${indent}if (${lhsClean}) ${body}`;
  return makeFix({
    ruleKey: 'Rule 13.4',
    confidence: 'medium',
    title: 'Move assignment out of controlling expression',
    rationale:
      'Rule 13.4: the result of an assignment operator should not be used in a controlling expression.',
    startOffset: ifAt,
    endOffset: stmtEnd,
    originalText,
    proposedText,
  });
}

function suggestRule144(ctx) {
  const text = ctx.text;
  const kw = findKeywordNearLine(text, ctx.focusLine, /\b(?:if|while|for)\b/g, {
    up: 3,
    down: 1,
  });
  if (kw < 0) {
    return null;
  }
  const which = text.slice(kw).match(/^(if|while|for)\b/)?.[1];
  if (!which || which === 'for') {
    // for is riskier — skip mechanical
    if (which === 'for') {
      return null;
    }
  }
  let i = skipWs(text, kw + which.length);
  if (text[i] !== '(') {
    return null;
  }
  const close = matchParen(text, i);
  if (close < 0) {
    return null;
  }
  const cond = text.slice(i + 1, close).trim();
  // Already boolean-ish
  if (/[!=<>]=|&&|\|\||\b(?:true|false|bool)\b|!=|==/.test(cond)) {
    return null;
  }
  // Single identifier or dereference
  if (!/^[A-Za-z_*][\w\s\->.]*$/.test(cond)) {
    return null;
  }
  const expr = cond.trim();
  const proposedCond = /\*/.test(expr) || /ptr|p\b/i.test(expr)
    ? `${expr} != NULL`
    : `${expr} != 0`;
  const originalText = text.slice(kw, close + 1);
  const proposedText = `${which} (${proposedCond})`;
  return makeFix({
    ruleKey: 'Rule 14.4',
    confidence: 'medium',
    title: 'Make controlling expression explicitly boolean',
    rationale:
      'Rule 14.4: the controlling expression of an if/while shall have essentially Boolean type.',
    startOffset: kw,
    endOffset: close + 1,
    originalText,
    proposedText,
  });
}

/**
 * Brace a single-statement body after if/else/for/while.
 * @param {object} ctx
 */
function suggestRule156(ctx) {
  const text = ctx.text;
  const kw = findKeywordNearLine(
    text,
    ctx.focusLine,
    /\b(?:if|else|for|while)\b/g,
    { up: 2, down: 2 }
  );
  if (kw < 0) {
    return null;
  }
  const word = text.slice(kw).match(/^(if|else|for|while)\b/)?.[1];
  if (!word) {
    return null;
  }

  let bodyStart;
  if (word === 'else') {
    let j = skipWs(text, kw + 4);
    if (/^if\b/.test(text.slice(j))) {
      return null; // else if handled by 15.7 path
    }
    bodyStart = j;
  } else {
    let j = skipWs(text, kw + word.length);
    if (text[j] !== '(') {
      return null;
    }
    const pe = matchParen(text, j);
    if (pe < 0) {
      return null;
    }
    bodyStart = skipWs(text, pe + 1);
  }

  if (text[bodyStart] === '{') {
    return null; // already braced
  }

  // body is a single statement ending at ;
  let semi = bodyStart;
  let depth = 0;
  for (; semi < text.length; semi++) {
    const ch = text[semi];
    if (ch === '"' || ch === "'") {
      // skip via helpers inline
      const q = ch;
      semi++;
      while (semi < text.length) {
        if (text[semi] === '\\') {
          semi += 2;
          continue;
        }
        if (text[semi] === q) {
          break;
        }
        semi++;
      }
      continue;
    }
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === ';' && depth === 0) {
      break;
    } else if (ch === '{' && depth === 0) {
      return null;
    }
  }
  if (semi >= text.length || text[semi] !== ';') {
    return null;
  }
  const indent = lineIndentAt(text, kw);
  const stmt = text.slice(bodyStart, semi + 1).trim();
  const originalText = text.slice(kw, semi + 1);
  const head = text.slice(kw, bodyStart).replace(/\s+$/, ' ');
  const proposedText = `${head}{\n${indent}  ${stmt}\n${indent}}`;
  return makeFix({
    ruleKey: 'Rule 15.6',
    confidence: 'high',
    title: 'Add braces around control-statement body',
    rationale:
      'Rule 15.6: the body of an iteration-statement or selection-statement shall be a compound statement.',
    startOffset: kw,
    endOffset: semi + 1,
    originalText,
    proposedText,
  });
}

function suggestRule157(ctx) {
  const text = ctx.text;
  const ifAt = findKeywordNearLine(text, ctx.focusLine, /\bif\b/g, {
    up: 40,
    down: 5,
  });
  if (ifAt < 0) {
    return null;
  }
  const chain = parseIfChain(text, ifAt);
  if (!chain || chain.hasFinalElse) {
    return null;
  }
  // Need at least one else if to be a chain; lone if can also get else for completeness
  const hasElseIf = /\belse\s+if\b/.test(text.slice(chain.start, chain.end));
  if (!hasElseIf) {
    // Coverity 15.7 is specifically about else-if chains; skip lone if
    return null;
  }
  const indent = lineIndentAt(text, chain.start);
  const insert = ` else {\n${indent}  /* no other cases */\n${indent}}`;
  return makeFix({
    ruleKey: 'Rule 15.7',
    confidence: 'high',
    title: 'Add final else clause',
    rationale:
      'Rule 15.7: all if … else if constructs shall be terminated with an else statement.',
    startOffset: chain.start,
    endOffset: chain.end,
    originalText: text.slice(chain.start, chain.end),
    proposedText: text.slice(chain.start, chain.end) + insert,
  });
}

function suggestRule163(ctx) {
  // Insert break; before next case/default when missing
  const text = ctx.text;
  const caseAt = findKeywordNearLine(text, ctx.focusLine, /\bcase\b|\bdefault\b/g, {
    up: 2,
    down: 15,
  });
  if (caseAt < 0) {
    return null;
  }
  // Find end of this clause: next case/default or }
  let i = caseAt;
  // skip to end of case label line / colon
  const colon = text.indexOf(':', caseAt);
  if (colon < 0) {
    return null;
  }
  i = colon + 1;
  let next = -1;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      if (depth === 0) {
        next = j;
        break;
      }
      depth--;
    } else if (depth === 0 && /^\b(?:case|default)\b/.test(text.slice(j))) {
      next = j;
      break;
    }
  }
  if (next < 0) {
    return null;
  }
  const body = text.slice(i, next);
  if (/\bbreak\s*;/.test(body) || /\breturn\b/.test(body) || /\bcontinue\b/.test(body) || /\bgoto\b/.test(body)) {
    return null;
  }
  if (!body.trim()) {
    return null; // empty fall-through intentional — skip
  }
  const indent = lineIndentAt(text, caseAt) + '  ';
  const insert = `\n${indent}break;`;
  return makeFix({
    ruleKey: 'Rule 16.3',
    confidence: 'medium',
    title: 'Add break before next case',
    rationale:
      'Rule 16.3: an unconditional break statement shall terminate every switch-clause.',
    startOffset: caseAt,
    endOffset: next,
    originalText: text.slice(caseAt, next),
    proposedText: text.slice(caseAt, next).replace(/\s*$/, '') + insert + '\n',
  });
}

function suggestRule164(ctx) {
  const text = ctx.text;
  const sw = findKeywordNearLine(text, ctx.focusLine, /\bswitch\b/g, {
    up: 30,
    down: 2,
  });
  if (sw < 0) {
    return null;
  }
  let i = skipWs(text, sw + 6);
  if (text[i] !== '(') {
    return null;
  }
  const pe = matchParen(text, i);
  if (pe < 0) {
    return null;
  }
  i = skipWs(text, pe + 1);
  if (text[i] !== '{') {
    return null;
  }
  const end = matchBrace(text, i);
  if (end < 0) {
    return null;
  }
  const body = text.slice(i, end + 1);
  if (/\bdefault\s*:/.test(body)) {
    return null;
  }
  const indent = lineIndentAt(text, sw);
  const insert = `\n${indent}  default: /* unexpected */\n${indent}    break;\n${indent}`;
  const originalText = text.slice(sw, end + 1);
  const proposedText =
    text.slice(sw, end) + insert + '}';
  return makeFix({
    ruleKey: 'Rule 16.4',
    confidence: 'high',
    title: 'Add default clause to switch',
    rationale: 'Rule 16.4: every switch statement shall have a default label.',
    startOffset: sw,
    endOffset: end + 1,
    originalText,
    proposedText,
  });
}

function suggestRule167(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const m = line.match(/^(\s*)switch\s*\((.+)\)\s*\{\s*$/);
      if (!m) {
        return null;
      }
      const cond = m[2].trim();
      if (!/(==|!=|<|>|<=|>=|&&|\|\||\btrue\b|\bfalse\b)/.test(cond) && !/\?/.test(cond)) {
        // might still be boolean variable — medium confidence only if payload says bool
        if (!/bool|boolean|true|false/i.test(ctx.payload || '')) {
          return null;
        }
      }
      return `${m[1]}if (${cond}) { /* TODO: replace switch-on-bool with if/else */`;
    },
    {
      ruleKey: 'Rule 16.7',
      confidence: 'low',
      title: 'Replace switch-on-boolean with if',
      rationale: 'Rule 16.7: a switch-expression shall not have essentially Boolean type.',
      applyable: false,
    }
  );
}

function suggestRule176(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\[\s*static\s+/.test(line)) {
        return null;
      }
      return line.replace(/\[\s*static\s+(\d+)\s*\]/g, '[$1]');
    },
    {
      ruleKey: 'Rule 17.6',
      confidence: 'high',
      title: 'Remove static from array parameter bound',
      rationale:
        'Rule 17.6: The declaration of an array parameter shall not contain the static keyword between the [ ].',
    }
  );
}

function suggestRule177(ctx) {
  for (const ln of nearbyLines(ctx.text, ctx.focusLine, 0)) {
    const line = ln.text;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }
    if (/^\(void\)/.test(trimmed)) {
      continue;
    }
    if (/^\s*(?:if|while|for|switch|return|sizeof|typeof|_Generic)\b/.test(line)) {
      continue;
    }
    if (/^\s*[^=\n]+=(?!=)/.test(line)) {
      continue;
    }
    if (!/\b[A-Za-z_]\w*\s*\(/.test(trimmed) || !/\)\s*;\s*$/.test(trimmed)) {
      continue;
    }
    if (/^\s*(?:static|extern|inline|const|volatile|struct|enum|union|typedef)\b/.test(line)) {
      continue;
    }
    const indent = line.match(/^\s*/)?.[0] || '';
    const proposed = `${indent}(void)${line.slice(indent.length)}`;
    return makeFix({
      ruleKey: 'Rule 17.7',
      confidence: 'high',
      title: 'Discard return value with (void)',
      rationale:
        'Rule 17.7: the value returned by a function having non-void return type shall be used.',
      startOffset: ln.start,
      endOffset: ln.end,
      originalText: line,
      proposedText: proposed,
    });
  }
  return null;
}

function suggestRule184(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      // *(arr + i) → arr[i]  and  *(arr + n) forms
      let next = line.replace(
        /\*\s*\(\s*([A-Za-z_]\w*)\s*\+\s*([^)]+?)\s*\)/g,
        '$1[$2]'
      );
      next = next.replace(
        /\*\s*\(\s*([^)]+?)\s*\+\s*([A-Za-z_]\w*)\s*\)/g,
        (full, a, b) => {
          // if first is number-like, keep second as base
          if (/^[A-Za-z_]/.test(a.trim())) {
            return `${a.trim()}[${b}]`;
          }
          return `${b}[${a.trim()}]`;
        }
      );
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 18.4',
      confidence: 'medium',
      title: 'Prefer array subscript over pointer arithmetic',
      rationale:
        'Rule 18.4: the +, -, += and -= operators should not be applied to an expression of pointer type.',
    }
  );
}

function suggestRule191(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\bmemcpy\s*\(/.test(line)) {
        return null;
      }
      if (!/overlap|memmove|19\.1/i.test(ctx.payload || '') && !/overlap/i.test(line)) {
        // still offer as medium when rule is 19.1
      }
      return line.replace(/\bmemcpy\b/g, 'memmove');
    },
    {
      ruleKey: 'Rule 19.1',
      confidence: 'medium',
      title: 'Use memmove for possibly overlapping regions',
      rationale:
        'Rule 19.1: an object shall not be assigned or copied to an overlapping object — prefer memmove when overlap is possible.',
    }
  );
}

function suggestRule202(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/^\s*#\s*include/.test(line) || !/\\/.test(line)) {
        return null;
      }
      return line.replace(/\\+/g, '/');
    },
    {
      ruleKey: 'Rule 20.2',
      confidence: 'high',
      title: 'Use forward slashes in #include paths',
      rationale:
        'Rule 20.2: the characters \' " or \\ characters and /* or // characters shall not occur in a header file name.',
    }
  );
}

function suggestRule203(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const m = line.match(/^(\s*#\s*include\s+)([A-Za-z0-9_./\\]+)\s*$/);
      if (!m) {
        return null;
      }
      if (/^["<]/.test(m[2])) {
        return null;
      }
      return `${m[1]}"${m[2].replace(/\\/g, '/')}"`;
    },
    {
      ruleKey: 'Rule 20.3',
      confidence: 'high',
      title: 'Quote the #include header name',
      rationale:
        'Rule 20.3: the #include directive shall be followed by either a <filename> or "filename" sequence.',
    }
  );
}

function suggestRule207(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const m = line.match(/^(\s*#\s*define\s+)([A-Za-z_]\w*)\s*\(([^)]*)\)\s+(.+)$/);
      if (!m) {
        return null;
      }
      const params = m[3]
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (params.length === 0) {
        return null;
      }
      let body = m[4].trim();
      // Already fully parenthesized replacement?
      let changed = false;
      for (const p of params) {
        const re = new RegExp(`(?<![\\w(])${p}(?![\\w)])`, 'g');
        const nextBody = body.replace(re, (tok, offset) => {
          // skip if already (p)
          if (body[offset - 1] === '(' && body[offset + tok.length] === ')') {
            return tok;
          }
          changed = true;
          return `(${tok})`;
        });
        body = nextBody;
      }
      if (!changed) {
        return null;
      }
      // Outer parens if not present
      if (!/^\(.*\)\s*$/.test(body) && !/^\(.*\)\s*\/\*/.test(body)) {
        body = `(${body})`;
      }
      return `${m[1]}${m[2]}(${m[3]}) ${body}`;
    },
    {
      ruleKey: 'Rule 20.7',
      confidence: 'medium',
      title: 'Parenthesize macro parameters',
      rationale:
        'Rule 20.7: expressions resulting from the expansion of macro parameters shall be enclosed in parentheses.',
    }
  );
}

function suggestRule212(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      // Leading single underscore on identifiers (not __ and not _[A-Z])
      if (!/\b_[A-Za-z]/.test(line)) {
        return null;
      }
      const next = line.replace(/\b_([a-z]\w*)\b/g, 'g_$1');
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 21.2',
      confidence: 'low',
      title: 'Avoid reserved identifier spellings',
      rationale:
        'Rule 21.2: a reserved identifier or reserved macro name shall not be declared. Prefer a project prefix without leading underscore.',
    }
  );
}

function suggestRule42(ctx) {
  // Trigraphs
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const map = {
        '??=': '#',
        '??(': '[',
        '??/': '\\',
        '??)': ']',
        '??\'': '^',
        '??<': '{',
        '??!': '|',
        '??>': '}',
        '??-': '~',
      };
      let next = line;
      let changed = false;
      for (const [tri, ch] of Object.entries(map)) {
        if (next.includes(tri)) {
          next = next.split(tri).join(ch);
          changed = true;
        }
      }
      return changed ? next : null;
    },
    {
      ruleKey: 'Rule 4.2',
      confidence: 'high',
      title: 'Replace trigraphs with real tokens',
      rationale: 'Rule 4.2: trigraphs should not be used.',
    }
  );
}

function suggestRule27(ctx) {
  // Unused parameter — add (void)param; at start of function body near focus
  const text = ctx.text;
  const ln = lineSlice(text, ctx.focusLine);
  if (!ln) {
    return null;
  }
  // Extract identifier from payload quotes if present
  const qm = String(ctx.payload || '').match(/["']([A-Za-z_]\w*)["']/);
  const name =
    qm?.[1] ||
    ln.text.match(/\b([A-Za-z_]\w*)\b/)?.[1];
  if (!name || /^(if|for|while|return|void|int)$/.test(name)) {
    return null;
  }
  // Find opening brace of function near line
  const braceAt = text.indexOf('{', ln.start);
  if (braceAt < 0 || braceAt - ln.start > 200) {
    return null;
  }
  const indent = lineIndentAt(text, braceAt) + '  ';
  const insert = `\n${indent}(void)${name}; /* unused */`;
  return makeFix({
    ruleKey: 'Rule 2.7',
    confidence: 'medium',
    title: `Mark unused parameter ${name} with (void)`,
    rationale:
      'Rule 2.7: there should be no unused parameters in functions — cast to void to document intent.',
    startOffset: braceAt,
    endOffset: braceAt + 1,
    originalText: '{',
    proposedText: `{${insert}`,
  });
}

function suggestRule813(ctx) {
  return rewriteNearbyLine(
    ctx,
    (line) => {
      if (!/\([^)]*\*[^)]*\)/.test(line)) {
        return null;
      }
      if (/\bconst\b/.test(line)) {
        return null;
      }
      // int *p → const int *p for pointer params (conservative: only if payload hints read-only)
      if (!/const|read-only|8\.13|not\s+modif/i.test(ctx.payload || '')) {
        return null;
      }
      return line.replace(
        /\b((?:unsigned\s+|signed\s+|long\s+|short\s+|int\s+|char\s+|void\s+|double\s+|float\s+|u?int\d+_t\s+|size_t\s+|bool\s+)+)\*/g,
        'const $1*'
      );
    },
    {
      ruleKey: 'Rule 8.13',
      confidence: 'medium',
      title: 'Add const to read-only pointer parameter',
      rationale:
        'Rule 8.13: a pointer should point to a const-qualified type whenever possible.',
    }
  );
}

function suggestRule41Escapes(ctx) {
  // Rule 4.1 universal character / hex escapes — split long \x
  return rewriteNearbyLine(
    ctx,
    (line) => {
      const next = line.replace(/\\x([0-9A-Fa-f]{3,})/g, (_, hex) => {
        const head = hex.slice(0, 2);
        const rest = hex.slice(2);
        return `\\x${head}" "${rest}`;
      });
      return next === line ? null : next;
    },
    {
      ruleKey: 'Rule 4.1',
      confidence: 'medium',
      title: 'Terminate hex escape sequence',
      rationale:
        'Rule 4.1: octal and hexadecimal escape sequences shall be terminated — split the string literal.',
    }
  );
}

/** @type {Record<string, (ctx: object) => PossibleFixSuggestion | null>} */
const STRATEGIES = {
  'Rule 2.7': suggestRule27,
  'Rule 4.1': suggestRule41Escapes,
  'Rule 4.2': suggestRule42,
  'Rule 7.1': suggestRule71,
  'Rule 7.2': suggestRule72,
  'Rule 7.3': suggestRule73,
  'Rule 7.4': suggestRule74,
  'Rule 8.2': suggestRule82,
  'Rule 8.10': suggestRule810,
  'Rule 8.13': suggestRule813,
  'Rule 8.14': suggestRule814,
  'Rule 11.9': suggestRule119,
  'Rule 12.3': suggestRule123,
  'Rule 13.4': suggestRule134,
  'Rule 14.4': suggestRule144,
  'Rule 15.6': suggestRule156,
  'Rule 15.7': suggestRule157,
  'Rule 16.3': suggestRule163,
  'Rule 16.4': suggestRule164,
  'Rule 16.7': suggestRule167,
  'Rule 17.6': suggestRule176,
  'Rule 17.7': suggestRule177,
  'Rule 18.4': suggestRule184,
  'Rule 19.1': suggestRule191,
  'Rule 20.2': suggestRule202,
  'Rule 20.3': suggestRule203,
  'Rule 20.7': suggestRule207,
  'Rule 21.2': suggestRule212,
};

module.exports = {
  STRATEGIES,
  suggestRule157,
  suggestRule119,
  suggestRule177,
};
