'use strict';

/**
 * Parses cov-format-errors multiline text (Type: + location/event trace blocks).
 * All format-specific rules live in this module — see docs/PARSER_FORMAT.md.
 */

/** Parsed report + finding object schema revision (see docs/PARSER_FORMAT.md). */
const SCHEMA_VERSION = 1;

/** Example: `  Type: Explicit null dereferenced (FORWARD_NULL)` */
const TYPE_LINE_RE = /^\s*Type:\s*(.+)\s+\((.+)\)\s*$/;

/** Example: `  1. returned_null: Reader *reader = get_reader();` */
const NUMBERED_EVENT_RE = /^\s*(\d+)\.\s+([^:]+):\s*(.*)$/;

const META_CLASSIFICATION_RE = /^\s*Classification:\s*(.*)\s*$/;
const META_SEVERITY_RE = /^\s*Severity:\s*(.*)\s*$/;

const CID_SUFFIX_RE = /:\s*CID\s+(\d+)\s+\(#\d+\s+of\s+\d+\):\s*$/;

/**
 * @param {string} text Full report file contents
 * @returns {{ schemaVersion: number, summaryLines: string[], findings: object[], warnings: object[], rawLineCount: number }}
 */
function parseCoverityTextReport(text) {
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = normalized.split(/\r?\n/);
  const summaryLines = [];
  const warnings = [];
  const findings = [];

  /** @type {object | null} */
  let finding = null;
  /** @type {object | null} */
  let pendingLocation = null;
  let blockStartLine = 0;

  function flushFinding(endLine) {
    if (!finding) {
      return;
    }
    if (finding.events.length === 0 && !finding.checkerId && !finding.typeTitle) {
      warnings.push({
        line: blockStartLine,
        message: 'Empty finding block discarded',
      });
      finding = null;
      pendingLocation = null;
      return;
    }
    finding.rawBlock = { startLine: blockStartLine, endLine: endLine };
    finding.id = finding.cid || finding.localId;
    findings.push(finding);
    finding = null;
    pendingLocation = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    if (isBlankLine(line)) {
      // cov-format-errors often inserts a blank line after Severity before the trace;
      // only end the finding once at least one event has been collected.
      if (finding && finding.events.length > 0) {
        flushFinding(lineNum - 1);
      }
      continue;
    }

    const typeMeta = parseTypeLine(line);
    if (typeMeta) {
      if (!finding) {
        finding = createFinding(findings.length, blockStartLine || lineNum);
        blockStartLine = blockStartLine || lineNum;
      }
      finding.typeTitle = typeMeta.title;
      finding.checkerId = typeMeta.checkerId;
      continue;
    }

    const classification = parseMetaLine(line, META_CLASSIFICATION_RE);
    if (classification !== null) {
      if (finding) {
        finding.classification = classification;
      }
      continue;
    }

    const severity = parseMetaLine(line, META_SEVERITY_RE);
    if (severity !== null) {
      if (finding) {
        finding.severity = severity;
      }
      continue;
    }

    const location = parseLocationLine(line);
    if (location) {
      const startsNewOccurrence = Boolean(location.cid) || !finding;

      if (startsNewOccurrence) {
        flushFinding(lineNum - 1);
        finding = createFinding(findings.length, lineNum);
        blockStartLine = lineNum;
        finding.headerLocation = location;
        if (location.cid) {
          finding.cid = location.cid;
        }
        pendingLocation = null;
      } else {
        pendingLocation = location;
      }
      continue;
    }

    const numbered = parseNumberedEventLine(line);
    if (numbered) {
      if (!finding) {
        finding = createFinding(findings.length, lineNum);
        blockStartLine = lineNum;
      }
      const loc = pendingLocation || finding.headerLocation;
      if (!loc) {
        warnings.push({ line: lineNum, message: 'Event line without preceding location' });
        continue;
      }
      finding.events.push(buildEvent(finding.events.length, numbered, loc));
      pendingLocation = null;
      continue;
    }

    if (looksLikeSummaryLine(line, lineNum === 1)) {
      summaryLines.push(line.trim());
      continue;
    }

    warnings.push({ line: lineNum, message: `Unrecognized line: ${line.trim().slice(0, 120)}` });
  }

  flushFinding(lines.length);

  return {
    schemaVersion: SCHEMA_VERSION,
    summaryLines,
    findings,
    warnings,
    rawLineCount: lines.length,
  };
}

function isBlankLine(line) {
  return line.trim() === '';
}

function looksLikeSummaryLine(line, isFirst) {
  const t = line.trim();
  if (isFirst && /^Detected\s+\d+/i.test(t)) {
    return true;
  }
  if (/^Coverity report summary/i.test(t)) {
    return true;
  }
  return false;
}

/**
 * @param {string} line
 * @returns {{ rawPath: string, line: number, column: number, cid?: string } | null}
 */
function parseLocationLine(line) {
  let s = line.trim();
  if (!s) {
    return null;
  }

  let cid;
  const cidMatch = s.match(CID_SUFFIX_RE);
  if (cidMatch) {
    cid = cidMatch[1];
    s = s.slice(0, cidMatch.index);
  }

  if (s.endsWith(':')) {
    s = s.slice(0, -1);
  }

  const parsed = parsePathLineColumn(s);
  if (!parsed) {
    return null;
  }

  if (cid) {
    parsed.cid = cid;
  }
  return parsed;
}

/**
 * Split `path:line:column` from the right so Windows drive letters work.
 * @param {string} s
 */
function parsePathLineColumn(s) {
  const parts = s.split(':');
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.pop(), 10);
  const line = parseInt(parts.pop(), 10);
  if (Number.isNaN(column) || Number.isNaN(line)) {
    return null;
  }
  let rawPath = parts.join(':');
  if (parts.length >= 2 && parts[0].length === 1 && /^[A-Za-z]$/.test(parts[0])) {
    rawPath = `${parts[0]}:${parts.slice(1).join(':')}`;
  }
  if (!rawPath) {
    return null;
  }
  return { rawPath, line, column };
}

