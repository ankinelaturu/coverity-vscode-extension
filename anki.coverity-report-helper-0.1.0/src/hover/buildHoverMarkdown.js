'use strict';

const vscode = require('vscode');
const { describe } = require('../lookup/lookup');
const { traceStepCellDataUri, TRACE_ROW_HEIGHT, TRACE_COL_WIDTH } = require('./traceTimelineSvg');
const { linkPillDataUri, sectionPillDataUri, PILL_HEIGHT } = require('./linkPillSvg');
const { fullTraceCommandUri } = require('../tracePeek/tracePeekPanel');
const { formatStepLabel, stepMarkdownIndent } = require('../model/stepDisplay');

const TRACE_SECTION_LABEL = 'Events';

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
  const stepId = formatStepLabel(step, i + 1);
  const prefix = stepMarkdownIndent(step);
  const pillText = current
    ? `${prefix}${stepId}. ${label} — ${loc} (current)`
    : `${prefix}${stepId}. ${label} — ${loc}`;
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

function appendTraceMarkdownList(md, finding, eventIndex) {
  md.appendMarkdown(`**${TRACE_SECTION_LABEL}**\n\n`);
  for (let i = 0; i < finding.events.length; i++) {
    const step = finding.events[i];
    const loc = `${step.location.rawPath}:${step.location.line}`;
    const stepId = formatStepLabel(step, i + 1);
    const prefix = stepMarkdownIndent(step);
    const link = `[${prefix}${stepId}. ${escapeMd(step.label)}](${navigateStepUri(finding.id, i)})`;
    if (i === eventIndex) {
      md.appendMarkdown(`**→ ${link} (current)** — \`${escapeMd(loc)}\`\n`);
    } else {
      md.appendMarkdown(`${link} — \`${escapeMd(loc)}\`\n`);
    }
  }
  md.appendMarkdown('\n');
}

function friendlyBlurb(finding, ev) {
  const fromLookup = describe(finding.checkerId, ev.label);
  if (fromLookup) {
    return fromLookup;
  }
  return '';
}

/**
 * @param {object} finding
 * @param {number} eventIndex
 */
function buildCoverityHoverMarkdown(finding, eventIndex, options = {}) {
  const { useRichTimeline: useRichTimelineOpt } = options;
  const ev = finding.events[eventIndex];
  const md = new vscode.MarkdownString();
  md.isTrusted = true;

  const useRichTimeline =
    useRichTimelineOpt ??
    (typeof vscode.workspace?.getConfiguration === 'function'
      ? vscode.workspace.getConfiguration('coverity').get('hoverRichTimeline', true)
      : true);
  md.supportHtml = useRichTimeline;

  md.appendMarkdown(
    `**[▶ Full Trace](${fullTraceCommandUri(finding.id, eventIndex)})** — all events with code (±2 lines)\n\n`
  );

  const checker = finding.checkerId || 'Unknown';
  const title = finding.typeTitle || checker;
  const stepTotal = finding.events.length;
  md.appendMarkdown(`**${escapeMd(title)}** (\`${escapeMd(checker)}\`)\n\n`);
  const currentStepId = formatStepLabel(ev, eventIndex + 1);
  md.appendMarkdown(
    `**Event ${escapeMd(currentStepId)}** (${eventIndex + 1} of ${stepTotal})\n\n`
  );

  const blurb = friendlyBlurb(finding, ev);
  if (blurb) {
    md.appendMarkdown(`${escapeMd(blurb)}\n\n`);
  }

  if (ev.label) {
    const eventHint = describe(null, ev.label);
    if (eventHint && eventHint !== blurb) {
      md.appendMarkdown(`_${escapeMd(ev.label)}:_ ${escapeMd(eventHint)}\n\n`);
    }
  }

  if (ev.rawPayload) {
    md.appendMarkdown('```\n' + ev.rawPayload + '\n```\n\n');
  }

  if (useRichTimeline) {
    md.appendMarkdown(buildTraceTableHtml(finding, eventIndex));
  } else {
    appendTraceMarkdownList(md, finding, eventIndex);
  }

  return md;
}

module.exports = {
  buildCoverityHoverMarkdown,
  buildTraceTableHtml,
  escapeMd,
};
