'use strict';

const crypto = require('crypto');

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Strip C comments for structure-oriented similarity.
 * @param {string} s
 */
function stripComments(s) {
  return String(s || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} ratio in [0,1]
 */
function similarity(a, b) {
  if (a === b) {
    return 1;
  }
  if (!a.length && !b.length) {
    return 1;
  }
  if (!a.length || !b.length) {
    return 0;
  }

  // One line is a prefix of the other (common for "same statement + comment")
  if (a.startsWith(b) || b.startsWith(a)) {
    const shorter = Math.min(a.length, b.length);
    const longer = Math.max(a.length, b.length);
    return 0.55 + 0.45 * (shorter / longer);
  }

  const ca = stripComments(a);
  const cb = stripComments(b);
  if (ca && cb && ca === cb) {
    return 0.92;
  }
  if (ca && cb && (ca.startsWith(cb) || cb.startsWith(ca))) {
    const shorter = Math.min(ca.length, cb.length);
    const longer = Math.max(ca.length, cb.length);
    return 0.55 + 0.4 * (shorter / longer);
  }

  const n = a.length;
  const m = b.length;
  let pre = 0;
  while (pre < n && pre < m && a[pre] === b[pre]) {
    pre++;
  }
  let suf = 0;
  while (suf < n - pre && suf < m - pre && a[n - 1 - suf] === b[m - 1 - suf]) {
    suf++;
  }
  const prefixScore = pre / Math.max(Math.min(n, m), 1);
  const shared = (2 * (pre + suf)) / (n + m);

  const aa = a.slice(pre, n - suf);
  const bb = b.slice(pre, m - suf);
  const an = aa.length;
  const bn = bb.length;
  let editScore = 0;
  if (an === 0 && bn === 0) {
    editScore = 1;
  } else if (an * bn <= 8000) {
    /** @type {number[]} */
    let prev = Array.from({ length: bn + 1 }, (_, j) => j);
    for (let i = 1; i <= an; i++) {
      /** @type {number[]} */
      const cur = [i];
      for (let j = 1; j <= bn; j++) {
        const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    editScore = 1 - prev[bn] / Math.max(n, m);
  }

  return Math.max(prefixScore, shared, editScore);
}

/**
 * Character-level LCS markup for a changed line pair.
 * @param {string} left
 * @param {string} right
 * @returns {{ leftHtml: string, rightHtml: string }}
 */
function inlineDiffHtml(left, right) {
  const a = [...left];
  const b = [...right];
  const n = a.length;
  const m = b.length;
  /** @type {number[][]} */
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  /** @type {{ t: 'same' | 'del' | 'add', c: string }[]} */
  const leftOps = [];
  /** @type {{ t: 'same' | 'del' | 'add', c: string }[]} */
  const rightOps = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      leftOps.push({ t: 'same', c: a[i] });
      rightOps.push({ t: 'same', c: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      leftOps.push({ t: 'del', c: a[i] });
      i++;
    } else {
      rightOps.push({ t: 'add', c: b[j] });
      j++;
    }
  }
  while (i < n) {
    leftOps.push({ t: 'del', c: a[i++] });
  }
  while (j < m) {
    rightOps.push({ t: 'add', c: b[j++] });
  }

  function renderOps(ops, markClass) {
    let html = '';
    let buf = '';
    let mode = /** @type {string | null} */ (null);
    const flush = () => {
      if (!buf) {
        return;
      }
      const esc = escapeHtml(buf);
      html += mode === 'mark' ? `<span class="${markClass}">${esc}</span>` : esc;
      buf = '';
    };
    for (const op of ops) {
      const next = op.t === 'same' ? 'same' : 'mark';
      if (mode !== null && next !== mode) {
        flush();
      }
      mode = next;
      buf += op.c;
    }
    flush();
    return html;
  }

  return {
    leftHtml: renderOps(leftOps, 'ih del'),
    rightHtml: renderOps(rightOps, 'ih add'),
  };
}

/**
 * Exact LCS index pairs between line arrays.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {[number, number][]}
 */
function exactMatches(a, b) {
  const n = a.length;
  const m = b.length;
  /** @type {number[][]} */
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  /** @type {[number, number][]} */
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * Order-preserving hunk alignment via DP (del / add / optional change).
 * @param {string[]} aSlice
 * @param {string[]} bSlice
 * @param {number} aStart
 * @param {number} bStart
 * @returns {{ kind: 'change' | 'del' | 'add', ai?: number, bi?: number }[]}
 */
function alignHunk(aSlice, bSlice, aStart, bStart) {
  const n = aSlice.length;
  const m = bSlice.length;
  const CHANGE_MIN = 0.5;
  /** @type {number[][]} */
  const cost = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  /** @type {('del'|'add'|'chg'|null)[][]} */
  const prev = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));

  for (let i = 1; i <= n; i++) {
    cost[i][0] = i;
    prev[i][0] = 'del';
  }
  for (let j = 1; j <= m; j++) {
    cost[0][j] = j;
    prev[0][j] = 'add';
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const delCost = cost[i - 1][j] + 1;
      const addCost = cost[i][j - 1] + 1;
      let best = delCost;
      let how = /** @type {'del'|'add'|'chg'} */ ('del');
      if (addCost < best) {
        best = addCost;
        how = 'add';
      }
      const sim = similarity(aSlice[i - 1], bSlice[j - 1]);
      if (sim >= CHANGE_MIN) {
        // Prefer pairing similar lines: change is cheaper than del+add
        const chgCost = cost[i - 1][j - 1] + (1 - sim);
        if (chgCost < best - 1e-9 || (Math.abs(chgCost - best) < 1e-9 && how !== 'chg')) {
          best = chgCost;
          how = 'chg';
        }
      }
      cost[i][j] = best;
      prev[i][j] = how;
    }
  }

  /** @type {{ kind: 'change' | 'del' | 'add', ai?: number, bi?: number }[]} */
  const opsRev = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const how = prev[i][j];
    if (how === 'chg') {
      opsRev.push({ kind: 'change', ai: aStart + i - 1, bi: bStart + j - 1 });
      i--;
      j--;
    } else if (how === 'del' || (i > 0 && j === 0)) {
      opsRev.push({ kind: 'del', ai: aStart + i - 1 });
      i--;
    } else {
      opsRev.push({ kind: 'add', bi: bStart + j - 1 });
      j--;
    }
  }
  opsRev.reverse();
  return opsRev;
}

