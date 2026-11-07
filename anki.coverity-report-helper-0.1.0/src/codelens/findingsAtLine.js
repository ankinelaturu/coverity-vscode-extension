'use strict';

/**
 * @param {object} finding
 * @returns {string}
 */
function findingDisplayName(finding) {
  const checker = finding.checkerId || 'Unknown';
  return finding.typeTitle || checker;
}

/**
 * @param {object} session
 * @param {import('vscode').Uri} uri
 * @param {number} line 0-based
 * @returns {{ finding: object, eventIndex: number }[]}
 */
function listFindingsOnLine(session, uri, line) {
  if (!session.indexes) {
    return [];
  }
  const checkerFilter = session.getProblemsCheckerFilter();
  const uriStr = uri.toString();
  /** @type {Map<string, { finding: object, eventIndex: number }>} */
  const byFinding = new Map();

  for (const finding of session.indexes.findings) {
    if (checkerFilter && (finding.checkerId || 'Unknown') !== checkerFilter) {
      continue;
    }
    for (let ei = 0; ei < finding.events.length; ei++) {
      const t = session.getTracked(finding.id, ei);
      if (!t?.uri || t.uri.toString() !== uriStr || !t.range) {
        continue;
      }
      if (t.range.start.line !== line) {
        continue;
      }
      const id = finding.id;
      const prev = byFinding.get(id);
      if (!prev || ei > prev.eventIndex) {
        byFinding.set(id, { finding, eventIndex: ei });
      }
    }
  }

  return [...byFinding.values()].sort((a, b) => {
    const na = findingDisplayName(a.finding);
    const nb = findingDisplayName(b.finding);
    const byName = na.localeCompare(nb, undefined, { sensitivity: 'base' });
    if (byName !== 0) {
      return byName;
    }
    return String(a.finding.id).localeCompare(String(b.finding.id), undefined, { numeric: true });
  });
}

/**
 * @param {object} session
 * @param {import('vscode').Uri} uri
 * @param {number} line
 * @param {import('vscode').Position} [position]
 * @returns {{ finding: object, eventIndex: number, choices: { finding: object, eventIndex: number }[], ruleIndex: number } | null}
 */
function resolveLineRuleContext(session, uri, line, position) {
  const choices = listFindingsOnLine(session, uri, line);
  if (choices.length === 0) {
    return null;
  }

  let ruleIndex = -1;
  const remembered = session.getLineFindingMemory(uri, line);
  if (remembered) {
    ruleIndex = choices.findIndex((c) => c.finding.id === remembered);
  }

  if (ruleIndex < 0 && position) {
    const atCursor = session
      .getEventsForUri(uri)
      .filter(({ tracked }) => tracked.range.contains(position) && tracked.range.start.line === line);
    if (atCursor.length) {
      const byFinding = new Map();
      for (const h of atCursor) {
        const id = h.finding.id;
        const prev = byFinding.get(id);
        if (!prev || h.eventIndex > prev.eventIndex) {
          byFinding.set(id, h);
        }
      }
      if (session.activeFindingId && byFinding.has(session.activeFindingId)) {
        ruleIndex = choices.findIndex((c) => c.finding.id === session.activeFindingId);
      } else if (byFinding.size === 1) {
        const only = [...byFinding.values()][0];
        ruleIndex = choices.findIndex((c) => c.finding.id === only.finding.id);
      }
    }
  }

  if (ruleIndex < 0 && session.activeFindingId) {
    ruleIndex = choices.findIndex((c) => c.finding.id === session.activeFindingId);
  }
  if (ruleIndex < 0) {
    ruleIndex = 0;
  }

  const { finding, eventIndex } = choices[ruleIndex];
  return { finding, eventIndex, choices, ruleIndex };
}

module.exports = {
  findingDisplayName,
  listFindingsOnLine,
  resolveLineRuleContext,
};
