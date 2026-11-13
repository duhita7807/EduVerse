/** Technical series — Chemical / Petroleum / Biotech-style process branches. Entries: [question, answer, [wrong x3], why, topic]. */
const { makeTechnicalBuilder, numQ, round, int, pick } = require("./common");

const TEMPLATES = {
  beginner: {
    molarity: (r) => {
      const mol = pick(r, [0.1, 0.2, 0.25, 0.5, 1]), L = pick(r, [0.25, 0.5, 1, 2]);
      return numQ("Stoichiometry", `${mol} mol of solute is dissolved to make ${L} L of solution. What is the molarity?`, round(mol / L, 3), 0.1, (x) => `${x} M`, `M = moles/litres = ${mol}/${L} = ${round(mol / L, 3)} M.`);
    },
    dilution: (r) => {
      const C1 = pick(r, [2, 5, 10, 12]), V1 = pick(r, [10, 20, 50]), V2 = pick(r, [100, 200, 250, 500]);
      return numQ("Stoichiometry", `${V1} mL of a ${C1} M solution is diluted to ${V2} mL. What is the new concentration?`, round((C1 * V1) / V2, 3), 0.1, (x) => `${x} M`, `C2 = C1V1/V2 = ${C1} × ${V1}/${V2} = ${round((C1 * V1) / V2, 3)} M.`);
    },
    yieldPct: (r) => {
      const theo = pick(r, [20, 40, 50, 80, 100]), pct = pick(r, [60, 70, 75, 80, 90]);
      const actual = round((theo * pct) / 100, 2);
      return numQ("Stoichiometry", `A reaction's theoretical yield is ${theo} g and ${actual} g is obtained. What is the percent yield?`, pct, 5, (x) => `${x}%`, `% yield = actual/theoretical × 100 = ${actual}/${theo} × 100 = ${pct}%.`);
    },
    heat: (r) => {
      const m = pick(r, [1, 2, 5, 10]), dT = int(r, 5, 40);
      const Q = round(m * 4.18 * dT, 2);
      return numQ("Thermodynamics", `How much heat is needed to raise ${m} kg of water by ${dT} °C? (c = 4.18 kJ/kg·K)`, Q, Math.max(2, round(Q / 5, 0)), (x) => `${x} kJ`, `Q = mcΔT = ${m} × 4.18 × ${dT} = ${Q} kJ.`);
    },
    massPct: (r) => {
      const s = pick(r, [5, 10, 15, 20, 25]), w = pick(r, [75, 90, 100, 150]);
      return numQ("Material balance", `${s} g of salt is dissolved in ${w} g of water. What is the mass percent of salt?`, round((s / (s + w)) * 100, 2), 2, (x) => `${x}%`, `Mass % = ${s}/(${s} + ${w}) × 100 = ${round((s / (s + w)) * 100, 2)}%.`);
    },
  },
  intermediate: {
    idealGas: (r) => {
      const P = pick(r, [100, 101.325, 200, 500]), V = pick(r, [1, 2, 5, 10]), T = pick(r, [273, 298, 300, 350]);
      const n = round((P * V) / (8.314 * T), 3);
      return numQ("Thermodynamics", `How many moles of ideal gas occupy ${V} m³ at ${P} kPa and ${T} K? (R = 8.314 kJ/kmol·K, answer in kmol)`, n, Math.max(0.01, round(n / 5, 3)), (x) => `${x} kmol`, `n = PV/RT = ${P} × ${V}/(8.314 × ${T}) = ${n} kmol.`);
    },
    reynolds: (r) => {
      const v = pick(r, [0.5, 1, 1.5, 2]), D = pick(r, [0.025, 0.05, 0.1]), nu = 1e-6;
      const Re = Math.round((v * D) / nu);
      return numQ("Fluid mechanics", `Water (kinematic viscosity 1 × 10⁻⁶ m²/s) flows at ${v} m/s in a ${D} m pipe. What is the Reynolds number?`, Re, Math.max(1000, Math.round(Re / 5)), String, `Re = vD/ν = ${v} × ${D}/10⁻⁶ = ${Re} (turbulent above ~4000).`);
    },
    mixing: (r) => {
      const m1 = pick(r, [100, 200, 300]), x1 = pick(r, [10, 20, 30]), m2 = pick(r, [100, 200, 400]), x2 = pick(r, [40, 50, 60]);
      const x = round((m1 * x1 + m2 * x2) / (m1 + m2), 2);
      return numQ("Material balance", `${m1} kg of ${x1}% solution is mixed with ${m2} kg of ${x2}% solution. What is the mixture concentration (mass %)?`, x, 2, (v) => `${v}%`, `x = (${m1}×${x1} + ${m2}×${x2})/(${m1 + m2}) = ${x}%.`);
    },
    conversion: (r) => {
      const fed = pick(r, [100, 200, 500]), pct = pick(r, [40, 60, 75, 85]);
      const left = round((fed * (100 - pct)) / 100, 2);
      return numQ("Reaction engineering", `${fed} mol of A is fed to a reactor and ${left} mol leaves unreacted. What is the conversion of A?`, pct, 5, (x) => `${x}%`, `X = (fed − out)/fed × 100 = (${fed} − ${left})/${fed} × 100 = ${pct}%.`);
    },
    ph: (r) => {
      const n = int(r, 1, 5);
      return numQ("Physical chemistry", `What is the pH of a strong acid solution with [H⁺] = 10⁻${n} M?`, n, 1, String, `pH = −log[H⁺] = −log(10⁻${n}) = ${n}.`);
    },
  },
  advanced: {
    lmtd: (r) => {
      const d1 = pick(r, [40, 50, 60, 80]), d2 = pick(r, [10, 15, 20, 25]);
      const L = round((d1 - d2) / Math.log(d1 / d2), 2);
      return numQ("Heat transfer", `In a heat exchanger the terminal temperature differences are ${d1} °C and ${d2} °C. What is the LMTD?`, L, 2, (x) => `${x} °C`, `LMTD = (ΔT1 − ΔT2)/ln(ΔT1/ΔT2) = (${d1} − ${d2})/ln(${d1}/${d2}) = ${L} °C.`);
    },
    halfLife: (r) => {
      const k = pick(r, [0.01, 0.02, 0.05, 0.1, 0.2]);
      const t = round(Math.log(2) / k, 2);
      return numQ("Reaction engineering", `A first-order reaction has k = ${k} min⁻¹. What is its half-life?`, t, Math.max(1, round(t / 5, 0)), (x) => `${x} min`, `t½ = ln2/k = 0.693/${k} = ${t} min.`);
    },
    cstr: (r) => {
      const v0 = pick(r, [1, 2, 5]), k = pick(r, [0.1, 0.2, 0.5]), X = pick(r, [0.5, 0.6, 0.75, 0.8]);
      const V = round((v0 * X) / (k * (1 - X)), 2);
      return numQ("Reaction engineering", `A CSTR runs a first-order liquid reaction (k = ${k} min⁻¹) with feed ${v0} L/min. What volume gives ${X * 100}% conversion?`, V, Math.max(1, round(V / 5, 0)), (x) => `${x} L`, `V = v₀X/(k(1 − X)) = ${v0} × ${X}/(${k} × ${round(1 - X, 2)}) = ${V} L.`);
    },
    heatDuty: (r) => {
      const U = pick(r, [200, 500, 800, 1000]), A = pick(r, [5, 10, 20]), dT = pick(r, [15, 20, 30, 40]);
      const Q = round((U * A * dT) / 1000, 2);
      return numQ("Heat transfer", `A heat exchanger has U = ${U} W/m²·K, area ${A} m² and LMTD ${dT} K. What is the heat duty?`, Q, Math.max(1, round(Q / 5, 0)), (x) => `${x} kW`, `Q = UAΔT = ${U} × ${A} × ${dT} = ${Q} kW.`);
    },
    raoult: (r) => {
      const x = pick(r, [0.2, 0.3, 0.4, 0.6]), Psat = pick(r, [50, 80, 100, 120]);
      return numQ("Mass transfer", `For an ideal liquid mixture, component A has mole fraction ${x} and vapour pressure ${Psat} kPa. What is its partial pressure?`, round(x * Psat, 2), 5, (v) => `${v} kPa`, `Raoult's law: pA = xA × PA_sat = ${x} × ${Psat} = ${round(x * Psat, 2)} kPa.`);
    },
  },
};