/**
 * Side-by-side line diff with modification pairing + optional inline HTML.
 * @param {string} leftText
 * @param {string} rightText
 * @returns {{ left: { num: number | null, text: string, kind: string, html?: string }[], right: { num: number | null, text: string, kind: string, html?: string }[] }}
 */
function diffLines(leftText, rightText) {
  const a = String(leftText || '').replace(/\n$/, '').split('\n');
  const b = String(rightText || '').replace(/\n$/, '').split('\n');
  const matches = exactMatches(a, b);

  /** @type {{ left: { num: number | null, text: string, kind: string, html?: string }, right: { num: number | null, text: string, kind: string, html?: string } }[]} */
  const rows = [];
  let ai = 0;
  let bi = 0;
  let li = 1;
  let ri = 1;
  let mi = 0;

  const pushChange = (aLine, bLine) => {
    const inline = inlineDiffHtml(aLine, bLine);
    rows.push({
      left: { num: li++, text: aLine, kind: 'chg', html: inline.leftHtml },
      right: { num: ri++, text: bLine, kind: 'chg', html: inline.rightHtml },
    });
  };

  while (ai < a.length || bi < b.length) {
    const next = mi < matches.length ? matches[mi] : null;
    if (next && next[0] === ai && next[1] === bi) {
      rows.push({
        left: { num: li++, text: a[ai], kind: 'same' },
        right: { num: ri++, text: b[bi], kind: 'same' },
      });
      ai++;
      bi++;
      mi++;
      continue;
    }

    const aEnd = next ? next[0] : a.length;
    const bEnd = next ? next[1] : b.length;
    const hunk = alignHunk(a.slice(ai, aEnd), b.slice(bi, bEnd), ai, bi);
    for (const op of hunk) {
      if (op.kind === 'change' && op.ai != null && op.bi != null) {
        pushChange(a[op.ai], b[op.bi]);
      } else if (op.kind === 'del' && op.ai != null) {
        rows.push({
          left: { num: li++, text: a[op.ai], kind: 'del' },
          right: { num: null, text: '', kind: 'pad' },
        });
      } else if (op.kind === 'add' && op.bi != null) {
        rows.push({
          left: { num: null, text: '', kind: 'pad' },
          right: { num: ri++, text: b[op.bi], kind: 'add' },
        });
      }
    }
    ai = aEnd;
    bi = bEnd;
  }

  return {
    left: rows.map((r) => r.left),
    right: rows.map((r) => r.right),
  };
}

/**
 * @param {{ num: number | null, text: string, kind: string, html?: string }[]} lines
 * @param {'left' | 'right'} side
 */
function renderPane(lines, side) {
  const rows = lines
    .map((ln) => {
      const num = ln.num == null ? '' : String(ln.num);
      const code = ln.html != null ? ln.html : escapeHtml(ln.text);
      return `<div class="diff-line ${ln.kind}"><span class="ln">${escapeHtml(num)}</span><span class="code">${code}</span></div>`;
    })
    .join('');
  const title = side === 'left' ? 'Example' : 'Fixed';
  const cls = side === 'left' ? 'pane example' : 'pane fixed';
  return `<div class="${cls}"><div class="pane-title">${title}</div><div class="pane-body">${rows}</div></div>`;
}

