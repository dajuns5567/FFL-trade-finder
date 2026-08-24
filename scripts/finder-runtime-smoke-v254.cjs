const fs = require('fs');
const vm = require('vm');

const failures = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (/guard failed|loader eval failed|Finder load failed|specific-player search failed/i.test(text)) failures.push(text);
  originalError(...args);
};

global.window = global;
const values = new Map();
const names = new Map();
const rankMap = new Map();
const allAssets = [];
const teams = [];
const players = {};

function addPlayer(id, owner, value, rank, name=id) {
  const x = { type: 'player', id, owner };
  allAssets.push(x); values.set(id, value); names.set(id, name); rankMap.set(id, rank); players[id] = { team: `T${owner}` };
  return x;
}
function addPick(id, owner, value, round=2, season=2027) {
  const x = { type: 'pick', id, owner, round, season, name: `${season} R${round}` };
  allAssets.push(x); values.set(id, value); names.set(id, x.name); return x;
}

const manual = addPlayer('manual', 1, 3000, 30, 'Manual Player');
const extra = addPlayer('extra', 1, 1200, 120, 'Extra Player');
const extra2 = addPlayer('extra2', 1, 700, 200, 'Second Extra');
for (let i=3;i<18;i++) addPlayer(`mine${i}`, 1, Math.max(180, 2400-i*110), 200+i, `Mine ${i}`);
addPick('minePick1',1,650,2,2027); addPick('minePick2',1,420,3,2028);

const target = addPlayer('target', 2, 3000, 32, 'Target Player');
addPlayer('partnerExtra', 2, 1200, 125, 'Partner Extra');
for (let owner=2; owner<=32; owner++) {
  teams.push({ id: owner, name: `Team ${owner}` });
  const start = owner===2 ? 2 : 0;
  for (let i=start;i<16;i++) addPlayer(`p${owner}_${i}`, owner, Math.max(160, 4200-i*220-owner*5), 40+owner*10+i, `P${owner}-${i}`);
  addPick(`pk${owner}_1`,owner,900,1,2027);
  addPick(`pk${owner}_2`,owner,550,2,2028);
  addPick(`pk${owner}_3`,owner,300,3,2029);
}
teams.unshift({ id: 1, name: 'Mine' });

window.state = { allAssets, teams, players };
window.tradeValueNormalizationV130 = {
  canonicalValue: x => values.get(x?.id) || 0,
  pickContext: () => ({ projectedSlot: 16 })
};
window.playerRankValue = x => ({ rank: rankMap.get(x?.id) || 9999 });
window.playerName = id => names.get(id) || String(id || '');
window.groupPos = x => x?.type==='pick' ? 'PICK' : 'WR';
window.teamName = id => id === 1 ? 'Mine' : `Team ${id}`;
window.teamContextTradeFit90 = () => 0;
let fairCalls = 0;
window.section1V130 = {
  fair(give, recv) {
    fairCalls++;
    const aRaw = give.reduce((s, x) => s + (values.get(x.id) || 0), 0);
    const bRaw = recv.reduce((s, x) => s + (values.get(x.id) || 0), 0);
    return { score: 90, rejected: false, edgeEffective: bRaw - aRaw, edgeRaw: bRaw - aRaw, aRaw, bRaw, aAdj: 0, bAdj: 0, aEffective: aRaw, bEffective: bRaw };
  }
};

const controls = {
  findTeam: { value: '1' },
  findMode: { value: 'balanced' },
  tradeTier94: { value: 'neutral' },
  tradeAssist97: { checked: true },
  desiredPlayerSearch: { value: 'Target Player' },
  finderResults: { innerHTML: '', appendChild() {} }
};
const mineAssets = allAssets.filter(x => Number(x.owner)===1);
const boxes = mineAssets.map(asset => ({ _asset: asset, checked: asset.id === 'manual' }));
const anyPos = { value: 'ANY', checked: true };

