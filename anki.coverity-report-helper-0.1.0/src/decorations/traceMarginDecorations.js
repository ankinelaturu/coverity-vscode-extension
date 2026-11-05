'use strict';

const vscode = require('vscode');
const {
  buildGutterLaneRowSvg,
  assignTraceLanes,
  gutterWidth,
} = require('./gutterLaneSvg');
const { traceMarginIconUri } = require('./traceMarginIconCache');
const { lineDecorationRange } = require('./editorLineRange');
const { stripLineLayout } = require('./codeLensLayout');

/** Subtle COV column tint (works on dark and light editor backgrounds). */
const STRIP_TINT = 'rgba(72, 82, 102, 0.28)';
const STRIP_TINT_ACTIVE = 'rgba(232, 168, 56, 0.2)';

function beforeStripRow(context, svg, widthPx, layout, backgroundColor) {
  const icon = traceMarginIconUri(context, svg);
  return {
    before: {
      contentIconPath: icon,
      width: `${widthPx}px`,
      height: layout.heightPx,
      margin: '0',
      backgroundColor,
    },
  };
}

function beforeStepRow(stepNumber, active, widthPx, layout) {
  return {
    before: {
      contentText: `${stepNumber}`,
      width: `${widthPx}px`,
      height: layout.heightPx,
      margin: '0',
      color: active ? '#e8a838' : '#b8bcc4',
      fontWeight: active ? 'bold' : 'normal',
      backgroundColor: active ? STRIP_TINT_ACTIVE : STRIP_TINT,
      border: active ? '1px solid rgba(232, 168, 56, 0.45)' : '1px solid rgba(90, 100, 118, 0.2)',
    },
  };
}

/** @typedef {{ spineLanes?: number[], stepNumber?: number, nodeLane?: number, isActiveStep?: boolean, connectFromLane?: number | null }} RowOpts */

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
function buildTraceMarginDecorations(session, editor, context, lanesEnabled, codeLensRows) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  const laneCount = Math.max(1, Math.min(12, cfg.get('traceGutterLaneCount', 8)));
  const laneWidth = Math.max(6, Math.min(16, cfg.get('traceGutterLaneWidth', 8)));
  const marginWidth = lanesEnabled ? gutterWidth(laneCount, laneWidth) : 22;

  const { rawSteps, activeEventIndex } = collectInFileTraceSteps(session, editor.document);
  const steps = assignTraceLanes(rawSteps, laneCount);

  /** @type {Map<number, RowOpts>} */
  const rowByLine = new Map();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prev = i > 0 ? steps[i - 1] : null;

    if (prev && prev.line < step.line - 1) {
      const spineLanes = [prev.lane, step.lane];
      for (let line = prev.line + 1; line < step.line; line++) {
        rowByLine.set(line, { spineLanes });
      }
    }

    rowByLine.set(step.line, {
      spineLanes: prev ? [prev.lane, step.lane] : [step.lane],
      stepNumber: step.eventIndex + 1,
      nodeLane: step.lane,
      isActiveStep: step.eventIndex === activeEventIndex,
      connectFromLane: prev ? prev.lane : null,
    });
  }

  const lineCount = editor.document.lineCount;
  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];

  for (let line = 0; line < lineCount; line++) {
    const row = rowByLine.get(line);
    const layout = stripLineLayout(line, lineCount, codeLensRows);
    const isActiveStep = row?.isActiveStep ?? false;
    const fillColor = isActiveStep && row?.stepNumber != null ? STRIP_TINT_ACTIVE : STRIP_TINT;

    let renderOptions;
    if (row?.stepNumber != null) {
      renderOptions = beforeStepRow(row.stepNumber, isActiveStep, marginWidth, layout);
    } else if (lanesEnabled) {
      const spineLanes = row?.spineLanes || [];
      const svg = buildGutterLaneRowSvg({ laneCount, laneWidth, spineLanes });
      renderOptions = beforeStripRow(context, svg, marginWidth, layout, fillColor);
    } else {
      const svg = buildGutterLaneRowSvg({ laneCount: 1, laneWidth: marginWidth, spineLanes: [] });
      renderOptions = beforeStripRow(context, svg, marginWidth, layout, fillColor);
    }

    decorations.push({
      range: lineDecorationRange(editor.document, line),
      renderOptions,
    });
  }

  return decorations;
}

module.exports = { buildTraceMarginDecorations };