const BANK = {
  beginner: [
    ["What is a unit operation?", "A basic physical step in a process like distillation or filtration", ["A chemical reaction only", "A unit of measurement", "A plant shutdown"], "Physical changes, not chemical ones.", "Process basics"],
    ["What is a unit process?", "A step involving a chemical change, like oxidation or nitration", ["A purely physical separation", "A measuring step", "A storage step"], "Chemical conversions.", "Process basics"],
    ["What is Avogadro's number?", "6.022 × 10²³", ["3 × 10⁸", "9.81", "1.38 × 10⁻²³"], "Particles per mole.", "Basics"],
    ["What is the molar mass of water?", "18 g/mol", ["16 g/mol", "20 g/mol", "32 g/mol"], "2(1) + 16 = 18.", "Stoichiometry"],
    ["What is the molar mass of CO₂?", "44 g/mol", ["28 g/mol", "32 g/mol", "48 g/mol"], "12 + 2(16) = 44.", "Stoichiometry"],
    ["What is the molar volume of an ideal gas at STP (0 °C, 1 atm)?", "22.4 L", ["24.5 L", "11.2 L", "1 L"], "At 25 °C it is about 24.5 L.", "Stoichiometry"],
    ["What is the pH of pure water at 25 °C?", "7", ["0", "14", "1"], "Neutral.", "Physical chemistry"],
    ["A solution with pH 3 is:", "Acidic", ["Basic", "Neutral", "Saturated"], "pH below 7 is acidic.", "Physical chemistry"],
    ["What does the law of conservation of mass state?", "Mass is neither created nor destroyed in a chemical reaction", ["Energy is always lost", "Mass increases in reactions", "Volume is conserved"], "Basis of material balances.", "Material balance"],
    ["What is the general material balance equation?", "Input − Output + Generation − Consumption = Accumulation", ["Input = Output always", "Input + Output = 0", "Output − Input = Generation"], "At steady state accumulation is zero.", "Material balance"],
    ["What does steady state mean in a process?", "Conditions do not change with time", ["The process is stopped", "Flow is zero", "Temperature is zero"], "Accumulation = 0.", "Process basics"],
    ["What is a catalyst?", "A substance that speeds up a reaction without being consumed", ["A reactant that is used up", "A product", "An inhibitor"], "It lowers activation energy.", "Reaction engineering"],
    ["What is an exothermic reaction?", "A reaction that releases heat", ["A reaction that absorbs heat", "A reaction with no energy change", "A nuclear reaction only"], "ΔH is negative.", "Thermodynamics"],
    ["What is an endothermic reaction?", "A reaction that absorbs heat", ["A reaction that releases heat", "A combustion reaction", "A fast reaction"], "ΔH is positive.", "Thermodynamics"],
    ["What is distillation based on?", "Differences in volatility (boiling points)", ["Differences in colour", "Differences in particle size", "Differences in magnetism"], "More volatile components vaporise first.", "Separation"],
    ["What is filtration used for?", "Separating solids from liquids or gases", ["Separating miscible liquids", "Heating liquids", "Mixing gases"], "A filter medium retains solids.", "Separation"],
    ["What is evaporation used for in industry?", "Concentrating a solution by removing solvent", ["Separating solids", "Cooling gases", "Producing crystals only by cooling"], "e.g. sugar juice concentration.", "Separation"],
    ["What is crystallisation?", "Forming solid crystals from a solution", ["Melting a solid", "Mixing liquids", "Burning fuel"], "Achieved by cooling or evaporation.", "Separation"],
    ["What does a centrifuge use to separate components?", "Centrifugal force", ["Magnetism", "Heat", "Light"], "Denser particles move outward.", "Separation"],
    ["Which mode of heat transfer needs no medium?", "Radiation", ["Conduction", "Convection", "Advection"], "Heat from the Sun reaches Earth.", "Heat transfer"],
    ["What is conduction?", "Heat transfer through a material without bulk motion", ["Heat transfer by fluid motion", "Heat transfer by waves only", "Heat loss by evaporation"], "Fourier's law.", "Heat transfer"],
    ["What is convection?", "Heat transfer by the movement of fluid", ["Heat transfer through solids", "Heat transfer through vacuum", "Heat generation"], "Natural or forced.", "Heat transfer"],
    ["Which law governs conduction heat transfer?", "Fourier's law", ["Newton's law of viscosity", "Fick's law", "Raoult's law"], "q = −k dT/dx.", "Heat transfer"],
    ["Which law governs molecular diffusion?", "Fick's law", ["Fourier's law", "Hooke's law", "Ohm's law"], "Flux ∝ concentration gradient.", "Mass transfer"],
    ["What is viscosity?", "A fluid's resistance to flow", ["A fluid's density", "A fluid's temperature", "A fluid's colour"], "Honey has high viscosity.", "Fluid mechanics"],
    ["What is a Newtonian fluid?", "A fluid whose shear stress is proportional to shear rate", ["A fluid with no viscosity", "A solid", "A fluid whose viscosity changes with stirring"], "e.g. water, air.", "Fluid mechanics"],
    ["Which flow regime has Re below about 2100 in pipes?", "Laminar", ["Turbulent", "Transitional only", "Supersonic"], "Smooth, layered flow.", "Fluid mechanics"],
    ["What device is commonly used to move liquids?", "Pump", ["Compressor", "Turbine", "Condenser"], "Compressors move gases.", "Fluid mechanics"],
    ["What device increases gas pressure?", "Compressor", ["Pump", "Valve", "Nozzle"], "Used in refrigeration and gas plants.", "Fluid mechanics"],
    ["What is the purpose of a valve?", "Controlling flow in a pipeline", ["Measuring temperature", "Generating heat", "Storing fluid"], "Gate, globe, ball valves etc.", "Process equipment"],
    ["What does a heat exchanger do?", "Transfers heat between two fluids", ["Mixes two fluids", "Stores heat permanently", "Generates electricity"], "Shell-and-tube is common.", "Heat transfer"],
    ["What is a boiler used for?", "Producing steam", ["Cooling water", "Separating oil", "Compressing air"], "Steam is used for heating and power.", "Process equipment"],
    ["What is a cooling tower used for?", "Rejecting heat from process water to the atmosphere", ["Heating water", "Storing chemicals", "Producing steam"], "Uses evaporative cooling.", "Process equipment"],
    ["What is the boiling point of water at 1 atm?", "100 °C", ["90 °C", "120 °C", "0 °C"], "It falls at lower pressure.", "Thermodynamics"],
    ["What is specific heat capacity?", "Heat needed to raise unit mass by one degree", ["Total heat in a body", "Heat of reaction", "Latent heat"], "Water is about 4.18 kJ/kg·K.", "Thermodynamics"],
    ["What is latent heat?", "Heat absorbed or released during a phase change at constant temperature", ["Heat that raises temperature", "Heat of combustion", "Heat lost by radiation"], "e.g. heat of vaporisation.", "Thermodynamics"],
    ["What is the first law of thermodynamics?", "Energy is conserved", ["Entropy always decreases", "Absolute zero can be reached", "Heat flows from cold to hot"], "ΔU = Q − W.", "Thermodynamics"],
    ["What is the second law of thermodynamics about?", "Entropy of an isolated system never decreases", ["Energy conservation", "Absolute zero", "Mass conservation"], "Heat flows hot to cold spontaneously.", "Thermodynamics"],
    ["What does PFD stand for in chemical engineering?", "Process Flow Diagram", ["Pipe Flow Data", "Plant Function Description", "Pressure Fluid Diagram"], "Shows major equipment and streams.", "Process basics"],
    ["What does P&ID stand for?", "Piping and Instrumentation Diagram", ["Pressure and Inlet Design", "Plant and Industrial Data", "Pump and Inlet Drawing"], "Details piping, valves and instruments.", "Process basics"],
    ["What is an MSDS/SDS?", "A safety data sheet describing a chemical's hazards and handling", ["A process diagram", "A cost estimate", "A maintenance log"], "Required for hazardous chemicals.", "Safety"],
    ["What does PPE stand for?", "Personal Protective Equipment", ["Process Plant Equipment", "Primary Pressure Element", "Pump Pressure Estimate"], "Gloves, goggles, helmets etc.", "Safety"],
    ["What is the fire triangle?", "Fuel, oxygen and heat", ["Fuel, water and air", "Heat, light and smoke", "Oxygen, nitrogen and carbon"], "Remove one to extinguish a fire.", "Safety"],
    ["What is the flash point of a liquid?", "The lowest temperature at which its vapour can ignite", ["Its boiling point", "Its freezing point", "The temperature of auto-ignition"], "Lower flash point is more hazardous.", "Safety"],
    ["What is the main component of natural gas?", "Methane", ["Ethane", "Propane", "Butane"], "Its formula is CH₄.", "Fuels"],
    ["What is LPG mainly composed of?", "Propane and butane", ["Methane", "Hydrogen", "Ethylene"], "Liquefied petroleum gas.", "Fuels"],
    ["What process separates crude oil into fractions?", "Fractional distillation", ["Filtration", "Crystallisation", "Electrolysis"], "Based on boiling ranges.", "Petroleum"],
    ["What is cracking in petroleum refining?", "Breaking large hydrocarbons into smaller ones", ["Joining small molecules", "Removing water", "Adding sulfur"], "Thermal or catalytic.", "Petroleum"],
    ["Which gas is produced in the Haber process?", "Ammonia", ["Methanol", "Sulfuric acid", "Nitric acid"], "N₂ + 3H₂ → 2NH₃.", "Industrial chemistry"],
    ["Which process makes sulfuric acid?", "Contact process", ["Haber process", "Solvay process", "Ostwald process"], "Uses V₂O₅ catalyst.", "Industrial chemistry"],
    ["Which process makes sodium carbonate?", "Solvay process", ["Contact process", "Haber process", "Bayer process"], "Uses brine, ammonia and CO₂.", "Industrial chemistry"],
    ["Which process makes nitric acid?", "Ostwald process", ["Haber process", "Contact process", "Hall–Héroult process"], "Oxidation of ammonia.", "Industrial chemistry"],
    ["What is a polymer?", "A large molecule made of repeating units", ["A single atom", "A small gas molecule", "A metal alloy"], "e.g. polyethylene.", "Polymers"],
    ["What is the monomer of polyethylene?", "Ethylene", ["Propylene", "Styrene", "Vinyl chloride"], "Addition polymerisation.", "Polymers"],
    ["What is fermentation?", "Microbial conversion of sugars into products like ethanol", ["Burning of sugar", "Distillation of alcohol", "Freezing of juice"], "Used in brewing and biotech.", "Biochemical engineering"],
    ["What is the purpose of a flow meter?", "Measuring flow rate", ["Measuring temperature", "Measuring pH", "Measuring pressure only"], "e.g. orifice, rotameter.", "Instrumentation"],
    ["What instrument measures pressure?", "Manometer or pressure gauge", ["Thermometer", "Rotameter", "Hygrometer"], "Bourdon gauges are common.", "Instrumentation"],
    ["What is a thermocouple?", "A temperature sensor using two dissimilar metals", ["A pressure sensor", "A flow meter", "A level gauge"], "Generates a voltage with temperature.", "Instrumentation"],
    ["What is absolute pressure?", "Gauge pressure plus atmospheric pressure", ["Gauge pressure minus atmospheric pressure", "Atmospheric pressure only", "Vacuum pressure"], "P_abs = P_gauge + P_atm.", "Fluid mechanics"],
    ["What is the density of water approximately at room temperature?", "1000 kg/m³", ["100 kg/m³", "1 kg/m³", "13600 kg/m³"], "Mercury is 13600 kg/m³.", "Fluid mechanics"],
  ],
  intermediate: [
    ["What does Bernoulli's equation express?", "Conservation of energy along a streamline", ["Conservation of mass only", "Momentum in pipes", "Heat transfer"], "P + ½ρv² + ρgz = constant.", "Fluid mechanics"],
    ["What does the continuity equation state for incompressible flow?", "A₁V₁ = A₂V₂", ["P₁ = P₂", "V₁ = V₂ always", "A₁ = A₂"], "Mass conservation.", "Fluid mechanics"],
    ["Which equation gives friction head loss in pipes?", "Darcy–Weisbach equation", ["Bernoulli equation", "Antoine equation", "Arrhenius equation"], "hf = f(L/D)(v²/2g).", "Fluid mechanics"],
    ["What is the friction factor for laminar flow in a pipe (Darcy)?", "64/Re", ["16/Re", "0.316/Re^0.25", "Re/64"], "Fanning friction factor is 16/Re.", "Fluid mechanics"],
    ["What is cavitation in pumps?", "Formation and collapse of vapour bubbles due to low pressure", ["Pump overheating", "Air leaks only", "Excess flow"], "It damages impellers.", "Fluid mechanics"],
    ["What is NPSH?", "Net Positive Suction Head — margin above vapour pressure at pump suction", ["Pump power", "Pump efficiency", "Discharge pressure"], "NPSH available must exceed required.", "Fluid mechanics"],
    ["What does an orifice meter measure?", "Flow rate from the pressure drop across a plate", ["Temperature", "Level", "Density"], "Uses Bernoulli's principle.", "Instrumentation"],
    ["What is the Nusselt number?", "Ratio of convective to conductive heat transfer", ["Ratio of inertial to viscous forces", "Ratio of momentum to thermal diffusivity", "Ratio of mass to heat transfer"], "Nu = hL/k.", "Heat transfer"],
    ["What is the Prandtl number?", "Ratio of momentum diffusivity to thermal diffusivity", ["Ratio of convection to conduction", "Ratio of inertia to viscosity", "Ratio of buoyancy to viscosity"], "Pr = ν/α.", "Heat transfer"],
    ["Which correlation is used for turbulent forced convection in tubes?", "Dittus–Boelter", ["Stefan–Boltzmann", "Fick", "Antoine"], "Nu = 0.023 Re^0.8 Pr^n.", "Heat transfer"],
    ["What is fouling in heat exchangers?", "Deposits on surfaces that reduce heat transfer", ["Increase in heat transfer", "Leakage of fluids", "Pump failure"], "Fouling factors are added in design.", "Heat transfer"],
    ["Which flow arrangement gives the larger LMTD for the same terminal temperatures?", "Counter-current", ["Co-current", "Cross flow always", "They are equal always"], "Counter-flow is more efficient.", "Heat transfer"],
    ["What is the Stefan–Boltzmann law?", "Radiant energy emitted is proportional to T⁴", ["Heat flux ∝ temperature gradient", "Diffusion ∝ concentration gradient", "Pressure ∝ temperature"], "q = εσT⁴.", "Heat transfer"],
    ["What is relative volatility?", "Ratio of volatilities of two components; measures ease of separation by distillation", ["Ratio of densities", "Ratio of viscosities", "Ratio of molar masses"], "α = 1 means no separation.", "Mass transfer"],
    ["What is an azeotrope?", "A mixture that boils at constant composition", ["A pure solvent", "A solid solution", "A catalyst"], "Cannot be separated by simple distillation.", "Mass transfer"],
    ["What does the McCabe–Thiele method determine?", "Number of theoretical stages in binary distillation", ["Heat exchanger area", "Pump power", "Reactor volume"], "Graphical method using operating lines.", "Mass transfer"],
    ["What is the reflux ratio?", "Ratio of liquid returned to the column to distillate withdrawn", ["Ratio of feed to bottoms", "Ratio of steam to feed", "Ratio of trays to height"], "R = L/D.", "Mass transfer"],
    ["At total reflux, the number of stages is:", "Minimum", ["Maximum", "Infinite", "Zero"], "Fenske equation gives it.", "Mass transfer"],
    ["What is absorption in mass transfer?", "Transfer of a gas component into a liquid solvent", ["Removal of liquid from solid", "Separation by boiling", "Drying of solids"], "e.g. CO₂ capture in amines.", "Mass transfer"],
    ["What is liquid–liquid extraction?", "Separating components using two immiscible liquids", ["Separating gases by pressure", "Separating solids by size", "Boiling off a solvent"], "Based on distribution coefficient.", "Mass transfer"],
    ["What is leaching?", "Extracting a soluble component from a solid using a solvent", ["Extracting gas from liquid", "Drying solids", "Distilling liquids"], "e.g. sugar from beets.", "Mass transfer"],
    ["What is adsorption?", "Accumulation of molecules on a solid surface", ["Absorption into bulk liquid", "Chemical reaction in gas", "Evaporation"], "Activated carbon is common.", "Mass transfer"],
    ["What is humidity?", "Amount of water vapour in air", ["Temperature of air", "Air pressure", "Air density"], "Relative humidity is a percentage.", "Mass transfer"],
    ["What is the purpose of a drying operation?", "Removing moisture from solids", ["Adding moisture", "Cooling liquids", "Separating gases"], "e.g. spray, tray, rotary dryers.", "Mass transfer"],
    ["What is the Arrhenius equation?", "k = A e^(−Ea/RT)", ["PV = nRT", "q = UAΔT", "r = kC²"], "Rate constant rises with temperature.", "Reaction engineering"],
    ["What is activation energy?", "Minimum energy required for a reaction to occur", ["Heat released by a reaction", "Energy of products", "Energy of a catalyst"], "Catalysts lower it.", "Reaction engineering"],
    ["What is the order of a reaction?", "The sum of the exponents of concentration terms in the rate law", ["The number of products", "The number of steps", "The temperature dependence"], "Determined experimentally.", "Reaction engineering"],
    ["Units of a first-order rate constant are:", "time⁻¹", ["mol/L·s", "L/mol·s", "Dimensionless"], "Rate = kC.", "Reaction engineering"],
    ["Which ideal reactor assumes perfect mixing?", "CSTR", ["PFR", "Batch with no mixing", "Packed bed"], "Exit composition equals tank composition.", "Reaction engineering"],
    ["Which ideal reactor assumes no axial mixing?", "PFR (plug flow reactor)", ["CSTR", "Fluidised bed", "Stirred batch"], "Concentration varies along length.", "Reaction engineering"],
    ["For positive-order reactions, which needs less volume for the same conversion?", "PFR", ["CSTR", "They are always equal", "Neither can reach it"], "CSTR operates at low exit concentration.", "Reaction engineering"],
    ["What is space time in a reactor?", "Reactor volume divided by volumetric feed rate", ["Reaction time in a batch", "Residence time distribution", "Time to heat the reactor"], "τ = V/v₀.", "Reaction engineering"],
    ["What is selectivity in reactions?", "Ratio of desired product formed to undesired product", ["Total conversion", "Reaction rate", "Yield of side products only"], "Important for multiple reactions.", "Reaction engineering"],
    ["What is Gibbs free energy used to predict?", "Spontaneity of a process (ΔG < 0)", ["Reaction speed", "Heat capacity", "Density"], "ΔG = ΔH − TΔS.", "Thermodynamics"],
    ["What is the relation between ΔG° and K?", "ΔG° = −RT ln K", ["ΔG° = RT K", "ΔG° = K/RT", "ΔG° = ln K"], "Large K means negative ΔG°.", "Thermodynamics"],
    ["What does Le Chatelier's principle state?", "A system at equilibrium shifts to counteract a change", ["Reactions always go to completion", "Equilibrium never changes", "Catalysts shift equilibrium"], "Applies to T, P and concentration.", "Thermodynamics"],
    ["What is the Antoine equation used for?", "Vapour pressure as a function of temperature", ["Reaction rate", "Pressure drop", "Heat transfer coefficient"], "log P = A − B/(C + T).", "Thermodynamics"],
    ["What is Raoult's law?", "Partial pressure = mole fraction × pure-component vapour pressure", ["Pressure ∝ temperature", "Solubility ∝ partial pressure", "Rate ∝ concentration"], "Applies to ideal solutions.", "Thermodynamics"],
    ["What is Henry's law?", "Solubility of a gas is proportional to its partial pressure", ["Vapour pressure equals mole fraction", "Volume ∝ temperature", "Pressure ∝ density"], "p = H × x.", "Thermodynamics"],
    ["What is the compressibility factor Z?", "PV/nRT — deviation from ideal gas behaviour", ["Ratio of densities", "Heat capacity ratio", "Reduced temperature"], "Z = 1 for ideal gases.", "Thermodynamics"],
    ["What is a feedback control loop's basic elements?", "Sensor, controller and final control element", ["Pump, pipe and tank", "Reactor, column and heater", "Valve, filter and dryer"], "e.g. a control valve as final element.", "Process control"],
    ["Which controller action gives zero offset?", "Integral action", ["Proportional only", "On-off only", "Derivative only"], "PI controllers remove offset.", "Process control"],
    ["What is a cascade control system?", "A primary controller setting the setpoint of a secondary controller", ["Two independent controllers", "Manual control", "Feedforward only"], "Rejects inner-loop disturbances faster.", "Process control"],
    ["What is feedforward control?", "Measuring a disturbance and correcting before it affects the output", ["Correcting after the output deviates", "Manual operation", "Random adjustment"], "Often combined with feedback.", "Process control"],
    ["What is a first-order system's time constant?", "Time to reach 63.2% of the final value after a step", ["Time to reach 100%", "Time to reach 50%", "Delay before response"], "τ characterises speed.", "Process control"],
    ["What is the purpose of a HAZOP study?", "Systematically identifying process hazards and operability problems", ["Calculating costs", "Designing pumps", "Measuring emissions"], "Uses guide words like 'more' and 'no'.", "Safety"],
    ["What is the LEL of a flammable gas?", "Lowest concentration in air that can burn", ["Highest concentration that can burn", "Ignition temperature", "Boiling point"], "Below LEL the mixture is too lean.", "Safety"],
    ["What is a pressure relief valve used for?", "Protecting equipment from overpressure", ["Increasing pressure", "Measuring flow", "Controlling temperature"], "Opens at set pressure.", "Safety"],
    ["What is the purpose of a rupture disc?", "A one-time pressure relief device that bursts at set pressure", ["A flow controller", "A heat exchanger part", "A level sensor"], "Often used with relief valves.", "Safety"],
    ["What is a packed column?", "A column filled with packing to increase gas–liquid contact area", ["A column with trays only", "A storage tank", "A reactor with catalyst only"], "Used for absorption and distillation.", "Mass transfer"],
    ["What is flooding in a distillation column?", "Excessive liquid accumulation due to high vapour flow", ["Low liquid flow", "Dry trays", "Column leakage"], "It reduces separation efficiency.", "Mass transfer"],
    ["What is weeping in tray columns?", "Liquid leaking through tray holes at low vapour flow", ["Liquid entrainment upward", "Flooding", "Foaming"], "Occurs at low vapour rates.", "Mass transfer"],
    ["What is the purpose of a reboiler?", "Supplying heat to generate vapour at the bottom of a column", ["Condensing overhead vapour", "Cooling the feed", "Storing product"], "Condensers are at the top.", "Mass transfer"],
    ["What is BOD/COD ratio used for?", "Assessing biodegradability of wastewater", ["Measuring pH", "Measuring flow", "Calculating heat"], "Higher ratio means more biodegradable.", "Environmental engineering"],
    ["What is the main purpose of a scrubber?", "Removing pollutants from gas streams using a liquid", ["Heating gases", "Compressing air", "Drying solids"], "Wet scrubbers remove SO₂, particulates.", "Environmental engineering"],
    ["What is an electrostatic precipitator?", "A device removing particles from gas using electric charge", ["A water heater", "A catalyst bed", "A pump"], "Used in power plant flue gas.", "Environmental engineering"],
    ["What is the Hall–Héroult process used for?", "Producing aluminium by electrolysis", ["Producing ammonia", "Producing steel", "Refining oil"], "Alumina in molten cryolite.", "Industrial chemistry"],
    ["What is steam reforming used for?", "Producing hydrogen from methane", ["Producing oxygen", "Cracking crude oil", "Making sulfuric acid"], "CH₄ + H₂O → CO + 3H₂.", "Industrial chemistry"],
    ["What is the purpose of hydrotreating in refineries?", "Removing sulfur and nitrogen using hydrogen", ["Adding sulfur", "Making plastics", "Separating water"], "Produces cleaner fuels.", "Petroleum"],
    ["What is octane number a measure of?", "Gasoline's resistance to knocking", ["Diesel ignition quality", "Fuel density", "Fuel colour"], "Cetane number is for diesel.", "Petroleum"],
  ],
  advanced: [
    ["What does the Damköhler number compare?", "Reaction rate to transport (flow) rate", ["Inertia to viscosity", "Heat to mass transfer", "Buoyancy to viscosity"], "High Da means reaction-limited conversion is high.", "Reaction engineering"],
    ["What does the Thiele modulus describe?", "Ratio of reaction rate to diffusion rate in a catalyst pellet", ["Heat transfer in tubes", "Pressure drop in beds", "Mixing in tanks"], "Large modulus means diffusion limitation.", "Reaction engineering"],
    ["What is the effectiveness factor of a catalyst?", "Actual rate divided by rate without internal diffusion limits", ["Catalyst cost per kg", "Selectivity ratio", "Conversion percentage"], "η ≤ 1 for isothermal pellets.", "Reaction engineering"],
    ["What is residence time distribution (RTD) used for?", "Characterising non-ideal flow in reactors", ["Measuring temperature", "Designing pumps", "Calculating heat of reaction"], "Measured with tracer tests.", "Reaction engineering"],
    ["What does the Ergun equation predict?", "Pressure drop through packed beds", ["Heat transfer in pipes", "Reaction rate", "Vapour pressure"], "Combines laminar and turbulent terms.", "Fluid mechanics"],
    ["What is minimum fluidisation velocity?", "The gas velocity at which bed weight is supported by drag", ["Velocity of particle settling", "Velocity at choking", "Velocity at zero flow"], "Above it the bed behaves like a fluid.", "Fluid mechanics"],
    ["What is Stokes' law used for?", "Terminal settling velocity of small particles in laminar flow", ["Pipe friction", "Heat conduction", "Gas diffusion"], "v = gd²(ρp − ρ)/(18μ).", "Mechanical operations"],
    ["What is a non-Newtonian shear-thinning fluid?", "A fluid whose apparent viscosity decreases with shear rate", ["A fluid whose viscosity increases with shear", "A fluid with constant viscosity", "An inviscid fluid"], "e.g. ketchup, polymer solutions.", "Fluid mechanics"],
    ["What is the Biot number used for?", "Judging whether internal conduction resistance is significant (lumped analysis)", ["Comparing reaction and diffusion", "Comparing inertia and viscosity", "Measuring radiation"], "Bi < 0.1 allows lumped capacitance.", "Heat transfer"],
    ["What does the Grashof number represent?", "Ratio of buoyancy to viscous forces", ["Ratio of convection to conduction", "Ratio of momentum to heat diffusivity", "Ratio of reaction to flow"], "Used in natural convection.", "Heat transfer"],
    ["What is the ε-NTU method used for?", "Heat exchanger analysis when outlet temperatures are unknown", ["Distillation stage count", "Reactor sizing", "Pump selection"], "Effectiveness vs number of transfer units.", "Heat transfer"],
    ["What is critical insulation thickness?", "Radius at which adding insulation to a cylinder maximises heat loss", ["Thickness for zero heat loss", "Maximum allowed thickness", "Thickness of the pipe wall"], "r_c = k/h for cylinders.", "Heat transfer"],
    ["What is the Sherwood number?", "Ratio of convective mass transfer to diffusive mass transfer", ["Ratio of heat to mass transfer", "Ratio of inertia to viscosity", "Ratio of reaction to diffusion"], "Mass-transfer analogue of Nusselt.", "Mass transfer"],
    ["What is the Schmidt number?", "Ratio of momentum diffusivity to mass diffusivity", ["Ratio of heat to mass diffusivity", "Ratio of buoyancy to viscosity", "Ratio of reaction to flow"], "Sc = ν/D.", "Mass transfer"],
    ["What does the Chilton–Colburn analogy relate?", "Momentum, heat and mass transfer coefficients", ["Reaction rates and temperature", "Pressure and volume", "Density and viscosity"], "j_H = j_D = f/2.", "Transport phenomena"],
    ["What is HETP?", "Height equivalent to a theoretical plate in packed columns", ["Heat exchanger temperature profile", "Height of the entire tower", "Heat of vaporisation"], "Packing height = N × HETP.", "Mass transfer"],
    ["What is the Fenske equation used for?", "Minimum number of stages at total reflux", ["Minimum reflux ratio", "Column diameter", "Feed condition"], "Uses relative volatility.", "Mass transfer"],
    ["What does the Underwood equation determine?", "Minimum reflux ratio", ["Minimum stages", "Column height", "Tray efficiency"], "Used in shortcut distillation design.", "Mass transfer"],
    ["What is the Gilliland correlation used for?", "Relating actual stages to reflux ratio from minimum values", ["Heat transfer coefficients", "Pressure drop", "Reaction kinetics"], "Part of the FUG shortcut method.", "Mass transfer"],
    ["What is the q-line in McCabe–Thiele?", "A line representing feed thermal condition", ["The equilibrium curve", "The diagonal", "The rectifying line only"], "q = 1 for saturated liquid feed.", "Mass transfer"],
    ["What is pressure-swing adsorption (PSA)?", "Separating gases by adsorbing at high pressure and desorbing at low pressure", ["Distillation at variable pressure", "Absorption into amines", "Membrane permeation"], "Used for H₂ and O₂ production.", "Separation"],
    ["What is reverse osmosis?", "Forcing solvent through a membrane against osmotic pressure", ["Natural diffusion of solvent", "Distillation of seawater", "Ion exchange"], "Used for desalination.", "Separation"],
    ["What is supercritical fluid extraction?", "Extraction using a fluid above its critical temperature and pressure", ["Extraction with boiling water", "Extraction under vacuum", "Extraction by freezing"], "e.g. supercritical CO₂ decaffeination.", "Separation"],
    ["What is the fugacity of a component?", "An effective pressure accounting for non-ideal behaviour", ["Its density", "Its volatility in ideal gas only", "Its molar mass"], "Equal fugacities mean phase equilibrium.", "Thermodynamics"],
    ["What is the activity coefficient?", "A factor measuring deviation from ideal solution behaviour", ["The reaction rate constant", "The compressibility factor", "The heat capacity ratio"], "γ = 1 for ideal solutions.", "Thermodynamics"],
    ["Which models predict activity coefficients?", "Wilson, NRTL and UNIQUAC", ["Ergun and Darcy", "Arrhenius and Eyring", "Fourier and Fick"], "Used for VLE in simulators.", "Thermodynamics"],
    ["What is the Peng–Robinson equation?", "A cubic equation of state for real gases and liquids", ["A heat transfer correlation", "A reaction rate law", "A pump curve"], "Widely used in hydrocarbon processing.", "Thermodynamics"],
    ["What is the Gibbs phase rule?", "F = C − P + 2", ["F = C + P − 2", "F = P − C", "F = 2C − P"], "Degrees of freedom for equilibrium systems.", "Thermodynamics"],
    ["What is exergy?", "Maximum useful work obtainable as a system reaches equilibrium with surroundings", ["Total energy", "Heat lost", "Internal energy only"], "Exergy is destroyed by irreversibility.", "Thermodynamics"],
    ["What is pinch analysis?", "A method to minimise energy use by heat integration", ["A pipe sizing method", "A safety audit", "A cost estimation tool"], "Finds minimum hot and cold utility.", "Process design"],
    ["What is the pinch point rule?", "Do not transfer heat across the pinch", ["Always heat above ambient", "Use only cold utilities", "Maximise ΔT everywhere"], "Crossing the pinch increases utilities.", "Process design"],
    ["What does ASPEN Plus (or similar) do?", "Process simulation of material and energy balances", ["CAD drawing only", "Accounting", "Network security"], "Also DWSIM, HYSYS.", "Process design"],
    ["What is the six-tenths rule?", "Equipment cost scales with capacity to about the 0.6 power", ["Cost doubles with capacity", "Cost is fixed", "Cost scales linearly"], "Used for quick estimates.", "Process economics"],
    ["What is NPV?", "Net present value — discounted sum of future cash flows minus investment", ["Total revenue", "Plant capacity", "Profit before tax only"], "Positive NPV means a worthwhile project.", "Process economics"],
    ["What is the payback period?", "Time to recover the initial investment from cash flows", ["Plant lifetime", "Construction time", "Depreciation period"], "Shorter is better.", "Process economics"],
    ["What are Ziegler–Nichols rules used for?", "Tuning PID controllers", ["Sizing reactors", "Designing columns", "Selecting pumps"], "Based on ultimate gain and period.", "Process control"],
    ["What is dead time in process control?", "Delay between an input change and the start of the output response", ["Time the plant is shut down", "Time constant", "Settling time"], "Makes control harder.", "Process control"],
    ["What is a Smith predictor used for?", "Compensating long dead time in control loops", ["Measuring flow", "Predicting cost", "Estimating yield"], "Uses a process model.", "Process control"],
    ["What is model predictive control (MPC)?", "Control that optimises future moves using a process model with constraints", ["Simple on-off control", "Manual control", "Feedforward only"], "Common in refineries.", "Process control"],
    ["What does LOPA stand for?", "Layer of Protection Analysis", ["Level of Process Automation", "Loss of Pressure Alarm", "Limit of Plant Availability"], "Semi-quantitative risk assessment.", "Safety"],
    ["What is a SIL?", "Safety Integrity Level of a safety instrumented function", ["System Input Limit", "Steam Injection Line", "Standard Industrial Load"], "SIL 1–4 per IEC 61511.", "Safety"],
    ["What is a BLEVE?", "Boiling Liquid Expanding Vapour Explosion", ["A type of pump", "A distillation fault", "A heat exchanger design"], "Occurs when pressurised liquid tanks rupture.", "Safety"],
    ["What caused the Bhopal disaster (1984)?", "Release of methyl isocyanate gas", ["A nuclear meltdown", "An oil spill", "A dust explosion"], "A key case study in process safety.", "Safety"],
    ["What is a runaway reaction?", "An exothermic reaction accelerating uncontrollably as temperature rises", ["A reaction that stops", "An endothermic reaction", "A catalytic reaction only"], "Requires cooling and relief design.", "Safety"],
    ["What is Michaelis–Menten kinetics?", "Enzyme reaction rate model: r = Vmax S/(Km + S)", ["First-order gas kinetics", "Heat transfer law", "Diffusion law"], "Km is substrate concentration at half Vmax.", "Biochemical engineering"],
    ["What is the Monod equation?", "Microbial growth rate as a function of substrate concentration", ["Enzyme inhibition", "Heat of fermentation", "Oxygen solubility"], "μ = μmax S/(Ks + S).", "Biochemical engineering"],
    ["What is kLa in bioreactors?", "Volumetric oxygen mass transfer coefficient", ["Cell growth rate", "Heat transfer coefficient", "Agitator speed"], "Critical for aerobic fermentation.", "Biochemical engineering"],
    ["What is fluid catalytic cracking (FCC)?", "Cracking heavy oil over a fluidised catalyst to make gasoline", ["Removing sulfur with hydrogen", "Distilling crude oil", "Making plastics from ethylene"], "Catalyst is regenerated by burning coke.", "Petroleum"],
    ["What is catalytic reforming used for?", "Raising octane by converting naphtha to aromatics", ["Removing water", "Making diesel only", "Producing coke"], "Also produces hydrogen.", "Petroleum"],
    ["What is the purpose of a Claus process?", "Recovering elemental sulfur from H₂S", ["Producing ammonia", "Making methanol", "Removing CO₂"], "Used in refineries and gas plants.", "Petroleum"],
    ["What is the main product of the Fischer–Tropsch process?", "Liquid hydrocarbons from syngas", ["Ammonia", "Sulfuric acid", "Chlorine"], "CO + H₂ → hydrocarbons.", "Industrial chemistry"],
    ["What is the chlor-alkali process?", "Electrolysis of brine to produce chlorine and sodium hydroxide", ["Making sodium carbonate", "Producing ammonia", "Refining aluminium"], "Membrane cells are modern.", "Industrial chemistry"],
    ["What does green chemistry emphasise?", "Designing processes that reduce hazardous substances and waste", ["Using only green dyes", "Maximising solvent use", "Higher temperatures always"], "12 principles of green chemistry.", "Sustainability"],
    ["What is atom economy?", "Percentage of reactant atoms ending up in the desired product", ["Yield of the reaction", "Cost of reactants", "Energy efficiency"], "Higher means less waste.", "Sustainability"],
    ["What is carbon capture and storage (CCS)?", "Capturing CO₂ from emissions and storing it underground", ["Burning more carbon", "Planting trees only", "Converting CO₂ to oxygen chemically"], "Amine absorption is common.", "Sustainability"],
    ["What is a membrane reactor?", "A reactor combining reaction and separation through a membrane", ["A reactor with no catalyst", "A batch reactor", "A heat exchanger"], "Can shift equilibrium.", "Reaction engineering"],
    ["What does the Langmuir isotherm assume?", "Monolayer adsorption on uniform sites with no interaction", ["Multilayer adsorption", "No adsorption", "Chemical reaction in bulk"], "BET extends it to multilayers.", "Separation"],
    ["What is the purpose of scale-up studies?", "Translating lab results to industrial-scale equipment reliably", ["Reducing plant size", "Increasing lab costs", "Testing safety only"], "Uses dimensionless similarity.", "Process design"],
    ["What is a dimensionless group used in agitation power?", "Power number", ["Reynolds number only", "Nusselt number", "Biot number"], "Np = P/(ρN³D⁵).", "Mechanical operations"],
    ["What is the purpose of a cyclone separator?", "Separating particles from gas using centrifugal force", ["Heating gas", "Cooling liquids", "Mixing powders"], "No moving parts.", "Mechanical operations"],
  ],
};

module.exports = { buildTechnicalTest: makeTechnicalBuilder(60000, TEMPLATES, BANK), BANK, TEMPLATES };
