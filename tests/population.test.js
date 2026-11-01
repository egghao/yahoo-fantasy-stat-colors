const test = require('node:test');
const assert = require('node:assert/strict');
const { collectPopulation, buildPopulationUrl } = require('../extension/population.js');

test('all-player requests remove view filters while preserving the selected stats period', () => {
  const url = new URL(buildPopulationUrl('https://basketball.fantasysports.yahoo.com/nba/123/players?status=A&pos=PG&stat1=S_AS_2026&count=50&search=foo&myteam=1&sort=PTS', 25));
  assert.equal(url.searchParams.get('status'), 'ALL');
  assert.equal(url.searchParams.get('pos'), 'P');
  assert.equal(url.searchParams.get('stat1'), 'S_AS_2026');
  assert.equal(url.searchParams.get('count'), '25');
  assert.equal(url.searchParams.has('search'), false);
  assert.equal(url.searchParams.get('myteam'), '0');
});

test('Yahoo pagination and tracking parameters do not split the same stats cache', () => {
  const {populationCacheKey} = require('../extension/population.js');
  const first = 'https://basketball.fantasysports.yahoo.com/nba/123/players?stat1=S_AS_2026';
  const next = 'https://basketball.fantasysports.yahoo.com/nba/123/players?stat1=S_AS_2026&cut_type=33&count=25&jsenabled=1&activity=players_sort_click';
  assert.equal(populationCacheKey(first), populationCacheKey(next));
  assert.notEqual(populationCacheKey(first), populationCacheKey(first.replace('S_AS_2026', 'S_PS7')));
});

test('collects every page and reports elapsed time before returning a population', async () => {
  const pages = [[{id:'a'}, {id:'b'}], [{id:'c'}, {id:'d'}], [{id:'e'}]];
  const counts = [];
  const result = await collectPopulation({
    url:'https://basketball.fantasysports.yahoo.com/nba/123/players?stat1=S_AS_2026',
    fetchPage: async (url) => { const count = Number(new URL(url).searchParams.get('count')); counts.push(count); return {players: pages[count / 2], hasNext: count < 4}; },
    pageSize: 2, clock: (() => { let n=1000; return () => { n += 50; return n; }; })()
  });
  assert.deepEqual(result.players.map(p => p.id), ['a','b','c','d','e']);
  assert.deepEqual(counts, [0,2,4]);
  assert.equal(result.elapsedMs, 50);
});

test('does not publish partial data after a failed page or repeated page', async () => {
  await assert.rejects(() => collectPopulation({url:'https://basketball.fantasysports.yahoo.com/nba/123/players', pageSize:1, fetchPage:async () => ({players:[{id:'a'}], hasNext:true})}), /duplicate/i);
  await assert.rejects(() => collectPopulation({url:'https://basketball.fantasysports.yahoo.com/nba/123/players', fetchPage:async () => { throw new Error('HTTP 429'); }}), /429/);
});

test('fetching a Yahoo page rejects server errors before parsing', async () => {
  const {createYahooPageFetcher} = require('../extension/population.js');
  const getPage = createYahooPageFetcher({fetchImpl: async () => ({ok:false, status:429}), parseHtml: () => { throw new Error('must not parse'); }});
  await assert.rejects(() => getPage('https://basketball.fantasysports.yahoo.com/nba/123/players?status=ALL'), /429/);
});


test('player search results use the same complete population and cache as the player list', () => {
  const {populationCacheKey} = require('../extension/population.js');
  const search = 'https://basketball.fantasysports.yahoo.com/nba/123/playersearch?search=LeBron&stat1=S_AS_2026';
  const list = 'https://basketball.fantasysports.yahoo.com/nba/123/players?stat1=S_AS_2026';
  assert.equal(populationCacheKey(search), populationCacheKey(list));
  assert.equal(new URL(buildPopulationUrl(search, 0)).pathname, '/nba/123/players');
});
