'use strict';

const vscode = require('vscode');

function registerCodeLens(session) {
  return vscode.languages.registerCodeLensProvider(['c', 'cpp'], {
    provideCodeLenses(document) {
      if (!session.hasReport()) {
        return [];
      }
      if (!vscode.workspace.getConfiguration('coverity').get('codeLensEnabled', true)) {
        return [];
      }
      const hits = session.getEventsForUri(document.uri);
      /** @type {Map<number, object[]>} */
      const byLine = new Map();
      for (const h of hits) {
        const line = h.tracked.range.start.line;
        if (!byLine.has(line)) {
          byLine.set(line, []);
        }
        byLine.get(line).push(h);
      }
      const lenses = [];
      for (const [line, list] of byLine.entries()) {
        if (list.length === 1) {
          const { finding, eventIndex } = list[0];
          const title = finding.checkerId || finding.typeTitle || 'Coverity';
          const text = `${title} · Step ${eventIndex + 1} of ${finding.events.length}`;
          lenses.push(new vscode.CodeLens(new vscode.Range(line, 0, line, 0), {
            command: 'coverity.navigateToStep',
            title: text,
            arguments: [finding.id, eventIndex],
          }));
        } else {
          lenses.push(new vscode.CodeLens(new vscode.Range(line, 0, line, 0), {
            command: 'coverity.filterFindings',
            title: `${list.length} Coverity findings`,
            arguments: [],
          }));
        }
      }
      return lenses;
    },
  });
}

module.exports = { registerCodeLens };
