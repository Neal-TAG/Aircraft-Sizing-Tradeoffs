# Payload-range and altitude: model spec (version 2)

This extends the sizing model in `BRIEF.md`. The brief's stall, gust, lift-curve-slope, span, wing-loading, empty-weight, best-L/D and minimum-drag-speed equations are unchanged. Speeds that set drag and gust load are equivalent airspeed (EAS).

Version 2 adds compressibility drag, climb and descent segments, a maximum landing weight, and a best-range speed. The version 1 "takeoff and climb allowance" is replaced by a smaller taxi and takeoff allowance, because climb is now modelled.

## Units and constants

| Symbol | Value | Meaning |
|---|---|---|
| KT | 1.688 | ft/s per knot |
| ρ0 | 0.002377 slug/ft³ | Sea-level density |
| 550 | ft·lb/s per hp | |
| a0 | 661.48 kt | Sea-level speed of sound |
| NM | 6076.12 ft | Feet per nautical mile |
| idle | 0.10 | Descent fuel flow as a fraction of cruise fuel flow (assumption) |

## Atmosphere (ISA)

Altitude h in feet, 0 to 51,000.
- Density ratio: σ(h) = (1 − 6.8756×10⁻⁶·h)^4.2559 for h ≤ 36,089 ft; above that σ(h) = 0.29708·exp(−(h − 36,089) ÷ 20,806).
- Temperature ratio: θ(h) = 1 − 6.8756×10⁻⁶·h for h ≤ 36,089 ft; above that θ = 0.751863.
- True airspeed at altitude h: V_TAS = V ÷ √σ(h), in knots.
- Speed of sound: a = a0·√θ(h). Cruise Mach number: M = V_TAS(h) ÷ a.

## Inputs

| Input | Symbol | Unit | Notes |
|---|---|---|---|
| Cruise altitude | h | ft | |
| Propulsion type | | prop or jet | |
| Brake specific fuel consumption (prop) | c_p | lb per shp per hour | |
| Propeller efficiency (prop) | η | | |
| Thrust specific fuel consumption (jet) | c_t | lb per lbf per hour | |
| Maximum fuel | F_max | lb | |
| Maximum payload | P_max | lb | Structural or volume limit |
| Maximum landing weight | W_L | lb | New in version 2 |
| Reserve | t_r | minutes | At cruise fuel flow |
| Taxi and takeoff fuel | f_t | fraction of takeoff weight | Replaces the version 1 climb allowance f_c |
| Average climb rate | roc | ft/min | New in version 2. 0 or less means no climb segment. |
| Critical Mach number | M_crit | | New in version 2 |

## Cruise drag with compressibility

Lock's fourth-power law: ΔCD = 20·(M − M_crit)⁴ if M > M_crit, else 0.

At the cruise EAS, the dynamic pressure is q = ½ρ0(V·KT)² and:
- Parasite drag: Dp = q·S·CD0 (as before)
- Compressibility drag: Dc = q·S·ΔCD
- Induced drag: Di = W²·k₂, with k₂ = 1 ÷ (q·π·AR·S·e)
- Cruise drag: D = Dp + Dc + Di. L/D at cruise = W ÷ D.
- As a function of weight: D(w) = k₀ + k₂·w², with k₀ = Dp + Dc.

Best L/D and minimum drag speed stay the incompressible formulas.

## Fuel flow in cruise, at weight w

- Prop: ff(w) = c_p·D(w)·V_TAS·KT ÷ (550·η)
- Jet: ff(w) = c_t·D(w)

## Climb segment

The climb is flown from the ground to h at the cruise EAS, at constant weight w_c (the weight at the start of the climb), with no compressibility drag. If h = 0 or roc ≤ 0, the climb time, fuel and distance are all 0.

- Time: t_c = h ÷ roc (minutes)
- Mean true airspeed: V_c = V ÷ √σ(h/2) (knots)
- Drag: D_c = Dp + k₂·w_c²
- Prop: shaft power P_c = (D_c·V_c·KT + w_c·roc ÷ 60) ÷ (550·η) hp; fuel flow ff_c = c_p·P_c
- Jet: thrust T_c = D_c + w_c·(roc ÷ 60) ÷ (V_c·KT); fuel flow ff_c = c_t·T_c
- Climb fuel: F_cl = ff_c·t_c ÷ 60. Climb distance: X_c = V_c·t_c ÷ 60 nmi.

## Descent segment

