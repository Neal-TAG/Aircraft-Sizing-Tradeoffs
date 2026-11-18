// Prints each preset's model outputs next to published figures (docs/presets.md).
//   node tests/presets-report.js [page.html]
const { chromium } = require('playwright-core');
const path = require('path');
const page = path.resolve(process.argv[2] || 'index.html');
const PUBLISHED = {
  skyvan: { Vs: 60, VTAS: 148, RC: 602, note: 'Range 602 nmi at max fuel (Jane\'s via Wikipedia, reserve not stated)' },
  c172: { Vs: 48, VTAS: 122, RC: 518, note: '518 nmi at 75% power, 8,500 ft, 45 min reserve, full tanks (POH)' },
  kingair350: { Vs: 81, VTAS: 312, RD: 1806, note: '1,806 nmi ferry, long-range cruise, NBAA IFR reserve (Textron)' },
  atr72: { Vs: 92, VTAS: 270, RB: 683, note: '683 nmi with 72 passengers, EASA reserves + 100 nmi alternate (ATR); max pax is close to max payload' },
  b737: { Vs: 111, VTAS: 450, RC: 2927, note: '2,927 nmi (Wikipedia, conditions not stated)' },
};
(async () => {
  const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.goto('file:///' + encodeURI(page.replace(/\\/g, '/')));
  const ids = await p.evaluate(() => Object.keys(PRESETS));
  for (const id of ids) {
    const r = await p.evaluate(id => { window.__app.loadPreset(id); const r = window.__last;
      return { Vs: r.Vs, VTAS: r.VTAS, We: r.We, U: r.U, D: r.D, LD: r.LD, ff0: r.ff0, PB: r.PB, RB: r.RB, PC: r.PC, RC: r.RC, RD: r.RD }; }, id);
    const pub = PUBLISHED[id] || {};
    const cmp = k => pub[k] ? `${r[k].toFixed(0)} (published ${pub[k]}, ${(100 * (r[k] / pub[k] - 1)).toFixed(0)}%)` : r[k].toFixed(0);
    console.log(`\n${id}: stall ${cmp('Vs')} kt, TAS ${cmp('VTAS')} kt, empty ${r.We.toFixed(0)} lb, useful ${r.U.toFixed(0)} lb, L/D ${r.LD.toFixed(1)}, fuel flow ${r.ff0.toFixed(0)} lb/h`);
    console.log(`  B: ${r.PB.toFixed(0)} lb, ${cmp('RB')} nmi | C: ${r.PC.toFixed(0)} lb, ${cmp('RC')} nmi | D: ${cmp('RD')} nmi`);
    if (pub.note) console.log('  published: ' + pub.note);
  }
  console.log(errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : '\nNo page errors.');
  await b.close();
})();
