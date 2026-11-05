'use strict';

const vscode = require('vscode');
/**
 * Markdown hover with step context and command links for trace navigation.
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
      const ev = finding.events[eventIndex];
      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      md.supportHtml = false;

      const checker = finding.checkerId || 'Unknown';
      const title = finding.typeTitle || checker;
      md.appendMarkdown(`**${escapeMd(title)}** (\`${escapeMd(checker)}\`)\n\n`);
      if (ev.rawPayload) {
        md.appendMarkdown('```\n' + ev.rawPayload + '\n```\n\n');
      }

      md.appendMarkdown('**Trace**\n');
      for (let i = 0; i < finding.events.length; i++) {
        const step = finding.events[i];
        const prefix = i === eventIndex ? '**→ ' : '';
        const suffix = i === eventIndex ? ' (current)**' : '';
        const link = `[${step.stepNumber || i + 1}. ${step.label}](command:coverity.navigateToStep?${encodeURIComponent(JSON.stringify([finding.id, i]))})`;
        md.appendMarkdown(`${prefix}${link}${suffix} — \`${escapeMd(step.location.rawPath)}:${step.location.line}\`\n`);
      }

      if (eventIndex > 0) {
        md.appendMarkdown(`\n[← Previous step](command:coverity.previousTraceStep)`);
      }
      if (eventIndex < finding.events.length - 1) {
        md.appendMarkdown(` · [Next step →](command:coverity.nextTraceStep)`);
      }

      return new vscode.Hover(md);
    },
  });
}

function escapeMd(s) {
  return String(s || '').replace(/([\\`*_[\]])/g, '\\$1');
}

module.exports = { registerHoverProvider };