The descent is an idle glide from h to the ground at the cruise EAS, evaluated at the landing weight w2. If h = 0, the descent time, fuel and distance are all 0.

- Glide ratio: G = w2 ÷ (Dp + k₂·w2²), with no compressibility
- Distance: X_d = h·G ÷ NM nmi
- Mean true airspeed: V_d = V ÷ √σ(h/2). Time: t_d = X_d ÷ V_d hours.
- Fuel: F_de = idle·ff(w2)·t_d, using the cruise fuel flow law at w2

## Range of one mission

A mission is a payload P and fuel F. Takeoff weight T = W_e + P + F.

1. Taxi and takeoff fuel: F_t = f_t·T. Start of climb: w_c = T − F_t.
2. Climb fuel and distance at w_c, as above. Start of cruise: w1 = w_c − F_cl.
3. Reserve and landing weight: F_r = (t_r ÷ 60)·ff(w2), with w2 = W_e + P + F_r. Solve by fixed-point iteration from F_r = 0, until it changes by less than 0.01 lb (up to 50 iterations). If an iterate exceeds the takeoff weight T, the iteration has run away: set F_r = T and stop. The mission then can't be flown (step 5).
4. Descent fuel and distance at w2. End of cruise: w3 = w2 + F_de.
5. Cruise fuel: F_cr = w1 − w3 = F − F_t − F_cl − F_de − F_r. If F_cr ≤ 0, the mission can't be flown and range is 0.
6. Cruise distance, the exact constant-altitude, constant-speed integral from w3 to w1:
   - J = (atan(w1·√(k₂/k₀)) − atan(w3·√(k₂/k₀))) ÷ √(k₀·k₂)
   - Prop: R_cr = (550·η ÷ (KT·c_p))·J. Jet: R_cr = (V_TAS ÷ c_t)·J. Both in nmi.
7. Range = X_c + R_cr + X_d. This is 0 if F_cr ≤ 0.

## Payload limits and corner points

- Useful load: U = W − W_e
- Landing-weight payload limit: P_L = W_L − W_e − (t_r ÷ 60)·ff(W_L). This is the payload that lands at exactly W_L with only the reserve left.
- Effective maximum payload: P* = max(0, min(P_max, P_L))

| Point | Payload | Fuel |
|---|---|---|
| A | min(P*, U) | 0 |
| B | min(P*, U) | min(F_max, U − payload_B) |
| C | min(P*, U − min(F_max, U)) | min(F_max, U) |
| D | 0 | min(F_max, U) |

If U ≤ 0, every payload, fuel and range is 0 (takeoff weight is undefined). Payload and fuel are never negative.

Edge cases, all intended:
- A has zero range.
- B can carry fuel but still have zero range, when taxi, climb, descent and reserve fuel use all of it.
- If F_max + P* ≤ U, C is the same point as B.
- If F_max ≥ U, C is the same point as D.

## Best-range speed

The EAS that maximises specific range (nmi per lb of fuel) in cruise at weight w_b = W·(1 − f_t), at the cruise altitude, with compressibility included:
- Prop: maximise 1 ÷ D(V). Jet: maximise V_TAS(V) ÷ D(V).
- Here D(V) = q(V)·S·(CD0 + ΔCD(V)) + w_b²·k₂(V), with q, k₂ and ΔCD evaluated at that V.
- Search V from max(40, 1.1·Vs) to 500 kt. Use a 400-step grid, then refine with a golden-section search to 0.01 kt.
- If the search interval is empty (1.1·Vs ≥ 500 kt), there is no best-range speed, and the page shows none.
- The page warns when cruise Mach is more than 0.02 past drag divergence. In Lock's law, drag divergence (dCD/dM = 0.1) is at M_crit + 0.108.
- Known quirk: the descent glide ratio grows with landing weight at a fixed speed, so point D's range can be a little below C's. The difference is never more than the difference in their descent distances.

Without compressibility this gives the minimum drag speed for a prop and 3^¼ ≈ 1.316 times the minimum drag speed for a jet. Those are the textbook results and a useful check.

## Outputs

- σ, V_TAS, θ, Mach number, ΔCD and Dc at the cruise point
- ff0: cruise fuel flow at W·(1 − f_t)
- For each corner point: payload, fuel, takeoff weight, taxi and takeoff fuel, climb fuel, climb distance, reserve, descent fuel, descent distance, cruise fuel, cruise distance and total range
- P_L, P*, best-range speed

Not modelled: climb-speed schedules, step climbs, descent drag devices, winds, and compressibility in climb and descent.
