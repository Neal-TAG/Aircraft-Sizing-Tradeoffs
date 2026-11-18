# Aircraft Sizing Trade-offs

An interactive page that shows how the main aircraft sizing quantities affect each other: gross weight, wing area, cruise speed, maximum lift coefficient, aspect ratio and stall speed. Change one value and watch the physics move the rest. It starts at the stock Short SC.7 Skyvan Series 3 (powered).

It is a teaching and early-trade tool, not a design tool.

## Use it

Open `index.html` in a browser. It is one self-contained file with no build step; the only outside request is Google Fonts.

- **Flight phase:** switch between Flaps down (powered, landing-flap CLmax 2.75) and Clean (flaps-up CLmax, 1.5 estimated). It changes only the stall speed; both stalls show under the switch.
- **Radar chart:** drag any of the seven handles, or focus one and use the arrow keys.
- **Controls:** sliders and typed values. Enter applies, Esc cancels.
- **Drag against speed:** parasite, induced and total drag, with the stall, minimum drag and cruise points marked.
- **Dependency map:** click a box to see what affects it and what it affects.
- **Influence table:** % change in each result for a 1% change in each input.
- **The math:** every equation with the current numbers.

## Files

| File | What it is |
|---|---|
| `index.html` | The page (REVB) |
| `BRIEF.md` | Full spec: equations, constants, defaults and their sources, layout, behaviour, and the REVA to REVB change log |
| `tests/ui.test.js` | Headless browser checks |

## Tests

Requires Node and an installed Microsoft Edge (or Chrome, with `BROWSER_CHANNEL=chrome`).

```
npm install
npm test
```

To compare against an earlier revision, pass it as a reference. Every check then runs on both pages, plus a regression pass that confirms they render the same output:

```
git show HEAD~1:index.html > old.html
node tests/ui.test.js index.html old.html
```

## Limits

Sea level only. The drag coefficient, span efficiency and empty-weight rule are fixed and fitted to one aircraft, so results away from the start point are trends, not predictions. See `BRIEF.md` for the full list.
