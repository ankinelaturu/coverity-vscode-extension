'use strict';

class MarkdownString {
  constructor() {
    this.value = '';
    this.isTrusted = false;
    this.supportHtml = false;
  }

  appendMarkdown(part) {
    this.value += part;
  }
}

const workspace = {
  getConfiguration(_section) {
    return {
      get(key, defaultValue) {
        if (key === 'hoverRichTimeline') {
          return defaultValue;
        }
        return defaultValue;
      },
    };
  },
};

module.exports = {
  MarkdownString,
  workspace,
};
