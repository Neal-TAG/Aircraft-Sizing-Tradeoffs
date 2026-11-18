# Aircraft Sizing Trade-offs

An interactive page that shows how the main aircraft sizing quantities affect each other: gross weight, wing area, cruise speed, maximum lift coefficient, aspect ratio, stall speed, altitude, fuel and payload. Change one value and watch the physics move the rest, down to a rough payload-range diagram. Ranges cover a light single up to a narrow-body jet. It starts at the stock Short SC.7 Skyvan Series 3 (powered), with presets for the Cessna 172S, King Air 350, ATR 72-600 and Boeing 737-800.

Live: https://neal-tag.github.io/Aircraft-Sizing-Tradeoffs/

It is a teaching and early-trade tool, not a design tool.

## Use it

Open `index.html` in a browser. It is one self-contained file with no build step; the only outside request is Google Fonts.

- **Aircraft menu:** load a preset. "Make this the reference" compares against your own design instead.
- **Radar chart:** drag any of the seven handles, or focus one and use the arrow keys. Log scale, 25% to 400% of the reference.
- **Controls:** sliders and typed values. Enter applies, Esc cancels. Drag and empty-weight constants are under "Aircraft constants".
- **Payload and range:** propeller or jet, fuel consumption, fuel and payload limits, reserve and climb allowance, with the diagram and its corner points.
- **Drag against speed:** parasite, induced and total drag, with the stall, minimum drag and cruise points marked.
- **Dependency map:** click a box to see what affects it and what it affects.
- **Influence table:** % change in each result for a 1% change in each input.
- **The math:** every equation with the current numbers.

## Files

| File | What it is |
|---|---|
| `index.html` | The page (REVC) |
| `BRIEF.md` | Full spec: equations, inputs and ranges, layout, behaviour, and revision history |
| `docs/payload-range-spec.md` | Altitude, fuel-flow and payload-range math |
| `docs/presets.md` | Preset values, sources, estimates, and model-versus-published comparison |
| `tests/ui.test.js` | Headless browser checks |
| `tests/independent/` | A separate implementation of the spec, with test cases and expected outputs that the tests compare against |
| `tests/presets-report.js` | Prints each preset next to published figures |

## Tests

Requires Node and an installed Microsoft Edge (or Chrome, with `BROWSER_CHANNEL=chrome`).

```
npm install
npm test
```

To compare against an earlier revision, pass it as a reference. This adds a regression pass confirming the sizing model gives identical numbers:

```
git show HEAD~1:index.html > old.html
node tests/ui.test.js index.html old.html
```

## Limits

No compressibility, no climb or descent distance, and an empty-weight rule fitted through one point per aircraft, so results are trends, not predictions. See `BRIEF.md` for the full list.
