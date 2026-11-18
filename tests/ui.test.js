// Headless browser checks for the Aircraft Sizing Trade-offs page.
//
//   node tests/ui.test.js [page.html] [reference.html]
//
// page.html defaults to index.html. If reference.html is given (an earlier revision, for example
// `git show <commit>:index.html > old.html`), a regression pass checks that the sizing model gives
// identical numbers to the reference for the Skyvan constants. Works with REVB-style pages whose
// model() takes (W, V, S, CLmax, AR).
//
// Uses an installed Microsoft Edge by default. Set BROWSER_CHANNEL=chrome to use Chrome,
// or BROWSER_PATH to point at any Chromium-based browser.
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const target = path.resolve(process.argv[2] || 'index.html');
const reference = process.argv[3] ? path.resolve(process.argv[3]) : null;
const fileUrl = f => 'file:///' + encodeURI(f.replace(/\\/g, '/'));
const IND = path.join(__dirname, 'independent');

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
const AXES = ['V', 'W', 'U', 'D', 'n', 'S', 'Vs'];            // the 7 draggable radar handles, in order
const DRIVES = { V: 'V', W: 'W', U: 'W', D: 'V', n: 'V', S: 'S', Vs: 'S' };
const LIMITS = { V: [40, 500], W: [500, 1300000], S: [30, 10000] };
const axisVal = (s, id) => (id === 'V' || id === 'W') ? s.st[id] : s.r[id];
const relStep = (id, v) => id === 'V' ? 1 : Math.pow(10, Math.floor(Math.log10(v)) - 3); // V is linear step 1; W and S round to 4 significant figures

