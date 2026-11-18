# Aircraft sizing trade-offs: project brief

## Purpose

An interactive web page that shows how the main aircraft sizing quantities affect each other, from a light single to a narrow-body jet. Change one value and see how the physics moves the others, including a rough payload-range diagram. It is a teaching and early-trade tool, not a design tool.

- Live pages: https://neal-tag.github.io/Aircraft-Sizing-Tradeoffs/ (public, serves `main`) and https://claude.ai/artifact/8i9AsJkd8AxCoPAtvNRe55 (private unless shared).
- Reference implementation: `index.html` in this repository, currently REVE. Where the brief and the code disagree, the code is what shipped. See "Revision history".
- Format: one self-contained HTML file. No libraries. Inline SVG for all drawings. The only outside request is Google Fonts.
- Starting point: the stock Short SC.7 Skyvan Series 3, powered. Four other presets: Cessna 172S, King Air 350, ATR 72-600 and Boeing 737-800 (values and sources in `docs/presets.md`).
- Payload-range model: `docs/payload-range-spec.md`.

## Units and constants

| Symbol | Value | Meaning |
|---|---|---|
| KT | 1.688 | ft/s per knot |
| ρ | 0.002377 slug/ft³ | Sea-level air density. Speeds that set drag and gust load are equivalent airspeed. |
| g | 32.2 ft/s² | Gravity |
| Ude | 50 ft/s | Gust velocity |

Per-aircraft constants, editable under "Aircraft constants" and set by each preset:

| Symbol | Skyvan value | Range | Meaning |
|---|---|---|---|
| CD0 | 0.040 | 0.008 to 0.12 | Zero-lift drag coefficient on wing area |
| e | 0.72 | 0.5 to 1.0 | Span efficiency |
| M_crit | 0.65 | 0.5 to 0.95 | Critical Mach number for compressibility drag |
| fe | 0.4085 | 0 to 0.95 | Empty weight fraction of gross weight. Set by typing an empty weight. |
| ws | 6 lb/ft² | 0 to 30 | Empty weight added per square foot of wing |

## Inputs, defaults and ranges

Log sliders move by ratio and round to 4 significant figures. Linear sliders round to their step.

| Input | Skyvan default | Range | Step | Notes |
|---|---|---|---|---|
| Gross weight W | 12,500 lb | 500 to 1,300,000 | log | Maximum takeoff weight |
| Wing area S | 373 ft² | 30 to 10,000 | log | |
| Cruise speed V | 127 kt | 40 to 500 | 1 | Equivalent airspeed. 148 kt true at 10,000 ft. |
| Maximum lift coefficient CLmax | 2.75 | 0.8 to 4.0 | 0.05 | Landing configuration. From the published 60 kt stall at 12,500 lb. |
| Aspect ratio AR | 11.3 | 3 to 40 | 0.1 | 64.9 ft span² ÷ 373 ft² |
| Cruise altitude h | 10,000 ft | 0 to 51,000 | 500 | ISA. Sets true airspeed. |
| Stall speed Vs | result, 60.0 kt | 25 to 200 | 0.5 | Setting it resizes the wing |
| Engines | propeller | propeller or jet | | Chooses the fuel-flow law |
| BSFC c_p (prop) | 0.60 lb/hp/h | 0.25 to 1.2 | 0.01 | Estimate |
| Propeller efficiency η (prop) | 0.80 | 0.4 to 0.95 | 0.01 | |
| TSFC c_t (jet) | 0.60 lb/lbf/h | 0.3 to 1.5 | 0.01 | |
| Maximum fuel | 2,262 lb | 10 to 400,000 | log | EASA type certificate |
| Maximum payload | 4,600 lb | 10 to 300,000 | log | Cabin limit. Crew counts as payload. |
| Maximum landing weight | 12,500 lb | 500 to 1,300,000 | log | Caps payload |
| Reserve | 45 min | 0 to 120 | 5 | At cruise fuel flow |
| Taxi and takeoff fuel | 0.8% | 0 to 3% | 0.01% | Of takeoff weight, burned before the climb |
| Average climb rate | 1,150 ft/min | 0 to 6,000 | 10 | 0 leaves the climb out |

## Equations

Sizing (unchanged since REVA, and bit-identical to REVB for the same inputs):

Lift-curve slope (per radian): CLa = 2π·AR ÷ (2 + √(4 + AR² ÷ 0.9025))

Geometry and loading:
- q = ½ ρ (V·KT)²
- b = √(AR·S) (span, ft)
- c = S ÷ b (mean chord, ft)
- W/S = W ÷ S

