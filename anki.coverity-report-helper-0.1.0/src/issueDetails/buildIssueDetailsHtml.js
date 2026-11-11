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
 * Simple LCS line diff → aligned rows with change marks.
 * @param {string} leftText
 * @param {string} rightText
 * @returns {{ left: { num: number | null, text: string, kind: string }[], right: { num: number | null, text: string, kind: string }[] }}
 */
function diffLines(leftText, rightText) {
  const a = String(leftText || '').replace(/\n$/, '').split('\n');
  const b = String(rightText || '').replace(/\n$/, '').split('\n');
  const n = a.length;
  const m = b.length;
  /** @type {number[][]} */
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  /** @type {{ left: { num: number | null, text: string, kind: string }, right: { num: number | null, text: string, kind: string } }[]} */
  const rows = [];
  let i = 0;
  let j = 0;
  let li = 1;
  let ri = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({
        left: { num: li++, text: a[i], kind: 'same' },
        right: { num: ri++, text: b[j], kind: 'same' },
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        left: { num: li++, text: a[i], kind: 'del' },
        right: { num: null, text: '', kind: 'pad' },
      });
      i++;
    } else {
      rows.push({
        left: { num: null, text: '', kind: 'pad' },
        right: { num: ri++, text: b[j], kind: 'add' },
      });
      j++;
    }
  }
  while (i < n) {
    rows.push({
      left: { num: li++, text: a[i], kind: 'del' },
      right: { num: null, text: '', kind: 'pad' },
    });
    i++;
  }
  while (j < m) {
    rows.push({
      left: { num: null, text: '', kind: 'pad' },
      right: { num: ri++, text: b[j], kind: 'add' },
    });
    j++;
  }
  return {
    left: rows.map((r) => r.left),
    right: rows.map((r) => r.right),
  };
}

/**
 * @param {{ num: number | null, text: string, kind: string }[]} lines
 * @param {'left' | 'right'} side
 */
function renderPane(lines, side) {
  const rows = lines
    .map((ln) => {
      const num = ln.num == null ? '' : String(ln.num);
      return `<div class="diff-line ${ln.kind}"><span class="ln">${escapeHtml(num)}</span><span class="code">${escapeHtml(ln.text)}</span></div>`;
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
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
  }
  .wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .meta {
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35));
    flex: 0 0 auto;
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
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    overflow: hidden;
  }
  .pane {
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35));
    overflow: hidden;
  }
  .pane.fixed { border-right: none; }
  .pane-title {
    flex: 0 0 auto;
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
    flex: 1 1 auto;
    overflow: auto;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: var(--vscode-editor-font-size, 12px);
    line-height: 1.45;
    background: var(--vscode-editor-background);
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
  .diff-line.del { background: rgba(255, 80, 80, 0.14); }
  .diff-line.add { background: rgba(80, 200, 80, 0.14); }
  .diff-line.pad { background: transparent; opacity: 0.35; }
  .diff-line.same:hover { background: var(--vscode-list-hoverBackground); }
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
  escapeHtml,
};
