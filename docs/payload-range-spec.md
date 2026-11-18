# Payload-range and altitude: model spec

This extends the sizing model in `BRIEF.md`. Every equation in the brief's "Equations" section is unchanged. Speeds there are equivalent airspeed (EAS), so cruise drag depends only on EAS, not altitude.

## Units and constants

| Symbol | Value | Meaning |
|---|---|---|
| KT | 1.688 | ft/s per knot |
| ρ0 | 0.002377 slug/ft³ | Sea-level density |
| 550 | ft·lb/s per hp | |

## Altitude (ISA)

Cruise altitude h in feet, 0 to 51,000.

- Troposphere, h ≤ 36,089 ft: σ = (1 − 6.8756×10⁻⁶·h)^4.2559
- Above that: σ = 0.29708·exp(−(h − 36,089) ÷ 20,806)
- True airspeed: V_TAS = V_EAS ÷ √σ (knots)

## New inputs

| Input | Symbol | Unit | Notes |
|---|---|---|---|
| Cruise altitude | h | ft | Sets σ, so true airspeed |
| Propulsion type | — | prop or jet | Chooses the fuel-flow law |
| Brake specific fuel consumption (prop) | c_p | lb per shp per hour | Shaft power basis |
| Propeller efficiency (prop) | η | — | |
| Thrust specific fuel consumption (jet) | c_t | lb per lbf per hour | |
| Maximum fuel | F_max | lb | Tank capacity |
| Maximum payload | P_max | lb | Structural or volume limit. Implies maximum zero-fuel weight = W_e + P_max |
| Reserve | t_r | minutes | Flown at cruise fuel flow |
| Takeoff and climb allowance | f_c | fraction of takeoff weight | Burned, no range credit |

Gross weight W (from the sizing model) is the maximum takeoff weight. Empty weight W_e comes from the sizing model's empty-weight rule. Crew and other operating items are counted as payload.

## Drag as a function of weight at fixed EAS

At the cruise EAS, D(w) = k₀ + k₂·w², with:
- k₀ = q·S·CD0 (parasite drag, unchanged with weight)
- k₂ = 1 ÷ (q·π·span²·e)

Compressibility is not modelled: there is no drag rise with Mach number, so jet cruise results are rough.

## Fuel flow (lb per hour) at weight w

- Prop: ff(w) = c_p · D(w) · V_TAS·KT ÷ (550·η)
- Jet: ff(w) = c_t · D(w)

## Range of one mission

A mission is a payload P and fuel F. Takeoff weight is T = W_e + P + F.

1. Takeoff and climb fuel: F_c = f_c·T. Start of cruise: w1 = T − F_c.
2. Landing weight: w2 = W_e + P + F_r. The reserve is F_r = (t_r ÷ 60)·ff(w2). Solve this by fixed-point iteration from F_r = 0 until it changes by less than 0.01 lb (20 iterations is plenty).
3. Cruise fuel: F_cr = F − F_c − F_r. If F_cr ≤ 0, range is 0.
4. Range, constant altitude and constant speed (exact integral of dR = −V dW ÷ ff):
   - J = (atan(w1·√(k₂/k₀)) − atan(w2·√(k₂/k₀))) ÷ √(k₀·k₂)   (this is ∫ dw ÷ D(w) from w2 to w1)
   - Prop: R = (550·η ÷ (KT·c_p))·J nautical miles
   - Jet: R = (V_TAS ÷ c_t)·J nautical miles (V_TAS in knots)

Check: when the fuel burned is small, J ≈ (w1 − w2) ÷ D(w_mid), which is the Breguet result.

## Payload-range corner points

Let U = W − W_e, the useful load.

| Point | Payload | Fuel | Meaning |
|---|---|---|---|
| A | min(P_max, U) | 0 | Maximum payload, zero range |
| B | min(P_max, U) | min(F_max, U − payload_B) | Maximum payload, fuel up to maximum takeoff weight |
| C | min(P_max, U − min(F_max, U)) | min(F_max, U) | Full tanks, payload reduced to keep maximum takeoff weight (and never above P_max) |
| D | 0 | min(F_max, U) | Full tanks, no payload (ferry). Takeoff weight can be below maximum. |

If U ≤ 0, there is no diagram: all payloads, fuels and ranges are 0 (the page reports takeoff weight as the empty weight in that case; it has no meaning). Payload and fuel are never negative.

Edge cases, all intended:
- A always has zero range (no fuel, so cruise fuel is negative).
- B can carry fuel but still have zero range, when the climb allowance and reserve use all of it.
- If F_max + P_max ≤ U, tanks are full at maximum payload, so C is the same point as B.
- If F_max ≥ U, C and D are the same point.

The diagram is the polyline A → B → C → D, with payload on the vertical axis and range on the horizontal.

## Outputs

- σ, V_TAS
- Cruise fuel flow at maximum takeoff weight minus climb allowance, ff(W·(1 − f_c))
- Range at B, C and D; payload at B and C
