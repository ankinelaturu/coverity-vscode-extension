'use strict';

const vscode = require('vscode');
const { DIAGNOSTIC_SOURCE } = require('../state/reportSession');
const { mainEventIndex } = require('../model/stepDisplay');
const { listFindingsOnLine } = require('../codelens/findingsAtLine');

/**
 * @param {object} session
 * @param {import('vscode').Uri} uri
 * @param {number} line
 * @param {string} findingId
 */
function rememberLineFinding(session, uri, line, findingId) {
  session.setLineFindingMemory(uri, line, findingId);
}

/**
 * @param {object} session
 * @param {string} findingId
 * @param {number} eventIndex
 */
function applyNavigationTarget(session, findingId, eventIndex) {
  session.activeFindingId = findingId;
  session.activeEventIndex = eventIndex;
  const tracked = session.getTracked(findingId, eventIndex);
  if (tracked?.uri && tracked.range) {
    rememberLineFinding(session, tracked.uri, tracked.range.start.line, findingId);
  }
  session.fireChange();
}

/**
 * Match Coverity diagnostic on this line → finding (main = last root step).
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {number} line
 * @param {import('vscode').Position} position
 */
function matchDiagnosticFinding(session, document, line) {
  const all = vscode.languages.getDiagnostics(document.uri);
  for (const d of all) {
    if (d.source !== DIAGNOSTIC_SOURCE) {
      continue;
    }
    if (d.range.start.line > line || line > d.range.end.line) {
      continue;
    }
    if (!session.indexes) {
      continue;
    }
    for (const finding of session.indexes.findings) {
      const mainEi = mainEventIndex(finding);
      if (mainEi < 0) {
        continue;
      }
      const t = session.getTracked(finding.id, mainEi);
      if (!t?.uri || t.uri.toString() !== document.uri.toString() || !t.range) {
        continue;
      }
      if (t.range.intersection(d.range) || t.range.contains(d.range.start)) {
        return { findingId: finding.id, eventIndex: mainEi };
      }
    }
  }
  return null;
}

/**
 * Caret landed without navigateToStep — align active rule with Problems / overlap.
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function syncEditorNavigationContext(session, document, position) {
  if (!session.hasReport()) {
    return;
  }
  const line = position.line;
  const choices = listFindingsOnLine(session, document.uri, line);
  if (choices.length === 0) {
    return;
  }

  const diagHit = matchDiagnosticFinding(session, document, line);
  if (diagHit) {
    if (
      session.activeFindingId === diagHit.findingId &&
      session.activeEventIndex === diagHit.eventIndex
    ) {
      rememberLineFinding(session, document.uri, line, diagHit.findingId);
      return;
    }
    applyNavigationTarget(session, diagHit.findingId, diagHit.eventIndex);
    return;
  }

  const atCursor = session
    .getEventsForUri(document.uri)
    .filter(({ tracked }) => tracked.range.contains(position) && tracked.range.start.line === line);

  if (atCursor.length) {
    let pick = atCursor.find((h) => h.finding.id === session.activeFindingId);
    if (!pick) {
      const byFinding = new Map();
      for (const h of atCursor) {
        const id = h.finding.id;
        const prev = byFinding.get(id);
        if (!prev || h.eventIndex > prev.eventIndex) {
          byFinding.set(id, h);
        }
      }
      if (session.activeFindingId && byFinding.has(session.activeFindingId)) {
        pick = byFinding.get(session.activeFindingId);
      } else if (byFinding.size === 1) {
        pick = [...byFinding.values()][0];
      } else {
        const remembered = session.getLineFindingMemory(document.uri, line);
        if (remembered && byFinding.has(remembered)) {
          pick = byFinding.get(remembered);
        } else {
          pick = atCursor[0];
        }
      }
    }
    if (
      session.activeFindingId === pick.finding.id &&
      session.activeEventIndex === pick.eventIndex
    ) {
      rememberLineFinding(session, document.uri, line, pick.finding.id);
      return;
    }
    applyNavigationTarget(session, pick.finding.id, pick.eventIndex);
    return;
  }

  const remembered = session.getLineFindingMemory(document.uri, line);
  if (remembered) {
    const choice = choices.find((c) => c.finding.id === remembered);
    if (
      choice &&
      session.activeFindingId === choice.finding.id &&
      session.activeEventIndex === choice.eventIndex
    ) {
      return;
    }
    if (choice) {
      applyNavigationTarget(session, choice.finding.id, choice.eventIndex);
      return;
    }
  }
}

module.exports = {
  applyNavigationTarget,
  rememberLineFinding,
  syncEditorNavigationContext,
  matchDiagnosticFinding,
};
