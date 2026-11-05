'use strict';

const vscode = require('vscode');
const { buildCoverityHoverMarkdown } = require('./buildHoverMarkdown');
const { sortFindingsAtLine } = require('./hoverFindingCarousel');

/**
 * @returns {{ finding: object, eventIndex: number, findingCarousel: { index: number, total: number } | null }}
 */
function resolveHoverContext(session, document, position) {
  const atCursor = session.getEventsForUri(document.uri).filter(({ tracked }) =>
    tracked.range.contains(position)
  );
  if (atCursor.length === 0) {
    return null;
  }

  const choices = sortFindingsAtLine(session, document, position);
  if (choices.length === 0) {
    return null;
  }

  if (choices.length === 1) {
    const { finding, eventIndex } = choices[0];
    return { finding, eventIndex, findingCarousel: null };
  }

  session.syncHoverFindingCarousel(document.uri.toString(), position.line, choices);
  const pos = session.getHoverFindingCarouselPosition();
  const sel = session.getHoverFindingCarouselSelection();
  const pick = sel
    ? choices.find((c) => c.finding.id === sel.findingId && c.eventIndex === sel.eventIndex) ||
      choices.find((c) => c.finding.id === sel.findingId) ||
      choices[0]
    : choices[0];

  return {
    finding: pick.finding,
    eventIndex: pick.eventIndex,
    findingCarousel: pos,
  };
}

function registerHoverProvider(session) {
  return vscode.languages.registerHoverProvider(['c', 'cpp'], {
    provideHover(document, position) {
      if (!session.hasReport()) {
        return null;
      }
      const ctx = resolveHoverContext(session, document, position);
      if (!ctx) {
        return null;
      }
      const md = buildCoverityHoverMarkdown(ctx.finding, ctx.eventIndex, {
        findingCarousel: ctx.findingCarousel,
      });
      return new vscode.Hover(md);
    },
  });
}

module.exports = { registerHoverProvider, resolveHoverContext };
