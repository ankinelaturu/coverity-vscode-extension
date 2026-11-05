'use strict';

const vscode = require('vscode');
const { describe } = require('../lookup/lookup');
const { traceStepCellDataUri, TRACE_ROW_HEIGHT, TRACE_COL_WIDTH } = require('./traceTimelineSvg');
const { linkPillDataUri, sectionPillDataUri, PILL_HEIGHT } = require('./linkPillSvg');
const { cycleHoverFindingCommandUri } = require('./hoverFindingCarousel');

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

function appendFindingCarouselHeader(md, carousel) {
  if (!carousel || carousel.total <= 1) {
    return;
  }
  const { index, total } = carousel;
  const prev = `[←](${cycleHoverFindingCommandUri(-1)})`;
  const next = `[→](${cycleHoverFindingCommandUri(1)})`;
  md.appendMarkdown(
    `${prev} **Finding ${index + 1} of ${total} at this line** ${next}\n\n` +
      `_Trace step prev/next: CodeLens above the line._\n\n`
  );
}

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
    const link = `[${step.stepNumber || i + 1}. ${escapeMd(step.label)}](${navigateStepUri(finding.id, i)})`;
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
 * @param {{ findingCarousel?: { index: number, total: number } | null }} [options]
 */
function buildCoverityHoverMarkdown(finding, eventIndex, options = {}) {
  const { findingCarousel = null, useRichTimeline: useRichTimelineOpt } = options;
  const ev = finding.events[eventIndex];
  const md = new vscode.MarkdownString();
  md.isTrusted = true;

  const useRichTimeline =
    useRichTimelineOpt ??
    (typeof vscode.workspace?.getConfiguration === 'function'
      ? vscode.workspace.getConfiguration('coverity').get('hoverRichTimeline', true)
      : true);
  md.supportHtml = useRichTimeline;

  appendFindingCarouselHeader(md, findingCarousel);

  const checker = finding.checkerId || 'Unknown';
  const title = finding.typeTitle || checker;
  const stepTotal = finding.events.length;
  md.appendMarkdown(`**${escapeMd(title)}** (\`${escapeMd(checker)}\`)\n\n`);
  md.appendMarkdown(`**Trace step ${eventIndex + 1} of ${stepTotal}**\n\n`);

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
