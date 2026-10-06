import assert from 'node:assert/strict';
import fs from 'node:fs';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {
  applyInquirerEditorialV31,
  evaluateInquirerEditionQuality,
  FORWARD_INQUIRER_VERSION,
  FORWARD_EDITORIAL_REVISION
} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {
  buildInquirerWeek,
  buildLeagueOverview,
  inquirerWeekClassification,
  publicReporters
} from '../netlify/functions/inquirer-reporters.mjs';

const LEAGUE = '1316867686394769408';
const API = 'https://api.sleeper.app/v1';
const SEASON = 2026;
const WEEK = 3;
const clone = value => JSON.parse(JSON.stringify(value));

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'Fleeced-Inquirer-Week3-Live-Audit/2.1' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function groupMatchups(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const id = String(row?.matchup_id ?? '');
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return groups;
}

function rosterName(roster, userById) {
  const user = userById.get(String(roster?.owner_id || ''));
  return String(user?.metadata?.team_name || user?.display_name || user?.username || `Roster ${roster?.roster_id}`);
}

function managerName(roster, userById) {
  const user = userById.get(String(roster?.owner_id || ''));
  return String(user?.display_name || user?.username || `Roster ${roster?.roster_id}`);
}

function transactionsByRoster(rows = []) {
  const out = {};
  for (const tx of rows) {
    const touched = new Set([
      ...(tx?.roster_ids || []).map(String),
      ...Object.values(tx?.adds || {}).map(String),
      ...Object.values(tx?.drops || {}).map(String)
    ]);
    for (const rosterId of touched) {
      out[rosterId] ??= [];
      out[rosterId].push({
        id: String(tx?.transaction_id || ''),
        type: String(tx?.type || ''),
        status: String(tx?.status || ''),
        adds: Object.keys(tx?.adds || {}).filter(id => String(tx.adds[id]) === rosterId),
        drops: Object.keys(tx?.drops || {}).filter(id => String(tx.drops[id]) === rosterId),
        created: Number(tx?.status_updated || tx?.created) || null
      });
    }
  }
  return out;
}

function recordsThrough(weekRows) {
  const out = {};
  for (const rows of weekRows) {
    for (const pair of groupMatchups(rows).values()) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      const ap = Number(a.points) || 0;
      const bp = Number(b.points) || 0;
      for (const [row, points, against] of [[a, ap, bp], [b, bp, ap]]) {
        const id = String(row.roster_id);
        const rec = out[id] ?? { wins: 0, losses: 0, ties: 0, points_for: 0 };
        rec.points_for += points;
        if (points > against) rec.wins += 1;
        else if (points < against) rec.losses += 1;
        else rec.ties += 1;
        out[id] = rec;
      }
    }
  }
  return out;
}

function divisionName(league, roster) {
  const id = roster?.settings?.division;
  return String(league?.metadata?.[`division_${id}`] || `Division ${id || ''}`).trim();
}

function playerPosition(player) {
  return String(player?.position || player?.fantasy_positions?.[0] || 'FLEX');
}

function eligible(slot, pos) {
  const s = String(slot || '').toUpperCase();
  const p = String(pos || '').toUpperCase();
  if (s === p) return true;
  if (s === 'FLEX') return ['RB', 'WR', 'TE'].includes(p);
  if (s === 'REC_FLEX') return ['WR', 'TE'].includes(p);
  if (s === 'WRRB_FLEX') return ['RB', 'WR'].includes(p);
  if (['SUPER_FLEX', 'OP'].includes(s)) return ['QB', 'RB', 'WR', 'TE'].includes(p);
  if (s === 'DL') return ['DL', 'DE', 'DT'].includes(p);
  if (s === 'DB') return ['DB', 'CB', 'S'].includes(p);
  if (['IDP', 'IDP_FLEX'].includes(s)) return ['DL', 'DE', 'DT', 'LB', 'DB', 'CB', 'S'].includes(p);
  return false;
}

function statMap(payload) {
  const out = {};
  if (Array.isArray(payload)) {
    for (const row of payload) {
      const id = String(row?.player_id || row?.player?.player_id || row?.id || '');
      if (id) out[id] = row?.stats && typeof row.stats === 'object' ? { ...row.stats } : { ...row };
    }
  } else if (payload && typeof payload === 'object') {
    for (const [key, row] of Object.entries(payload)) {
      const id = String(row?.player_id || row?.player?.player_id || row?.id || key);
      if (id) out[id] = row?.stats && typeof row.stats === 'object' ? { ...row.stats } : { ...row };
    }
  }
  return out;
}

