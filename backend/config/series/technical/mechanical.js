/** Technical series — Mechanical / Automobile / Production. Entries: [question, answer, [wrong x3], why, topic]. */
const { makeTechnicalBuilder, numQ, round, int, pick } = require("./common");

const TEMPLATES = {
  beginner: {
    stress: (r) => {
      const F = int(r, 2, 50) * 1000, A = pick(r, [100, 200, 250, 400, 500]);
      return numQ("Strength of materials", `A rod with cross-sectional area ${A} mm² carries an axial load of ${F} N. What is the stress?`, F / A, Math.max(2, F / A / 5), (x) => `${x} MPa`, `Stress = F/A = ${F} N ÷ ${A} mm² = ${F / A} N/mm² = ${F / A} MPa.`);
    },
    kinetic: (r) => {
      const m = int(r, 2, 20), v = int(r, 2, 15);
      return numQ("Engineering mechanics", `What is the kinetic energy of a ${m} kg body moving at ${v} m/s?`, 0.5 * m * v * v, Math.max(5, (m * v) / 2), (x) => `${x} J`, `KE = ½mv² = 0.5 × ${m} × ${v}² = ${0.5 * m * v * v} J.`);
    },
    gearSpeed: (r) => {
      const t1 = pick(r, [20, 24, 30, 40]), t2 = pick(r, [60, 80, 90, 120]), n1 = pick(r, [600, 900, 1200, 1500]);
      return numQ("Machine design", `A ${t1}-tooth driver gear turns at ${n1} rpm and drives a ${t2}-tooth gear. What is the driven gear's speed?`, (n1 * t1) / t2, 50, (x) => `${x} rpm`, `N₂ = N₁ × T₁/T₂ = ${n1} × ${t1}/${t2} = ${(n1 * t1) / t2} rpm.`);
    },
    work: (r) => {
      const F = int(r, 10, 200), d = int(r, 2, 20);
      return numQ("Engineering mechanics", `A force of ${F} N moves a body ${d} m in the direction of the force. How much work is done?`, F * d, Math.max(10, F), (x) => `${x} J`, `W = F × d = ${F} × ${d} = ${F * d} J.`);
    },
    pressure: (r) => {
      const h = int(r, 2, 30);
      return numQ("Fluid mechanics", `What is the gauge pressure at a depth of ${h} m in water (ρ = 1000 kg/m³, g = 10 m/s²)?`, h * 10, 10, (x) => `${x} kPa`, `p = ρgh = 1000 × 10 × ${h} = ${h * 10000} Pa = ${h * 10} kPa.`);
    },
  },
  intermediate: {
    carnot: (r) => {
      const Th = pick(r, [500, 600, 800, 1000, 1200]), Tc = pick(r, [300, 350, 400]);
      return numQ("Thermodynamics", `What is the Carnot efficiency of an engine working between ${Th} K and ${Tc} K?`, round((1 - Tc / Th) * 100, 1), 5, (x) => `${x}%`, `η = 1 − Tc/Th = 1 − ${Tc}/${Th} = ${round((1 - Tc / Th) * 100, 1)}%.`);
    },
    power: (r) => {
      const T = int(r, 20, 400), N = pick(r, [600, 900, 1200, 1500, 3000]);
      const P = round((2 * Math.PI * N * T) / 60 / 1000, 2);
      return numQ("Machine design", `A shaft transmits a torque of ${T} N·m at ${N} rpm. What power does it transmit?`, P, Math.max(0.5, round(P / 5, 1)), (x) => `${x} kW`, `P = 2πNT/60 = 2π × ${N} × ${T} / 60 = ${P} kW.`);
    },
    expansion: (r) => {
      const L = pick(r, [1, 2, 5, 10]), dT = int(r, 20, 100), alpha = 12;
      return numQ("Thermal engineering", `A ${L} m steel rail (α = ${alpha} × 10⁻⁶ /°C) is heated by ${dT}°C. By how much does it expand?`, round(L * alpha * dT / 1000, 3), round(L * alpha * dT / 4000, 3) || 0.01, (x) => `${x} mm`, `ΔL = αLΔT = ${alpha}×10⁻⁶ × ${L * 1000} mm × ${dT} = ${round(L * alpha * dT / 1000, 3)} mm.`);
    },
    strain: (r) => {
      const L = pick(r, [500, 1000, 2000]), dL = pick(r, [0.5, 1, 2, 2.5]);
      const milli = (dL / L) * 1000; // strain in units of 10⁻³
      return numQ("Strength of materials", `A bar of length ${L} mm elongates by ${dL} mm. What is the strain?`, milli, 0.5, (x) => `${x} × 10⁻³`, `Strain = ΔL/L = ${dL}/${L} = ${milli} × 10⁻³ (dimensionless).`);
    },
    flowRate: (r) => {
      const d = pick(r, [0.1, 0.2, 0.3]), v = int(r, 1, 6);
      const Q = round(Math.PI / 4 * d * d * v, 4);
      return numQ("Fluid mechanics", `Water flows at ${v} m/s through a pipe of ${d * 1000} mm diameter. What is the flow rate?`, Q, round(Q / 4, 4), (x) => `${x} m³/s`, `Q = A × v = (π/4)(${d})² × ${v} = ${Q} m³/s.`);
    },
  },
  advanced: {
    bending: (r) => {
      const w = int(r, 2, 20), L = int(r, 2, 10);
      return numQ("Strength of materials", `A simply supported beam of span ${L} m carries a uniformly distributed load of ${w} kN/m. What is the maximum bending moment?`, round((w * L * L) / 8, 2), Math.max(1, round((w * L * L) / 32, 1)), (x) => `${x} kN·m`, `M_max = wL²/8 = ${w} × ${L}² / 8 = ${round((w * L * L) / 8, 2)} kN·m.`);
    },
    copRefrig: (r) => {
      const Tc = pick(r, [250, 260, 270]), Th = pick(r, [300, 310, 320]);
      return numQ("Refrigeration", `What is the COP of a Carnot refrigerator working between ${Tc} K and ${Th} K?`, round(Tc / (Th - Tc), 2), 0.5, String, `COP = Tc/(Th − Tc) = ${Tc}/(${Th} − ${Tc}) = ${round(Tc / (Th - Tc), 2)}.`);
    },
    torsion: (r) => {
      const T = int(r, 1, 10) * 100, d = pick(r, [20, 30, 40, 50]);
      const tau = round((16 * T * 1000) / (Math.PI * d ** 3), 2);
      return numQ("Machine design", `A solid shaft of ${d} mm diameter transmits a torque of ${T} N·m. What is the maximum shear stress?`, tau, Math.max(1, round(tau / 5, 1)), (x) => `${x} MPa`, `τ = 16T/(πd³) = 16 × ${T * 1000} N·mm / (π × ${d}³) = ${tau} MPa.`);
    },
    springDeflection: (r) => {
      const W = int(r, 50, 500), k = pick(r, [10, 20, 25, 40, 50]);
      return numQ("Machine design", `A spring of stiffness ${k} N/mm carries a load of ${W} N. What is its deflection?`, round(W / k, 2), Math.max(1, round(W / k / 4, 1)), (x) => `${x} mm`, `δ = W/k = ${W}/${k} = ${round(W / k, 2)} mm.`);
    },
    otto: (r) => {
      const rc = pick(r, [6, 8, 10, 12]), g = 1.4;
      const eta = round((1 - 1 / rc ** (g - 1)) * 100, 1);
      return numQ("IC engines", `What is the air-standard efficiency of an Otto cycle with compression ratio ${rc} (γ = 1.4)?`, eta, 4, (x) => `${x}%`, `η = 1 − 1/r^(γ−1) = 1 − 1/${rc}^0.4 = ${eta}%.`);
    },
  },
};

