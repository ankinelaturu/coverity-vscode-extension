'use strict';

const vscode = require('vscode');

/**
 * Status bar summary after a report is loaded (finding + warning counts).
 */
function registerReportStatusBar(session) {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  item.command = 'coverity.showParseOutput';
  item.tooltip = 'Coverity report loaded — click for parse details';

  function refresh() {
    if (!session.hasReport() || !session.parsed) {
      item.hide();
      return;
    }
    const n = session.parsed.findings.length;
    const w = session.parsed.warnings.length;
    item.text = `$(shield) Coverity: ${n} finding${n === 1 ? '' : 's'}`;
    const typeFilter = session.getProblemsCheckerFilter();
    if (typeFilter) {
      item.text += ` · $(filter) ${typeFilter}`;
    }
    if (w > 0) {
      item.text += ` · ${w} parse warning${w === 1 ? '' : 's'}`;
    }
    item.tooltip = typeFilter
      ? `Coverity report loaded — Problems filtered to ${typeFilter}. Click for parse details.`
      : 'Coverity report loaded — click for parse details';
    item.show();
  }

  session.onDidChange(refresh);
  refresh();
  return item;
}

module.exports = { registerReportStatusBar };
