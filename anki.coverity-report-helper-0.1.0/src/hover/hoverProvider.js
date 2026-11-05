'use strict';

const vscode = require('vscode');
const { buildCoverityHoverMarkdown } = require('./buildHoverMarkdown');

/**
 * Markdown hover with SVG trace timeline and command links for navigation.
 */
function registerHoverProvider(session) {
  return vscode.languages.registerHoverProvider(['c', 'cpp'], {
    provideHover(document, position) {
      if (!session.hasReport()) {
        return null;
      }
      const hits = session.getEventsForUri(document.uri).filter(({ tracked }) =>
        tracked.range.contains(position)
      );
      if (hits.length === 0) {
        return null;
      }
      const hit = hits.length === 1 ? hits[0] : hits[0];
      const { finding, eventIndex } = hit;
      session.activeFindingId = finding.id;
      session.activeEventIndex = eventIndex;
      const md = buildCoverityHoverMarkdown(finding, eventIndex);
      return new vscode.Hover(md);
    },
  });
}

module.exports = { registerHoverProvider };
