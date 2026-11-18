// Headless browser checks for the Aircraft Sizing Trade-offs page.
//
//   node tests/ui.test.js [page.html] [reference.html]
//
// page.html defaults to index.html. If reference.html is given (for example an earlier
// revision from `git show <commit>:index.html > old.html`), every check also runs on it,
// and a regression pass confirms both pages render the same output wherever payload > 0.
//
// Uses an installed Microsoft Edge by default. Set BROWSER_CHANNEL=chrome to use Chrome,
// or BROWSER_PATH to point at any Chromium-based browser.
const { chromium } = require('playwright-core');
const path = require('path');

const target = path.resolve(process.argv[2] || 'index.html');
const reference = process.argv[3] ? path.resolve(process.argv[3]) : null;
const fileUrl = f => 'file:///' + encodeURI(f.replace(/\\/g, '/'));

async function open(browser, f, width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // Fonts don't affect the logic; serve an empty stylesheet so the test runs offline.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(fileUrl(f));
  page.errors = errors;
  return page;
}
const set = (page, pairs) => page.evaluate(p => { p.forEach(([k, v]) => window.__app.setInput(k, v)); }, pairs);
const state = page => page.evaluate(() => ({ st: JSON.parse(JSON.stringify(window.__app.st)), r: window.__last }));
async function pressOnHandle(page, i, key) {
  await page.focus(`#radar circle.handle[data-i="${i}"]`);
  await page.keyboard.press(key);
}
const AXES = ['V', 'W', 'payload', 'D', 'n', 'S', 'Vs'];
const axisVal = (s, id) => (id === 'V' || id === 'W') ? s.st[id] : s.r[id];