global.document = {
  addEventListener() {},
  querySelectorAll(selector) {
    if (selector.includes('#findShop .shopCheck:checked') || selector === '.shopCheck:checked') return boxes.filter(x => x.checked);
    if (selector === '#findShop .shopCheck' || selector === '.shopCheck') return boxes;
    if (selector.includes('.trade97-pos:checked')) return [anyPos];
    if (selector === '.draftYear106:checked' || selector === '.draftRound106:checked') return [];
    if (selector === 'input[type="checkbox"]') return [controls.tradeAssist97, anyPos, ...boxes];
    return [];
  },
  querySelector() { return null; },
  getElementById(id) { return controls[id] || null; },
  createElement(tag) { return { tagName: String(tag).toUpperCase(), className: '', style: {}, textContent: '', onclick: null }; }
};

class LocalXHR {
  open(_method, url) { this.url = url; }
  send() {
    const path = String(this.url || '').split('?')[0].replace(/^\//, '');
    try {
      this.responseText = fs.readFileSync(path, 'utf8');
      this.status = 200;
    } catch (err) {
      this.responseText = '';
      this.status = 404;
      throw err;
    }
  }
}
global.XMLHttpRequest = LocalXHR;

function runFile(path) {
  vm.runInThisContext(fs.readFileSync(path, 'utf8'), { filename: path });
}
function hasExpanded(rows) { return (rows || []).some(r => (r.give || []).length > 1 && (r.give || []).some(x => x.id === 'manual')); }
function allManualOnly(rows) { return (rows || []).length > 0 && rows.every(r => (r.give || []).length === 1 && r.give[0]?.id === 'manual'); }

(async () => {
  runFile('trade-finder-style-loader-v209.js');
  if (!window.tradeFinderV168 || typeof window.tradeFinderV168.generateAsync !== 'function') {
    failures.push('normal Finder runtime did not install');
  } else {
    controls.tradeAssist97.checked = true;
    fairCalls = 0;
    const onRows = await window.tradeFinderV168.generateAsync(0);
    const normalOnCalls = fairCalls;
    if (!hasExpanded(onRows)) failures.push('normal Finder checkbox ON returned no qualifying expanded outgoing package');
    if (!hasExpanded((onRows || []).slice(0, 5))) failures.push('normal Finder checkbox ON did not place an expanded outgoing package in the first five recommendations');
    if (!(onRows || []).slice(0, 5).some(r => (r.give || []).length === 1 && r.give[0]?.id === 'manual')) failures.push('normal Finder checkbox ON did not preserve the exact manual package in the first five recommendations');
    if (normalOnCalls > 30000) failures.push(`normal Finder checkbox ON exceeded bounded fairness work: ${normalOnCalls}`);

    controls.tradeAssist97.checked = false;
    fairCalls = 0;
    const offRows = await window.tradeFinderV168.generateAsync(0);
    if (!allManualOnly(offRows)) failures.push('normal Finder checkbox OFF changed the manual-only outgoing package');
  }

  runFile('trade-specific-player-v232.js');
  if (!window.tradeSpecificPlayerV232 || typeof window.tradeSpecificPlayerV232.run !== 'function') {
    failures.push('Acquire Specific Player runtime did not install');
  } else {
    controls.tradeAssist97.checked = true;
    controls.finderResults.innerHTML = '';
    fairCalls = 0;
    await window.tradeSpecificPlayerV232.run();
    const targetedOnCalls = fairCalls;
    const renderedOn = controls.finderResults.innerHTML;
    if (!renderedOn.includes('Manual Player')) failures.push('Acquire Specific Player did not render the selected outgoing player');
    if (!renderedOn.includes('Extra Player') && !renderedOn.includes('Second Extra') && !renderedOn.includes('Mine ')) failures.push('Acquire Specific Player checkbox ON did not render an added outgoing asset in the visible batch');
    if (targetedOnCalls > 5000) failures.push(`Acquire Specific Player checkbox ON exceeded bounded fairness work: ${targetedOnCalls}`);

    controls.tradeAssist97.checked = false;
    controls.finderResults.innerHTML = '';
    await window.tradeSpecificPlayerV232.run();
    const renderedOff = controls.finderResults.innerHTML;
    if (/Extra Player|Second Extra|Mine \d+/.test(renderedOff)) failures.push('Acquire Specific Player checkbox OFF rendered an unselected outgoing asset');
  }

  if (failures.length) {
    originalError('\nV256 Finder behavioral/performance smoke failed:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  console.log('V256 Finder smoke passed: V255 behavior preserved with bounded normal + targeted search work');
})().catch(err => {
  originalError(err);
  process.exit(1);
});
