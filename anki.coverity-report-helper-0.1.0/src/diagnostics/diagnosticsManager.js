'use strict';

const vscode = require('vscode');

class DiagnosticsManager {
  constructor(session) {
    this.session = session;
    this.collection = vscode.languages.createDiagnosticCollection('coverityReport');
    session.onDidChange(() => this.publish());
  }

  publish() {
    this.collection.clear();
    if (!this.session.hasReport()) {
      return;
    }
    const grouped = this.session.collectDiagnostics();
    for (const [uriStr, diags] of grouped.entries()) {
      this.collection.set(vscode.Uri.parse(uriStr), diags);
    }
  }

  dispose() {
    this.collection.dispose();
  }
}

module.exports = { DiagnosticsManager };
