# Aircraft presets: values, sources and how well they match

Each preset is a full set of model inputs. Where a number is published, the source is given. Where it isn't, it's an engineering estimate and is marked **est**. Run `node tests/presets-report.js` to reprint the model-versus-published comparison.

How some inputs are derived:
- **CLmax** comes from the stall speed: CLmax = 2W ÷ (ρ·S·(Vs·1.688)²).
- **Cruise EAS** comes from the published true airspeed and altitude: EAS = TAS·√σ.
- **fe** is set so that the empty-weight rule (We = fe·W + ws·S) gives the listed empty weight at the listed gross weight. ws is an estimate of empty weight per square foot of wing.

## Values

| | Skyvan 3 | Cessna 172S | King Air 350 | ATR 72-600 | 737-800 |
|---|---|---|---|---|---|
| Max takeoff weight, lb | 12,500 | 2,550 | 15,000 | 50,705 | 174,200 |
| Wing area, ft² | 373 | 174 | 300 | 657 | 1,341 |
| Aspect ratio | 11.3 | 7.5 | 11.2 | 12.0 | 9.5 (no winglets) |
| Empty weight, lb | 7,344 basic | 1,663 standard | 9,955 basic operating | 30,314 operating | 91,300 operating |
| ws, lb/ft² (est) | 6 | 2.5 | 4 | 6 | 8 |
| Stall, kt | 60 at MTOW | 48 at MTOW | 81 (weight not given) | 92 **est** at MLW | 111 **est** at MLW |
| CLmax | 2.75 | 1.90 | 2.25 | 2.60 | 2.60 |
| Cruise | 148 kt TAS, 10,000 ft | 122 kt TAS, 8,000 ft | 312 kt TAS, 35,000 ft | 270 kt TAS, 20,000 ft | ~450 kt TAS, 35,000 ft |
| Cruise EAS, kt | 127 | 108 | 174 | 197 | 250 |
| CD0 / e (est) | 0.040 / 0.72 | 0.032 / 0.75 | 0.027 / 0.80 | 0.026 / 0.80 | 0.021 / 0.85 |
| Fuel consumption | 0.60 lb/shp/h **est** | 0.46 lb/hp/h (from POH table) | 0.58 lb/shp/h **est** | 0.46 lb/shp/h (from ATR fuel flow) | 0.60 lb/lbf/h **est** |
| Propeller efficiency (est) | 0.80 | 0.78 | 0.82 | 0.82 | — |
| Usable fuel, lb | 2,262 | 318 | 3,611 | 11,024 | 46,062 |
| Max payload, lb | 4,600 cabin | 895 useful load | 2,545 (assumes 12,500 lb MZFW) | 15,982 | 47,000 |
| Max landing weight, lb | 12,500 (secondary) | 2,550 (POH) | 15,000 (secondary) | 49,272 (ATR) | 146,300 (Boeing) |
| Reserve | 45 min | 45 min | 45 min | 45 min | 45 min |
| Taxi and takeoff fuel | 0.8% **est** | 0.33% (POH 1.4 gal) | 0.67% **est** | 0.35% **est** | 0.25% **est** |
| Average climb rate, ft/min | 1,150 **est** (70% of 1,640) | 571 (POH: 14 min to 8,000 ft) | 1,200 **est** | 880 **est** (from ATR's 17.5 min to FL170) | 1,500 **est** |
| Critical Mach | 0.65 **est** | 0.70 **est** | 0.70 **est** | 0.68 **est** | 0.67 **est** (drag divergence about 0.78) |

The 737's critical Mach comes from Lock's law. Drag divergence, where the drag rise reaches dCD/dM = 0.1, sits 0.108 above critical Mach, so a divergence Mach of about 0.78 gives a critical Mach of 0.67. The EASA documents for the Skyvan and King Air turned out to be noise data sheets, so their landing weights come from secondary spec listings.

The stall speed in the model is at maximum takeoff weight. For the ATR and 737, the published reference is at maximum landing weight, so the model's stall is higher by √(MTOW ÷ MLW): 94 kt instead of 92, and 121 kt instead of 111. CLmax is the same either way.

## Model against published figures

The model now includes climb, descent and compressibility (REVD). The REVC column shows the earlier flat-allowance model, for comparison.

| Aircraft | Published | REVD model | REVD diff | REVC diff | Why |
|---|---|---|---|---|---|
| Skyvan 3 | 602 nmi with full tanks (reserve not stated) | 770 nmi | +28% | +19% | CD0 0.040 leaves out the nacelles and propellers, so drag reads low. REVC's 2% climb allowance used to hide part of that. |
| Cessna 172S | 518 nmi with full tanks, 75% power, 45 min reserve | 547 nmi | +6% | −1% | Close. The model climbs at cruise speed, so its climb covers more distance (see below). |
| King Air 350 | 1,806 nmi ferry, long-range cruise, NBAA IFR reserve | 1,382 nmi at the 312 kt max cruise; 1,976 nmi at best-range speed | −24% / +9% | −28% | The published figure is at long-range cruise, between the two. NBAA reserves (alternate plus 30 min) are bigger than 45 min. |
| ATR 72-600 | 683 nmi with 72 passengers, EASA reserves plus a 100 nmi alternate | 570 nmi at max payload | −17% | −38% | The modelled taxi and climb replace the old 2% allowance. Max payload is still about 900 lb more than 72 passengers, and EASA reserves are bigger. |
| 737-800 | 2,927 nmi (conditions not stated) | 3,019 nmi with full tanks | +3% | +6% | Compressibility now adds 805 lb of drag at Mach 0.78. |

**Climb check against the Cessna 172S handbook** (Fig 5-7: 2,550 lb, sea level to 8,000 ft, ISA): the handbook gives 14 min, 18 lb and 19 nmi. The model gives 14.0 min, 19 lb and 27 nmi. Time and fuel match. Distance reads high because the model climbs at the 108 kt cruise EAS, while the handbook climbs at 74 KIAS.

At its cabin limit, the Skyvan's range at maximum payload is 66 nmi in the model. Only 556 lb of fuel fits under maximum takeoff weight, and taxi, climb and the 45-minute reserve take most of it. An unverified secondary source gives 243 nmi at maximum payload.

These presets are starting points for trends, not performance data. To calibrate one against a published point, adjust CD0 or the fuel consumption.

## Sources

- EASA TCDS EASA.IM.A.666, SC-7 Skyvan, Issue 01 (2019): https://www.easa.europa.eu/lv/downloads/100253/en
- Jane's All the World's Aircraft 1977-78 (Skyvan empty weight and stall), and Wikipedia's Short SC.7 Skyvan page (range): https://en.wikipedia.org/wiki/Skyvan
- USDA Forest Service, Flight Evaluation of the SC7 Military Skyvan Series 3M (1972): https://archive.org/details/CAT75662333
- Cessna 172S Pilot's Operating Handbook: https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf
- EASA TCDS EASA.IM.A.277 (King Air B300 section), Issue 22: https://www.easa.europa.eu/nl/downloads/7208/en
- Textron King Air 350i brochure and product card: https://africair.com/wp-content/uploads/2018/02/King_Air_350i_Brochure.pdf
- Twin & Turbine, January 2017 (King Air stall speed): https://twinandturbine.com/issue/Jan17/files/basic-html/page10.html
- ATR 72-600 brochure (2023): https://www.atr-aircraft.com/wp-content/uploads/2023/04/260611-Digital-72_600Brochure-3.pdf
- ATR 72-600 factsheet (2020): https://www.atr-aircraft.com/wp-content/uploads/2020/07/Factsheets_-_ATR_72-600.pdf
- Boeing, 737 Airplane Characteristics for Airport Planning, D6-58325-7 Rev C: https://www.boeing.com/content/dam/boeing/v2/airports/acaps/737NG_REV_C.pdf
- Wikipedia, Boeing 737 Next Generation (wing area, span, range): https://en.wikipedia.org/wiki/Boeing_737_Next_Generation
- Raymer, *Aircraft Design: A Conceptual Approach* (typical CD0 and span efficiency ranges)