Stall:
- Vs = √(2W ÷ (ρ·S·CLmax)) ÷ KT (knots)
- Inverse, used when stall speed is set: S = 2W ÷ (ρ·(Vs·KT)²·CLmax)
- The powered stall is carried entirely by CLmax. Slipstream and thrust are not modelled separately.

Gust load factor (FAR 23 style):
- μ = 2(W/S) ÷ (ρ·c·CLa·g)
- Kg = 0.88μ ÷ (5.3 + μ)
- n = 1 + Kg·Ude·V·CLa ÷ (498·W/S), with V in knots equivalent airspeed

Drag:
- Dp = q·S·CD0 (parasite)
- Di = W² ÷ (q·π·b²·e) (induced)
- D = Dp + Di
- L/D at cruise = W ÷ D
- K = 1 ÷ (π·AR·e)
- Best L/D = 0.5 ÷ √(CD0·K)
- Minimum drag speed Vmd = √(2(W/S) ÷ ρ · √(K ÷ CD0)) ÷ KT

Weight:
- Empty weight We = fe·W + ws·S
- Useful load U = W − We (payload plus fuel). REVA and REVB called this "payload", which was wrong once fuel is modelled.

Altitude, fuel flow and range: see `docs/payload-range-spec.md` (version 2). In short:
- Atmosphere: σ and θ from ISA. V_true = V ÷ √σ. Mach = V_true ÷ (661.48·√θ).
- Compressibility: ΔCD = 20·(M − M_crit)⁴ above M_crit (Lock's law). Cruise drag D = Dp + Dc + Di, and L/D at cruise uses this D.
- At the cruise EAS, D(w) = k₀ + k₂w². Fuel flow is c_p·D·V_true·KT ÷ (550η) for a prop, or c_t·D for a jet.
- Mission: taxi and takeoff, a climb at the cruise EAS (power or thrust for drag plus climbing), a cruise using the exact constant-altitude, constant-speed integral, an idle glide descent at 10% of cruise fuel flow, and a timed reserve. Range = climb + cruise + descent distance.
- Payload is capped by maximum payload and by maximum landing weight (landing with the reserve).
- The corner points are: A, maximum payload at zero range; B, maximum payload with fuel up to maximum takeoff weight; C, full tanks; D, full tanks with no payload.
- Best-range speed: the EAS of least drag (prop) or most true airspeed per unit drag (jet), including compressibility, at W·(1 − taxi).

## Values at the Skyvan defaults

| Quantity | Value |
|---|---|
| Stall speed | 60.0 kt |
| Span | 64.9 ft |
| Wing loading | 33.5 lb/ft² |
| Empty weight | 7,344 lb |
| Useful load | 5,156 lb |
| Cruise drag | 1,115 lb (parasite 815, induced 300) |
| Best L/D | 12.6 |
| Gust load factor | 2.44 g |
| Density ratio, true airspeed | 0.7385, 147.8 kt |
| Mach number | 0.232 |
| Cruise fuel flow | 378 lb/h |
| Climb with full tanks | 8.7 min, 98 lb, 20 nmi |
| Range: max payload, full tanks, ferry | 66, 770, 882 nmi |
| Best-range speed | 99 kt EAS (ferry 1,228 nmi if flown there) |

## Page layout

The page is a two-column workbench. Every input is in a docked control rail on the left; the results are on the right, with the key ones pinned in view.

1. **Control rail (left, 372 px, dark):** stays in place while the results scroll, and scrolls on its own if it is taller than the window.
   - The aircraft preset menu and the "Make reference", "Pin this point" and "Reset" buttons.
   - A one-line note on how to drive the page.
   - Collapsible groups, each a slider plus typed box per input:
     - **Wing and weight:** stall speed, wing area, gross weight, CLmax and aspect ratio.
     - **Cruise:** cruise speed (EAS) and altitude.
     - **Engines and fuel:** the propeller/jet switch, BSFC and propeller efficiency (props) or TSFC (jets), and maximum fuel.
     - **Mission and limits:** maximum payload, maximum landing weight, reserve, taxi fuel and climb rate.
     - **Aircraft constants** (closed by default, id `constBox`): CD0, span efficiency, critical Mach, empty weight, and empty weight per ft² of wing.
   - A control's hint shows while that control has focus.
2. **Header (right):** title, and a subtitle naming the preset and reference.
3. **Readout strip:** pinned 12 px below the top of the window while the results scroll. It has seven readouts: range with full tanks, range at max payload, ferry range, useful load, cruise drag, fuel flow and Mach. Each shows its value, unit and % change from the reference ("±0%" when unchanged). Green means better and red means worse; Mach stays neutral.
4. **Design point:** the radar, with a spec sheet beside it.
   - The radar has eight axes on a log scale, from 25% of the reference (centre) to 400% (rim). The dashed ring is the reference: the preset, or your own point after "Make reference". The filled shape is the current point, and a dotted outline shows a pinned point.
     - Axes in order: cruise speed (EAS), gross weight, useful load, cruise drag, gust load factor, wing area, stall speed, range with full tanks.
     - The first seven are draggable handles. Range is a result only: a small dot, with its name in muted italic.
     - Labels show the value and the % change from the reference. Green means better, red means worse; speed, weight and wing area stay neutral. "Off scale" marks values outside 25 to 400%.
   - The spec sheet has one row each for wing loading, span, empty weight, cruise L/D, best L/D, minimum drag speed, true airspeed and Mach number. Each row shows the value and the % change from the reference.
5. **Payload and range:**
   - Left: the payload-range diagram, with the reference dashed, points B, C and D labelled, and a warning line.
   - Right: four readouts that aren't in the strip (max payload, payload with full tanks, climb time with full tanks, best-range speed) and the "Fly at best-range speed" button.
   - The warning line covers:
     - no useful load;
     - a maximum-payload mission with no usable cruise fuel;
     - payload capped by landing weight;
     - cruise speed below stall;
     - cruise well past drag divergence.
6. **Drag against speed:** parasite, induced and total drag against equivalent airspeed. Both axes rescale to the current aircraft with round-number ticks. Shows the stall line, minimum drag point, cruise point and the reference total drag dashed.
7. **How the quantities connect:** the 16-box dependency map, unchanged except that "Payload" is now "Useful load".
8. **Influence table:** % change in each result for a 1% increase in wing area, gross weight, cruise speed, CLmax or aspect ratio. The results are stall speed, useful load, parasite, induced and total drag, gust factor, range at max payload and ferry range. "–" means the result is zero or negative.
9. **The math, with your numbers:** grouped rows (sizing; altitude and fuel flow; range at maximum payload, worked through point B).
10. **Notes:** the core link, drag, range, the preset's sources, and assumptions.

## Handles: what each one moves

| Handle | What it changes |
|---|---|
| Wing area, gross weight, cruise speed | Set directly |
| Stall speed | Wing area, from the inverse stall equation |
| Useful load | Gross weight: W = (U + ws·S) ÷ (1 − fe) |
| Gust load factor | Cruise speed, because n is linear in V: V = (n − 1) ÷ k, with k = (n0 − 1) ÷ V0 |
| Cruise drag | Cruise speed, by bisection on the fast side of minimum drag. It stops at Vmd if the target is below minimum drag. If minimum drag is above 500 kt, it solves on the slow side instead. |

Arrow keys step a handle by 1% of the reference value or of the current value, whichever is bigger, in the direction of the key. If rounding swallows the step, it grows (up to 10×) until something moves. Dragging maps the pointer to the log scale.

Typed values apply on Enter or when you click away; Esc cancels. All values clamp to their range.

## Dependency map

16 boxes. Edges:
- Stall: S → Vs, W → Vs, CLmax → Vs
- Speed: V → q
- Span: S → b, AR → b
- Wing loading: S → W/S, W → W/S
- Gust: W/S → n, V → n, AR → n
- Parasite drag: S → Dp, q → Dp
- Induced drag: b → Di, W → Di, q → Di
- Drag: Dp → D, Di → D
- Empty weight: S → We, W → We
- Useful load: We → U, W → U
- L/D: D → L/D, W → L/D

Interaction: by default everything downstream of the last control touched is highlighted. Clicking a box shows its ancestors (purple) and descendants (green); click again or on empty space to clear. Boxes work with Tab and Enter.

The map doesn't yet show altitude, fuel or range.

## Implementation details

### Look
- Fonts (Google Fonts): Barlow Semi Condensed 500/600 for headings, IBM Plex Sans 400/500/600 for body text (15 px), IBM Plex Mono 400/500 for numbers.
- Layout: a 372 px sticky rail, then a main column of at most 1,240 px with 32 px side padding. Panels have a 1 px border, a 6 px radius, 22 × 24 px padding and a soft drop shadow.
- The design-point panel is radar and spec sheet (1.45 : 1). The payload-range panel is chart and readouts (1.7 : 1). Both stack below 1,180 px.
- The rail narrows to 330 px below 1,180 px.
- Below 900 px the page is one column, ordered as header, strip, design point, then the rail, then the rest. Nothing is sticky, the strip shows six readouts in three columns, and the radar labels grow so they stay readable.
- Logo: the Tamarack wordmark, embedded once as a transparent PNG `data:` URL in the `--logo` token and drawn as a CSS mask, so it takes the text colour. It is white at the top of the rail, and navy above the title below 900 px, where the rail's brand block hides.
- Tab icon: an inline SVG `data:` URL showing a white radar shape on the accent green.
- Theme follows the system; `data-theme` on `<html>` overrides it. The colour tokens are:
  - bg, panel, ink, muted, line, grid, accent, accent-soft, accent-fill, pin, pin-fill, good, bad, warn (REVE moved these to a cool slate palette);
  - for the rail: rail, rail-2, rail-ink, rail-muted, rail-line, rail-field and rail-accent.

### Numbers
- Values that span orders of magnitude are shown as whole numbers from 100 up, and to about 3 significant figures below that.
- Chart ticks use 1-2-5 steps. Values from 10,000 up are shown as "12k".

### Charts
- Drag chart: viewBox 900 × 330, plot x 62 to 884. The speed axis runs to a round number at or above max(1.5 × cruise, 1.9 × Vmd, 1.4 × Vs). The drag axis runs to a round number at or above max(2.2 × minimum drag, 1.15 × cruise drag).
- Payload-range chart: viewBox 640 × 340, plot x 62 to 620, y 18 to 296. Both axes cover the current and reference diagrams with a little headroom. Points B, C and D are dots. Labels give the range, and coinciding points share one label (for example "B=C").

### Presets and reference
- Choosing a preset loads every input and makes it the reference.
- "Make this the reference" makes the current point the reference ("your aircraft") and clears the pin.
- Reset reloads the current preset.

### Tests and data files
- `tests/ui.test.js`: 32 headless-browser checks. Add a reference page as a second argument to also run a bit-for-bit sizing regression.
- `tests/independent/`: an implementation of the spec written separately, by a different agent that never saw the page code. It holds the test cases and its expected outputs, which the test suite compares with the page.
- `tests/presets-report.js`: prints each preset's model outputs next to published figures.
- `window.__app` exposes `st`, `setInput`, `loadPreset`, `ref` and `model` for the tests.

## Revision history

### REVE (from REVD)

A layout rework. The model is unchanged.

Before REVE:
- The radar sat beside only the sizing controls.
- The nine fuel and mission sliders were far down the page.
- Range, which appears on the radar, changed while the radar was off screen.
- The control column was twice the height of the radar, leaving a large empty space.

Changed:
- Every input moved to one docked rail, in five groups.
- A pinned readout strip keeps range, useful load, drag, fuel flow and Mach in view from anywhere on the page.
- The radar now sits beside a spec sheet of derived values.
- The payload-range panel shows only the readouts the strip doesn't.
- New palette and panel styling.
- Hints appear on focus.
- BRIEF.md's broken characters are fixed: text such as "ftÂ²" had been saved twice-encoded.

Verified:
- All earlier checks pass.
- The sizing model is identical to REVB at 8,500 values.
- A new check, `layoutKeepsResultsInView`, confirms that:
  - all 21 sliders are in the rail;
  - after scrolling to the bottom, the strip is at the top of the window and the fuel slider is still on screen;
  - the strip's range follows the model, 770 → 1,090 nmi (+41%) for 3,000 lb of fuel.
- The new check fails on REVD.

### REVD (from REVC)

Added:
- Mach number and compressibility drag, with a per-aircraft critical Mach number. The drag chart draws compressibility drag when it is present, and a warning appears past drag divergence.
- A climb segment from an average climb rate, and an idle glide descent. Both use fuel and cover distance.
- Taxi and takeoff fuel. It replaces REVC's flat "takeoff and climb" allowance.
- Maximum landing weight. It caps payload, and a warning appears when it binds.
- Best-range speed: a tile, a diamond on the drag chart, and a "Fly at best-range speed" button.
- A Mach tile, plus math rows for Mach, compressibility, the payload limit, climb, descent and best-range speed.
- Preset values for landing weight, climb rate, taxi fuel and critical Mach, with the sources in `docs/presets.md`.

Verified:
- The page matches a separate implementation of spec version 2 on 12 cases (828 values).
- Best-range speed reduces to the textbook results (Vmd for props, 3^¼·Vmd for jets) to 0.003 kt when compressibility is off.
- For 400 random aircraft, fuel and distance add up exactly at every corner point, and no corner lands above maximum landing weight.
- The sizing model is still bit-identical to REVB.
- The Cessna climb gives 14.0 min and 19 lb, against the handbook's 14 min and 18 lb.
- Random edits found a runaway reserve iteration at Mach > 1, which put NaN on screen. The iteration now stops, and the mission is shown as unflyable.
- A review pass found no formula or unit errors. It found these behaviour problems, which are now fixed and tested (each test fails on the pre-review commit):
  - The stock 737 showed a false "past drag divergence" warning. Divergence is now defined as M_crit + 0.108, with a 0.02 margin.
  - The best-range button could pick a speed below stall when no valid speed existed. It now shows "none".
  - The button stranded keyboard focus when it disabled itself. It now uses aria-disabled.
  - The Cessna's landing-weight cap read like an error. It now reads as a note.
- The review also showed that ferry range can be a hair below full-tanks range, because of the descent glide. This is documented, and the test now checks that the glide is the only cause.

### REVC (from REVB)

Added:
- Scales for any aircraft: log-scale gross weight, wing area, fuel and payload sliders, wider ranges elsewhere, a log radar (25% to 400%), and drag-chart axes that rescale.
- Cruise altitude, true airspeed, editable aircraft constants, five sourced presets and "Make this the reference".
- The payload-range model and diagram, with a prop/jet switch, tiles, math rows, influence columns and a range radar axis.

Changed:
- "Payload" is now "useful load", because it always included fuel.
- The radar is now a log scale, so "start" now reads "reference".

Verified:
- The sizing model gives bit-identical numbers to REVB at 500 random points (8,500 values, worst difference 0).
- The page matches an independent implementation of the spec on 9 cases (320 values; the largest range difference is in the 12th decimal place).
- 400 random aircraft all give a correctly ordered payload-range staircase that stays within maximum takeoff weight.
- 300 random edits never put NaN on screen.
- All presets fit both charts and have no sideways scroll at 400 px.
- The independent check also found a spec bug before any code was written: point C wasn't capped at maximum payload. It was fixed in the spec.
- A separate review pass tried to break the page and found four input-control bugs. Each has a test that fails on the pre-review commit and passes now:
  - A focused number box showed a stale value after stepping.
  - Number-box arrows jumped by 1, so CD0 went from 0.040 to 0.008.
  - Log sliders gave screen readers a position (0 to 1,000) instead of a value.
  - Changing preset while a box held typed text applied that text on blur.
- The review also confirmed:
  - ferry range never falls as maximum fuel rises;
  - jet range grows with altitude;
  - dark mode and the degenerate cases (zero fuel, zero payload, no useful load) render without errors.

### REVB (from REVA)

| Problem in REVA | Fix in REVB |
|---|---|
| Esc in a number box didn't cancel | Esc restores the value before leaving the box |
| Payload arrow keys ran backwards when negative, and stuck near zero | The step is based on the reference value and grows until something moves |
| Influence table gave misleading colours for negative payload | Shows "–" |
| Reset left a map selection on screen | Reset clears it |
| Radar handles gave screen readers no value | aria-valuenow and aria-valuetext added |

REVB also removed a hidden, unreachable "stall mode" and some dead code.

## Known limits and ideas

- Compressibility follows Lock's law with no lift-coefficient dependence, so it is rough past drag divergence.
- The climb is flown at the cruise EAS and at constant weight, with no check against installed power or thrust. Descent is an idle glide with no drag devices. There's no step climb, and no wind.
- Best-range speed is the true optimum. "Long-range cruise" (99% of best specific range, at a higher speed) isn't modelled.
- CD0 has no Reynolds number or wetted-area dependence. Propeller efficiency and fuel consumption don't vary with speed or altitude.
- The empty-weight rule is a two-term fit through one point per aircraft, so it gives trends away from the start.
- The gust model is FAR 23 style with sea-level density, and is not right for transport aircraft.
- No check stops impossible points, for example cruise below stall (the page warns) or negative useful load.
- The powered stall is lumped into CLmax. A power-on versus power-off toggle is a future option.
- Ideas:
  - show altitude, fuel and range on the dependency map;
  - a mission point (payload and distance) with pass or fail;
  - share a design by URL, or export and import it;
  - calibrate a preset against one published point;
  - an engine power or thrust check;
  - takeoff and landing distance;
  - a constraint diagram;
  - a clean versus flapped CLmax pair.
