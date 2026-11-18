# Aircraft sizing trade-offs: project brief

## Purpose

An interactive web page that shows how the main aircraft sizing quantities affect each other. Change one value and see how the physics moves the others. It is a teaching and early-trade tool, not a design tool.

- Live page: https://claude.ai/artifact/8i9AsJkd8AxCoPAtvNRe55 (title "Aircraft Sizing Trade-offs"). It is private unless shared from its Share menu.
- Reference implementation: `index.html` in this repository, currently REVB. Where the brief and the code disagree, the code is what shipped. REVA is the first commit; see "Changes in REVB".
- Format: one self-contained HTML file. No libraries. Inline SVG for all drawings. The only outside request is Google Fonts.
- Starting point: the stock Short SC.7 Skyvan Series 3, powered.

## Units and constants

| Symbol | Value | Meaning |
|---|---|---|
| KT | 1.688 | ft/s per knot |
| ρ | 0.002377 slug/ft³ | Sea-level air density. All speeds are sea-level equivalent. |
| g | 32.2 ft/s² | Gravity |
| CD0 | 0.040 | Zero-lift drag coefficient on wing area |
| e | 0.72 | Span efficiency |
| fe | 0.4085 | Empty weight fraction of gross weight |
| ws | 6 lb/ft² | Empty weight added per square foot of wing |
| Ude | 50 ft/s | Gust velocity |

## Inputs, defaults and ranges

