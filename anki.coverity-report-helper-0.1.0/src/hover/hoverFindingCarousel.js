'use strict';

/**
 * Unique findings with a trace step on this editor line (not cursor overlap).
 * Picks the best event per finding on the line (prefers range under cursor, else latest step on line).
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function sortFindingsAtLine(session, document, position) {
  const lineHits = session.getEventsOnLine(document.uri, position.line);
  /** @type {Map<string, { finding: object, eventIndex: number, tracked: object }>} */
  const byFinding = new Map();

  for (const h of lineHits) {
    const id = h.finding.id;
    const existing = byFinding.get(id);
    if (!existing) {
      byFinding.set(id, h);
      continue;
    }
    const curIn = h.tracked.range.contains(position);
    const exIn = existing.tracked.range.contains(position);
    if (curIn && !exIn) {
      byFinding.set(id, h);
    } else if (curIn === exIn && h.eventIndex > existing.eventIndex) {
      byFinding.set(id, h);
    }
  }

  return [...byFinding.values()].sort((a, b) => {
    const idA = String(a.finding.id || '');
    const idB = String(b.finding.id || '');
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
}

function cycleHoverFindingCommandUri(delta) {
  return `command:coverity.cycleHoverFinding?${encodeURIComponent(JSON.stringify([delta]))}`;
}

module.exports = {
  sortFindingsAtLine,
  cycleHoverFindingCommandUri,
};
