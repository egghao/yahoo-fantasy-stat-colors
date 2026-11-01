const test = require('node:test');
const assert = require('node:assert/strict');
const { percentile } = require('../extension/percentile.js');

test('percentile compares a value against the complete eligible population, including ties', () => {
  assert.equal(percentile(2, [1, 2, 2, 4]), 0.5);
  assert.equal(percentile(1, [1, 2, 2, 4]), 0.125);
  assert.equal(percentile(4, [1, 2, 2, 4], true), 0.125);
  assert.equal(percentile(1, []), null);
});
