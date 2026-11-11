'use strict';

const { parseMisraCheckerRef } = require('./misraRules');
const { makeFix } = require('./possibleFixHelpers');
const { STRATEGIES } = require('./possibleFixStrategies');

/**
 * @typedef {{
 *   ruleKey: string,
 *   confidence: 'high' | 'medium' | 'low',
 *   title: string,
 *   rationale: string,
 *   startOffset: number,
 *   endOffset: number,
 *   originalText: string,
 *   proposedText: string,
 *   applyable: boolean,
 *   referenceOnly?: boolean,
 * }} PossibleFixSuggestion
 */

/**
 * When no local rewrite applies, show the MISRA reference Example|Fixed as a pattern.
 * Never auto-applied.
 * @param {string} ruleKey
 * @param {import('./misraRules').MisraRuleEntry} rule
 * @returns {PossibleFixSuggestion | null}
 */
function referencePatternFallback(ruleKey, rule) {
  if (!rule) {
    return null;
  }
  const originalText = String(rule.example || '').trim();
  const proposedText = String(rule.fixed || '').trim();
  if (!originalText && !proposedText) {
    return null;
  }
  return makeFix({
    ruleKey,
    confidence: 'low',
    title: 'Reference pattern (not applied to your code)',
    rationale:
      (rule.howToFix || '').trim() ||
      'No safe offline rewrite for this finding yet. Follow the reference Fixed pattern and How to fix guidance.',
    startOffset: 0,
    endOffset: 0,
    originalText: originalText || '/* (no example) */',
    proposedText: proposedText || originalText || '/* (no fixed sample) */',
    applyable: false,
    referenceOnly: true,
  });
}

/**
 * @param {object} opts
 * @param {string} [opts.checkerId]
 * @param {string} [opts.typeTitle]
 * @param {string} [opts.documentText]
 * @param {number} [opts.focusLine] 0-based
 * @param {Array<{ label?: string, rawPayload?: string }>} [opts.events]
 * @param {import('./misraRules').MisraRuleEntry | null} [opts.rule]
 * @returns {PossibleFixSuggestion | null}
 */
function suggestPossibleFix(opts) {
  const ref =
    parseMisraCheckerRef(opts.checkerId) || parseMisraCheckerRef(opts.typeTitle);
  if (!ref) {
    return null;
  }
  const ruleKey = `${ref.kind} ${ref.number}`;
  const events = opts.events || [];
  const payloads = events
    .map((e) => [e.label, e.rawPayload].filter(Boolean).join(' '))
    .join('\n');

  const ctx = {
    text: opts.documentText || '',
    focusLine: Math.max(0, opts.focusLine | 0),
    payload: payloads,
    events,
    rule: opts.rule || null,
  };

  const strategy = STRATEGIES[ruleKey];
  if (strategy && ctx.text) {
    try {
      const hit = strategy(ctx);
      if (hit) {
        return hit;
      }
    } catch (err) {
      console.warn('Coverity: possible-fix strategy failed for', ruleKey, err);
    }
  }

  // Fallback for every MISRA Rule/Dir that has reference samples.
  return referencePatternFallback(ruleKey, opts.rule);
}

/**
 * Rules with a dedicated local rewrite strategy.
 */
function supportedPossibleFixRules() {
  return Object.keys(STRATEGIES).sort();
}

module.exports = {
  suggestPossibleFix,
  supportedPossibleFixRules,
  referencePatternFallback,
  // re-exports used by tests / actions
  parseIfChain: require('./possibleFixHelpers').parseIfChain,
  matchBrace: require('./possibleFixHelpers').matchBrace,
  offsetOfLine: require('./possibleFixHelpers').offsetOfLine,
  lineAtOffset: require('./possibleFixHelpers').lineAtOffset,
  suggestRule157: require('./possibleFixStrategies').suggestRule157,
  suggestRule119: require('./possibleFixStrategies').suggestRule119,
  suggestRule177: require('./possibleFixStrategies').suggestRule177,
};