/**
 * @param {string} line
 * @returns {{ title: string, checkerId: string } | null}
 */
function parseTypeLine(line) {
  const m = line.match(TYPE_LINE_RE);
  if (!m) {
    return null;
  }
  return { title: m[1].trim(), checkerId: m[2].trim() };
}

/**
 * @param {string} line
 * @param {RegExp} re
 * @returns {string | null}
 */
function parseMetaLine(line, re) {
  const m = line.match(re);
  if (!m) {
    return null;
  }
  return m[1].trim();
}

/**
 * @param {string} line
 * @returns {{ stepNumber: number, label: string, rawPayload: string } | null}
 */
function parseNumberedEventLine(line) {
  const m = line.match(NUMBERED_EVENT_RE);
  if (!m) {
    return null;
  }
  return {
    stepNumber: parseInt(m[1], 10),
    label: m[2].trim(),
    rawPayload: m[3],
  };
}

function createFinding(index, startLine) {
  return {
    localId: `finding-${index + 1}`,
    cid: null,
    id: null,
    typeTitle: null,
    checkerId: null,
    classification: null,
    severity: null,
    headerLocation: null,
    events: [],
    rawBlock: { startLine, endLine: startLine },
  };
}

function buildEvent(index, numbered, location) {
  return {
    index,
    stepNumber: numbered.stepNumber,
    label: numbered.label,
    rawPayload: numbered.rawPayload,
    location: {
      rawPath: location.rawPath,
      line: location.line,
      column: location.column,
    },
  };
}

/**
 * Stable fingerprint for report identity (simple hash of normalized text).
 * @param {string} text
 */
function fingerprintReportText(text) {
  let h = 2166136261;
  const s = text.replace(/\r\n/g, '\n');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

module.exports = {
  SCHEMA_VERSION,
  parseCoverityTextReport,
  fingerprintReportText,
  parseLocationLine,
  parseTypeLine,
};
