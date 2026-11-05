'use strict';

const { traceStepCellDataUri, TRACE_ROW_HEIGHT, TRACE_COL_WIDTH } = require('./traceTimelineSvg');
const { linkPillDataUri, sectionPillDataUri, PILL_HEIGHT } = require('./linkPillSvg');

const TRACE_SECTION_LABEL = 'Trace Steps';

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

function traceSectionHeaderRowHtml() {
  const pill = sectionPillDataUri(TRACE_SECTION_LABEL);
  const alt = escapeHtml(pill.text);
  return (
    `<tr height="${PILL_HEIGHT}">` +
    `<td colspan="2" height="${PILL_HEIGHT}">` +
    `<img src="${pill.uri}" width="${pill.width}" height="${PILL_HEIGHT}" alt="${alt}" />` +
    `</td></tr>`
  );
}

/**
 * Section pill (first table row) + N×2 trace rows; pill row sits flush with trace rows.
 */
function buildTraceTableHtml(finding, eventIndex) {
  const n = finding.events.length;
  if (n === 0) {
    return '';
  }

  let html = '<br><table>';
  html += traceSectionHeaderRowHtml();
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

  return md;
}

module.exports = {
  buildCoverityHoverMarkdown,
  buildTraceTableHtml,
  escapeMd,
};