async function buildDirectSleeperWeek3() {
  const statUrl = w => `https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/2026/week-${String(w).padStart(2, '0')}.json`;
  const [league, rosters, users, players, transactions, w1, w2, w3, w4, rawStats1, rawStats2, rawStats3] = await Promise.all([
    getJson(`${API}/league/${LEAGUE}`),
    getJson(`${API}/league/${LEAGUE}/rosters`),
    getJson(`${API}/league/${LEAGUE}/users`),
    getJson(`${API}/players/nfl`),
    getJson(`${API}/league/${LEAGUE}/transactions/${WEEK}`),
    getJson(`${API}/league/${LEAGUE}/matchups/1`),
    getJson(`${API}/league/${LEAGUE}/matchups/2`),
    getJson(`${API}/league/${LEAGUE}/matchups/3`),
    getJson(`${API}/league/${LEAGUE}/matchups/4`).catch(() => []),
    getJson(statUrl(1)).catch(() => ({})),
    getJson(statUrl(2)).catch(() => ({})),
    getJson(statUrl(3)).catch(() => ({}))
  ]);

  assert.equal(rosters.length, 32, 'Sleeper league must have 32 rosters');
  assert.equal(w3.length, 32, 'Completed Week 3 must have 32 matchup rows');

  const userById = new Map(users.map(user => [String(user.user_id), user]));
  const rosterById = new Map(rosters.map(roster => [String(roster.roster_id), roster]));
  const week3ByRoster = new Map(w3.map(row => [String(row.roster_id), row]));
  const records = recordsThrough([w1, w2, w3]);
  const ranking = Object.entries(records).sort((a, b) =>
    b[1].wins - a[1].wins || a[1].losses - b[1].losses || b[1].points_for - a[1].points_for
  );
  const rankByRoster = new Map(ranking.map(([id], index) => [id, index + 1]));
  const txMap = transactionsByRoster(transactions);
  const starterSlots = (league?.roster_positions || []).map(String).filter(slot => !['BN', 'IR', 'TAXI'].includes(slot.toUpperCase()));

  const opponent = {};
  for (const pair of groupMatchups(w3).values()) {
    if (pair.length !== 2) continue;
    opponent[String(pair[0].roster_id)] = String(pair[1].roster_id);
    opponent[String(pair[1].roster_id)] = String(pair[0].roster_id);
  }
  const nextOpponent = {};
  for (const pair of groupMatchups(w4).values()) {
    if (pair.length !== 2) continue;
    nextOpponent[String(pair[0].roster_id)] = String(pair[1].roster_id);
    nextOpponent[String(pair[1].roster_id)] = String(pair[0].roster_id);
  }

  const stats1 = statMap(rawStats1);
  const stats2 = statMap(rawStats2);
  const stats3 = statMap(rawStats3);
  for (const matchup of w3) {
    for (const [playerId, points] of Object.entries(matchup?.players_points || {})) {
      stats3[playerId] = { ...(stats3[playerId] || {}), _audit_points: Number(points) };
    }
  }

  const teams = rosters.map(roster => {
    const rosterId = String(roster.roster_id);
    const matchup = week3ByRoster.get(rosterId) || {};
    const opponentId = opponent[rosterId];
    const opponentRoster = rosterById.get(opponentId);
    const starterIds = (matchup.starters || []).map(String);
    const rosterPlayers = (roster.players || []).map(String);

    const starterDetails = starterIds.map((id, index) => {
      const player = players[id] || {};
      return {
        id,
        name: String(player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || id),
        position: playerPosition(player),
        nfl_team: String(player.team || 'FA'),
        points: Number(matchup?.players_points?.[id] ?? 0),
        lineup_slot: String(starterSlots[index] || playerPosition(player))
      };
    });

    const bench = rosterPlayers
      .filter(id => !starterIds.includes(id))
      .map(id => {
        const player = players[id] || {};
        return {
          id,
          name: String(player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || id),
          position: playerPosition(player),
          nfl_team: String(player.team || 'FA'),
          points: Number(matchup?.players_points?.[id] ?? 0)
        };
      });

    const worstStarter = starterDetails.slice().sort((a, b) => a.points - b.points)[0] || null;
    const bestBench = bench.slice().sort((a, b) => b.points - a.points)[0] || null;
    let bestLineupMiss = null;
    for (const starter of starterDetails) {
      for (const reserve of bench) {
        if (!eligible(starter.lineup_slot, reserve.position)) continue;
        const gap = reserve.points - starter.points;
        if (gap > 0 && (!bestLineupMiss || gap > bestLineupMiss.gap)) {
          bestLineupMiss = { gap, starter, reserve, slot: starter.lineup_slot };
        }
      }
    }

    const rec = records[rosterId] || { wins: 0, losses: 0, ties: 0, points_for: 0 };
    const division = divisionName(league, roster);
    const divisionRows = rosters
      .filter(row => divisionName(league, row) === division)
      .map(row => ({ id: String(row.roster_id), ...(records[String(row.roster_id)] || { wins: 0, losses: 0, ties: 0, points_for: 0 }) }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.points_for - a.points_for);
    const divisionRank = divisionRows.findIndex(row => row.id === rosterId) + 1;
    const nextId = nextOpponent[rosterId];
    const nextRoster = rosterById.get(nextId);
    const opponentPoints = Number(week3ByRoster.get(opponentId)?.points) || 0;

    return {
      roster_id: rosterId,
      team_name: rosterName(roster, userById),
      manager_name: managerName(roster, userById),
      division: String(roster?.settings?.division || ''),
      division_name: division,
      roster_player_ids: rosterPlayers,
      starter_ids: starterIds,
      starter_details: starterDetails,
      best_bench: bestBench,
      worst_starter: worstStarter,
      best_lineup_miss: bestLineupMiss,
      transactions: txMap[rosterId] || [],
      points: Number(matchup.points) || 0,
      opponent_points: opponentPoints,
      won: Number(matchup.points) > opponentPoints,
      projected: null,
      opponent_roster_id: opponentId,
      opponent_name: opponentRoster ? rosterName(opponentRoster, userById) : `Roster ${opponentId}`,
      next_opponent_roster_id: nextId || null,
      next_opponent_name: nextRoster ? rosterName(nextRoster, userById) : '',
      division_context: {
        division_name: division,
        division_rank: divisionRank,
        division_size: divisionRows.length,
        record: { wins: rec.wins, losses: rec.losses, ties: rec.ties }
      },
      league_context: {
        snapshot_through_week: WEEK,
        standings_rank: rankByRoster.get(rosterId) || null,
        record: { wins: rec.wins, losses: rec.losses, ties: rec.ties },
        division_name: division,
        division_rank: divisionRank,
        division_size: divisionRows.length
      },
      week_classification: inquirerWeekClassification(WEEK, SEASON)
    };
  });

  const weekClassification = inquirerWeekClassification(WEEK, SEASON);
  const scoreFn = stats => Number.isFinite(Number(stats?._audit_points)) ? Number(stats._audit_points) : null;
  const rawInquirer = buildInquirerWeek({
    season: SEASON,
    week: WEEK,
    teams,
    players,
    weeklyStats: stats3,
    weeklyStatHistory: { 1: stats1, 2: stats2, 3: stats3 },
    scoringSettings: league.scoring_settings || {},
    scoreFn,
    weekClassification,
    playerValues: {}
  });
  const rawOverview = buildLeagueOverview({
    season: SEASON,
    week: WEEK,
    teams: rawInquirer.teams,
    players,
    transactions,
    canonicalTrades: [],
    weekClassification,
    valueHistoryMeta: { source: 'direct-sleeper-audit' }
  });

  return {
    available: true,
    season: SEASON,
    week: WEEK,
    reporters: publicReporters(),
    teams: rawInquirer.teams,
    league_overview: rawOverview,
    generated_at: new Date().toISOString(),
    _rawInquirer: rawInquirer,
    _rawOverview: rawOverview
  };
}

async function tryStoredBroadcast() {
  const configured = String(process.env.INQUIRER_LIVE_SITE || '').trim().replace(/\/$/, '');
  const sites = [
    configured,
    'https://deploy-preview-390--mellow-salmiakki-f4268c.netlify.app',
    'https://precious-stroopwafel-196eae.netlify.app',
    'https://subtle-genie-6167c5.netlify.app'
  ].filter(Boolean);
  const probes = [];
  for (const site of [...new Set(sites)]) {
    const url = `${site}/.netlify/functions/league-hub?broadcast_season=${SEASON}&broadcast_week=${WEEK}`;
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch {}
      probes.push({ site, status: response.status, teams: Array.isArray(body?.teams) ? body.teams.length : null, error: body?.error || null });
      if (response.ok && Number(body?.season) === SEASON && Number(body?.week) === WEEK && body?.teams?.length === 32) {
        return { live: body, source: url, probes };
      }
    } catch (error) {
      probes.push({ site, status: null, error: String(error?.message || error) });
    }
  }
  return { live: null, source: '', probes };
}

