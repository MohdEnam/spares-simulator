# Case study: Co-packaged optics changes what goes on the spares shelf

*Companion to the [Data Center Spares Sizing Simulator](https://spares-simulator.lovable.app). One page.*

## The shift

Today, a data center switch talks to fiber through **pluggable transceivers**: 800G modules that slide into the front panel. When one fails, a technician swaps it from the shelf in minutes. That is the world the simulator models: 11 spare optics for a 1,000-module fleet, $10,109 generic or $45,557 branded.

**Co-packaged optics (CPO)** moves the optical engines [the chips that turn electrical signals into light] inside the switch package, next to the switch chip. Only the lasers stay outside, in **external laser source (ELS)** modules. NVIDIA ships this in its Quantum-X and Spectrum-X Photonics switches; Broadcom ships it as Bailly (51.2T) and Davisson (102.4T).

## What changes for spares

| | Pluggable era | CPO era |
|---|---|---|
| Field-replaceable optics unit | Transceiver (1 per port) | ELS module (8 lasers, feeds 32 transmit lanes) |
| Units per 144-port 800G switch | 144 | 18 ELS |
| Units for a 32-switch fabric | 4,608 | 576 (**8x fewer**) |
| When the optical engine fails | Swap one $919 module | Engine is inside the switch package: **switch-level repair or RMA** |
| Buying choice | Generic vs branded (4.5x price gap) | Optics come with the switch vendor |

Sources: NVIDIA says each ELS holds eight lasers, powers 32 of a Quantum-X switch's 576 transmit lanes, is field-replaceable, and that centralizing lasers cuts the lasers in the data center by 4x ([NVIDIA, Aug 2025](https://developer.nvidia.com/blog/how-industry-collaboration-fosters-nvidia-co-packaged-optics/)). 576 / 32 = 18 ELS per switch.

## Worked example (using the simulator's model, 95% fill rate, 16-week lead time)

- **Pluggable fabric:** 4,608 transceivers at 2% AFR → lead-time demand 28.4 → **38 spares, $34,922** at generic pricing.
- **CPO fabric, ELS shelf:** 576 ELS at 1% / 2% / 4% AFR → **5 / 8 / 13 spares**. No public ELS failure rate or price exists, so this is a sensitivity range, not a forecast.
- **What the shelf no longer covers:** an optical engine failure. It now behaves like the simulator's GPU board case, where one failed GPU takes out a whole 8-GPU board and spares capital jumps **6.2x**. The unit you replace gets bigger, and so does the cost of each failure.

## Is CPO more reliable? Early data says yes, with a small sample

- Broadcom reports Meta testing reached **one million 400G port device-hours with no link flaps** ([Broadcom, Oct 2025](https://www.broadcom.com/company/news/product-releases/63616)).
- SemiAnalysis reports Meta's ECOC 2025 talk showed an MTBF of **2.6M port device-hours for CPO vs ~550k for 400G pluggables** ([SemiAnalysis](https://newsletter.semianalysis.com/p/co-packaged-optics-cpo-book-scaling)). Converted with the simulator's formula, AFR = 1 - e^(-8760/MTBF): **~0.34% vs ~1.58% per port per year**, roughly 5x fewer failures.
- Caveat: that is 15 switches in a lab over about 11 months, reported second-hand. Fewer failures with a larger blast radius per failure is the trade-off to plan around.

## What a planner should do

1. **Stock two tiers.** ELS modules on the local shelf (sized with the Poisson model), and whole switches or line cards at a depot or under an advance-replacement contract.
2. **Buy the data, not just the hardware.** No public ELS failure rate exists. Write field failure-rate reporting into the supply agreement so the spares model runs on real numbers.
3. **Negotiate the RMA clock.** With switch-level repairs, the vendor's advance-replacement time, not the shelf, sets how long ports stay down.
4. **Price the lost optionality.** The generic-vs-branded choice (4.5x in the simulator) goes away when optics ship inside the switch. Put that into the total-cost comparison.

## Confidence

High: NVIDIA's ELS architecture numbers and the unit-count arithmetic. Moderate: CPO reliability advantage (one operator, small sample, second-hand MTBF). Unknown: ELS failure rate and price, and field repair times for optical engines.

*Background on why optics are moving into the package: P. A. Baziana, "Optical Data Center Networking: A Comprehensive Review," IEEE Access, 2024, [doi:10.1109/ACCESS.2024.3513214](https://doi.org/10.1109/ACCESS.2024.3513214).*
