'use strict';

const vscode = require('vscode');
const { buildCoverityHoverMarkdown } = require('./buildHoverMarkdown');

/**
 * @returns {{ finding: object, eventIndex: number } | null}
 */
function resolveHoverContext(session, document, position) {
  const line = position.line;
  const onLine = session
    .getEventsForUri(document.uri)
    .filter(({ tracked }) => tracked.range.start.line === line);
  if (onLine.length === 0) {
    return null;
  }

  const ctx = session.resolveLineRuleContext(document.uri, line, position);
  if (!ctx) {
    return null;
  }

  return { finding: ctx.finding, eventIndex: ctx.eventIndex };
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
      const md = buildCoverityHoverMarkdown(ctx.finding, ctx.eventIndex);
      return new vscode.Hover(md);
    },
  });
}

module.exports = { registerHoverProvider, resolveHoverContext };
