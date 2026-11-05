'use strict';

const vscode = require('vscode');
const { buildCoverityHoverMarkdown } = require('./buildHoverMarkdown');

/**
 * Resolve which finding/step to show when one or more tracked ranges cover the cursor.
 * @returns {{ finding: object, eventIndex: number, allowStepNav: boolean, ambiguousHits: object[] | null }}
 */
function resolveHoverContext(session, hits) {
  if (hits.length === 0) {
    return null;
  }
  if (hits.length === 1) {
    const { finding, eventIndex } = hits[0];
    return { finding, eventIndex, allowStepNav: true, ambiguousHits: null };
  }

  const activeId = session.activeFindingId;
  const activeHit = hits.find((h) => h.finding.id === activeId);
  if (activeHit) {
    return {
      finding: activeHit.finding,
      eventIndex: activeHit.eventIndex,
      allowStepNav: true,
      ambiguousHits: hits,
    };
  }

  const { finding, eventIndex } = hits[0];
  return { finding, eventIndex, allowStepNav: false, ambiguousHits: hits };
}

function registerHoverProvider(session) {
  return vscode.languages.registerHoverProvider(['c', 'cpp'], {
    provideHover(document, position) {
      if (!session.hasReport()) {
        return null;
      }
      const hits = session.getEventsForUri(document.uri).filter(({ tracked }) =>
        tracked.range.contains(position)
      );
      const ctx = resolveHoverContext(session, hits);
      if (!ctx) {
        return null;
      }
      const md = buildCoverityHoverMarkdown(ctx.finding, ctx.eventIndex, {
        allowStepNav: ctx.allowStepNav,
        ambiguousHits: ctx.ambiguousHits,
        activeFindingId: session.activeFindingId,
      });
      return new vscode.Hover(md);
    },
  });
}

module.exports = { registerHoverProvider, resolveHoverContext };
