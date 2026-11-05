#!/usr/bin/env node
'use strict';

/**
 * Write exact hover strings (no wrappers) for a finding from a report file.
 * Usage: node scripts/dump-hover-html.js [report.txt] [cid] [eventIndex]
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const extRoot = path.join(__dirname, '..');
const repoRoot = path.join(extRoot, '..');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'vscode') {
    return path.join(__dirname, 'vscode-mock.js');
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const { parseCoverityTextReport } = require(path.join(extRoot, 'src/parser/textReportParser'));
const { buildTraceTableHtml, buildCoverityHoverMarkdown } = require(path.join(extRoot, 'src/hover/buildHoverMarkdown'));

const reportPath = path.resolve(process.argv[2] || path.join(repoRoot, 'my-repo/deploy/coverity/coverity-report.txt'));
const cidWanted = process.argv[3] || '90001';
const eventIndex = Number(process.argv[4] ?? 1);

const { findings } = parseCoverityTextReport(fs.readFileSync(reportPath, 'utf8'));
const finding = findings.find((f) => String(f.cid || f.localId) === String(cidWanted));
if (!finding) {
  console.error('Finding not found:', cidWanted);
  process.exit(1);
}

const tableHtml = buildTraceTableHtml(finding, eventIndex);
const md = buildCoverityHoverMarkdown(finding, eventIndex);

const outTable = path.join(repoRoot, 'hover-exact-table.html');
const outFull = path.join(repoRoot, 'hover-exact.md');

fs.writeFileSync(outTable, tableHtml, 'utf8');
fs.writeFileSync(outFull, md.value, 'utf8');

console.log('Wrote', outTable);
console.log('Wrote', outFull);
console.log('CID', cidWanted, 'eventIndex', eventIndex, 'events', finding.events.length);