const BANK = {
  beginner: [
    ["What is the SI unit of force?", "Newton", ["Joule", "Pascal", "Watt"], "1 N = 1 kg·m/s².", "Basics"],
    ["What is the SI unit of pressure?", "Pascal", ["Newton", "Bar", "Joule"], "1 Pa = 1 N/m².", "Basics"],
    ["Which law states that energy can neither be created nor destroyed?", "First law of thermodynamics", ["Second law of thermodynamics", "Zeroth law of thermodynamics", "Newton's first law"], "It is the conservation of energy.", "Thermodynamics"],
    ["Which law defines thermal equilibrium and temperature measurement?", "Zeroth law of thermodynamics", ["First law", "Second law", "Third law"], "If A and B are each in equilibrium with C, they are in equilibrium with each other.", "Thermodynamics"],
    ["What is the ratio of stress to strain within the elastic limit called?", "Modulus of elasticity", ["Poisson's ratio", "Bulk modulus only", "Factor of safety"], "Young's modulus E = σ/ε.", "Strength of materials"],
    ["Which material property allows it to be drawn into wires?", "Ductility", ["Brittleness", "Hardness", "Malleability"], "Ductile materials stretch without breaking.", "Materials"],
    ["Which property lets a material be hammered into thin sheets?", "Malleability", ["Ductility", "Toughness", "Elasticity"], "Malleable materials deform under compression.", "Materials"],
    ["Cast iron is generally:", "Brittle", ["Highly ductile", "Highly malleable", "Elastic to large strains"], "Its high carbon content makes it brittle.", "Materials"],
    ["What is Hooke's law?", "Stress is proportional to strain within the elastic limit", ["Stress equals force times area", "Strain is constant", "Load equals deflection squared"], "σ = Eε in the linear region.", "Strength of materials"],
    ["Which engine cycle is used in petrol engines?", "Otto cycle", ["Diesel cycle", "Rankine cycle", "Brayton cycle"], "Petrol engines use spark ignition at constant volume.", "IC engines"],
    ["Which cycle is used in diesel engines?", "Diesel cycle", ["Otto cycle", "Carnot cycle", "Stirling cycle"], "Heat is added at constant pressure.", "IC engines"],
    ["What is the function of a flywheel?", "To store energy and reduce speed fluctuations", ["To increase engine power", "To cool the engine", "To change gear ratios"], "It smooths out torque variations.", "Machines"],
    ["Which device converts reciprocating motion into rotary motion in an engine?", "Crankshaft", ["Camshaft", "Piston ring", "Valve"], "The crank converts piston movement to rotation.", "IC engines"],
    ["Which welding process uses a consumable electrode coated with flux?", "Shielded metal arc welding", ["TIG welding", "Gas welding", "Resistance welding"], "SMAW (stick welding) uses coated electrodes.", "Manufacturing"],
    ["What does a lathe primarily produce?", "Cylindrical (turned) parts", ["Flat surfaces only", "Gear teeth only", "Sheet metal parts"], "The workpiece rotates against a cutting tool.", "Manufacturing"],
    ["Which mode of heat transfer occurs without a medium?", "Radiation", ["Conduction", "Convection", "Advection"], "Radiation travels as electromagnetic waves.", "Heat transfer"],
    ["Heat transfer through a solid wall is mainly by:", "Conduction", ["Convection", "Radiation", "Evaporation"], "Molecular contact transfers heat in solids.", "Heat transfer"],
    ["What is the unit of power?", "Watt", ["Joule", "Newton", "Pascal"], "1 W = 1 J/s.", "Basics"],
    ["Which instrument measures pressure in a fluid?", "Manometer", ["Thermometer", "Hygrometer", "Ammeter"], "Manometers use liquid columns.", "Fluid mechanics"],
    ["What is the boiling point of water at standard atmospheric pressure?", "100°C", ["90°C", "110°C", "120°C"], "At 1 atm water boils at 100°C.", "Thermodynamics"],
    ["What is the purpose of a radiator in a car?", "To dissipate engine heat from the coolant", ["To increase fuel efficiency", "To charge the battery", "To filter air"], "Coolant releases heat to the air.", "Automobile"],
    ["Which gear is used to transmit motion between intersecting shafts?", "Bevel gear", ["Spur gear", "Rack and pinion", "Helical gear for parallel shafts"], "Bevel gears connect shafts at an angle.", "Machines"],
    ["Which gears connect parallel shafts with straight teeth?", "Spur gears", ["Bevel gears", "Worm gears", "Hypoid gears"], "Spur gears are the simplest type.", "Machines"],
    ["What does CAD stand for?", "Computer-Aided Design", ["Computer Automated Drafting only", "Central Axis Drawing", "Computer Assembly Device"], "CAD software creates digital models.", "Design"],
    ["Which of these is a measuring instrument for small lengths?", "Vernier caliper", ["Spanner", "Hacksaw", "Chisel"], "Vernier calipers read to 0.02 mm.", "Metrology"],
    ["What is the least count of a standard micrometer?", "0.01 mm", ["0.1 mm", "1 mm", "0.001 m"], "Pitch 0.5 mm ÷ 50 divisions = 0.01 mm.", "Metrology"],
    ["What is friction?", "A force that opposes relative motion between surfaces in contact", ["A force that helps motion", "The weight of an object", "A type of energy"], "Friction depends on surfaces and normal force.", "Engineering mechanics"],
    ["What is the coefficient of friction?", "Ratio of friction force to normal reaction", ["Ratio of mass to weight", "Force per unit area", "Work per unit time"], "μ = F/N.", "Engineering mechanics"],
    ["What is a moment of a force?", "The turning effect of a force about a point", ["The force times mass", "The speed of rotation", "The force per area"], "M = F × perpendicular distance.", "Engineering mechanics"],
    ["What is the SI unit of energy?", "Joule", ["Watt", "Newton", "Kelvin"], "1 J = 1 N·m.", "Basics"],
    ["Which metal is the main component of steel?", "Iron", ["Copper", "Aluminium", "Zinc"], "Steel is iron with a small amount of carbon.", "Materials"],
    ["What is an alloy?", "A mixture of a metal with other elements", ["A pure metal", "A type of plastic", "A ceramic"], "e.g. brass = copper + zinc.", "Materials"],
    ["Brass is an alloy of:", "Copper and zinc", ["Copper and tin", "Iron and carbon", "Aluminium and copper"], "Bronze is copper and tin.", "Materials"],
    ["Which process shapes metal by forcing it through a die?", "Extrusion", ["Casting", "Welding", "Milling"], "Extrusion produces constant cross-sections.", "Manufacturing"],
    ["What is the purpose of a carburettor (in older petrol engines)?", "Mixing air and fuel in the right ratio", ["Cooling the engine", "Igniting fuel", "Lubricating parts"], "Modern engines use fuel injection instead.", "IC engines"],
    ["Which law of motion explains rocket propulsion?", "Newton's third law", ["Newton's first law", "Hooke's law", "Pascal's law"], "Exhaust pushed back pushes the rocket forward.", "Engineering mechanics"],
    ["What does Pascal's law state?", "Pressure applied to a confined fluid is transmitted equally in all directions", ["Pressure increases with speed", "Fluids are incompressible", "Pressure is force times area"], "It is the basis of hydraulic systems.", "Fluid mechanics"],
    ["Which machine uses Pascal's law to lift heavy loads?", "Hydraulic jack", ["Lever", "Pulley", "Screw jack"], "A small force on a small piston lifts a large load.", "Fluid mechanics"],
    ["What is the function of a bearing?", "Supporting a rotating shaft while reducing friction", ["Increasing speed", "Storing energy", "Sealing fluids"], "Bearings allow smooth rotation.", "Machines"],
    ["What does a thermostat do?", "Maintains temperature by switching heating or cooling", ["Measures pressure", "Pumps coolant", "Ignites fuel"], "It regulates temperature automatically.", "Thermal engineering"],
    ["What is specific heat capacity?", "Heat needed to raise 1 kg of a substance by 1 K", ["Heat needed to melt a substance", "Total heat in a body", "Heat lost per second"], "Water has a high specific heat.", "Thermodynamics"],
    ["Which of these is a non-conventional energy source?", "Solar energy", ["Coal", "Diesel", "Natural gas"], "Solar is renewable.", "Energy"],
    ["What is a fit in engineering drawing?", "The relationship between mating parts (clearance, interference, transition)", ["The size of a drawing", "A drawing scale", "A type of thread"], "Fits define how parts assemble.", "Design"],
    ["What is the purpose of a gasket?", "Sealing the joint between two surfaces", ["Reducing speed", "Transmitting power", "Measuring pressure"], "Gaskets prevent leaks.", "Machines"],
    ["Which casting defect is caused by trapped gas?", "Blowholes", ["Cold shut", "Hot tear", "Misrun"], "Gas bubbles form cavities.", "Manufacturing"],
    ["What is the efficiency of a machine?", "Ratio of output work to input work", ["Output force only", "Input power only", "Speed ratio"], "It is always less than 100% in practice.", "Machines"],
    ["Which law relates pressure and volume of a gas at constant temperature?", "Boyle's law", ["Charles's law", "Gay-Lussac's law", "Avogadro's law"], "PV = constant at constant T.", "Thermodynamics"],
    ["What is the purpose of a clutch in a vehicle?", "Engaging and disengaging the engine from the transmission", ["Braking the vehicle", "Steering the wheels", "Cooling the engine"], "It allows smooth gear changes.", "Automobile"],
    ["What is a cantilever beam?", "A beam fixed at one end and free at the other", ["A beam supported at both ends", "A beam with no supports", "A curved beam"], "e.g. a balcony slab.", "Strength of materials"],
    ["What is the unit of torque?", "Newton-metre", ["Newton", "Joule per second", "Pascal"], "Torque = force × radius.", "Basics"],
    ["What does an orifice meter measure?", "Fluid flow rate", ["Temperature", "Viscosity", "Density"], "It uses the pressure drop across an orifice.", "Fluid mechanics"],
    ["Which process removes material using a rotating multi-point cutter?", "Milling", ["Turning", "Drilling with a single point", "Forging"], "Milling cutters have many teeth.", "Manufacturing"],
    ["What is annealing?", "Heating and slow cooling to soften a metal and relieve stress", ["Rapid cooling to harden", "Coating with zinc", "Cutting metal"], "Annealing improves ductility.", "Materials"],
    ["What is quenching?", "Rapid cooling of hot metal to increase hardness", ["Slow cooling", "Melting", "Painting"], "Quenching in water or oil hardens steel.", "Materials"],
    ["What is the purpose of a governor in an engine?", "Regulating speed under varying load", ["Starting the engine", "Cooling the engine", "Filtering fuel"], "It controls fuel supply.", "Machines"],
    ["Which refrigerant property is most important for refrigeration?", "Low boiling point", ["High boiling point", "High density", "Bright colour"], "It must evaporate at low temperatures.", "Refrigeration"],
    ["What is a turbine?", "A machine that extracts energy from a moving fluid", ["A pump", "A compressor only", "A heat exchanger"], "e.g. steam, gas and water turbines.", "Fluid machines"],
    ["What is 1 horsepower approximately equal to?", "746 W", ["1000 W", "500 W", "100 W"], "1 hp ≈ 746 watts.", "Basics"],
    ["What is a free body diagram?", "A diagram showing all forces acting on a body", ["A drawing of a machine", "A graph of motion", "A circuit diagram"], "Used to solve equilibrium problems.", "Engineering mechanics"],
    ["Which material is commonly used for engine pistons?", "Aluminium alloy", ["Glass", "Rubber", "Lead"], "It is light and conducts heat well.", "Materials"],
  ],
  intermediate: [
    ["What does the second law of thermodynamics imply for heat engines?", "No heat engine can convert all heat into work", ["Energy is conserved", "Heat flows from cold to hot spontaneously", "Efficiency can exceed 100%"], "Some heat must be rejected to a sink.", "Thermodynamics"],
    ["What is entropy a measure of?", "Disorder / unavailable energy in a system", ["Temperature", "Pressure", "Mass"], "Entropy of an isolated system never decreases.", "Thermodynamics"],
    ["Which cycle is used in steam power plants?", "Rankine cycle", ["Otto cycle", "Brayton cycle", "Diesel cycle"], "Water is boiled, expanded, condensed and pumped.", "Power plants"],
    ["Which cycle is used in gas turbines?", "Brayton cycle", ["Rankine cycle", "Otto cycle", "Stirling cycle"], "Compression, heat addition, expansion at constant pressure.", "Power plants"],
    ["What is Poisson's ratio?", "Ratio of lateral strain to longitudinal strain", ["Ratio of stress to strain", "Ratio of shear to normal stress", "Ratio of load to deflection"], "Typically about 0.3 for steel.", "Strength of materials"],
    ["What is the factor of safety?", "Ratio of ultimate (or yield) stress to working stress", ["Ratio of working stress to ultimate stress", "Load times deflection", "Weight of safety devices"], "It covers uncertainty in design.", "Machine design"],
    ["What is the critical Reynolds number for flow in a pipe (approximately)?", "2000–2300", ["100", "10,000", "50,000"], "Below this, flow is laminar.", "Fluid mechanics"],
    ["Bernoulli's equation is based on conservation of:", "Energy", ["Mass", "Momentum", "Charge"], "Pressure, kinetic and potential energy sum is constant.", "Fluid mechanics"],
    ["What is the continuity equation based on?", "Conservation of mass", ["Conservation of energy", "Newton's third law", "Hooke's law"], "A₁V₁ = A₂V₂ for incompressible flow.", "Fluid mechanics"],
    ["Which heat exchanger arrangement gives the highest effectiveness for the same area?", "Counter-flow", ["Parallel flow", "Cross flow without mixing", "No flow"], "It maintains a larger mean temperature difference.", "Heat transfer"],
    ["What does Fourier's law describe?", "Heat conduction rate is proportional to the temperature gradient", ["Convection coefficient", "Radiation emission", "Fluid friction"], "q = −k dT/dx.", "Heat transfer"],
    ["What is the Stefan–Boltzmann law about?", "Radiated power is proportional to the fourth power of absolute temperature", ["Heat conduction in solids", "Convection in fluids", "Thermal expansion"], "E = σT⁴ for a black body.", "Heat transfer"],
    ["What is the function of a cam and follower?", "Converting rotary motion into a specific reciprocating or oscillating motion", ["Storing energy", "Transmitting torque between parallel shafts", "Reducing friction"], "Used in engine valve mechanisms.", "Theory of machines"],
    ["What is the degree of freedom of a simple four-bar linkage?", "1", ["0", "2", "3"], "One input fully defines its motion (Grübler's equation).", "Theory of machines"],
    ["Which type of stress is induced in a shaft subjected to torque?", "Shear stress", ["Tensile stress only", "Compressive stress only", "Bearing stress"], "Torsion produces shear.", "Strength of materials"],
    ["What is fatigue failure?", "Failure under repeated cyclic loading below the ultimate strength", ["Failure from a single overload", "Failure from corrosion only", "Failure from heat only"], "Cracks grow over many cycles.", "Machine design"],
    ["What is the endurance limit?", "The stress below which a material can endure infinite load cycles", ["The maximum static stress", "The yield point", "The breaking load"], "Steels show a clear endurance limit.", "Machine design"],
    ["Which test measures a material's hardness by indenting with a steel ball?", "Brinell test", ["Charpy test", "Tensile test", "Fatigue test"], "Brinell hardness uses ball indentation.", "Materials"],
    ["Which test measures impact toughness?", "Charpy test", ["Brinell test", "Rockwell test", "Creep test"], "A pendulum breaks a notched specimen.", "Materials"],
    ["What is creep?", "Slow permanent deformation under constant load at high temperature", ["Rapid fracture", "Elastic recovery", "Surface wear"], "Important for turbine blades.", "Materials"],
    ["What does a compressor do in a refrigeration cycle?", "Raises the pressure and temperature of refrigerant vapour", ["Cools the refrigerant", "Expands the refrigerant", "Stores refrigerant"], "High-pressure vapour then condenses.", "Refrigeration"],
    ["In a vapour compression system, where is heat absorbed from the space?", "Evaporator", ["Condenser", "Compressor", "Expansion valve"], "Refrigerant evaporates by absorbing heat.", "Refrigeration"],
    ["What is the purpose of the expansion valve?", "Reducing refrigerant pressure before the evaporator", ["Increasing pressure", "Cooling the condenser", "Pumping oil"], "Throttling lowers pressure and temperature.", "Refrigeration"],
    ["What is the compression ratio of an engine?", "Ratio of total cylinder volume to clearance volume", ["Ratio of bore to stroke", "Ratio of power to weight", "Ratio of fuel to air"], "Higher ratio usually means higher efficiency.", "IC engines"],
    ["Why do diesel engines have higher compression ratios than petrol engines?", "Diesel relies on compression heat to ignite the fuel", ["Diesel burns faster", "Petrol is heavier", "Diesel engines are smaller"], "Compression ignition needs high temperature.", "IC engines"],
    ["What causes knocking in petrol engines?", "Premature auto-ignition of the air-fuel mixture", ["Low compression", "Excess lubrication", "A cold engine only"], "Higher-octane fuel resists knock.", "IC engines"],
    ["What is the octane number a measure of?", "A petrol's resistance to knocking", ["A diesel's ignition quality", "Fuel density", "Engine power"], "Cetane number applies to diesel.", "IC engines"],
    ["What is the function of a differential in a vehicle?", "Allowing the driving wheels to rotate at different speeds when turning", ["Changing gears", "Braking", "Steering"], "Outer wheels travel farther in turns.", "Automobile"],
    ["Which brake type uses a rotor and calipers?", "Disc brake", ["Drum brake", "Band brake", "Engine brake"], "Calipers squeeze pads against the disc.", "Automobile"],
    ["What is a CNC machine?", "A machine tool controlled by computer programs", ["A manual lathe", "A casting furnace", "A measuring device"], "Computer Numerical Control.", "Manufacturing"],
    ["What is G-code used for?", "Programming CNC machine movements", ["Designing gears", "Testing materials", "Welding steel"], "G-codes specify motion commands.", "Manufacturing"],
    ["What is tolerance in manufacturing?", "The permissible variation in a dimension", ["The maximum load", "The surface finish", "The speed of cutting"], "Tolerances ensure interchangeability.", "Metrology"],
    ["What is an interference fit?", "A fit where the shaft is larger than the hole, requiring force to assemble", ["A loose fit", "A fit with a gap", "A fit for sliding parts"], "Used for permanent assemblies.", "Design"],
    ["Which welding process uses a non-consumable tungsten electrode?", "TIG welding", ["MIG welding", "Arc welding with coated rods", "Thermit welding"], "Filler is added separately if needed.", "Manufacturing"],
    ["What is the main purpose of tempering after hardening?", "Reducing brittleness while keeping adequate hardness", ["Increasing brittleness", "Melting the steel", "Cleaning the surface"], "It relieves internal stresses.", "Materials"],
    ["What is the shear force diagram used for?", "Showing how shear force varies along a beam", ["Showing temperature", "Showing pressure in fluids", "Showing gear speeds"], "It helps locate maximum bending moment.", "Strength of materials"],
    ["Where is the bending moment maximum in a beam?", "Where the shear force is zero or changes sign", ["At the supports always", "Where load is zero", "At the free end of a cantilever"], "dM/dx = V.", "Strength of materials"],
    ["What is the Euler buckling load proportional to?", "EI/L² (for a given end condition)", ["L²/EI", "Area only", "Density"], "Longer columns buckle at lower loads.", "Strength of materials"],
    ["Which pump is most commonly used for high flow, low head applications?", "Centrifugal pump", ["Reciprocating pump", "Gear pump", "Screw pump"], "Centrifugal pumps suit high flow rates.", "Fluid machines"],
    ["What is cavitation in pumps?", "Formation and collapse of vapour bubbles due to low pressure", ["Leakage of fluid", "Overheating of the motor", "Blockage of the pipe"], "It damages impellers.", "Fluid machines"],
    ["What is the purpose of a draft tube in a reaction turbine?", "Recovering kinetic energy and allowing the turbine above tailwater", ["Increasing water pressure at entry", "Cooling the turbine", "Lubricating bearings"], "It improves efficiency.", "Fluid machines"],
    ["What does a Pelton wheel use?", "High-velocity water jets hitting buckets (impulse turbine)", ["Low head reaction blades", "Steam", "Air"], "Suited to high-head hydro plants.", "Fluid machines"],
    ["What is the specific speed of a turbine used for?", "Comparing and selecting turbine types", ["Calculating power output only", "Measuring blade angle", "Finding efficiency directly"], "It relates speed, power and head.", "Fluid machines"],
    ["What is enthalpy?", "Internal energy plus pressure × volume", ["Temperature × entropy", "Work done", "Heat lost"], "h = u + pv.", "Thermodynamics"],
    ["What is a reversible process?", "An idealised process that can be reversed without leaving any change", ["A fast process", "A process with friction", "A cyclic process only"], "Real processes are irreversible.", "Thermodynamics"],
    ["What is an adiabatic process?", "A process with no heat transfer", ["A constant-temperature process", "A constant-pressure process", "A constant-volume process"], "Q = 0.", "Thermodynamics"],
    ["What is an isothermal process?", "A process at constant temperature", ["A process with no heat transfer", "A constant-volume process", "A process at constant entropy"], "For an ideal gas, PV = constant.", "Thermodynamics"],
    ["What is the role of a superheater in a boiler?", "Raising steam temperature above saturation", ["Preheating feed water", "Removing ash", "Reducing pressure"], "Superheated steam improves efficiency.", "Power plants"],
    ["What does an economiser do in a boiler?", "Preheats feed water using flue gas heat", ["Superheats steam", "Removes smoke", "Pumps water"], "It recovers waste heat.", "Power plants"],
    ["What is a key advantage of helical gears over spur gears?", "Smoother and quieter operation", ["Lower cost always", "No axial thrust", "Simpler manufacturing"], "Teeth engage gradually.", "Machines"],
    ["Which drive allows a large speed reduction in a compact space?", "Worm and worm wheel", ["Spur gears", "Belt drive", "Chain drive"], "Worm gears give high ratios.", "Machines"],
    ["What causes belt slip?", "Insufficient friction between the belt and pulley", ["Excess friction", "Pulley size equality", "Low speed only"], "Slip reduces the velocity ratio.", "Machines"],
    ["What is vibration damping?", "Dissipation of vibration energy", ["Increase of amplitude", "Change of frequency only", "Addition of mass only"], "Dampers reduce oscillations.", "Vibrations"],
    ["What is resonance?", "Large vibration when the forcing frequency equals the natural frequency", ["Vibration stopping", "Low-frequency noise", "A damping method"], "Designs avoid operating at resonance.", "Vibrations"],
    ["What is the purpose of fins on an air-cooled engine?", "Increasing surface area for heat transfer", ["Decoration", "Strength", "Reducing weight"], "More area improves convection.", "Heat transfer"],
    ["Which lubricant property is most important for bearings?", "Viscosity", ["Colour", "Odour", "Density only"], "Viscosity maintains the oil film.", "Machines"],
    ["What is surface roughness measured as commonly?", "Ra (arithmetic average roughness)", ["Hardness number", "Tensile strength", "Density"], "Ra is in micrometres.", "Metrology"],
    ["What is a jig?", "A device that holds the workpiece and guides the cutting tool", ["A measuring tool", "A welding machine", "A type of gear"], "Jigs ensure repeatable machining.", "Manufacturing"],
    ["What is powder metallurgy?", "Making parts by compacting and sintering metal powders", ["Melting and casting metal", "Welding powders", "Painting metals"], "Useful for complex, precise parts.", "Manufacturing"],
    ["What is the purpose of a heat treatment called normalising?", "Refining grain structure by air cooling after heating", ["Hardening by water quench", "Coating with zinc", "Softening by slow furnace cooling only"], "It produces uniform, fine grains.", "Materials"],
  ],
  advanced: [
    ["What does the Clausius inequality state for a cycle?", "∮ δQ/T ≤ 0", ["∮ δQ/T ≥ 0", "∮ δQ = 0", "∮ δW/T ≤ 0"], "Equality holds only for reversible cycles.", "Thermodynamics"],
    ["What is exergy?", "The maximum useful work obtainable as a system reaches equilibrium with its surroundings", ["Total energy", "Internal energy only", "Heat transfer rate"], "Exergy is destroyed by irreversibility.", "Thermodynamics"],
    ["Which theory of failure is most suitable for ductile materials?", "Maximum shear stress (Tresca) or distortion energy (von Mises)", ["Maximum principal stress theory", "Maximum strain theory only", "Rankine's theory"], "Ductile materials fail by shear.", "Machine design"],
    ["What is Mohr's circle used for?", "Finding principal stresses and maximum shear stress graphically", ["Calculating gear ratios", "Plotting temperature", "Finding flow rates"], "It transforms stress states.", "Strength of materials"],
    ["What is a stress concentration factor?", "Ratio of peak local stress to nominal stress near a discontinuity", ["Ratio of load to area", "Factor of safety", "Endurance ratio"], "Notches and holes raise local stress.", "Machine design"],
    ["What is the Goodman relation used for?", "Fatigue design under combined mean and alternating stress", ["Static design only", "Buckling of columns", "Heat exchanger sizing"], "It relates σa/Se + σm/Su ≤ 1.", "Machine design"],
    ["What is the significance of the Nusselt number?", "Ratio of convective to conductive heat transfer", ["Ratio of inertia to viscous forces", "Ratio of momentum to thermal diffusivity", "Dimensionless temperature"], "Nu = hL/k.", "Heat transfer"],
    ["What does the Prandtl number represent?", "Ratio of momentum diffusivity to thermal diffusivity", ["Ratio of inertia to viscous forces", "Ratio of buoyancy to viscous forces", "Ratio of convection to conduction"], "Pr = ν/α.", "Heat transfer"],
    ["What is the LMTD method used for?", "Sizing heat exchangers when inlet and outlet temperatures are known", ["Calculating pump power", "Finding Reynolds number", "Designing gears"], "Q = UA·LMTD.", "Heat transfer"],
    ["What is the effectiveness-NTU method useful for?", "Analysing heat exchangers when outlet temperatures are unknown", ["Measuring viscosity", "Gear design", "Combustion analysis"], "It avoids iteration.", "Heat transfer"],
    ["What is the boundary layer?", "The thin fluid region near a surface where viscous effects are significant", ["The outer edge of a pipe", "The free stream", "A shock wave"], "Velocity changes from zero to free stream.", "Fluid mechanics"],
    ["What is flow separation?", "Detachment of the boundary layer due to an adverse pressure gradient", ["Mixing of two fluids", "Laminar flow", "Cavitation"], "It increases drag.", "Fluid mechanics"],
    ["What does the Mach number indicate?", "Ratio of flow velocity to the speed of sound", ["Ratio of inertia to viscous forces", "Ratio of pressure to density", "Ratio of heat transfer"], "M > 1 is supersonic.", "Fluid mechanics"],
    ["What happens in a convergent-divergent nozzle at choked flow?", "The flow reaches Mach 1 at the throat", ["Flow stops", "Flow becomes laminar", "Pressure rises at the throat"], "Further pressure drop can't increase mass flow.", "Fluid mechanics"],
    ["What is the purpose of reheating in a Rankine cycle?", "Reducing moisture in turbine exhaust and increasing work", ["Lowering boiler pressure", "Cooling the condenser", "Removing ash"], "Steam is reheated between turbine stages.", "Power plants"],
    ["What is regeneration in a Rankine cycle?", "Preheating feed water with steam bled from the turbine", ["Reheating steam", "Cooling the condenser", "Adding fuel"], "It raises mean heat addition temperature.", "Power plants"],
    ["In gas turbines, what does an intercooler do?", "Cools air between compression stages to reduce compressor work", ["Heats exhaust gas", "Cools turbine blades only", "Removes moisture"], "Less work is needed for cooler air.", "Power plants"],
    ["What is the critical speed of a shaft?", "The speed at which the shaft's natural frequency is excited, causing whirling", ["The maximum rated speed", "The idle speed", "The synchronous speed of a motor"], "Shafts must avoid critical speeds.", "Vibrations"],
    ["What is the logarithmic decrement?", "The natural log of the ratio of successive amplitudes in damped vibration", ["The frequency of vibration", "The damping force", "The time period"], "It quantifies damping.", "Vibrations"],
    ["What is vibration isolation's goal?", "Reducing force transmitted to the foundation", ["Increasing amplitude", "Changing the material", "Increasing speed"], "Achieved when frequency ratio > √2.", "Vibrations"],
    ["What is the purpose of a gyroscope in vehicles or ships?", "Providing stability and orientation sensing", ["Increasing speed", "Cooling the engine", "Steering directly"], "Gyroscopic couples resist changes in axis.", "Theory of machines"],
    ["What is the Kutzbach criterion used for?", "Determining the degrees of freedom of planar mechanisms", ["Calculating gear ratios", "Finding bending moments", "Sizing bearings"], "F = 3(n−1) − 2j − h.", "Theory of machines"],
    ["What is interference in involute gears?", "Undesirable contact causing the tip to dig into the mating tooth's flank", ["Noise from loose gears", "Lubricant leakage", "Backlash"], "Avoided by minimum tooth numbers.", "Machine design"],
    ["What does FMEA stand for?", "Failure Mode and Effects Analysis", ["Finite Material Element Analysis", "Fatigue Mode Evaluation Assessment", "Fluid Mechanics Energy Analysis"], "It identifies and prioritises failure risks.", "Industrial engineering"],
    ["What is Six Sigma's goal?", "Reducing process variation to about 3.4 defects per million opportunities", ["Increasing variation", "Reducing staff", "Doubling output"], "It uses DMAIC.", "Industrial engineering"],
    ["What does DMAIC stand for?", "Define, Measure, Analyse, Improve, Control", ["Design, Make, Assemble, Inspect, Correct", "Develop, Model, Apply, Inspect, Close", "Define, Monitor, Act, Implement, Check"], "It is the Six Sigma improvement cycle.", "Industrial engineering"],
    ["What is the purpose of an Andon system in lean manufacturing?", "Signalling problems on the line so they are fixed immediately", ["Measuring tool wear", "Storing inventory", "Paying workers"], "It empowers workers to stop the line.", "Industrial engineering"],
    ["What is Just-in-Time production?", "Producing items only as needed to minimise inventory", ["Producing as much as possible", "Storing large buffers", "Producing on fixed annual schedules"], "JIT reduces waste.", "Industrial engineering"],
    ["What is the finite element method (FEM)?", "A numerical method dividing a domain into small elements to solve field equations", ["A manufacturing process", "A material test", "A type of gear"], "Used for stress and thermal analysis.", "CAE"],
    ["What is meshing in FEA?", "Dividing the geometry into small elements", ["Combining parts", "Painting the model", "Welding parts"], "Finer meshes improve accuracy.", "CAE"],
    ["What is additive manufacturing?", "Building parts layer by layer from a digital model", ["Removing material by cutting", "Casting metal", "Forging"], "3D printing is additive.", "Manufacturing"],
    ["What is the principle of electro-discharge machining (EDM)?", "Material removal by controlled electrical sparks", ["Mechanical cutting", "Chemical etching", "Laser melting"], "Works on hard conductive materials.", "Manufacturing"],
    ["What does an ECU do in a modern engine?", "Electronically controls fuel injection, ignition and emissions", ["Cools the engine", "Changes gears mechanically", "Stores fuel"], "Engine Control Unit uses sensor data.", "Automobile"],
    ["What is the purpose of a catalytic converter?", "Converting harmful exhaust gases into less harmful ones", ["Increasing power", "Cooling exhaust", "Reducing noise only"], "It oxidises CO and HC and reduces NOx.", "Automobile"],
    ["What is turbocharging?", "Using exhaust energy to compress intake air", ["Using a belt-driven compressor", "Cooling the engine", "Injecting water"], "More air allows more fuel and power.", "IC engines"],
    ["What is the main advantage of a hybrid electric vehicle?", "Improved fuel efficiency by combining an engine with electric drive", ["Higher top speed always", "No battery needed", "No engine maintenance"], "Regenerative braking recovers energy.", "Automobile"],
    ["What is regenerative braking?", "Recovering kinetic energy during braking to recharge the battery", ["Using engine friction to brake", "Disc brakes cooling", "A parking brake"], "Common in EVs and hybrids.", "Automobile"],
    ["What is the Taylor tool life equation?", "VTⁿ = C", ["V = CT", "T = V²", "VT = Cⁿ"], "Higher cutting speed shortens tool life.", "Manufacturing"],
    ["What is the merchant circle used for?", "Analysing forces in orthogonal metal cutting", ["Gear design", "Fluid flow", "Heat treatment"], "It relates cutting, thrust and shear forces.", "Manufacturing"],
    ["What is creep resistance most important for?", "High-temperature components like turbine blades", ["Room-temperature fasteners", "Plastic toys", "Glass windows"], "Creep accelerates with temperature.", "Materials"],
    ["What is the purpose of a Moody chart?", "Finding the friction factor for pipe flow", ["Finding gear ratios", "Finding heat transfer coefficients", "Finding stresses"], "It relates Re and relative roughness.", "Fluid mechanics"],
    ["What is the Darcy–Weisbach equation used for?", "Calculating head loss due to friction in pipes", ["Calculating pump efficiency", "Calculating buoyancy", "Calculating lift"], "h_f = f(L/D)(V²/2g).", "Fluid mechanics"],
    ["What is the purpose of psychrometry?", "Studying properties of moist air for air conditioning", ["Studying metals", "Studying combustion", "Studying vibration"], "Psychrometric charts guide HVAC design.", "Refrigeration"],
    ["What is relative humidity?", "Ratio of actual vapour pressure to saturation vapour pressure at the same temperature", ["Mass of water in air", "Dew point temperature", "Wet-bulb temperature"], "Expressed as a percentage.", "Refrigeration"],
    ["What is the dew point?", "The temperature at which moist air becomes saturated when cooled", ["The boiling point of water", "The wet-bulb temperature always", "The freezing point"], "Condensation begins at the dew point.", "Refrigeration"],
    ["What is the main function of a cooling tower?", "Rejecting waste heat to the atmosphere by evaporative cooling", ["Generating steam", "Storing water", "Filtering air"], "Used with condensers in power plants.", "Power plants"],
    ["What is the purpose of a governor's sensitiveness?", "Responding to small speed changes", ["Maximising speed", "Reducing weight", "Increasing friction"], "Too sensitive can cause hunting.", "Theory of machines"],
    ["What is hunting in governors?", "Continuous fluctuation of engine speed around the mean", ["Engine stalling", "Overheating", "Gear slipping"], "Caused by excessive sensitivity.", "Theory of machines"],
    ["What is the primary purpose of balancing rotating masses?", "Reducing vibration and bearing loads", ["Increasing speed", "Reducing weight", "Improving lubrication"], "Unbalance causes centrifugal forces.", "Theory of machines"],
    ["What is kinematic viscosity?", "Dynamic viscosity divided by density", ["Viscosity times density", "Shear stress", "Velocity gradient"], "Unit: m²/s.", "Fluid mechanics"],
    ["What is a non-Newtonian fluid?", "A fluid whose viscosity changes with shear rate", ["A fluid with zero viscosity", "Water", "A gas"], "e.g. ketchup, blood.", "Fluid mechanics"],
    ["What is the purpose of a fillet radius in design?", "Reducing stress concentration at corners", ["Increasing weight", "Improving appearance only", "Reducing cost only"], "Sharp corners concentrate stress.", "Machine design"],
    ["What is meant by 'design for manufacturability' (DFM)?", "Designing parts so they are easy and economical to make", ["Designing only for looks", "Designing without tolerances", "Designing for one-off prototypes"], "DFM reduces cost and defects.", "Design"],
    ["What is GD&T?", "Geometric Dimensioning and Tolerancing — a system for specifying form and position", ["A gear design method", "A CAD file format", "A welding code"], "It controls geometry precisely.", "Design"],
    ["What is the purpose of a Gantt chart in production planning?", "Scheduling tasks over time", ["Measuring quality", "Designing parts", "Testing materials"], "It shows start and end dates of tasks.", "Industrial engineering"],
    ["What is OEE (Overall Equipment Effectiveness)?", "Availability × Performance × Quality", ["Output divided by input", "Energy per unit", "Equipment cost per hour"], "World-class OEE is about 85%.", "Industrial engineering"],
    ["What is the primary benefit of a PLC in automation?", "Reliable programmable control of machines and processes", ["Replacing all sensors", "Designing gears", "Measuring hardness"], "PLCs run ladder logic.", "Mechatronics"],
    ["What does a servo motor provide?", "Precise control of angular position, speed and torque", ["Constant speed only", "No feedback", "Only high torque"], "Servos use feedback loops.", "Mechatronics"],
    ["What is the purpose of a PID controller?", "Minimising error using proportional, integral and derivative action", ["Measuring temperature", "Storing data", "Generating power"], "Widely used in process control.", "Mechatronics"],
    ["What is the main difference between a robot's open-loop and closed-loop control?", "Closed-loop uses feedback to correct errors", ["Open-loop is more accurate", "They are identical", "Closed-loop has no sensors"], "Feedback improves accuracy.", "Mechatronics"],
  ],
};

module.exports = { buildTechnicalTest: makeTechnicalBuilder(30000, TEMPLATES, BANK), BANK, TEMPLATES };