| Input | Default (stock Skyvan) | Range | Step | Default source |
|---|---|---|---|---|
| Gross weight W | 12,500 lb | 5,000 to 16,000 | 10 | Series 3 maximum takeoff weight |
| Wing area S | 373 ft² | 200 to 700 | 1 | Published (Jane's 1977-78) |
| Cruise speed V | 127 kt | 80 to 240 | 1 | 148 kt true at 10,000 ft (USFS 1972), as sea-level equivalent |
| Maximum lift coefficient CLmax | 2.75 | 1.2 to 3.0 | 0.05 | Landing flap, powered. Derived from the published 60 kt stall at 12,500 lb (Jane's 1977-78) |
| Aspect ratio AR | 11.3 | 6 to 16 | 0.5 | 64.9 ft span² ÷ 373 ft² |
| Stall speed Vs | result, 60.0 kt | 40 to 90 | 0.5 | Matches the published 60 kt at 12,500 lb |

Stall speed can also be set; it then resizes the wing (see "Handles" below).

## Equations

Lift-curve slope (per radian):
CLa = 2π·AR ÷ (2 + √(4 + AR² ÷ 0.9025))

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

Drag and power:
- Dp = q·S·CD0 (parasite)
- Di = W² ÷ (q·π·b²·e) (induced)
- D = Dp + Di
- L/D at cruise = W ÷ D
- K = 1 ÷ (π·AR·e)
- Best L/D = 0.5 ÷ √(CD0·K)
- Minimum drag speed Vmd = √(2(W/S) ÷ ρ · √(K ÷ CD0)) ÷ KT
- Power is not computed or shown. If it is added, use true airspeed: D·V_true·KT ÷ 550 hp. Using equivalent airspeed reads low at altitude.

Weight:
- Empty weight We = fe·W + ws·S. The constants are set so We = 7,344 lb at the defaults (Jane's basic empty weight).
- Payload = W − We

## Values at the defaults (checked by hand)

| Quantity | Value |
|---|---|
| Stall speed | 60.0 kt |
| Span | 64.9 ft |
| Wing loading | 33.5 lb/ft² |
| Empty weight | 7,344 lb |
| Payload | 5,156 lb |
| Cruise drag | 1,115 lb (parasite 815, induced 300) |
| Best L/D | 12.6 |
| Gust load factor | 2.44 g |

Sanity check: 1,115 lb at 148 kt true is about 506 thrust hp, roughly 630 shp at 80% propeller efficiency, against two 715 shp engines. This is plausible.

## Page layout

1. **Header:** title, one-line description, "Pin this point" and "Reset" buttons.
2. **Radar chart (left):** seven axes, each shown as a percentage of the stock Skyvan from 40% (centre) to 160% (rim). The dashed ring is the stock Skyvan, the filled shape is the current point, and a dotted outline shows a pinned point. Labels show value and % change; green means better, red means worse, and weight and speed stay neutral.
   - Axes in order: cruise speed, gross weight, payload, cruise drag, gust load factor, wing area, stall speed.
3. **Controls (right):** a slider plus a typed number box for each input (stall speed, wing area, gross weight, cruise speed, max lift coefficient, aspect ratio). Six tiles show wing loading, span, empty weight, cruise L/D, best L/D and minimum drag speed, each with % change.
4. **Drag against speed:** parasite, induced and total drag curves from the stall speed to 260 kt. Shows the stall line, minimum drag point, cruise point, and the stock total drag curve dashed for comparison.
5. **How the quantities connect:** a dependency map (see below).
6. **Influence table:** % change in each result for a 1% increase in each input at the current point (log derivative from a 0.1% step). For example, +0.50 means a square-root dependence and −2.00 an inverse square.
7. **The math, with your numbers:** a four-column table (quantity, formula, with numbers, result), live.
8. **Notes:** starting point, assumptions and how to read the radar.

## Handles: what each one moves

All seven radar handles can be dragged, and keyboard arrows step them by 1%. There is no mode switch.

| Handle | What it changes |
|---|---|
| Wing area, gross weight, cruise speed | Set directly |
| Stall speed | Wing area, from the inverse stall equation |
| Payload | Gross weight: W = (payload + ws·S) ÷ (1 − fe) |
| Gust load factor | Cruise speed, because n is linear in V: V = (n − 1) ÷ k, with k = (n0 − 1) ÷ V0 |
| Cruise drag | Cruise speed, found by bisection on the fast side of minimum drag. It stops at Vmd if the target is below minimum drag. |

Typed values apply on Enter or when you click away; Esc cancels. All values clamp to the slider range.

## Dependency map

The map is a directed graph of 16 boxes. Its edges are:

- Stall: S → Vs, W → Vs, CLmax → Vs
- Speed: V → q
- Span: S → b, AR → b
- Wing loading: S → W/S, W → W/S
- Gust: W/S → n, V → n, AR → n
- Parasite drag: S → Dp, q → Dp
- Induced drag: b → Di, W → Di, q → Di
- Drag: Dp → D, Di → D
- Empty weight: S → We, W → We
- Payload: We → payload, W → payload
- L/D: D → L/D, W → L/D

Interaction:
- **By default:** everything downstream of the last control touched is highlighted.
- **Click a box:** everything that affects it (all ancestors) turns purple and everything it affects (all descendants) turns green. Unrelated boxes and lines fade. A key shows the counts.
- **Clear:** click the box again or empty space. Boxes also work with Tab and Enter.

## Implementation details (taken from REVB)

### Look
- Fonts (Google Fonts): Barlow Semi Condensed 500/600 for headings (h1 30 px, h2 20 px), IBM Plex Sans 400/500/600 for body text (15 px), IBM Plex Mono 400/500 for all numbers (tabular figures).
- Page is at most 1,180 px wide, with 16 px side padding and 16 px gaps. Panels have a 1 px border, 12 px corner radius and 16 px padding.
- Top row: radar and controls side by side (1.15 : 1). Below 900 px they stack in one column.
- Theme follows the system light/dark setting. `data-theme="light"` or `"dark"` on `<html>` overrides it.

| Token | Light | Dark | Used for |
|---|---|---|---|
| bg | #f3f5f4 | #0f1513 | Page background |
| panel | #ffffff | #171f1c | Panels |
| ink | #16211e | #e6ecea | Text |
| muted | #5d6b67 | #93a19c | Secondary text, stock outline |
| line | #d5dcd9 | #2b3632 | Borders, map edges |
| grid | #e3e8e6 | #222c29 | Chart gridlines, radar rings |
| accent | #0d8a63 | #3ecf9a | Current point, total drag, downstream highlight |
| accent-fill | #d6ede4 | #1c4034 | Highlighted map boxes |
| pin | #7a55c7 | #b79cf2 | Pinned point, induced drag, upstream highlight |
| pin-fill | #e9e2f7 | #2e2545 | Upstream map boxes |
| good | #0d7a4f | #58d6a3 | Better than stock |
| bad | #b5402f | #f08a78 | Worse than stock, stall line |
| warn | #a36a00 | #e6b450 | Parasite drag curve |

The radar's current-point fill is the accent colour at 18% opacity (22% in dark mode).

### Radar
- SVG viewBox 600 × 510. Centre (300, 255), radius 170 px, running from 40% at the centre to 160% at the rim. The first axis points straight up and the rest go clockwise, 360/7° apart.
- Rings at 60, 80, 100, 120, 140 and 160%. The 100% ring is dashed. Percentage labels sit on the top axis.
- Each axis label has three lines: name, value with unit, and % change. The change shows "start" when it is within ±0.05%. Values outside 40 to 160% are drawn at the edge and get "(off scale)".
- Which direction counts as better:

| Axis | Better |
|---|---|
| Payload | Higher |
| Cruise drag, gust load factor, stall speed | Lower |
| Cruise speed, gross weight, wing area | Neutral (grey) |

- Handles are circles of radius 9 px, keyboard-focusable, with role="slider". Each one reports its value to screen readers through aria-valuetext, for example "127 kt, start from stock". Dragging projects the pointer onto the handle's axis.
- Arrow Up/Right move a handle up by 1% of its stock value, which is one percentage point on the radar. Arrow Down/Left move it down by the same amount. If rounding to the slider step swallows the move, the step grows (2%, 3% and so on, up to 10%) until something changes.

### Controls
- Order and labels: Stall speed, Wing area, Gross weight, Cruise speed, Maximum lift coefficient, Aspect ratio.
- Number box decimals: stall speed 1, wing area 0, gross weight 0, cruise speed 0, CLmax 2, aspect ratio 1.
- Hint text: stall speed "Changing this resizes the wing to give that stall speed."; CLmax "Powered, flaps down. Changes the stall speed."; aspect ratio "Span squared divided by wing area. Slender wings have a high value."
- Every value that gets set, including the ones the handles solve for, is rounded to its slider step and then clamped to its range. Stall speed is never stored: it is always recomputed from wing area. If the solved wing area hits 200 or 700 ft², the stall speed stops short of the target.
- Tiles show % change from stock, or "start" when within ±0.05%.
- The intro line above the sliders reads: "Drag any handle or slider, or type a value and press Enter. Wing area, weight, speed, lift coefficient and aspect ratio change directly. Stall speed resizes the wing. Payload changes the gross weight. Cruise drag and gust load factor change the cruise speed."

### Drag against speed
- SVG viewBox 900 × 330. Plot area x 56 to 884, y 14 to 286.
- Speed axis is 40 to 260 kt with labels every 20 kt. Drag axis is fixed at 0 to 3,600 lb with gridlines every 600 lb. Drag above 3,600 lb is drawn at the top edge.
- Curves are sampled every 2 kt from the stall speed (or 40 kt if that is higher) to 260 kt.
  - Total drag: accent colour, 2.6 px.
  - Parasite drag: warn colour.
  - Induced drag: pin colour.
  - Stock total drag: dashed muted line, starting at the stock stall speed.
- Stall line: red dashed vertical line labelled "Stall xx.x kt".
- Minimum drag point: a filled dot labelled "Minimum drag", shown only when the minimum drag speed is above the stall speed.
- Cruise point: an open circle of radius 7 px labelled "Cruise N lb".
- The pinned point is not shown on this chart.

### Dependency map
- SVG viewBox 900 × 372, at least 860 px wide, with sideways scroll inside its panel on narrow screens.
- Boxes are 128 × 46 px with a 7 px corner radius. Each box shows its name and its live value. Box x = 8 + 150 × column.
- Edges are cubic curves from the middle of the source box's right side to the middle of the target box's left side.
- Input boxes have a dark outline.

| Column | Boxes (y) |
|---|---|
| 0 | Wing area (16), Gross weight (90), Max lift coefficient (164), Aspect ratio (238), Cruise speed (312) |
| 1 | Stall speed (60), Dynamic pressure (312) |
| 2 | Span (16), Wing loading (150) |
| 3 | Induced drag (16), Gust load factor (120), Parasite drag (224) |
| 4 | Cruise drag (120), Empty weight (312) |
| 5 | Lift to drag (120), Payload (312) |

- "Last control touched" starts as gross weight. A handle highlights from the input it actually moves: stall speed highlights from wing area, payload from gross weight, and cruise drag and gust load factor from cruise speed.
- Simplification: wing area also reaches the gust load factor through the chord (c = S ÷ b). The map doesn't draw that edge.
- The key below the map reads "Click a box to trace it." With a box selected it reads "<box> · Affects it (n) · It affects (n)".

### Influence table
- Rows are the inputs: wing area, gross weight, cruise speed, maximum lift coefficient, aspect ratio. Stall speed is not a row.
- Columns are the results: stall speed, payload, parasite drag, induced drag, cruise drag, gust factor.
- Value = ln(result after ÷ result before) ÷ ln(1.001), for a +0.1% step in that input. It shows "0" when its magnitude is below 0.005. It shows "–" when the result is zero or negative, which can only happen to payload, because a percent change has no meaning there.
- Colours follow the "better" directions: stall speed, drags and gust are better lower, and payload is better higher.

### The math, with your numbers
Twelve rows, in order: stall speed, span, wing loading, dynamic pressure, parasite drag, induced drag, cruise drag, mass ratio μ, gust alleviation Kg, gust load factor, empty weight, payload.

### Pin and Reset
- Pin stores the seven radar values in memory. It is lost on reload, drawn only on the radar, and cleared by Reset.
- Reset restores every default and clears any map selection.

### Notes section
Five paragraphs, laid out in columns of at least 280 px:
- **The core link:** stall speed, weight, wing area and CLmax are tied by one equation, so setting three fixes the fourth.
- **Drag:** how parasite and induced drag scale with speed, weight and wing size, and that the sum is lowest where they are equal.
- **Gusts:** the gust factor rises with speed and falls with wing loading, so a big slow-stalling wing rides roughly at speed.
- **Starting point:** the stock Skyvan numbers.
- **Assumptions:** CD0 0.040 comes from the earlier Skyvan drag build-up (struts, fixed gear and the upswept tail; nacelles and propellers left out, so drag reads a little low).

- `window.__app` exposes `st` and `setInput` for the headless tests.

## Changes in REVB (from REVA)

Each fix was checked by running the same headless Edge test (`tests/ui.test.js`) against both files. Every check below fails on REVA and passes on REVB.

| Problem in REVA | Fix in REVB | Test result |
|---|---|---|
| Esc in a number box didn't cancel. The typed value was applied when the box lost focus. | Esc puts the current value back before leaving the box. | Type 9000 in gross weight, press Esc. REVA: W = 9,000. REVB: W = 12,500. |
| Payload keys ran backwards when payload was negative, because the step was 1% of the current value. | The step is 1% of the stock value. | From −1,243 lb, Arrow Up. REVA: no change. REVB: −1,189 lb. |
| Payload handle stuck near zero, because the step rounded away on the 10 lb weight step. | Same fix, plus the step grows until something moves. | From −0.35 lb. REVA: stuck. REVB: +52.9 lb, then −53.6 lb. |
| Arrow keys stuck or went the wrong way at some points. | Same fixes. | Every handle, both directions, at 6 points (84 presses). REVA: 5 wrong. REVB: 0 wrong. |
| Influence table gave misleading payload numbers when payload was negative. Worse showed green, better showed red. | Shows "–" when the result is zero or negative. | REVA: +3.38 green, −2.38 red. REVB: all "–". |
| Reset left a map selection on screen. | Reset clears it. | Fixed. |
| Radar handles gave screen readers no value. | aria-valuenow and aria-valuetext added. | Fixed. |

Removed:
- The hidden stall mode: the mode state, `setMode`, and the stall-mode branches in the map, math and influence code.
- Unused CSS, `isOut()`, `lastDrag`, and the unused horsepower result.

Unchanged:
- Over 240 random steps through all nine controls, REVB rendered exactly what REVA did wherever payload was positive. That covers model numbers, radar, tiles, drag chart, map, influence table and math table.
- All 28 handle solves still land within one slider step.
- At 400 px wide there is no sideways scroll and no console errors.

## Verification so far

- The original generic model was re-implemented independently from a written equation spec by a separate agent. Eight test cases with 13 outputs each matched the page code to about 1e-16. The analytic exponents (for example Vs ∝ W^0.5 S^−0.5 CLmax^−0.5, Dp ∝ V² S, Di ∝ W² V^−2 S^−1) matched numerical 1% steps to 5 decimals.
- The Skyvan defaults were checked by hand: stall 59.99 kt, empty weight 7,344.3 lb, span 64.92 ft.
- Headless browser tests confirmed:
  - every handle solve hits its target within one slider step;
  - typed inputs update the slider and model, and clamp out-of-range values;
  - map highlights match the edge list;
  - there are no console errors and no sideways scroll at 400 px width.

## Known limits and ideas

- Sea level only. There is no altitude or true airspeed input.
- CD0, e, fe and ws are fixed; CD0 has no Reynolds number or wetted-area dependence.
- The empty weight rule is a two-term fit to one aircraft, so it only gives trends away from the start point.
- The gust model uses sea-level density and a constant 50 ft/s gust.
- No check stops impossible points, for example a cruise speed below the stall speed or a negative payload.- The powered stall is lumped into CLmax. A future option is a power-on versus power-off toggle:
  - Power-off: Vs = √(2W ÷ (ρ S CLmax)).
  - Power-on: W = ½ρV²S·CLmax,eff + T·sin(α + iT), with CLmax,eff ≈ CLmax(1 + (S_wash ÷ S)·T ÷ (q·A_disk)).
- Other possible additions: an altitude input, editable model constants, preset aircraft, export of the current point, and a clean versus flapped CLmax pair.

## Sources for the defaults

- Short SC.7 Skyvan Series 3: Jane's All the World's Aircraft 1977-78 (wing area 373 ft², basic empty weight 7,344 lb, 60 kt stall at 12,500 lb, from which CLmax 2.75 is derived).
- USDA Forest Service, *Flight Evaluation of the SC7 Military Skyvan Series 3M* (1972): 148 kt true cruise at 10,000 ft, 64 ft 11 in span. https://archive.org/details/CAT75662333
- EASA TCDS IM.A.666 (SC-7): maximum takeoff weight 5,670 kg (12,499 lb). https://www.easa.europa.eu/nl/downloads/100253/en
- Raymer, *Aircraft Design: A Conceptual Approach*: span efficiency formula and lift-curve slope form.
