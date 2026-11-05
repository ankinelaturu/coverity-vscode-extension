'use strict';

const crypto = require('crypto');
const vscode = require('vscode');
const { describe } = require('../lookup/lookup');

const CONTEXT_LINES = 2;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {vscode.TextDocument | null} doc
 * @param {number} line0
 * @param {vscode.Range | null} highlightRange
 * @param {string} fallbackPayload
 */
function sliceContextLines(doc, line0, highlightRange, fallbackPayload) {
  if (!doc || line0 < 0 || line0 >= doc.lineCount) {
    const text = fallbackPayload || '(source not available)';
    return [{ lineNumber: line0 + 1, text, isHighlight: true, isContext: false }];
  }
  const start = Math.max(0, line0 - CONTEXT_LINES);
  const end = Math.min(doc.lineCount - 1, line0 + CONTEXT_LINES);
  /** @type {{ lineNumber: number, text: string, isHighlight: boolean, isContext: boolean }[]} */
  const rows = [];
  for (let i = start; i <= end; i++) {
    const isHighlight =
      i === line0 ||
      (highlightRange &&
        highlightRange.start.line <= i &&
        i <= highlightRange.end.line);
    rows.push({
      lineNumber: i + 1,
      text: doc.lineAt(i).text,
      isHighlight,
      isContext: i !== line0,
    });
  }
  return rows;
}

/**
 * @param {object} session
 * @param {object} finding
 * @param {number} activeEventIndex
 */
async function buildTracePeekHtml(session, finding, activeEventIndex) {
  const checker = finding.checkerId || 'Unknown';
  const title = finding.typeTitle || checker;
  const n = finding.events.length;
  const nonce = crypto.randomBytes(16).toString('base64');

  /** @type {Map<string, vscode.TextDocument>} */
  const docCache = new Map();

  async function getDoc(uri) {
    if (!uri) {
      return null;
    }
    const key = uri.toString();
    if (docCache.has(key)) {
      return docCache.get(key);
    }
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      docCache.set(key, doc);
      return doc;
    } catch {
      return null;
    }
  }

  const blocks = [];
  for (let ei = 0; ei < n; ei++) {
    const ev = finding.events[ei];
    const tracked = session.getTracked(finding.id, ei);
    const uri = tracked?.uri;
    const doc = await getDoc(uri);
    const line0 = tracked?.range?.start.line ?? Math.max(0, (ev.location?.line || 1) - 1);
    const locLabel = ev.location?.rawPath
      ? `${ev.location.rawPath}:${ev.location.line}`
      : uri?.fsPath || 'unknown';
    const hint = describe(finding.checkerId, ev.label);
    const rows = sliceContextLines(doc, line0, tracked?.range ?? null, ev.rawPayload);
    const message = (ev.rawPayload || '').trim();
    const canNavigate = Boolean(tracked?.uri && tracked.status !== 'unresolved');
    blocks.push({
      stepNumber: ei + 1,
      eventIndex: ei,
      findingId: finding.id,
      isCurrent: ei === activeEventIndex,
      label: ev.label || 'step',
      locLabel,
      hint,
      message,
      canNavigate,
      rows,
    });
  }

  const blockHtml = blocks
    .map((b) => {
      const cls = b.isCurrent ? 'block current' : 'block';
      const badge = b.isCurrent ? ' · current step' : '';
      const meta = escapeHtml(`${b.label}${b.hint ? ` — ${b.hint}` : ''}${badge}`);
      const loc = escapeHtml(b.locLabel);
      const msgText = b.message || '(no message in report)';
      const msg = escapeHtml(msgText);
      const codeRows = b.rows
        .map((r) => {
          const lineCls = r.isHighlight ? 'line highlight' : 'line';
          return (
            `<tr class="${lineCls}">` +
            `<td class="ln">${r.lineNumber}</td>` +
            `<td class="code"><pre>${escapeHtml(r.text)}</pre></td></tr>`
          );
        })
        .join('');

      const hdrInner =
        `<span class="row1"><span class="step">Step ${b.stepNumber} of ${n}</span> ` +
        `<span class="meta">${meta}</span></span>` +
        `<span class="row2 loc">${loc}</span>` +
        `<span class="row3 msg">${msg}</span>`;

      const hdr = b.canNavigate
        ? `<button type="button" class="hdr hdr-link" data-finding-id="${escapeHtml(b.findingId)}" data-event-index="${b.eventIndex}" title="Open this step in the editor">` +
          hdrInner +
          `</button>`
        : `<div class="hdr hdr-static" title="Location unresolved">${hdrInner}</div>`;

      return `<section class="${cls}">${hdr}<table class="code">${codeRows}</table></section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<style>
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    margin: 0;
    padding: 12px 16px 24px;
    line-height: 1.4;
  }
  h1 {
    font-size: 1.1em;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--vscode-foreground);
  }
  .subtitle { opacity: 0.85; margin-bottom: 16px; font-size: 0.95em; }
  .block {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    margin-bottom: 14px;
    overflow: hidden;
  }
  .block.current {
    border-color: var(--vscode-editorWarning-foreground, #e8a838);
    box-shadow: 0 0 0 1px var(--vscode-editorWarning-foreground, #e8a838);
  }
  .hdr {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.15));
    font-size: 0.9em;
    text-align: left;
    border: none;
    color: inherit;
  }
  .hdr-link {
    cursor: pointer;
  }
  .hdr-link:hover {
    background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.25));
  }
  .hdr-link:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }
  .hdr-static { cursor: default; opacity: 0.95; }
  .row1, .row2, .row3 { display: block; }
  .row2 { margin-top: 2px; }
  .row3 { margin-top: 4px; }
  .step { font-weight: 600; }
  .loc {
    font-family: var(--vscode-editor-font-family);
    font-size: 0.85em;
    opacity: 0.9;
  }
  .msg {
    font-family: var(--vscode-editor-font-family);
    font-size: 0.85em;
    white-space: pre-wrap;
    word-break: break-word;
    opacity: 0.95;
  }
  table.code { width: 100%; border-collapse: collapse; }
  td.ln {
    width: 3em;
    text-align: right;
    padding: 0 8px 0 4px;
    vertical-align: top;
    color: var(--vscode-editorLineNumber-foreground);
    user-select: none;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
  }
  td.code { padding: 0; width: 100%; }
  td.code pre {
    margin: 0;
    padding: 2px 8px 2px 0;
    white-space: pre;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
  }
  tr.line.highlight td.code pre {
    background: var(--vscode-editor-selectionBackground);
    outline: 1px solid var(--vscode-editor-selectionHighlightBorder, transparent);
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle"><code>${escapeHtml(checker)}</code> — full trace (${n} step${n === 1 ? '' : 's'})</div>
  ${blockHtml}
  <script nonce="${nonce}">
    (function () {
      const api = acquireVsCodeApi();
      document.querySelectorAll('.hdr-link').forEach(function (el) {
        el.addEventListener('click', function () {
          api.postMessage({
            type: 'navigate',
            findingId: el.getAttribute('data-finding-id'),
            eventIndex: Number(el.getAttribute('data-event-index')),
          });
        });
      });
    })();
  </script>
</body>
</html>`;
}

module.exports = { buildTracePeekHtml, CONTEXT_LINES };
