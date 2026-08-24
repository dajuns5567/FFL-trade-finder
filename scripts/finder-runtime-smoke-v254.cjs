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
const values = { manual: 3000, extra: 1200, extra2: 700, target: 3000, partnerExtra: 1200 };
const names = { manual: 'Manual Player', extra: 'Extra Player', extra2: 'Second Extra', target: 'Target Player', partnerExtra: 'Partner Extra' };
const manual = { type: 'player', id: 'manual', owner: 1 };
const extra = { type: 'player', id: 'extra', owner: 1 };
const extra2 = { type: 'player', id: 'extra2', owner: 1 };
const target = { type: 'player', id: 'target', owner: 2 };
const partnerExtra = { type: 'player', id: 'partnerExtra', owner: 2 };
window.state = {
  allAssets: [manual, extra, extra2, target, partnerExtra],
  teams: [{ id: 1, name: 'Mine' }, { id: 2, name: 'Partner' }],
  players: {
    manual: { team: 'AAA' }, extra: { team: 'AAA' }, extra2: { team: 'AAA' },
    target: { team: 'BBB' }, partnerExtra: { team: 'BBB' }
  }
};
window.tradeValueNormalizationV130 = {
  canonicalValue: x => values[x?.id] || 0,
  pickContext: () => ({ projectedSlot: 16 })
};
window.playerRankValue = x => ({ rank: ({ manual: 30, extra: 120, extra2: 200, target: 32, partnerExtra: 125 })[x?.id] || 9999 });
window.playerName = id => names[id] || String(id || '');
window.groupPos = () => 'WR';
window.teamName = id => id === 1 ? 'Mine' : 'Partner';
window.teamContextTradeFit90 = () => 0;
window.section1V130 = {
  fair(give, recv) {
    const aRaw = give.reduce((s, x) => s + (values[x.id] || 0), 0);
    const bRaw = recv.reduce((s, x) => s + (values[x.id] || 0), 0);
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
const boxes = [manual, extra, extra2].map((asset, i) => ({ _asset: asset, checked: i === 0 }));
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
    const onRows = await window.tradeFinderV168.generateAsync(0);
    if (!hasExpanded(onRows)) failures.push('normal Finder checkbox ON returned no qualifying expanded outgoing package');
    if (!(onRows || []).some(r => (r.give || []).length === 1 && r.give[0]?.id === 'manual')) failures.push('normal Finder checkbox ON did not preserve the exact manual package');

    controls.tradeAssist97.checked = false;
    const offRows = await window.tradeFinderV168.generateAsync(0);
    if (!allManualOnly(offRows)) failures.push('normal Finder checkbox OFF changed the manual-only outgoing package');
  }

  runFile('trade-specific-player-v232.js');
  if (!window.tradeSpecificPlayerV232 || typeof window.tradeSpecificPlayerV232.run !== 'function') {
    failures.push('Acquire Specific Player runtime did not install');
  } else {
    controls.tradeAssist97.checked = true;
    controls.finderResults.innerHTML = '';
    await window.tradeSpecificPlayerV232.run();
    const renderedOn = controls.finderResults.innerHTML;
    if (!renderedOn.includes('Manual Player')) failures.push('Acquire Specific Player did not render the selected outgoing player');
    if (!renderedOn.includes('Extra Player') && !renderedOn.includes('Second Extra')) failures.push('Acquire Specific Player checkbox ON did not render an added outgoing asset in the visible batch');

    controls.tradeAssist97.checked = false;
    controls.finderResults.innerHTML = '';
    await window.tradeSpecificPlayerV232.run();
    const renderedOff = controls.finderResults.innerHTML;
    if (renderedOff.includes('Extra Player') || renderedOff.includes('Second Extra')) failures.push('Acquire Specific Player checkbox OFF rendered an unselected outgoing asset');
  }

  if (failures.length) {
    originalError('\nV255 Finder behavioral smoke failed:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  console.log('V255 Finder behavioral smoke passed: normal + targeted checkbox ON/OFF behavior verified');
})().catch(err => {
  originalError(err);
  process.exit(1);
});
