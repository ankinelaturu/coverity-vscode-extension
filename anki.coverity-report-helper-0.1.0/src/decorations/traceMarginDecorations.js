'use strict';

const vscode = require('vscode');
const { gutterWidth } = require('./gutterLaneSvg');
const { lineDecorationRange } = require('./editorLineRange');
const { stripLineLayout } = require('./codeLensLayout');
const { buildStripTraceRowText, computeStripTraceRowSpecs } = require('./stripTraceRowSvg');

/**
 * One `before` per line (dual decoration types stacked horizontally and hid step labels in Cursor).
 */
function beforeStripCell(widthPx, layout, contentText, textStyle) {
  const before = {
    contentText,
    width: `${widthPx}px`,
    height: layout.heightPx,
    margin: '0',
    backgroundColor: new vscode.ThemeColor('editor.background'),
  };
  if (textStyle) {
    before.color = textStyle.color;
    before.fontWeight = textStyle.fontWeight;
    if (textStyle.fontFamily) {
      before.fontFamily = textStyle.fontFamily;
    }
  }
  return { before };
}

/** Figure spaces — Cursor trims normal spaces; fixed width keeps the strip px size unchanged. */
const STRIP_PAD = '\u2007';

/**
 * @example in-file ordinals 1–4 → "1□□□", "□2□□", "□□3□", "□□□4" (□ = figure space)
 */
function formatStepInStrip(stepNumber, inFileOrdinal, fieldChars) {
  const num = String(stepNumber);
  const lead = Math.max(0, inFileOrdinal - 1);
  const trail = Math.max(0, fieldChars - lead - num.length);
  return STRIP_PAD.repeat(lead) + num + STRIP_PAD.repeat(trail);
}

function stripLabelFieldChars(rawSteps, marginWidthPx) {
  if (rawSteps.length === 0) {
    return 1;
  }
  const maxNumLen = Math.max(...rawSteps.map((s) => String(s.eventIndex + 1).length));
  const minChars = rawSteps.length - 1 + maxNumLen;
  const widthChars = Math.floor(marginWidthPx / 7);
  return Math.max(minChars, widthChars);
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
  const connectorsEnabled = cfg.get('traceStripConnectors', false);

  const { rawSteps, activeEventIndex } = collectInFileTraceSteps(session, editor.document);
  const labelFieldChars = stripLabelFieldChars(rawSteps, marginWidth);
  const rowSpecs =
    connectorsEnabled && rawSteps.length > 0 ? computeStripTraceRowSpecs(rawSteps) : null;

  /** @type {Map<number, { stepNumber: number, inFileOrdinal: number, isActiveStep: boolean }>} */
  const stepByLine = new Map();
  for (let i = 0; i < rawSteps.length; i++) {
    const step = rawSteps[i];
    stepByLine.set(step.line, {
      stepNumber: step.eventIndex + 1,
      inFileOrdinal: i + 1,
      isActiveStep: step.eventIndex === activeEventIndex,
    });
  }

  if (rowSpecs) {
    for (const spec of rowSpecs.values()) {
      for (const st of spec.steps) {
        const hit = rawSteps[st.column];
        st.isActive = hit != null && hit.eventIndex === activeEventIndex;
      }
    }
  }

  const lineCount = editor.document.lineCount;
  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];

  for (let line = 0; line < lineCount; line++) {
    const layout = stripLineLayout(line, lineCount, codeLensRows);
    const step = stepByLine.get(line);
    const traceRow = rowSpecs?.get(line);
    let renderOptions;

    if (traceRow) {
      const rowActive = traceRow.steps.some((s) => s.isActive);
      renderOptions = beforeStripCell(
        marginWidth,
        layout,
        buildStripTraceRowText(traceRow, labelFieldChars),
        {
          color: rowActive ? '#e8a838' : '#b8bcc4',
          fontWeight: rowActive ? 'bold' : 'normal',
          fontFamily: 'monospace',
        }
      );
    } else if (step) {
      renderOptions = beforeStripCell(
        marginWidth,
        layout,
        formatStepInStrip(step.stepNumber, step.inFileOrdinal, labelFieldChars),
        {
          color: step.isActiveStep ? '#e8a838' : '#b8bcc4',
          fontWeight: step.isActiveStep ? 'bold' : 'normal',
          fontFamily: 'monospace',
        }
      );
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
