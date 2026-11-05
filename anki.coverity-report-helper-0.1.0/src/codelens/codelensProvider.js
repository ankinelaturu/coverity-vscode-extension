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
        const range = new vscode.Range(line, 0, line, 0);
        const peekFinding = list[0].finding;
        const peekStep = list[0].eventIndex;
        lenses.push(
          new vscode.CodeLens(range, {
            command: 'coverity.showTracePeek',
            title: 'Full Trace',
            arguments: [peekFinding.id, peekStep],
          })
        );
        if (list.length > 1) {
          lenses.push(
            new vscode.CodeLens(range, {
              command: 'coverity.chooseFindingsAtLine',
              title: `${list.length} Coverity findings`,
              arguments: [document.uri.toString(), line],
            })
          );
          continue;
        }

        const { finding, eventIndex } = list[0];
        const checker = finding.checkerId || finding.typeTitle || 'Coverity';
        const title = finding.typeTitle || checker;
        const contextTitle = `${title} · Step ${eventIndex + 1} of ${finding.events.length}`;
        lenses.push(
          new vscode.CodeLens(range, {
            command: 'coverity.navigateToStep',
            title: contextTitle,
            arguments: [finding.id, eventIndex],
          })
        );
        if (eventIndex > 0) {
          lenses.push(
            new vscode.CodeLens(range, {
              command: 'coverity.traceStepRelative',
              title: '← Prev step',
              arguments: [finding.id, eventIndex, -1],
            })
          );
        }
        if (eventIndex < finding.events.length - 1) {
          lenses.push(
            new vscode.CodeLens(range, {
              command: 'coverity.traceStepRelative',
              title: 'Next step →',
              arguments: [finding.id, eventIndex, 1],
            })
          );
        }
      }
      return lenses;
    },
  });
}

module.exports = { registerCodeLens };
