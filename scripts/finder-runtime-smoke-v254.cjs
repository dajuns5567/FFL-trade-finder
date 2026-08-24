const fs = require('fs');
const vm = require('vm');

const failures = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (/guard failed|loader eval failed|Finder load failed|targeted.*failed/i.test(text)) failures.push(text);
  originalError(...args);
};

global.window = global;
window.state = { allAssets: [], teams: [], players: {} };
window.tradeValueNormalizationV130 = { canonicalValue: () => 0 };
window.playerRankValue = () => ({ rank: 9999 });
window.playerName = id => String(id || '');
window.groupPos = () => 'WR';
window.teamName = id => `Team ${id}`;
window.section1V130 = { fair: () => null };
window.teamContextTradeFit90 = () => 0;

global.document = {
  addEventListener() {},
  querySelectorAll() { return []; },
  querySelector() { return null; },
  getElementById() { return null; }
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

runFile('trade-finder-style-loader-v209.js');
if (!window.tradeFinderV168 || typeof window.tradeFinderV168.render !== 'function' || typeof window.tradeFinderV168.generateAsync !== 'function') {
  failures.push('normal Finder runtime did not install');
} else {
  const body = Function.prototype.toString.call(window.tradeFinderV168.generateAsync);
  if (!body.includes('manualGivePackages(me,chosen)')) failures.push('normal Finder add-assets package-input patch did not install');
}

runFile('trade-specific-player-v232.js');
if (!window.tradeSpecificPlayerV232 || typeof window.tradeSpecificPlayerV232.run !== 'function') {
  failures.push('Acquire Specific Player runtime did not install');
} else {
  const body = Function.prototype.toString.call(window.tradeSpecificPlayerV232.run);
  if (!body.includes('buildAdditionalOutgoing(me,chosen)')) failures.push('targeted add-assets backfill path did not install');
}

if (failures.length) {
  originalError('\nV254 Finder runtime smoke failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('V254 Finder runtime smoke passed');
