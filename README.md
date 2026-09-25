# Data Center Spares Sizing Simulator

How many spare drives, power supplies, optics and GPUs should a data center keep on the shelf, and how much capital does that tie up?

This app answers that with a Poisson base-stock model, checks the answer with a day-by-day simulation, and shows every source behind every number.

**Live app:** _link added at publish_ · **Excel reference model:** [`docs/spares_model.xlsx`](docs/spares_model.xlsx)

---

## What it shows (default inputs, 95% fill rate)

| Part class | Fleet | Failure rate | Lead time | Spares needed | Capital |
|---|---|---|---|---|---|
| Drives (Seagate Exos 24TB) | 500 | 1.36% / yr | 12 wk | 5 | $5,399.95 |
| PSUs (Artesyn CSU2000AP) | 400 | 1.74% / yr | 8 wk | 4 | $2,124.64 |
| Optics (800G OSFP, generic) | 1,000 | 2.0% / yr | 16 wk | 11 | $10,109.00 |
| GPUs (H100 SXM, module level) | 1,024 | 9.08% / yr | 8 wk | 22 | $492,250.00 |
| **Total** | | | | **42** | **$509,883.59** |

### Four findings worth knowing

1. **The GPU repair unit is the biggest capital decision in the model.** Sparing single GPUs needs 22 units ($492,250). Sparing whole 8-GPU HGX boards needs 17 boards ($3,043,000), **6.2x the capital**, because one failed GPU takes its board out of service (board failure rate = 1 - (1 - 9.08%)^8 = 53.3% / yr).
2. **A 95% fill-rate target is a long-run average, not a promise for every year.** Across 1,000 simulated years, optics and GPUs still miss 95% in about 1 year in 5.
3. **Branded vs generic optics costs 4.5x as much for the same 11 spares:** $10,109 generic vs $45,557 for a branded-equivalent module.
4. **For rarely failing parts, the textbook normal approximation over-stocks.** For optics it recommends 12 units where the Poisson model needs 11.

---

## How it works

- **Lead-time demand:** λ = fleet × annual failure rate × lead time (weeks) / 52
- **Recommended stock S:** the smallest S where P(demand during lead time ≤ S − 1) ≥ target fill rate. Fill rate is the chance a failure finds a spare on the shelf under one-for-one replenishment (every failure triggers one reorder).
- **Cycle service level** P(D ≤ S) and the **normal approximation** are shown for comparison only.
- **Simulation:** day-by-day, 364 days per year, seeded random numbers with an independent stream per part class, backorders filled as replacements arrive. "Run 1,000 scenarios" reports the average fill rate, the share of years meeting target, the worst year, and stockouts per year over a 1, 3 or 5-year horizon.
- **GPU model:** H100 SXM uses sourced data by default. A **Custom** option takes any GPU's failure rate, board price and GPUs per board, clearly labeled as user-entered.

---

## Data sources

