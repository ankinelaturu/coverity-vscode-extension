'use strict';

const vscode = require('vscode');
const { gutterWidth } = require('./gutterLaneSvg');
const { lineDecorationRange } = require('./editorLineRange');
const { stripLineLayout } = require('./codeLensLayout');

const STRIP_TINT = 'rgba(72, 82, 102, 0.28)';

/**
 * One `before` per line (dual decoration types stacked horizontally and hid step labels in Cursor).
 */
function beforeStripCell(widthPx, layout, contentText, textStyle) {
  const before = {
    contentText,
    width: `${widthPx}px`,
    height: layout.heightPx,
    margin: '0',
    backgroundColor: STRIP_TINT,
  };
  if (textStyle) {
    before.color = textStyle.color;
    before.fontWeight = textStyle.fontWeight;
  }
  return { before };
}

function uriMatchesDocument(trackedUri, documentUri) {
  if (!trackedUri) {
    return false;
  }
  if (trackedUri.toString() === documentUri.toString()) {
    return true;
  }
  return trackedUri.fsPath === documentUri.fsPath;
}

function collectInFileTraceSteps(session, document) {
  session.ensureActiveFindingForUri(document.uri);
  const docUri = document.uri;

  /** @param {object} finding */
  function stepsForFinding(finding) {
    /** @type {{ eventIndex: number, line: number }[]} */
    const rawSteps = [];
    for (let ei = 0; ei < finding.events.length; ei++) {
      const t = session.getTracked(finding.id, ei);
      if (!t?.uri || !t.range || !uriMatchesDocument(t.uri, docUri)) {
        continue;
      }
      rawSteps.push({ eventIndex: ei, line: t.range.start.line });
    }
    rawSteps.sort((a, b) => a.eventIndex - b.eventIndex);
    return rawSteps;
  }

  let finding = session.activeFindingId ? session.getFinding(session.activeFindingId) : null;
  let rawSteps = finding ? stepsForFinding(finding) : [];

  if (rawSteps.length === 0) {
    const hits = session.getEventsForUri(docUri);
    if (hits.length === 0) {
      return { rawSteps: [], activeEventIndex: session.activeEventIndex };
    }
    /** @type {Map<string, object>} */
    const byFinding = new Map();
    for (const h of hits) {
      if (!byFinding.has(h.finding.id)) {
        byFinding.set(h.finding.id, h.finding);
      }
    }
    let best = finding;
    let bestSteps = rawSteps;
    for (const f of byFinding.values()) {
      const steps = stepsForFinding(f);
      if (steps.length > bestSteps.length) {
        best = f;
        bestSteps = steps;
      }
    }
    if (best && bestSteps.length > 0) {
      session.setActive(best.id, bestSteps[0].eventIndex);
      rawSteps = bestSteps;
    }
  }

  return { rawSteps, activeEventIndex: session.activeEventIndex };
}

/**
 * @param {Map<number, number>} codeLensRows
 * @returns {vscode.DecorationOptions[]}
 */
function buildTraceMarginDecorations(session, editor, lanesEnabled, codeLensRows) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  const laneCount = Math.max(1, Math.min(12, cfg.get('traceGutterLaneCount', 8)));
  const laneWidth = Math.max(6, Math.min(16, cfg.get('traceGutterLaneWidth', 8)));
  const marginWidth = lanesEnabled ? gutterWidth(laneCount, laneWidth) : 22;

  const { rawSteps, activeEventIndex } = collectInFileTraceSteps(session, editor.document);

  /** @type {Map<number, { stepNumber: number, isActiveStep: boolean }>} */
  const stepByLine = new Map();
  for (const step of rawSteps) {
    stepByLine.set(step.line, {
      stepNumber: step.eventIndex + 1,
      isActiveStep: step.eventIndex === activeEventIndex,
    });
  }

  const lineCount = editor.document.lineCount;
  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];

  for (let line = 0; line < lineCount; line++) {
    const layout = stripLineLayout(line, lineCount, codeLensRows);
    const step = stepByLine.get(line);
    let renderOptions;
    if (step) {
      renderOptions = beforeStripCell(marginWidth, layout, `${step.stepNumber}`, {
        color: step.isActiveStep ? '#e8a838' : '#b8bcc4',
        fontWeight: step.isActiveStep ? 'bold' : 'normal',
      });
    } else {
      renderOptions = beforeStripCell(marginWidth, layout, '\u200b', null);
    }

    decorations.push({
      range: lineDecorationRange(editor.document, line),
      renderOptions,
    });
  }

  return decorations;
}

module.exports = { buildTraceMarginDecorations };
