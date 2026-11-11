'use strict';

/**
 * Offline possible-fix strategy smoke tests.
 * Run: node test/possibleFix.test.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const workspaceRoot = path.join(root, '..');
const {
  suggestPossibleFix,
  supportedPossibleFixRules,
} = require('../src/misra/possibleFix');
const { parseMisraMarkdown } = require('../src/misra/misraRules');

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  }
}

const md = fs.readFileSync(
  path.join(root, 'data', 'misra_c_2012_complete_rules_reference.md'),
  'utf8'
);
const rules = parseMisraMarkdown(md);

const strategies = supportedPossibleFixRules();
assert(strategies.length >= 28, `expected >= 28 strategies, got ${strategies.length}`);
console.log('strategies:', strategies.length);

function check(name, checker, text, focusLine, pred) {
  const key = checker.match(/(Rule|Dir) (\d+\.\d+)/);
  const ruleKey = key ? `${key[1]} ${key[2]}` : null;
  const rule = ruleKey ? rules.get(ruleKey) : null;
  const fix = suggestPossibleFix({
    checkerId: checker,
    documentText: text,
    focusLine,
    events: [],
    rule,
  });
  const ok = pred(fix);
  assert(ok, `${name} => ${JSON.stringify(fix && {
    title: fix.title,
    confidence: fix.confidence,
    applyable: fix.applyable,
    referenceOnly: fix.referenceOnly,
    proposed: fix.proposedText,
  })}`);
  if (ok) {
    console.log('OK', name);
  }
}

const fixture = (rel) => fs.readFileSync(path.join(workspaceRoot, rel), 'utf8');

check(
  '15.7 fixture',
  'MISRA C-2012 Rule 15.7, Required',
  fixture('my-repo/interstellar/src/misra_control.c'),
  4,
  (f) => f && f.applyable && f.proposedText.includes('else {')
);
check(
  '11.9 fixture',
  'MISRA C-2012 Rule 11.9, Required',
  fixture('my-repo/interstellar/src/misra_null.c'),
  4,
  (f) => f && f.applyable && f.proposedText.includes('NULL')
);
check(
  '17.7 fixture',
  'MISRA C-2012 Rule 17.7, Required',
  fixture('my-repo/interstellar/src/misra_discard.c'),
  4,
  (f) => f && f.applyable && f.proposedText.includes('(void)printf')
);

const synth = [
  ['7.3', 'long v = 100l;', (t) => t.includes('100L')],
  ['7.1', 'int x = 052;', (t) => t.includes('42')],
  ['7.4', 'char *s = "hi";', (t) => t.includes('const char')],
  ['8.14', 'void f(int * restrict p);', (t) => !t.includes('restrict')],
  ['8.10', 'inline int add(int a,int b){return a+b;}', (t) => t.includes('static inline')],
  ['8.2', 'int calculate();', (t) => t.includes('(void)')],
  ['17.6', 'void fn(int arr[static 5]);', (t) => t.includes('[5]') && !t.includes('static')],
  ['18.4', '*(arr + 2) = 10;', (t) => t.includes('arr[2]')],
  ['20.2', '#include "dir\\file.h"', (t) => t.includes('dir/file')],
  ['20.3', '#include file.h', (t) => t.includes('"file.h"')],
  ['15.6', 'if (flag)\n  do_it();', (t) => t.includes('{') && t.includes('do_it')],
  ['14.4', 'if (status) { }', (t) => t.includes('!= 0')],
  ['4.2', 'int x = 0; /* ??= */', (t) => t.includes('#')],
  ['19.1', 'memcpy(dst, src, n);', (t) => t.includes('memmove')],
  ['20.7', '#define SQR(x) x * x', (t) => t.includes('(x)')],
];

for (const [num, text, pred] of synth) {
  check(
    num,
    `MISRA C-2012 Rule ${num}, Required`,
    text,
    0,
    (f) => f && !f.referenceOnly && f.applyable !== false && pred(f.proposedText)
  );
}

check(
  '16.4 default',
  'MISRA C-2012 Rule 16.4, Required',
  'void f(int v){\n  switch (v) {\n    case 1:\n      break;\n  }\n}\n',
  1,
  (f) => f && f.proposedText.includes('default:')
);

check(
  '18.1 reference-only',
  'MISRA C-2012 Rule 18.1, Required',
  'int a[1]; a[2]=0;',
  0,
  (f) => f && f.referenceOnly === true && f.applyable === false
);

check(
  '15.7 skips else-if keyword',
  'MISRA C-2012 Rule 15.7, Required',
  'void f(int m){\n  if (m==1){\n    return;\n  } else if (m==2){\n    return;\n  }\n  /* if/else-if note */\n}\n',
  1,
  (f) => f && f.applyable && f.proposedText.includes('no other cases')
);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nALL PASS');