/**
 * @param {object} opts
 * @param {string} opts.checkerId
 * @param {string} opts.typeTitle
 * @param {string} [opts.findingSummary]
 * @param {import('../misra/misraRules').MisraRuleEntry | null} opts.rule
 */
function buildIssueDetailsHtml(opts) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const checker = opts.checkerId || 'Unknown';
  const title = opts.typeTitle || checker;
  const rule = opts.rule;

  let body;
  if (!rule) {
    body = `
      <div class="meta">
        <div class="badge">Non-MISRA / no reference</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="checker">${escapeHtml(checker)}</p>
        ${opts.findingSummary ? `<p class="summary">${escapeHtml(opts.findingSummary)}</p>` : ''}
        <p class="muted">No MISRA C:2012 entry matched this checker. Details panel focuses on MISRA Rule/Dir references.</p>
      </div>`;
  } else {
    const { left, right } = diffLines(rule.example, rule.fixed);
    body = `
      <div class="meta">
        <div class="badge">${escapeHtml(rule.kind)} · ${escapeHtml(rule.category)}</div>
        <h1>${escapeHtml(rule.heading)}</h1>
        <p class="checker">${escapeHtml(checker)}</p>
        <p class="desc">${escapeHtml(rule.description)}</p>
        ${rule.whyFix ? `<p class="why"><strong>Why fix?</strong> ${escapeHtml(rule.whyFix)}</p>` : ''}
        ${rule.howToFix ? `<p class="how"><strong>How to fix:</strong> ${escapeHtml(rule.howToFix)}</p>` : ''}
      </div>
      <div class="diff">
        ${renderPane(left, 'left')}
        ${renderPane(right, 'right')}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style nonce="${nonce}">
  :root {
    color-scheme: light dark;
  }
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
  }
  .wrap {
    box-sizing: border-box;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .meta {
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35));
  }
  .badge {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    margin-bottom: 8px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
  }
  .checker, .muted, .summary {
    margin: 0 0 8px;
    opacity: 0.8;
    font-size: 12px;
  }
  .desc, .why, .how {
    margin: 0 0 8px;
    line-height: 1.45;
  }
  .why, .how { opacity: 0.95; }
  .diff {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: start;
    min-height: 160px;
  }
  .pane {
    min-width: 0;
    border-right: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35));
  }
  .pane.fixed { border-right: none; }
  .pane-title {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .pane.example .pane-title {
    background: rgba(255, 80, 80, 0.16);
    color: #ff8a8a;
  }
  .pane.fixed .pane-title {
    background: rgba(80, 200, 80, 0.16);
    color: #8aff8a;
  }
  .pane-body {
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: var(--vscode-editor-font-size, 12px);
    line-height: 1.45;
    background: var(--vscode-editor-background);
    overflow-x: auto;
  }
  .diff-line {
    display: grid;
    grid-template-columns: 40px 1fr;
    white-space: pre;
  }
  .diff-line .ln {
    text-align: right;
    padding: 0 8px 0 4px;
    opacity: 0.55;
    user-select: none;
    border-right: 1px solid var(--vscode-panel-border, rgba(128,128,128,.25));
  }
  .diff-line .code {
    padding: 0 8px;
  }
  .diff-line.del { background: rgba(255, 80, 80, 0.12); }
  .diff-line.add { background: rgba(80, 200, 80, 0.12); }
  .diff-line.chg { background: rgba(200, 180, 40, 0.10); }
  .diff-line.pad { background: transparent; min-height: 1.45em; }
  .diff-line.same:hover { background: var(--vscode-list-hoverBackground); }
  .ih {
    border-radius: 2px;
    padding: 0 1px;
  }
  .ih.del {
    background: rgba(255, 80, 80, 0.35);
    box-shadow: inset 0 -1px 0 rgba(255, 80, 80, 0.55);
  }
  .ih.add {
    background: rgba(80, 200, 80, 0.35);
    box-shadow: inset 0 -1px 0 rgba(80, 200, 80, 0.55);
  }
  @media (max-width: 520px) {
    .diff { grid-template-columns: 1fr; }
    .pane.example { border-right: none; border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35)); }
  }
</style>
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;
}

/**
 * @param {string} [message]
 */
function emptyIssueDetailsHtml(message) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const text =
    message ||
    'Select a Coverity issue in Problems (or navigate to one). MISRA findings show description, Why fix?, How to fix, and an Example | Fixed diff.';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';" />
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-sideBar-background,var(--vscode-editor-background));padding:14px;line-height:1.5;margin:0;}
h1{font-size:14px;margin:0 0 8px;} p{margin:0;opacity:.85;}
</style></head>
<body><h1>Issue Details</h1><p>${escapeHtml(text)}</p></body></html>`;
}

module.exports = {
  buildIssueDetailsHtml,
  emptyIssueDetailsHtml,
  diffLines,
  inlineDiffHtml,
  similarity,
  escapeHtml,
};