const stored = await tryStoredBroadcast();
let live = stored.live;
let source = stored.source;
const probes = stored.probes;
if (!live) {
  live = await buildDirectSleeperWeek3();
  source = 'Sleeper API + persisted sleeper-data Week 3';
  probes.push({ site: 'direct-sleeper-fallback', status: 200, teams: live.teams.length });
}

const rawInquirer = live._rawInquirer
  ? clone(live._rawInquirer)
  : { reporters: clone(live.reporters || week2.reporters || []), teams: clone(live.teams) };
if (!live._rawInquirer) for (const team of rawInquirer.teams) delete team.inquirer_article;
const rawOverview = live._rawOverview ? clone(live._rawOverview) : clone(live.league_overview || {});
const weekClassification = inquirerWeekClassification(WEEK, SEASON);

let accepted = null;
let lastQuality = null;
for (let salt = 0; salt < 8; salt++) {
  const edited = applyInquirerEditorialV31({
    season: SEASON,
    week: WEEK,
    rawInquirer: clone(rawInquirer),
    rawOverview: clone(rawOverview),
    previousEdition: week2,
    weekClassification,
    variationSalt: salt
  });
  const candidate = {
    available: true,
    season: SEASON,
    week: WEEK,
    inquirer_version: FORWARD_INQUIRER_VERSION,
    editorial_revision: FORWARD_EDITORIAL_REVISION,
    teams: edited.inquirer.teams,
    league_overview: edited.leagueOverview,
    editorial_generation: { variation_salt: salt, source }
  };
  const quality = evaluateInquirerEditionQuality(candidate, week2);
  lastQuality = quality;
  if (quality.ok) {
    accepted = candidate;
    break;
  }
}

