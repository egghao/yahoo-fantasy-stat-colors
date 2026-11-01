(() => {
  if (!/^\/(?:\d{4}\/)?nba\/[^/]+\/(?:players|playersearch)\/?$/.test(location.pathname)) return;
  let activeTable = null;
  let activeStats = '';
  let activeUrl = '';
  function mount() {
  const table = Array.from(document.querySelectorAll('table')).find(t => t.querySelector('a[id^="playernote-"]'));
  mountStickyPlayerTable(table);
  const statsSelect = document.querySelector('#statselect');
  if (!table || !statsSelect) return;
  if (table === activeTable && statsSelect.value === activeStats && location.href === activeUrl && document.querySelector('#fantasy-stat-colors')) return;
  document.querySelector('#fantasy-stat-colors')?.remove();
  activeTable = table;
  activeStats = statsSelect.value;
  activeUrl = location.href;

  const zh = navigator.language.toLowerCase().startsWith('zh');
  const text = zh ? {
    title: '數據百分位', refresh: '立即更新', loading: '正在取得全部球員資料…',
    low: '第 0 百分位（較差）', high: '第 100 百分位（較佳）', updated: '更新時間',
    failed: '更新失敗，請稍後重試。', noData: '此統計模式缺少出賽或上場時間資料，暫不顯示顏色。',
    rule: '比較母體：至少 10 分鐘／場，且出賽至少達最高場次的四分之一。', projectedRule: '預測數據母體：預測出賽至少 1 場；Yahoo 未提供預測上場時間。',
    stale: '使用較舊快取；更新失敗。', prefix: '百分位', players: '球員', eligible: '符合門檻', duration: '抓取耗時'
  } : {
    title: 'Stat percentiles', refresh: 'Refresh', loading: 'Loading all players…',
    low: '0th percentile (worse)', high: '100th percentile (better)', updated: 'Updated',
    failed: 'Update failed. Please try again.', noData: 'This stats view lacks games or minutes needed to calculate the comparison.',
    rule: 'Reference: at least 10 minutes per game and one quarter of the maximum games played.', projectedRule: 'Projected reference: at least one projected game; Yahoo does not provide projected minutes.',
    stale: 'Showing older cached data; refresh failed.', prefix: 'Percentile', players: 'players', eligible: 'eligible', duration: 'fetch time'
  };
  const box = document.createElement('div');
  box.id = 'fantasy-stat-colors';
  box.setAttribute('role', 'status');
  const title = document.createElement('strong'); title.textContent = text.title;
  const legend = document.createElement('span'); legend.className = 'fsc-legend'; legend.setAttribute('aria-hidden', 'true');
  const projected = /^S_P/.test(statsSelect.value);
  const rule = document.createElement('div'); rule.textContent = projected ? text.projectedRule : text.rule;
  const refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = text.refresh;
  const info = document.createElement('div');
  box.append(title, ' ', text.low, legend, text.high, refresh, rule, info);
  table.parentElement.before(box);

  const source = new URL(location.href);
  source.searchParams.set('stat1', statsSelect.value);
  const cacheKey = populationCacheKey(source.href);
  const TTL = 15 * 60 * 1000;
  let pending = false;
  let last = null;

  function clearColors() {
    for (const cell of table.querySelectorAll('[data-fsc-colored]')) {
      cell.style.backgroundColor = cell.dataset.fscBackground;
      if (cell.dataset.fscHadTitle === 'yes') cell.setAttribute('title', cell.dataset.fscTitle);
      else cell.removeAttribute('title');
      delete cell.dataset.fscColored;
      delete cell.dataset.fscBackground;
      delete cell.dataset.fscHadTitle;
      delete cell.dataset.fscTitle;
    }
  }
  function show(entry, stale = false) {
    if (!table.isConnected || !box.isConnected) return false;
    clearColors();
    if (!entry || !Array.isArray(entry.players)) return false;
    const eligible = eligiblePlayers(entry.players, {projected});
    if (eligible.length < 10) { info.textContent = text.noData; return false; }
    const headers = Array.from(table.querySelector('thead tr:last-child')?.cells || [], cell => normalizeCategory(cell.textContent));
    const distributions = new Map();
    for (const category of headers) {
      if (!categoryDirection(category)) continue;
      const values = eligible.map(player => {
        const match = Object.entries(player.values).find(([key]) => normalizeCategory(key) === category);
        return parseStat(match?.[1]);
      }).filter(Number.isFinite);
      if (values.length >= 10) distributions.set(category, values);
    }
    for (const row of table.querySelectorAll('tbody tr')) {
      if (!row.querySelector('a[id^="playernote-"]')) continue;
      Array.from(row.cells).forEach((cell, index) => {
        const key = headers[index];
        const direction = categoryDirection(key || '');
        const values = distributions.get(key);
        const value = parseStat(cell.textContent);
        if (!direction || !values || value === null) return;
        const score = percentile(value, values, direction < 0);
        cell.dataset.fscColored = 'yes';
        cell.dataset.fscBackground = cell.style.backgroundColor;
        cell.dataset.fscHadTitle = cell.hasAttribute('title') ? 'yes' : 'no';
        cell.dataset.fscTitle = cell.getAttribute('title') || '';
        cell.style.backgroundColor = colorForPercentile(score);
        cell.title = `${text.prefix}: ${Math.round(score * 100)}`;
      });
    }
    const summary = `${entry.players.length} ${text.players} · ${eligible.length} ${text.eligible} · ${text.duration}: ${(entry.elapsedMs / 1000).toFixed(1)}s`;
    info.textContent = stale ? `${text.stale} ${summary}` : `${text.updated}: ${new Date(entry.at).toLocaleString()} · ${summary}`;
    return true;
  }

  async function update(force = false) {
    if (pending) return;
    pending = true; refresh.disabled = true;
    try {
      const saved = (await chrome.storage.local.get(cacheKey))[cacheKey];
      if (saved && Array.isArray(saved.players) && Number.isFinite(saved.at)) last = saved;
      if (!force && last && Date.now() - last.at < TTL) { show(last); return; }
      if (last) show(last);
      info.textContent = text.loading;
      const fetchPage = createYahooPageFetcher();
      const result = await collectPopulation({url: source.href, fetchPage: async url => {
        const page = await fetchPage(url);
        await new Promise(resolve => setTimeout(resolve, 200));
        return page;
      }});
      const entry = {at: Date.now(), players: result.players, elapsedMs: result.elapsedMs};
      await chrome.storage.local.set({[cacheKey]:entry});
      last = entry;
      show(entry);
    } catch (error) {
      console.warn('[Fantasy Stat Colors]', error);
      if (!last || !show(last, true)) info.textContent = text.failed;
    } finally {
      pending = false; refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', () => update(true));
  update();
  }
  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(mount, 250);
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  mount();
})();