const tests = {
  // Typing a value and pressing Esc should leave the model alone.
  async escCancels(page) {
    await page.click('#n_W', { clickCount: 3 });
    await page.keyboard.type('9000');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const s = await state(page);
    const box = await page.inputValue('#n_W');
    return { pass: s.st.W === 12500 && box === '12500', detail: `W after Esc = ${s.st.W}, box shows ${box}` };
  },
  // Negative payload: Arrow Up on the payload handle should raise payload.
  async payloadUpWhenNegative(page) {
    await set(page, [['S', 700], ['W', 5000]]);
    const a = await state(page);
    await pressOnHandle(page, 2, 'ArrowUp');
    const b = await state(page);
    return { pass: b.r.payload > a.r.payload, detail: `payload ${a.r.payload.toFixed(0)} -> ${b.r.payload.toFixed(0)}` };
  },
  // Payload near zero: arrows should still move it.
  async payloadMovesNearZero(page) {
    await set(page, [['S', 700], ['W', 7100]]);
    const a = await state(page);
    await pressOnHandle(page, 2, 'ArrowUp');
    const b = await state(page);
    await pressOnHandle(page, 2, 'ArrowDown'); await pressOnHandle(page, 2, 'ArrowDown');
    const c = await state(page);
    return { pass: b.r.payload > a.r.payload && c.r.payload < b.r.payload,
      detail: `payload ${a.r.payload.toFixed(2)} -> up ${b.r.payload.toFixed(2)} -> down x2 ${c.r.payload.toFixed(2)}` };
  },
  // Every handle, both keys, at 6 points: the axis moves the right way unless its input sits at a range limit.
  async everyArrowMovesTheRightWay(page) {
    const points = [[], [['W', 16000], ['S', 200]], [['W', 5000], ['S', 700], ['V', 80]], [['V', 240], ['AR', 6]], [['CLmax', 1.2], ['W', 9000]], [['S', 700], ['W', 7100]]];
    const bad = []; let checked = 0;
    for (const pt of points) {
      for (let i = 0; i < 7; i++) for (const [key, dir] of [['ArrowUp', 1], ['ArrowDown', -1]]) {
        await page.evaluate(() => document.getElementById('btnReset').click());
        await set(page, pt);
        const a = await state(page);
        await pressOnHandle(page, i, key);
        const b = await state(page);
        const moved = JSON.stringify(a.st) !== JSON.stringify(b.st);
        const delta = axisVal(b, AXES[i]) - axisVal(a, AXES[i]);
        checked++;
        if (moved && Math.sign(delta) !== dir) bad.push(`${AXES[i]} ${key} went the wrong way at ${JSON.stringify(pt)}`);
        if (!moved) {
          // allowed only if the input this handle drives is at its limit in that direction
          const drv = { V: 'V', W: 'W', payload: 'W', D: 'V', n: 'V', S: 'S', Vs: 'S' }[AXES[i]];
          const lim = { V: [80, 240], W: [5000, 16000], S: [200, 700] }[drv];
          const wantUp = (AXES[i] === 'Vs') ? -dir : dir; // higher stall speed means less wing
          const atLimit = wantUp > 0 ? a.st[drv] >= lim[1] : a.st[drv] <= lim[0];
          const belowVmd = AXES[i] === 'D' && dir < 0 && Math.abs(a.st.V - Math.max(80, a.r.Vmd)) <= 1;
          if (!atLimit && !belowVmd) bad.push(`${AXES[i]} ${key} stuck at ${JSON.stringify(pt)}`);
        }
      }
    }
    return { pass: bad.length === 0, detail: `${checked} presses, ${bad.length} wrong` + (bad.length ? ': ' + bad.slice(0, 3).join('; ') : '') };
  },
  // Influence table with negative payload: no misleading numbers.
  async influenceNegativePayload(page) {
    await set(page, [['S', 700], ['W', 5000]]);
    const cells = await page.$$eval('#sens tbody tr', rows => rows.map(r => r.cells[2].textContent + (r.cells[2].className ? '(' + r.cells[2].className + ')' : '')));
    return { pass: cells.every(c => c.startsWith('–')), detail: 'payload column: ' + cells.join(' ') };
  },
  // Reset should also clear a map selection.
  async resetClearsMapSelection(page) {
    await page.click('#map g.node[aria-label="Payload"]');
    await page.click('#btnReset');
    const key = await page.textContent('#mapkey');
    return { pass: key.includes('Click a box'), detail: `map key after Reset: "${key.trim()}"` };
  },
  // Screen readers get each handle's value.
  async handlesHaveValueText(page) {
    const t = await page.$$eval('#radar circle.handle', cs => cs.map(c => c.getAttribute('aria-valuetext')));
    return { pass: t.every(Boolean), detail: t[0] ? `e.g. "${t[0]}"` : 'no aria-valuetext' };
  },
  // Every handle solve lands within one step of the driven input, at 60/80/120/140% of stock.
  async handleSolvesHitTarget(page) {
    const res = await page.evaluate(() => {
      const ids = ['V', 'W', 'payload', 'D', 'n', 'S', 'Vs'], drv = { V: 'V', W: 'W', payload: 'W', D: 'V', n: 'V', S: 'S', Vs: 'S' };
      const step = { V: 1, W: 10, S: 1 }, lim = { V: [80, 240], W: [5000, 16000], S: [200, 700] };
      const get = id => (id === 'V' || id === 'W') ? window.__app.st[id] : window.__last[id];
      const base = {}; document.getElementById('btnReset').click(); ids.forEach(id => base[id] = get(id));
      const bad = []; let n = 0;
      for (const id of ids) for (const p of [60, 80, 120, 140]) {
        document.getElementById('btnReset').click();
        const target = base[id] * p / 100; window.__app.setInput(id, target); n++;
        const d = drv[id], v0 = window.__app.st[d], got = get(id);
        if (v0 <= lim[d][0] || v0 >= lim[d][1]) continue; // clamped: can't reach, fine
        if (id === 'D' && Math.abs(v0 - Math.max(80, window.__last.Vmd)) <= 1) continue; // below min drag: stops at Vmd
        // the value one step either side of the driven input must bracket the target
        const at = x => { window.__app.setInput(d, x); return get(id); };
        const lo = at(v0 - step[d]), hi = at(v0 + step[d]); window.__app.setInput(d, v0);
        if (!((target - lo) * (target - hi) <= 0)) bad.push(`${id}@${p}%: target ${target.toFixed(2)} got ${got.toFixed(2)}`);
      }
      return { n, bad };
    });
    return { pass: res.bad.length === 0, detail: `${res.n} solves, ${res.bad.length} off` + (res.bad.length ? ': ' + res.bad.slice(0, 3).join('; ') : '') };
  },
  // The page declares a tab icon and it decodes as an image (so browsers don't fall back to /favicon.ico).
  async tabIcon(page) {
    const res = await page.evaluate(() => new Promise(done => {
      const link = document.querySelector('link[rel="icon"]');
      if (!link) return done({ ok: false, why: 'no <link rel="icon">' });
      const img = new Image();
      img.onload = () => done({ ok: img.naturalWidth > 0, why: `decodes at ${img.naturalWidth} x ${img.naturalHeight}` });
      img.onerror = () => done({ ok: false, why: 'icon does not decode' });
      img.src = link.href;
    }));
    return { pass: res.ok, detail: res.why };
  },
  // Stock values from the brief.
  async stockValues(page) {
    const r = (await state(page)).r;
    const want = { Vs: [60.0, 0.05], b: [64.9, 0.05], WS: [33.5, 0.05], We: [7344, 0.5], payload: [5156, 0.5], D: [1115, 0.5], Dp: [815, 0.5], Di: [300, 0.5], LDmax: [12.6, 0.05], n: [2.44, 0.005] };
    const bad = Object.entries(want).filter(([k, [v, tol]]) => Math.abs(r[k] - v) > tol).map(([k, [v]]) => `${k} ${r[k].toFixed(3)} (want ${v})`);
    return { pass: bad.length === 0, detail: bad.length ? bad.join('; ') : 'all 10 match the brief' };
  },
};

