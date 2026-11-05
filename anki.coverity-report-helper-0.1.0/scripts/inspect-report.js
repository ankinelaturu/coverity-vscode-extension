#!/usr/bin/env node
'use strict';

/**
 * Print parser output for a report file (local dev helper, no VS Code required).
 * Usage: node scripts/inspect-report.js path/to/report.txt
 */

const fs = require('fs');
const path = require('path');
const { parseCoverityTextReport } = require('../src/parser/textReportParser');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/inspect-report.js <report.txt>');
  process.exit(1);
}

const text = fs.readFileSync(path.resolve(file), 'utf8');
const result = parseCoverityTextReport(text);
console.log(JSON.stringify({
  findings: result.findings.length,
  warnings: result.warnings.length,
  summary: result.summaryLines,
  findingsBrief: result.findings.map((f) => ({
    id: f.cid || f.localId,
    checkerId: f.checkerId,
    events: f.events.length,
  })),
  warnings: result.warnings,
}, null, 2));