const tests = {
  // ---------- carried over from REVB ----------
  async escCancels(page) {
    await page.click('#n_W', { clickCount: 3 });
    await page.keyboard.type('9000');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const s = await state(page);
    const box = await page.inputValue('#n_W');
    return { pass: s.st.W === 12500 && box === '12500', detail: `W after Esc = ${s.st.W}, box shows ${box}` };
  },
  async usefulLoadUpWhenNegative(page) {
    await set(page, [['S', 700], ['W', 5000]]);
    const a = await state(page);
    await pressOnHandle(page, 2, 'ArrowUp');
    const b = await state(page);
    return { pass: a.r.U < 0 && b.r.U > a.r.U, detail: `useful load ${a.r.U.toFixed(0)} -> ${b.r.U.toFixed(0)}` };
  },
  async usefulLoadMovesNearZero(page) {
    await set(page, [['S', 700], ['W', 7100]]);
    const a = await state(page);
    await pressOnHandle(page, 2, 'ArrowUp');
    const b = await state(page);
    await pressOnHandle(page, 2, 'ArrowDown'); await pressOnHandle(page, 2, 'ArrowDown');
    const c = await state(page);
    return { pass: b.r.U > a.r.U && c.r.U < b.r.U, detail: `useful load ${a.r.U.toFixed(2)} -> up ${b.r.U.toFixed(2)} -> down x2 ${c.r.U.toFixed(2)}` };
  },
  async everyArrowMovesTheRightWay(page) {
    const points = [[], [['W', 16000], ['S', 200]], [['W', 5000], ['S', 700], ['V', 80]], [['V', 240], ['AR', 6]], [['CLmax', 1.2], ['W', 9000]], [['S', 700], ['W', 7100]],
      [['W', 1300000], ['S', 30]], [['V', 40], ['W', 500]], [['V', 500], ['S', 10000]]];
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
          const drv = DRIVES[AXES[i]], lim = LIMITS[drv];
          const wantUp = (AXES[i] === 'Vs') ? -dir : dir; // higher stall speed means less wing
          const atLimit = wantUp > 0 ? a.st[drv] >= lim[1] : a.st[drv] <= lim[0];
          // cruise drag: stopping at minimum drag or at either end of the speed range is correct
          const dragStop = AXES[i] === 'D' && (a.st.V <= 40 || a.st.V >= 500 || Math.abs(a.st.V - a.r.Vmd) <= 1);
          if (!atLimit && !dragStop) bad.push(`${AXES[i]} ${key} stuck at ${JSON.stringify(pt)}`);
        }
      }
    }
    return { pass: bad.length === 0, detail: `${checked} presses, ${bad.length} wrong` + (bad.length ? ': ' + bad.slice(0, 3).join('; ') : '') };
  },
  async influenceNegativeUsefulLoad(page) {
    await set(page, [['S', 700], ['W', 5000]]);
    const cells = await page.$$eval('#sens tbody tr', rows => rows.map(r => r.cells[2].textContent));
    return { pass: cells.length === 5 && cells.every(c => c === '–'), detail: 'useful load column: ' + cells.join(' ') };
  },
  async resetClearsMapSelection(page) {
    await page.click('#map g.node[aria-label="Useful load"]');
    await page.click('#btnReset');
    const key = await page.textContent('#mapkey');
    return { pass: key.includes('Click a box'), detail: `map key after Reset: "${key.trim()}"` };
  },
  async handlesHaveValueText(page) {
    const t = await page.$$eval('#radar circle.handle', cs => cs.map(c => c.getAttribute('aria-valuetext')));
    return { pass: t.length === 7 && t.every(Boolean), detail: `${t.length} handles, e.g. "${t[0]}"` };
  },
  async handleSolvesHitTarget(page) {
    // every handle, at 30/60/150/300% of the reference, for three very different aircraft
    const res = await page.evaluate(({ AXES, DRIVES, LIMITS }) => {
      const get = id => (id === 'V' || id === 'W') ? window.__app.st[id] : window.__last[id];
      const step = (d, v) => d === 'V' ? 1 : Math.pow(10, Math.floor(Math.log10(v)) - 3);
      const bad = []; let n = 0, skipped = 0;
      for (const preset of ['skyvan', 'c172', 'b737']) {
        window.__app.loadPreset(preset); const base = {}; AXES.forEach(id => base[id] = get(id));
        for (const id of AXES) for (const p of [30, 60, 150, 300]) {
          window.__app.loadPreset(preset);
          const target = base[id] * p / 100; window.__app.setInput(id, target); n++;
          const d = DRIVES[id], v0 = window.__app.st[d], got = get(id);
          if (v0 <= LIMITS[d][0] || v0 >= LIMITS[d][1]) { skipped++; continue; } // clamped: can't reach
          if (id === 'D' && Math.abs(v0 - Math.max(40, window.__last.Vmd)) <= 1) { skipped++; continue; } // below min drag
          const at = x => { window.__app.setInput(d, x); return get(id); };
          const s0 = step(d, v0), lo = at(v0 - s0), hi = at(v0 + s0); window.__app.setInput(d, v0);
          if (!((target - lo) * (target - hi) <= 0)) bad.push(`${preset} ${id}@${p}%: target ${target.toFixed(3)} got ${got.toFixed(3)}`);
        }
      }
      return { n, bad, skipped };
    }, { AXES, DRIVES, LIMITS });
    return { pass: res.bad.length === 0, detail: `${res.n} solves (${res.skipped} at a range limit), ${res.bad.length} off` + (res.bad.length ? ': ' + res.bad.slice(0, 3).join('; ') : '') };
  },
  async stockValues(page) {
    const r = (await state(page)).r;
    const want = { Vs: [60.0, 0.05], b: [64.9, 0.05], WS: [33.5, 0.05], We: [7344, 0.5], U: [5156, 0.5], D: [1115, 0.5], Dp: [815, 0.5], Di: [300, 0.5], LDmax: [12.6, 0.05], n: [2.44, 0.005], VTAS: [148, 0.5], sigma: [0.7385, 0.0001] };
    const bad = Object.entries(want).filter(([k, [v, tol]]) => Math.abs(r[k] - v) > tol).map(([k, [v]]) => `${k} ${r[k].toFixed(3)} (want ${v})`);
    return { pass: bad.length === 0, detail: bad.length ? bad.join('; ') : `all ${Object.keys(want).length} match the brief` };
  },
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

  // ---------- new in this revision ----------
  // The page's model must match the independent implementation written from docs/payload-range-spec.md.
  async matchesIndependentImplementation(page) {
    const cases = JSON.parse(fs.readFileSync(path.join(IND, 'cases.json'), 'utf8'));
    const expected = JSON.parse(fs.readFileSync(path.join(IND, 'expected.json'), 'utf8'));
    const got = await page.evaluate(cases => cases.map(c => { const r = model(c); return { id: c.id, r: JSON.parse(JSON.stringify(r)) }; }), cases);
    let worst = 0, worstAt = '', compared = 0, skippedT = 0; const bad = [];
    const cmp = (label, a, e, absTol) => { compared++; const err = Math.abs(a - e), rel = err / Math.max(Math.abs(e), 1e-9);
      const score = Math.min(rel, err / absTol); if (score > worst) { worst = score; worstAt = `${label}: page ${a} vs independent ${e}`; }
      if (!(err <= absTol || rel <= 1e-9)) bad.push(`${label}: page ${a} vs ${e}`); };
    for (const { id, r } of got) {
      const e = expected[id];
      for (const k of ['Vs', 'b', 'WS', 'We', 'U', 'q', 'Dp', 'Di', 'LD', 'LDmax', 'Vmd', 'n', 'sigma', 'VTAS', 'ff0']) cmp(`${id}.${k}`, r[k], e[k], 1e-9);
      cmp(`${id}.D(total)`, r.D, e.Dp + e.Di, 1e-9);
      for (const P of ['A', 'B', 'C', 'D']) {
        const m = r.pr[P], x = e[P];
        cmp(`${id}.${P}.payload`, m.P, x.payload, 1e-6); cmp(`${id}.${P}.fuel`, m.F, x.fuel, 1e-6);
        // with no useful load the spec leaves takeoff weight undefined (page: empty weight, independent: 0)
        if (e.U > 0) cmp(`${id}.${P}.takeoff`, m.T, x.takeoffWeight, 1e-6); else skippedT++;
        cmp(`${id}.${P}.reserve`, m.Fr, x.reserve, 0.02); cmp(`${id}.${P}.range`, m.R, x.range, 0.01);
      }
    }
    return { pass: bad.length === 0, detail: `${got.length} cases, ${compared} values (${skippedT} undefined takeoff weights skipped), ${bad.length} mismatched` + (bad.length ? ': ' + bad.slice(0, 3).join('; ') : `; closest call ${worstAt}`) };
  },
  // Every preset loads cleanly, becomes the reference, and draws real numbers everywhere.
  async presetsLoadCleanly(page) {
    const res = await page.evaluate(() => Object.keys(PRESETS).map(id => {
      window.__app.loadPreset(id);
      const txt = document.body.innerText, pcts = [...document.querySelectorAll('#radar .ax-d')].map(t => t.textContent);
      const prPath = document.querySelector('#prchart path.ct');
      return { id, nan: /NaN|Infinity|undefined/.test(txt), allRef: pcts.every(t => t === 'reference'), pr: !!prPath, title: document.getElementById('subline').textContent.includes(PRESETS[id].name),
        selected: document.getElementById('preset').value === id, RB: window.__last.RB, RD: window.__last.RD };
    }));
    const bad = res.filter(x => x.nan || !x.allRef || !x.pr || !x.title || !x.selected || !(x.RD > 0));
    return { pass: bad.length === 0, detail: res.map(x => `${x.id} ferry ${x.RD.toFixed(0)} nmi`).join(', ') + (bad.length ? ' | BAD: ' + JSON.stringify(bad) : '') };
  },
  // Log sliders reach both ends of the much wider ranges, and typed values survive.
  async wideLogSliders(page) {
    const out = await page.evaluate(() => {
      const r = {}; const slide = (id, pos) => { const s = document.getElementById('s_' + id); s.value = pos; s.dispatchEvent(new Event('input', { bubbles: true })); return window.__app.st[id]; };
      r.Wmin = slide('W', 0); r.Wmax = slide('W', 1000); r.Smin = slide('S', 0); r.Smax = slide('S', 1000);
      window.__app.loadPreset('skyvan'); r.Wmid = slide('W', 500);
      window.__app.setInput('W', 174200); r.typed = window.__app.st.W; r.box = document.getElementById('n_W').value;
      return r;
    });
    const ok = out.Wmin === 500 && out.Wmax === 1300000 && out.Smin === 30 && out.Smax === 10000 && Math.abs(out.Wmid - Math.sqrt(500 * 1300000)) / out.Wmid < 0.001 && out.typed === 174200 && out.box === '174200';
    return { pass: ok, detail: `W slider ${out.Wmin} to ${out.Wmax} lb (middle ${out.Wmid}), S ${out.Smin} to ${out.Smax} ft², typed 174200 -> ${out.typed} (box ${out.box})` };
  },
  // Charts rescale so the cruise point and every payload-range corner are on the plot, for every preset.
  async chartsScaleToAircraft(page) {
    const res = await page.evaluate(() => Object.keys(PRESETS).map(id => {
      window.__app.loadPreset(id); const r = window.__last, ax = window.__curveAxes;
      const inside = (sel, box) => [...document.querySelectorAll(sel)].every(c => { const x = +c.getAttribute('cx'), y = +c.getAttribute('cy'); return x >= box[0] - 0.5 && x <= box[2] + 0.5 && y >= box[1] - 0.5 && y <= box[3] + 0.5; });
      return { id, cruiseOn: window.__app.st.V < ax.vmax && r.D < ax.dmax, prOn: inside('#prchart circle', [62, 18, 620, 296]), dragOn: inside('#curve circle', [62, 14, 884, 286]) };
    }));
    const bad = res.filter(x => !x.cruiseOn || !x.prOn || !x.dragOn);
    return { pass: bad.length === 0, detail: `${res.length} presets checked` + (bad.length ? ': ' + JSON.stringify(bad) : ', all points inside both plots') };
  },
  // Propeller/jet switch shows the right inputs and uses the right fuel law.
  async propJetSwitch(page) {
    const vis = () => page.evaluate(() => ['cp', 'eta', 'ct'].map(id => !document.getElementById('n_' + id).closest('.row').hidden));
    // range ÷ ∫dw/D must equal the propulsion constant: 550η/(1.688 c_p) for prop, V_true/c_t for jet
    const constant = s => { const m = s.r.pr.C, k = Math.sqrt(s.r.k2 / s.r.k0), J = (Math.atan(m.w1 * k) - Math.atan(m.w2 * k)) / Math.sqrt(s.r.k0 * s.r.k2); return m.R / J; };
    const a = await vis(), sa = await state(page);
    await page.click('#bJet');
    const b = await vis(), sb = await state(page);
    await page.click('#bProp');
    const c = await vis();
    const kProp = constant(sa), wantProp = 550 * sa.st.eta / (1.688 * sa.st.cp), kJet = constant(sb), wantJet = sb.r.VTAS / sb.st.ct;
    const ok = a.join() === 'true,true,false' && b.join() === 'false,false,true' && c.join() === a.join() && sb.st.prop === 'jet' && sb.r.RC !== sa.r.RC
      && Math.abs(kProp / wantProp - 1) < 1e-9 && Math.abs(kJet / wantJet - 1) < 1e-9;
    return { pass: ok, detail: `rows shown prop ${a} / jet ${b}; range constant prop ${kProp.toFixed(3)} (want ${wantProp.toFixed(3)}), jet ${kJet.toFixed(3)} (want ${wantJet.toFixed(3)})` };
  },
  // "Make this the reference" rebases the radar and tiles on the current point.
  async makeReference(page) {
    await set(page, [['W', 15000], ['S', 420]]);
    const before = await page.$$eval('#radar .ax-d', t => t.map(x => x.textContent));
    await page.click('#btnRef');
    const after = await page.$$eval('#radar .ax-d', t => t.map(x => x.textContent));
    const sub = await page.textContent('#subline');
    await page.click('#btnReset');
    const back = await page.$$eval('#radar .ax-d', t => t.map(x => x.textContent));
    const ok = before.some(t => t !== 'reference') && after.every(t => t === 'reference') && sub.includes('your aircraft') && back.every(t => t === 'reference');
    return { pass: ok, detail: `before: ${before.slice(0, 3).join(', ')}…; after: ${after.slice(0, 3).join(', ')}…; subtitle mentions "your aircraft": ${sub.includes('your aircraft')}` };
  },
  // Editing the empty weight solves the fixed fraction, and the new value is what the model uses.
  async emptyWeightSolvesFraction(page) {
    await set(page, [['We', 8000]]);
    const s = await state(page);
    const ok = Math.abs(s.r.We - 8000) < 0.02 && Math.abs(s.st.fe - (8000 - 6 * 373) / 12500) < 1e-6;
    return { pass: ok, detail: `empty weight ${s.r.We.toFixed(2)} lb, fe ${s.st.fe}` };
  },
  // The payload-range diagram is a monotone staircase: range never shrinks from B to C to D, payload never grows.
  async payloadRangeShape(page) {
    const res = await page.evaluate(() => {
      const bad = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const lim = { W: [500, 1300000], S: [30, 10000], V: [40, 500], AR: [3, 40], h: [0, 51000], Fmax: [10, 400000], Pmax: [10, 300000], tr: [0, 120], fc: [0, 0.08], CD0: [0.008, 0.12] };
      for (let i = 0; i < 400; i++) {
        window.__app.loadPreset(Object.keys(PRESETS)[i % 5]);
        Object.entries(lim).forEach(([k, [a, b]]) => { if (rnd() < 0.5) window.__app.setInput(k, k === 'W' || k === 'S' || k === 'Fmax' || k === 'Pmax' ? a * Math.pow(b / a, rnd()) : a + rnd() * (b - a)); });
        if (rnd() < 0.3) window.__app.st.prop = 'jet';
        const r = model(window.__app.st), p = r.pr;
        const pts = [p.A, p.B, p.C, p.D];
        if (pts.some(x => x.P < -1e-9 || x.F < -1e-9 || x.R < 0 || !isFinite(x.R))) bad.push('negative or non-finite at ' + i);
        if (!(p.B.R <= p.C.R + 1e-9 && p.C.R <= p.D.R + 1e-9)) bad.push(`range order ${p.B.R.toFixed(1)}, ${p.C.R.toFixed(1)}, ${p.D.R.toFixed(1)} at ${i}`);
        if (!(p.A.P >= p.B.P - 1e-9 && p.B.P >= p.C.P - 1e-9 && p.C.P >= p.D.P - 1e-9)) bad.push('payload order at ' + i);
        if (r.U > 0 && pts.some(x => x.T > window.__app.st.W + 1e-6)) bad.push('over max takeoff weight at ' + i);
      }
      return bad;
    });
    return { pass: res.length === 0, detail: `400 random aircraft, ${res.length} problems` + (res.length ? ': ' + res.slice(0, 3).join('; ') : '') };
  },
  // Random walks over the full new ranges never put NaN on screen or throw.
  async noNaNAnywhere(page) {
    const res = await page.evaluate(() => {
      let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const bad = [];
      const ids = ['W', 'S', 'V', 'Vs', 'CLmax', 'AR', 'h', 'CD0', 'e', 'We', 'ws', 'cp', 'eta', 'ct', 'Fmax', 'Pmax', 'tr', 'fc', 'U', 'D', 'n'];
      for (let i = 0; i < 300; i++) {
        const id = ids[Math.floor(rnd() * ids.length)], R = { U: [-5e4, 5e5], D: [10, 1e5], n: [1, 6] }[id];
        const inp = document.getElementById('n_' + id);
        const v = R ? R[0] + rnd() * (R[1] - R[0]) : (+inp.min) + rnd() * ((+inp.max) - (+inp.min));
        if (R) window.__app.setInput(id, v); else { inp.value = v; inp.dispatchEvent(new Event('change')); }
        if (rnd() < 0.1) document.getElementById(rnd() < 0.5 ? 'bJet' : 'bProp').click();
        if (/NaN|Infinity|undefined/.test(document.body.innerText)) { bad.push(`after ${id}=${v}`); break; }
      }
      return bad;
    });
    return { pass: res.length === 0, detail: `300 random edits` + (res.length ? ', NaN on screen ' + res[0] : ', no NaN, Infinity or undefined on screen') };
  },
};

