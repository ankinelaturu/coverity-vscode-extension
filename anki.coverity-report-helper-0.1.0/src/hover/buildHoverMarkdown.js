'use strict';

const { traceStepCellDataUri, TRACE_ROW_HEIGHT, TRACE_COL_WIDTH } = require('./traceTimelineSvg');
const { linkPillDataUri } = require('./linkPillSvg');

function escapeMd(s) {
  return String(s || '').replace(/([\\`*_[\]])/g, '\\$1');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function navigateStepUri(findingId, eventIndex) {
  return `command:coverity.navigateToStep?${encodeURIComponent(JSON.stringify([findingId, eventIndex]))}`;
}

const ROW = TRACE_ROW_HEIGHT;

function timelineCellHtml(stepIndex, activeIndex) {
  const dataUri = traceStepCellDataUri(stepIndex, activeIndex);
  return (
    `<td width="${TRACE_COL_WIDTH}" height="${ROW}" valign="middle">` +
    `<img src="${dataUri}" width="${TRACE_COL_WIDTH}" height="${ROW}" alt="" />` +
    `</td>`
  );
}

function linkCellHtml(finding, i, eventIndex) {
  const step = finding.events[i];
  const label = step.label || 'step';
  const href = navigateStepUri(finding.id, i);
  const loc = `${step.location.rawPath}:${step.location.line}`;
  const current = i === eventIndex;
  const pillText = current ? `${label} — ${loc} (current)` : `${label} — ${loc}`;
  const pill = linkPillDataUri(pillText, current);
  const alt = escapeHtml(pill.text);
  return (
    `<td height="${ROW}" valign="middle">` +
    `<a href="${href}"><img src="${pill.uri}" width="${pill.width}" height="${pill.height}" alt="${alt}" /></a>` +
    `</td>`
  );
}

/**
 * N×2 table: 18×18 timeline img + 18px-tall link img per row (exact heights align).
 */
function buildTraceTableHtml(finding, eventIndex) {
  const n = finding.events.length;
  if (n === 0) {
    return '';
  }

  let html = '<table>';
  for (let i = 0; i < n; i++) {
    html += `<tr height="${ROW}">`;
    html += timelineCellHtml(i, eventIndex);
    html += linkCellHtml(finding, i, eventIndex);
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function appendTraceTableHtml(md, finding, eventIndex) {
  md.appendMarkdown(buildTraceTableHtml(finding, eventIndex));
}

/**
 * @param {object} finding
 * @param {number} eventIndex
 * @returns {import('vscode').MarkdownString}
 */
function buildCoverityHoverMarkdown(finding, eventIndex) {
  const vscode = require('vscode');
  const ev = finding.events[eventIndex];
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;

  const checker = finding.checkerId || 'Unknown';
  const title = finding.typeTitle || checker;
  md.appendMarkdown(`**${escapeMd(title)}** (\`${escapeMd(checker)}\`)\n\n`);

  if (ev.rawPayload) {
    md.appendMarkdown('```\n' + ev.rawPayload + '\n```\n\n');
  }

  appendTraceTableHtml(md, finding, eventIndex);

  const navLinks = [];
  if (eventIndex > 0) {
    navLinks.push(`[← Previous step](command:coverity.previousTraceStep)`);
  }
  if (eventIndex < finding.events.length - 1) {
    navLinks.push(`[Next step →](command:coverity.nextTraceStep)`);
  }
  if (navLinks.length) {
    md.appendMarkdown(`\n${navLinks.join(' · ')}\n`);
  }

  return md;
}

module.exports = {
  buildCoverityHoverMarkdown,
  buildTraceTableHtml,
  escapeMd,
};
