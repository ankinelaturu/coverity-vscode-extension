'use strict';

const { resolveLineRuleContext } = require('../codelens/findingsAtLine');

/**
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function sortFindingsAtLine(session, document, position) {
  const ctx = resolveLineRuleContext(session, document.uri, position.line, position);
  if (!ctx) {
    return [];
  }
  return ctx.choices.map(({ finding, eventIndex }) => ({
    finding,
    eventIndex,
    tracked: session.getTracked(finding.id, eventIndex),
  }));
}

module.exports = {
  sortFindingsAtLine,
};
