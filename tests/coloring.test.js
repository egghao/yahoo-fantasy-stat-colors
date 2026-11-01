const test = require('node:test');
const assert = require('node:assert/strict');
const {parseStat, eligiblePlayers, categoryDirection, colorForPercentile} = require('../extension/coloring.js');

test('numeric statistics include percentages and minutes but exclude missing and composite values', () => {
  assert.equal(parseStat('28:30'), 28.5);
  assert.equal(parseStat('.571'), 0.571);
  assert.equal(parseStat('43%'), 43);
  assert.equal(parseStat('4.0/7.0'), null);
  assert.equal(parseStat('-'), null);
});

test('season average comparison excludes insufficient games and minutes', () => {
  const players = [
    {id:'1', values:{'GP*':'8', MPG:'20:00'}},
    {id:'2', values:{'GP*':'1', MPG:'20:00'}},
    {id:'3', values:{'GP*':'4', MPG:'9:00'}}
  ];
  assert.deepEqual(eligiblePlayers(players).map(p=>p.id), ['1']);
});

test('turnovers are reversed and unknown or combined categories are not colored', () => {
  assert.equal(categoryDirection('TO'), -1);
  assert.equal(categoryDirection('PTS'), 1);
  assert.equal(categoryDirection('FGM/A*'), 0);
  assert.equal(categoryDirection('unknown'), 0);
  assert.match(colorForPercentile(1), /^rgb\(/);
});

test('projected views use projected games because Yahoo does not supply minutes', () => {
  const players = [{id:'1',values:{'GP*':'3.0',MPG:'-'}},{id:'2',values:{'GP*':'0.0',MPG:'-'}}];
  assert.deepEqual(eligiblePlayers(players,{projected:true}).map(p=>p.id),['1']);
});