// Narrow screen: no sideways scroll and no console errors.
async function narrowCheck(browser, f) {
  const page = await open(browser, f, 400);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.click('#map g.node[aria-label="Wing area"]');
  const r = { pass: sw <= 400 && page.errors.length === 0, detail: `scrollWidth ${sw}, errors ${page.errors.length}` + (page.errors.length ? ': ' + page.errors.join(' | ') : '') };
  await page.close();
  return r;
}

// Random walks through every control; everything rendered must match the reference exactly
// (model numbers, tiles, radar labels, drag chart, map, influence table, math table) wherever payload > 0.
async function regression(browser, ref, cur) {
  const A = await open(browser, ref), B = await open(browser, cur);
  const ranges = { W: [5000, 16000], V: [80, 240], S: [200, 700], CLmax: [1.2, 3.0], AR: [6, 16], Vs: [40, 90], payload: [-2000, 9000], D: [500, 3000], n: [1.5, 4] };
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const snap = page => page.evaluate(() => {
    const r = Object.assign({}, window.__last); delete r.hp;
    const s = window.__app.st;
    return { r, st: { W: s.W, V: s.V, S: s.S, CLmax: s.CLmax, AR: s.AR },
      tiles: document.querySelector('#tiles').innerHTML, radar: [...document.querySelectorAll('#radar text')].map(t => t.textContent + '|' + t.style.fill).join(';'),
      shape: document.querySelector('#radar .shape').getAttribute('points'), curve: document.querySelector('#curve').innerHTML,
      map: [...document.querySelectorAll('#map text, #map .hot')].map(e => e.textContent || e.getAttribute('class')).join(';'),
      sens: document.querySelector('#sens').innerHTML, math: document.querySelector('#math tbody').innerHTML };
  });
  let steps = 0, skipped = 0; const diffs = [];
  for (let walk = 0; walk < 40; walk++) {
    const seq = [];
    for (let k = 0; k < 6; k++) { const keys = Object.keys(ranges), id = keys[Math.floor(rnd() * keys.length)], [a, b] = ranges[id]; seq.push([id, a + rnd() * (b - a)]); }
    for (const p of [A, B]) await p.evaluate(() => document.getElementById('btnReset').click());
    for (const s of seq) {
      await set(A, [s]); await set(B, [s]); steps++;
      const a = await snap(A), b = await snap(B);
      if (!(a.r.payload > 0)) { skipped++; if (JSON.stringify(a.st) !== JSON.stringify(b.st)) diffs.push('state ' + JSON.stringify(s)); continue; }
      for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(`${k} after ${s[0]}=${s[1].toFixed(2)}`);
    }
  }
  const errs = A.errors.concat(B.errors);
  await A.close(); await B.close();
  return { pass: diffs.length === 0 && errs.length === 0,
    detail: `${steps} random steps, ${diffs.length} differences (${skipped} steps with payload ≤ 0 compared on state only)` + (diffs.length ? ': ' + diffs.slice(0, 4).join('; ') : '') + (errs.length ? ' ERRORS: ' + errs.join(' | ') : '') };
}

(async () => {
  const launch = process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'msedge' };
  const browser = await chromium.launch({ ...launch, headless: true });
  const files = reference ? { reference, page: target } : { page: target };
  const rows = [];
  for (const [name, fn] of Object.entries(tests)) {
    const row = { name };
    for (const [label, f] of Object.entries(files)) {
      const page = await open(browser, f);
      try { row[label] = await fn(page); } catch (e) { row[label] = { pass: false, detail: 'threw: ' + e.message.split('\n')[0] }; }
      if (page.errors.length) { row[label].pass = false; row[label].detail += ' [page errors: ' + page.errors.join(' | ') + ']'; }
      await page.close();
    }
    rows.push(row);
  }
  rows.push({ name: 'At 400 px: no sideways scroll, no console errors', page: await narrowCheck(browser, target) });
  if (reference) rows.push({ name: 'Regression: page renders exactly what the reference does', page: await regression(browser, reference, target) });
  await browser.close();

  let failed = 0;
  for (const r of rows) {
    console.log('\n## ' + r.name);
    for (const label of Object.keys(files)) if (r[label]) {
      console.log(`  ${label}: ${r[label].pass ? 'PASS' : 'FAIL'}  ${r[label].detail}`);
      if (label === 'page' && !r[label].pass) failed++;
    }
  }
  console.log(`\n${failed ? failed + ' check(s) failed' : 'All checks passed'} on ${path.basename(target)}.`);
  process.exit(failed ? 1 : 0);
})();
