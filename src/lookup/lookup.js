'use strict';

const descriptions = require('./descriptions.json');

/**
 * Offline lookup for friendly checker/event descriptions (not Coverity proprietary text).
 * @param {string | null} checkerId
 * @param {string | null} eventTag
 */
function describe(checkerId, eventTag) {
  const parts = [];
  if (checkerId && descriptions.checkers[checkerId]) {
    parts.push(descriptions.checkers[checkerId]);
  }
  if (eventTag && descriptions.eventTags[eventTag]) {
    parts.push(descriptions.eventTags[eventTag]);
  }
  return parts.join(' ');
}

module.exports = {
  describe,
  descriptions,
};
