/* This collector only returns a population after the final page succeeds. */
function buildPopulationUrl(sourceUrl, offset) {
  const url = new URL(sourceUrl);
  if (url.origin !== 'https://basketball.fantasysports.yahoo.com' || !/\/nba\/[^/]+\/(?:players|playersearch)\/?$/.test(url.pathname)) {
    throw new Error('Expected a Yahoo Fantasy Basketball player list URL');
  }
  url.pathname = url.pathname.replace(/\/playersearch\/?$/, '/players');
  for (const key of ['search', 'query', 'name', 'position', 'team', 'pspid', 'activity', 'jsenabled']) url.searchParams.delete(key);
  url.searchParams.set('status', 'ALL');
  url.searchParams.set('pos', 'P');
  url.searchParams.set('eteam', 'ALL');
  url.searchParams.set('fteam', 'NONE');
  url.searchParams.set('myteam', '0');
  if (!url.searchParams.has('cut_type')) url.searchParams.set('cut_type', '33');
  url.searchParams.set('sort', 'AR');
  url.searchParams.set('sdir', '1');
  url.searchParams.set('count', String(offset));
  return url.href;
}

function populationCacheKey(sourceUrl) {
  const url = new URL(buildPopulationUrl(sourceUrl, 0));
  for (const key of ['count', 'sort', 'sdir']) url.searchParams.delete(key);
  url.searchParams.sort();
  return `fsc:v1:${url.href}`;
}

async function collectPopulation({url, fetchPage, pageSize = 25, maxPages = 100, clock = Date.now}) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(maxPages) || maxPages < 1) throw new Error('Invalid page limit');
  const start = clock();
  const players = [];
  const seen = new Set();
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(buildPopulationUrl(url, page * pageSize));
    if (!result || !Array.isArray(result.players) || typeof result.hasNext !== 'boolean') throw new Error('Invalid Yahoo player page');
    if (result.hasNext && result.players.length !== pageSize) throw new Error('Incomplete player page with a next page');
    for (const player of result.players) {
      if (!player || typeof player.id !== 'string' || !player.id) throw new Error('Player ID missing');
      if (seen.has(player.id)) throw new Error('Duplicate player in population');
      seen.add(player.id);
      players.push(player);
    }
    if (!result.hasNext) {
      if (!players.length) throw new Error('No players found');
      return {players, elapsedMs: clock() - start, pages: page + 1};
    }
  }
  throw new Error('Player page limit reached before completion');
}

function parseYahooPage(html, requestedUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const status = doc.querySelector('#statusselect');
  const position = doc.querySelector('input[name="pos"]:checked');
  const stat = doc.querySelector('#statselect');
  const expectedStat = new URL(requestedUrl).searchParams.get('stat1');
  if (status?.value !== 'ALL' || position?.value !== 'P' || (expectedStat && stat?.value !== expectedStat)) {
    throw new Error('Yahoo returned a different player filter or stats period');
  }
  const nav = doc.querySelector('#playerspagenav1');
  const table = Array.from(doc.querySelectorAll('table')).find(t => t.querySelector('a[id^="playernote-"]'));
  const header = table?.querySelector('thead tr:last-child');
  if (!table || !header || !nav) throw new Error('Yahoo player list structure not found');
  const labels = Array.from(header.cells, c => c.textContent.trim().replace(/\s+/g, ' '));
  const players = Array.from(table.querySelectorAll('tbody tr')).map(row => {
    const anchor = row.querySelector('a[id^="playernote-"]');
    if (!anchor) return null;
    const id = anchor.id.slice('playernote-'.length);
    const values = {};
    Array.from(row.cells).forEach((cell, i) => {
      const label = labels[i];
      if (label && label !== 'Players' && label !== 'Roster Status' && !label.startsWith('Opp:')) {
        values[label] = cell.textContent.trim();
      }
    });
    return {id, values};
  }).filter(Boolean);
  const last = nav.querySelector('li.last');
  if (!last) throw new Error('Yahoo pagination end marker missing');
  const next = last.querySelector('a[href]');
  if (next) {
    const destination = new URL(next.getAttribute('href'), requestedUrl);
    const current = Number(new URL(requestedUrl).searchParams.get('count') || 0);
    if (destination.origin !== new URL(requestedUrl).origin || Number(destination.searchParams.get('count')) !== current + 25) {
      throw new Error('Yahoo pagination link is invalid');
    }
  }
  const hasNext = Boolean(next);
  return {players, hasNext};
}

function createYahooPageFetcher({fetchImpl = fetch, parseHtml = parseYahooPage} = {}) {
  return async url => {
    const response = await fetchImpl(url, {credentials: 'same-origin', redirect: 'follow'});
    if (!response.ok) throw new Error(`Yahoo request failed: HTTP ${response.status}`);
    if (response.url && new URL(response.url).origin !== 'https://basketball.fantasysports.yahoo.com') {
      throw new Error('Yahoo redirected away from the player list');
    }
    return parseHtml(await response.text(), url);
  };
}

if (typeof module !== 'undefined') module.exports = {buildPopulationUrl, populationCacheKey, collectPopulation, parseYahooPage, createYahooPageFetcher};
