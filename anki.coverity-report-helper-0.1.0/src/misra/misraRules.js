'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {{
 *   key: string,
 *   kind: 'Rule' | 'Dir',
 *   number: string,
 *   category: string,
 *   heading: string,
 *   description: string,
 *   whyFix: string,
 *   howToFix: string,
 *   example: string,
 *   fixed: string,
 * }} MisraRuleEntry
 */

/** @type {Map<string, MisraRuleEntry> | null} */
let cache = null;
/** @type {string | null} */
let cachePath = null;

/**
 * Extract MISRA Rule/Dir id from a Coverity checkerId / type string.
 * Examples:
 *   "MISRA C-2012 Rule 21.6, Advisory" → { kind: 'Rule', number: '21.6' }
 *   "MISRA C-2012 Dir 4.1, Required" → { kind: 'Dir', number: '4.1' }
 * @param {string | null | undefined} checkerOrTitle
 * @returns {{ kind: 'Rule' | 'Dir', number: string } | null}
 */
function parseMisraCheckerRef(checkerOrTitle) {
  if (!checkerOrTitle) {
    return null;
  }
  const text = String(checkerOrTitle);
  const m = text.match(
    /MISRA\s*C\s*[- ]?\s*2012\s+(Directive|Dir\.?|Rule)\s+(\d+\.\d+)/i
  );
  if (!m) {
    return null;
  }
  const kind = /^dir/i.test(m[1]) ? 'Dir' : 'Rule';
  return { kind, number: m[2] };
}

/**
 * @param {string} markdown
 * @returns {Map<string, MisraRuleEntry>}
 */
function parseMisraMarkdown(markdown) {
  /** @type {Map<string, MisraRuleEntry>} */
  const map = new Map();
  const parts = markdown.split(/(?=^### )/m);
  for (const part of parts) {
    const hm = part.match(/^###\s+((Dir|Rule)\s+(\d+\.\d+))\s*\(([^)]+)\)\s*\n/);
    if (!hm) {
      continue;
    }
    const headingCore = hm[1];
    const kind = /** @type {'Rule' | 'Dir'} */ (hm[2]);
    const number = hm[3];
    const category = hm[4].trim();
    const key = `${kind} ${number}`;

    const body = part.slice(hm[0].length);
    const beforeTable = body.split(/<table>/i)[0] || body;

    const whyM = beforeTable.match(/\*\*Why fix\?\*\*\s*([\s\S]*?)(?=\n\s*\*\*How to fix:|\n\s*<table|\Z)/i);
    const howM = beforeTable.match(/\*\*How to fix:\*\*\s*([\s\S]*?)(?=\n\s*<table|\Z)/i);

    let description = beforeTable;
    if (whyM) {
      description = beforeTable.slice(0, whyM.index);
    } else if (howM) {
      description = beforeTable.slice(0, howM.index);
    }
    description = description.replace(/\n---+\s*$/g, '').trim();

    const blocks = [...body.matchAll(/```(?:c|C)?\n([\s\S]*?)```/g)].map((x) =>
      x[1].replace(/\s+$/, '')
    );

    map.set(key, {
      key,
      kind,
      number,
      category,
      heading: `${headingCore} (${category})`,
      description,
      whyFix: (whyM?.[1] || '').trim(),
      howToFix: (howM?.[1] || '').trim(),
      example: blocks[0] || '',
      fixed: blocks[1] || '',
    });
  }
  return map;
}

/**
 * @param {{ extensionPath: string }} context
 * @returns {string}
 */
function resolveReferencePath(context) {
  const bundled = path.join(context.extensionPath, 'data', 'misra_c_2012_complete_rules_reference.md');
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  // Dev fallback: workspace sibling next to packaged extension folder
  const sibling = path.join(context.extensionPath, '..', 'misra_c_2012_complete_rules_reference.md');
  if (fs.existsSync(sibling)) {
    return sibling;
  }
  return bundled;
}

/**
 * @param {{ extensionPath: string }} context
 * @param {{ force?: boolean }} [opts]
 * @returns {Map<string, MisraRuleEntry>}
 */
function loadMisraRules(context, opts = {}) {
  const filePath = resolveReferencePath(context);
  if (!opts.force && cache && cachePath === filePath) {
    return cache;
  }
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    cache = parseMisraMarkdown(text);
    cachePath = filePath;
  } catch (err) {
    cache = new Map();
    cachePath = filePath;
    console.warn('Coverity: failed to load MISRA reference', err);
  }
  return cache;
}

/**
 * @param {{ extensionPath: string }} context
 * @param {string | null | undefined} checkerId
 * @param {string | null | undefined} typeTitle
 * @returns {MisraRuleEntry | null}
 */
function lookupMisraRule(context, checkerId, typeTitle) {
  const ref =
    parseMisraCheckerRef(checkerId) || parseMisraCheckerRef(typeTitle);
  if (!ref) {
    return null;
  }
  const rules = loadMisraRules(context);
  return rules.get(`${ref.kind} ${ref.number}`) || null;
}

module.exports = {
  parseMisraCheckerRef,
  parseMisraMarkdown,
  loadMisraRules,
  lookupMisraRule,
  resolveReferencePath,
};