assert.ok(accepted, 'Real Week 3 data could not produce an accepted edition within 8 salts: ' + JSON.stringify(lastQuality?.issues || []).slice(0, 12000));

const paragraphs = article => (article?.sections || []).flatMap(section => [
  ...(section?.paragraphs || []),
  ...(section?.blocks || []).flatMap(block => block?.paragraphs || [])
]).filter(Boolean);
const wordCount = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const teamStats = accepted.teams.map(team => ({
  roster_id: String(team.roster_id),
  team_name: String(team.team_name || ''),
  reporter: String(team?.inquirer_article?.reporter?.name || ''),
  reporter_id: String(team?.inquirer_article?.reporter?.id || ''),
  headline: String(team?.inquirer_article?.headline || ''),
  paragraphs: paragraphs(team.inquirer_article).length,
  words: wordCount(paragraphs(team.inquirer_article).join(' '))
}));
const reporterCounts = Object.fromEntries([...new Set(teamStats.map(row => row.reporter_id))].sort().map(id => [id, teamStats.filter(row => row.reporter_id === id).length]));
const wordStats = {
  min: Math.min(...teamStats.map(row => row.words)),
  max: Math.max(...teamStats.map(row => row.words)),
  average: Math.round(teamStats.reduce((sum, row) => sum + row.words, 0) / teamStats.length)
};

const audit = {
  ok: true,
  source,
  probes,
  candidate_version: accepted.inquirer_version,
  candidate_revision: accepted.editorial_revision,
  variation_salt: accepted.editorial_generation.variation_salt,
  quality: lastQuality?.metrics || {},
  teams: accepted.teams.length,
  reporter_counts: reporterCounts,
  words: wordStats,
  team_stats: teamStats
};
fs.writeFileSync('/tmp/inquirer-week3-live-candidate.json', JSON.stringify(accepted, null, 2) + '\n');
fs.writeFileSync('/tmp/inquirer-week3-live-audit.json', JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ ...audit, team_stats: undefined }, null, 2));
