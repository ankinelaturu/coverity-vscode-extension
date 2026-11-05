'use strict';

const vscode = require('vscode');
const { buildGutterLaneRowSvg, assignTraceLanes } = require('./gutterLaneSvg');
const { gutterIconUriForSvg } = require('./gutterIconCache');
const { lineDecorationRange } = require('./editorLineRange');

/**
 * Build per-line gutter decorations for the active finding (multi-lane fixed width).
 * @param {object} session
 * @param {vscode.TextEditor} editor
 * @param {vscode.ExtensionContext} context
 * @returns {vscode.DecorationOptions[]}
 */
function buildTraceLaneGutterDecorations(session, editor, context) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  const laneCount = Math.max(1, Math.min(12, cfg.get('traceGutterLaneCount', 8)));
  const laneWidth = Math.max(6, Math.min(16, cfg.get('traceGutterLaneWidth', 8)));

  session.ensureActiveFindingForUri(editor.document.uri);

  const findingId = session.activeFindingId;
  if (!findingId) {
    return [];
  }
  const finding = session.getFinding(findingId);
  if (!finding) {
    return [];
  }

  const docStr = editor.document.uri.toString();
  /** @type {{ eventIndex: number, line: number }[]} */
  const rawSteps = [];
  for (let ei = 0; ei < finding.events.length; ei++) {
    const t = session.getTracked(finding.id, ei);
    if (!t?.uri || t.uri.toString() !== docStr || !t.range) {
      continue;
    }
    rawSteps.push({ eventIndex: ei, line: t.range.start.line });
  }
  if (rawSteps.length === 0) {
    return [];
  }

  rawSteps.sort((a, b) => a.eventIndex - b.eventIndex);
  const steps = assignTraceLanes(rawSteps, laneCount);
  const activeEventIndex = session.activeEventIndex;

  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];

  function pushRow(line, svgOpts) {
    const svg = buildGutterLaneRowSvg({ laneCount, laneWidth, ...svgOpts });
    const range = lineDecorationRange(editor.document, line);
    const iconUri = gutterIconUriForSvg(context, svg);
    decorations.push({
      range,
      renderOptions: {
        gutterIconPath: { light: iconUri, dark: iconUri },
        gutterIconSize: 'contain',
      },
    });
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prev = i > 0 ? steps[i - 1] : null;

    if (prev && prev.line < step.line - 1) {
      const spineLanes = [prev.lane, step.lane];
      for (let line = prev.line + 1; line < step.line; line++) {
        pushRow(line, { spineLanes });
      }
    }

    pushRow(step.line, {
      spineLanes: prev ? [prev.lane, step.lane] : [step.lane],
      stepNumber: step.eventIndex + 1,
      nodeLane: step.lane,
      isActiveStep: step.eventIndex === activeEventIndex,
      connectFromLane: prev ? prev.lane : null,
    });
  }

  return decorations;
}

module.exports = { buildTraceLaneGutterDecorations };