// Narrow screen, every preset: no sideways scroll and no console errors.
async function narrowCheck(browser, f) {
  const page = await open(browser, f, 400);
  const widths = await page.evaluate(() => Object.keys(PRESETS).map(id => { window.__app.loadPreset(id); return document.documentElement.scrollWidth; }));
  await page.click('#map g.node[aria-label="Wing area"]');
  const r = { pass: widths.every(w => w <= 400) && page.errors.length === 0, detail: `scrollWidth per preset ${widths.join(', ')}; errors ${page.errors.length}` + (page.errors.length ? ': ' + page.errors.join(' | ') : '') };
  await page.close();
  return r;
}

// Sizing model regression against an earlier page (REVB-style model(W,V,S,CLmax,AR)), Skyvan constants.
async function regression(browser, ref, cur) {
  const A = await open(browser, ref), B = await open(browser, cur);
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const keys = ['Vs', 'b', 'c', 'CLa', 'WS', 'q', 'mu', 'Kg', 'n', 'Dp', 'Di', 'D', 'LD', 'LDmax', 'Vmd', 'We'];
  let worst = 0, n = 0; const bad = [];
  for (let i = 0; i < 500; i++) {
    const x = { W: 5000 + rnd() * 11000, V: 80 + rnd() * 160, S: 200 + rnd() * 500, CLmax: 1.2 + rnd() * 1.8, AR: 6 + rnd() * 10 };
    const a = await A.evaluate(x => { const r = model(x.W, x.V, x.S, x.CLmax, x.AR); r.U = r.payload; return r; }, x);
    const b = await B.evaluate(x => model(Object.assign({}, PRESETS.skyvan, x)), x);
    for (const k of keys.concat(['U'])) { n++; const rel = Math.abs(a[k] - b[k]) / Math.max(1e-12, Math.abs(a[k])); worst = Math.max(worst, rel); if (rel > 1e-12) bad.push(`${k} at ${JSON.stringify(x)}`); }
  }
  const errs = A.errors.concat(B.errors);
  await A.close(); await B.close();
  return { pass: bad.length === 0 && errs.length === 0, detail: `500 random points, ${n} values, worst relative difference ${worst.toExponential(1)}` + (bad.length ? ': ' + bad.slice(0, 3).join('; ') : '') + (errs.length ? ' ERRORS: ' + errs.join(' | ') : '') };
}

(async () => {
  const launch = process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'msedge' };
  const browser = await chromium.launch({ ...launch, headless: true });
  const rows = [];
  for (const [name, fn] of Object.entries(tests)) {
    const page = await open(browser, target);
    let res;
    try { res = await fn(page); } catch (e) { res = { pass: false, detail: 'threw: ' + e.message.split('\n')[0] }; }
    if (page.errors.length) { res.pass = false; res.detail += ' [page errors: ' + page.errors.join(' | ') + ']'; }
    await page.close();
    rows.push({ name, ...res });
  }
  rows.push({ name: 'At 400 px, every preset: no sideways scroll, no console errors', ...(await narrowCheck(browser, target)) });
  if (reference) rows.push({ name: 'Regression: sizing model identical to the reference page', ...(await regression(browser, reference, target)) });
  await browser.close();

  let failed = 0;
  for (const r of rows) { console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.detail}`); if (!r.pass) failed++; }
  console.log(`\n${failed ? failed + ' of ' + rows.length + ' checks failed' : 'All ' + rows.length + ' checks passed'} on ${path.basename(target)}.`);
  process.exit(failed ? 1 : 0);
})();