| Input | Value | Source | Status |
|---|---|---|---|
| Drive failure rate | 1.36% | [Backblaze Drive Stats for 2025](https://www.backblaze.com/blog/backblaze-drive-stats-for-2025/) | Sourced (cloud storage fleet, not an AI cluster) |
| PSU failure rate | 1.74% | 1 - e^(-8760 / 500,000 h MTBF), [Artesyn CSU Series datasheet](https://www.mouser.com/datasheet/2/863/ENG_CSU_SERIES_235_01_06_03_25-3462455.pdf) | Derived (lab rating at 50°C, 85% load; field rates often run higher) |
| Optics failure rate | 2.0% | Planner assumption, tested at 1% / 2% / 4% | **Unsourced**: no public field rate for 800G modules found |
| GPU failure rate | 9.08% | (148 faulty-GPU + 72 HBM3 interruptions) / 16,384 H100s × 365 / 54 days, [Meta, *The Llama 3 Herd of Models*](https://ai.meta.com/research/publications/the-llama-3-herd-of-models/) | Derived; an interruption rate, likely an upper bound for replacements |
| Drive price | $1,079.99 | [ListofDisks](https://www.listofdisks.com/products/seagate-exos-24tb-st24000nm002h-d62767), lowest new offer | Sourced, checked 2026-09-24 |
| PSU price | $531.16 | [Mouser](https://www.mouser.com/ProductDetail/Advanced-Energy-Artesyn/CSU2000AP-3-100?qs=PqoDHHvF649qddCp7yZ1ZA%3D%3D), qty 1 | Sourced, checked 2026-09-24 |
| Optics price, generic | $919.00 | [NADDOD #32798](https://www.naddod.com/products/32798.html) | Sourced, checked 2026-09-24 |
| Optics price, branded-equivalent | $4,141.54 | [Axiom, Arista OSFP-800G-2XDR4 equivalent, at SHI](https://www.shi.com/product/50875021/Axiom-OSFP112-transceiver-module-(equivalent-to:-Arista-OSFP-800G-2XDR4)) | Sourced (MSRP), checked 2026-09-24 |
| HGX H100 8-GPU board price | $179,000 | [Network Outlet](https://networkoutlet.com/products/nvidia-hgx-h100-sxm5-8-gpu-board-935-24287-0301-000-board-new) | Sourced, checked 2026-09-25 |

GPU module cost ($22,375) is board price / 8, a proxy, since single H100 SXM modules are rarely sold new on their own. Fleet sizes and lead times are sample values; dollar totals scale with fleet size. Street prices move, so re-check before quoting.

---

## How the math was verified

1. **Excel answer key.** [`docs/spares_model.xlsx`](docs/spares_model.xlsx) computes every result with visible formulas and its own check tab (19/19 pass).
2. **51 automated tests** ([`src/lib/sparesModel.test.ts`](src/lib/sparesModel.test.ts)) compare the app's math against those Excel values, typed in as fixed answers, plus hyperscale cases.
3. **Independent re-computation** of every tested value in Python (SciPy).
4. **Line-by-line code review** against the formula spec. It found a real bug: above about 53,000 GPUs, the Poisson calculation underflowed (e^-λ rounds to 0 once λ passes ~745) and the app silently capped recommended stock at 1,000. At 100,000 GPUs the correct answer is 1,459. Fixed with a log-space calculation, and regression tests now run at 100,000 GPUs.
5. **Simulation vs model:** long-run simulated fill rates land within 0.5 percentage points of the model for every part class. An earlier weekly-step version was 1.7 points too optimistic for GPUs, so the simulation was moved to daily steps.

### Run the tests yourself

```sh
git clone https://github.com/MohdEnam/spares-simulator.git
cd spares-simulator
npm install
npx vitest run
```

---

## How this differs from existing tools

- **DCIM parts modules** (e.g. [Sunbird dcTrack](https://www.sunbirddcim.com/blog/how-leading-data-center-managers-track-and-manage-parts)) track spare-part inventory and alert when stock falls below a threshold **you set**. This tool calculates what that threshold should be, and what it costs.
- **Third-party maintenance sparing services** (e.g. Service Express OnDeck Predictive Sparing) pre-position parts for customers as a managed service. This tool makes the sizing logic transparent so a planner can see and challenge it.
- **GPU cloud ratings** (e.g. [SemiAnalysis ClusterMAX](https://www.clustermax.ai/)) help decide which provider to rent from. This tool is for teams running their own fleet.

## Limitations

- Constant failure rates: no infant mortality or wear-out curve.
- Independent failures: no bad-batch correlation (matters most for optics).
- Fixed lead times, no repair/RMA loop, no multi-site pooling.
- GPU failure data is H100-only; other GPUs rely on user-entered values.

---

Built by Enamullah Mohammad as a supply chain portfolio project. Frontend built with [Lovable](https://lovable.dev); math verified in Excel, Vitest and Python.
