function normalizeCategory(label) {
  return label.replace(/[\uE000-\uF8FF\s*]/g, '').toUpperCase();
}

function parseStat(text) {
  const value = String(text ?? '').trim();
  const time = /^(\d+):(\d{2})$/.exec(value);
  if (time && Number(time[2]) < 60) return Number(time[1]) + Number(time[2]) / 60;
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(value)) return null;
  const number = Number(value.replace('%', ''));
  return Number.isFinite(number) ? number : null;
}

function eligiblePlayers(players, {projected = false} = {}) {
  const rows = players.map(player => {
    const entries = Object.entries(player.values);
    const get = name => entries.find(([key]) => normalizeCategory(key) === name)?.[1];
    const games = parseStat(get('GP'));
    const mpg = parseStat(get('MPG'));
    const minutes = parseStat(get('MIN'));
    return {player, games, mpg: mpg ?? (games > 0 && minutes !== null ? minutes / games : null)};
  });
  if (projected) return rows.filter(row => row.games > 0).map(row => row.player);
  const games = rows.map(row => row.games).filter(Number.isFinite);
  if (!games.length || !rows.some(row => Number.isFinite(row.mpg))) return [];
  const minimum = Math.max(1, Math.ceil(Math.max(...games) / 4));
  return rows.filter(row => row.games >= minimum && row.mpg >= 10).map(row => row.player);
}

function categoryDirection(label) {
  const key = normalizeCategory(label);
  if (['TO', 'TOV', 'PF', 'FOULS'].includes(key)) return -1;
  if (['GP','MIN','MPG','FG%','FT%','3PTM','3PTA','3PT%','PTS','REB','OREB','DREB','AST','ST','STL','BLK','FGM','FGA','FTM','FTA','DD','TD','A/T','FANPTS'].includes(key)) return 1;
  return 0;
}

function colorForPercentile(p) {
  const value = Math.max(0, Math.min(1, p));
  const target = value < 0.5 ? [234,174,162] : [163,207,175];
  const strength = Math.abs(value - 0.5) * 2;
  const channels = target.map(n => Math.round(250 + (n - 250) * strength));
  return `rgb(${channels.join(', ')})`;
}

if (typeof module !== 'undefined') module.exports = {normalizeCategory, parseStat, eligiblePlayers, categoryDirection, colorForPercentile};
