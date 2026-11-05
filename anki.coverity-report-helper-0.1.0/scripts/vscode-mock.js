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

module.exports = { MarkdownString };
