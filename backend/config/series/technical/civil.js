/** Technical series — Civil / Construction / Structural. Entries: [question, answer, [wrong x3], why, topic]. */
const { makeTechnicalBuilder, numQ, round, int, pick } = require("./common");

const TEMPLATES = {
  beginner: {
    concreteVolume: (r) => {
      const l = int(r, 2, 10), b = pick(r, [0.2, 0.23, 0.3, 0.45]), h = pick(r, [0.15, 0.3, 0.45, 0.6]);
      return numQ("Quantity estimation", `What volume of concrete is needed for a beam ${l} m long, ${b} m wide and ${h} m deep?`, round(l * b * h, 3), round(l * b * h / 4, 3) || 0.05, (x) => `${x} m³`, `V = l × b × h = ${l} × ${b} × ${h} = ${round(l * b * h, 3)} m³.`);
    },
    slope: (r) => {
      const rise = int(r, 1, 9), run = pick(r, [50, 100, 200, 400]);
      return numQ("Surveying", `A road rises ${rise} m over a horizontal distance of ${run} m. What is its gradient in percent?`, round((rise / run) * 100, 2), 0.5, (x) => `${x}%`, `Gradient = rise/run × 100 = ${rise}/${run} × 100 = ${round((rise / run) * 100, 2)}%.`);
    },
    wcRatio: (r) => {
      const c = pick(r, [300, 350, 400, 450]), wc = pick(r, [0.4, 0.45, 0.5, 0.55]);
      return numQ("Concrete technology", `A mix uses ${c} kg of cement per m³ at a water-cement ratio of ${wc}. How much water is needed per m³?`, round(c * wc, 1), 15, (x) => `${x} kg`, `Water = w/c × cement = ${wc} × ${c} = ${round(c * wc, 1)} kg.`);
    },
    areaLoad: (r) => {
      const P = int(r, 50, 500), A = pick(r, [1, 2, 4, 5]);
      return numQ("Structural basics", `A column load of ${P} kN rests on a ${A} m² footing. What is the bearing pressure on the soil?`, round(P / A, 2), Math.max(5, round(P / A / 5, 0)), (x) => `${x} kN/m²`, `Pressure = P/A = ${P}/${A} = ${round(P / A, 2)} kN/m².`);
    },
    bricks: (r) => {
      const v = pick(r, [1, 2, 3, 5]);
      return numQ("Quantity estimation", `Using the thumb rule of about 500 standard bricks per m³ of brickwork, how many bricks are needed for ${v} m³?`, v * 500, 100, String, `${v} × 500 = ${v * 500} bricks.`);
    },
  },
  intermediate: {
    udlMoment: (r) => {
      const w = int(r, 5, 30), L = int(r, 3, 8);
      return numQ("Structural analysis", `A simply supported beam of span ${L} m carries a UDL of ${w} kN/m. What is the maximum bending moment?`, round((w * L * L) / 8, 2), Math.max(2, round((w * L * L) / 40, 0)), (x) => `${x} kN·m`, `M = wL²/8 = ${w} × ${L}² / 8 = ${round((w * L * L) / 8, 2)} kN·m.`);
    },
    pointMoment: (r) => {
      const P = int(r, 10, 100), L = int(r, 2, 10);
      return numQ("Structural analysis", `A simply supported beam of span ${L} m carries a central point load of ${P} kN. What is the maximum bending moment?`, round((P * L) / 4, 2), Math.max(2, round((P * L) / 20, 0)), (x) => `${x} kN·m`, `M = PL/4 = ${P} × ${L} / 4 = ${round((P * L) / 4, 2)} kN·m.`);
    },
    cantilever: (r) => {
      const P = int(r, 5, 50), L = int(r, 1, 6);
      return numQ("Structural analysis", `A cantilever of length ${L} m carries a point load of ${P} kN at its free end. What is the maximum bending moment?`, P * L, Math.max(2, Math.round((P * L) / 5)), (x) => `${x} kN·m`, `M = P × L = ${P} × ${L} = ${P * L} kN·m at the fixed end.`);
    },
    discharge: (r) => {
      const b = pick(r, [1, 2, 3]), d = pick(r, [0.5, 1, 1.5]), v = pick(r, [0.5, 1, 1.5, 2]);
      return numQ("Hydraulics", `A rectangular channel ${b} m wide flows ${d} m deep at ${v} m/s. What is the discharge?`, round(b * d * v, 3), 0.5, (x) => `${x} m³/s`, `Q = A × V = (${b} × ${d}) × ${v} = ${round(b * d * v, 3)} m³/s.`);
    },
    voidRatio: (r) => {
      const n = pick(r, [0.2, 0.25, 0.3, 0.4, 0.5]);
      return numQ("Geotechnical engineering", `A soil has porosity n = ${n}. What is its void ratio?`, round(n / (1 - n), 3), 0.1, String, `e = n/(1 − n) = ${n}/${1 - n} = ${round(n / (1 - n), 3)}.`);
    },
  },
  advanced: {
    eulerLoad: (r) => {
      const E = 200000, I = pick(r, [2, 4, 5, 8]) * 1e6, L = pick(r, [2, 3, 4, 5]);
      const P = round((Math.PI ** 2 * E * I) / (L * 1000) ** 2 / 1000, 1);
      return numQ("Structural analysis", `A pin-ended steel column (E = 200 GPa) of length ${L} m has I = ${I / 1e6} × 10⁶ mm⁴. What is its Euler buckling load?`, P, Math.max(10, round(P / 5, 0)), (x) => `${x} kN`, `P = π²EI/L² = π² × 200000 × ${I / 1e6}×10⁶ / (${L * 1000})² = ${P} kN.`);
    },
    deflection: (r) => {
      const w = pick(r, [10, 15, 20]), L = pick(r, [4, 5, 6]), EI = pick(r, [20000, 40000, 50000]);
      const d = round((5 * w * L ** 4) / (384 * EI) * 1000, 2);
      return numQ("Structural analysis", `Max deflection of a simply supported beam: span ${L} m, UDL ${w} kN/m, EI = ${EI} kN·m². What is it?`, d, Math.max(0.5, round(d / 4, 2)), (x) => `${x} mm`, `δ = 5wL⁴/(384EI) = 5 × ${w} × ${L}⁴ / (384 × ${EI}) = ${d} mm.`);
    },
    manning: (r) => {
      const R = pick(r, [0.5, 1, 1.5]), S = pick(r, [0.0004, 0.001, 0.0025]), n = pick(r, [0.013, 0.015, 0.02]);
      const V = round((1 / n) * R ** (2 / 3) * Math.sqrt(S), 2);
      return numQ("Hydraulics", `Using Manning's formula with n = ${n}, hydraulic radius ${R} m and slope ${S}, what is the flow velocity?`, V, Math.max(0.2, round(V / 5, 1)), (x) => `${x} m/s`, `V = (1/n)R^(2/3)S^(1/2) = (1/${n}) × ${R}^(2/3) × √${S} = ${V} m/s.`);
    },
    sightDistance: (r) => {
      const v = pick(r, [40, 60, 80, 100]), t = 2.5, f = 0.35;
      const vms = v / 3.6;
      const SSD = round(vms * t + (vms * vms) / (2 * 9.81 * f), 1);
      return numQ("Transportation engineering", `Find the stopping sight distance for ${v} km/h, reaction time ${t} s, friction coefficient ${f} (g = 9.81 m/s²).`, SSD, Math.max(5, round(SSD / 6, 0)), (x) => `${x} m`, `SSD = vt + v²/(2gf) with v = ${round(vms, 2)} m/s gives ${SSD} m.`);
    },
    settlementTime: (r) => {
      const H = pick(r, [2, 4, 6]), cv = pick(r, [2, 4, 5]), Tv = 0.197;
      const t = round((Tv * H * H) / cv, 2);
      return numQ("Geotechnical engineering", `A clay layer drained on one side has drainage path ${H} m and cv = ${cv} m²/year. How long for 50% consolidation (Tv = 0.197)?`, t, Math.max(0.1, round(t / 4, 2)), (x) => `${x} years`, `t = Tv·H²/cv = 0.197 × ${H}² / ${cv} = ${t} years.`);
    },
  },
};

const BANK = {
  beginner: [
    ["What is the main binding material in concrete?", "Cement", ["Sand", "Aggregate", "Water"], "Cement hydrates and binds aggregates.", "Building materials"],
    ["Which test measures the workability of fresh concrete?", "Slump test", ["Compression test", "Le Chatelier test", "Vicat test"], "The slump shows consistency.", "Concrete technology"],
    ["What is the standard size of a modular brick in India?", "190 × 90 × 90 mm", ["230 × 110 × 70 mm", "200 × 100 × 100 mm", "250 × 125 × 75 mm"], "With mortar it becomes 200 × 100 × 100 mm.", "Building materials"],
    ["What is the curing period commonly recommended for ordinary concrete?", "At least 7 days (ideally 28)", ["1 day", "2 hours", "6 months"], "Curing allows proper hydration.", "Concrete technology"],
    ["Which instrument measures horizontal and vertical angles?", "Theodolite", ["Chain", "Level only", "Planimeter"], "Theodolites are used in surveying.", "Surveying"],
    ["What does a levelling staff measure?", "Vertical distance (staff readings) for elevations", ["Horizontal angles", "Soil density", "Rainfall"], "Used with a level instrument.", "Surveying"],
    ["What is a bench mark in surveying?", "A fixed reference point of known elevation", ["The first chain length", "A type of instrument", "The survey's end point"], "Elevations are measured relative to it.", "Surveying"],
    ["What does RCC stand for?", "Reinforced Cement Concrete", ["Rapid Cement Concrete", "Reinforced Concrete Column", "Rolled Cement Composite"], "Steel bars carry tension.", "RCC"],
    ["Why is steel used in RCC?", "To resist tensile stresses", ["To resist compression only", "To reduce cost", "To improve colour"], "Concrete is weak in tension.", "RCC"],
    ["What is the full form of PCC?", "Plain Cement Concrete", ["Pre-Cast Concrete", "Portland Cement Composite", "Primary Concrete Cover"], "PCC has no reinforcement.", "Concrete technology"],
    ["Which cement grade has a 28-day compressive strength of 53 MPa?", "OPC 53 grade", ["OPC 33 grade", "OPC 43 grade", "PPC 20 grade"], "Grade = 28-day strength in MPa.", "Building materials"],
    ["What is the initial setting time of ordinary Portland cement (minimum)?", "30 minutes", ["5 minutes", "10 hours", "1 day"], "Final setting time is at most 10 hours.", "Building materials"],
    ["Which apparatus is used to find the setting time of cement?", "Vicat apparatus", ["Slump cone", "Le Chatelier mould", "Proctor mould"], "The Vicat needle penetrates the paste.", "Building materials"],
    ["What is the function of fine aggregate in concrete?", "Filling voids between coarse aggregates", ["Binding materials", "Providing colour", "Reducing water"], "Sand fills gaps for density.", "Concrete technology"],
    ["Which foundation is suitable for weak soil with heavy loads?", "Pile foundation", ["Isolated footing", "Strip footing for light walls", "No foundation"], "Piles transfer load to deeper strata.", "Foundations"],
    ["What is a lintel?", "A horizontal member spanning an opening like a door or window", ["A vertical column", "A floor slab", "A roof truss"], "Lintels carry loads over openings.", "Building construction"],
    ["What is the purpose of a damp-proof course (DPC)?", "Preventing moisture rising through walls", ["Increasing strength", "Improving appearance", "Reducing load"], "DPC is placed at plinth level.", "Building construction"],
    ["Which bond is commonly used in brick masonry for strength?", "English bond", ["Stretcher bond only", "Header bond only", "Rat-trap bond for load walls"], "Alternate header and stretcher courses.", "Building construction"],
    ["What is the purpose of a plinth beam?", "Distributing load and preventing settlement cracks at plinth level", ["Supporting the roof", "Carrying water", "Holding windows"], "It ties walls together.", "Building construction"],
    ["What is the unit weight of plain concrete approximately?", "24 kN/m³", ["10 kN/m³", "78.5 kN/m³", "2 kN/m³"], "RCC is about 25 kN/m³.", "Structural basics"],
    ["What is the unit weight of steel approximately?", "78.5 kN/m³", ["24 kN/m³", "10 kN/m³", "18 kN/m³"], "Steel is about 7850 kg/m³.", "Structural basics"],
    ["What type of load is the self-weight of a structure?", "Dead load", ["Live load", "Wind load", "Seismic load"], "Dead loads are permanent.", "Structural basics"],
    ["What type of load is the weight of people and furniture?", "Live load", ["Dead load", "Snow load", "Earthquake load"], "Live loads vary with use.", "Structural basics"],
    ["What is the purpose of a contour map?", "Showing ground elevation using lines of equal height", ["Showing property boundaries", "Showing rainfall", "Showing soil types"], "Contours reveal terrain shape.", "Surveying"],
    ["What is the bearing capacity of soil?", "The maximum load per unit area soil can support without failure", ["The weight of soil", "The water content", "The density of soil"], "Foundations are designed within it.", "Geotechnical engineering"],
    ["Which soil has the smallest particle size?", "Clay", ["Sand", "Gravel", "Silt"], "Clay particles are below 0.002 mm.", "Geotechnical engineering"],
    ["What is the purpose of a culvert?", "Allowing water to pass under a road or railway", ["Supporting a bridge deck", "Storing water", "Lighting a road"], "Culverts carry small streams.", "Transportation engineering"],
    ["What is camber in a road?", "The transverse slope that drains water to the sides", ["The road's length", "The curve radius", "The pavement thickness"], "It prevents water ponding.", "Transportation engineering"],
    ["Which pavement type is made with bitumen?", "Flexible pavement", ["Rigid pavement", "Brick pavement", "Gravel road only"], "Bituminous surfaces flex under load.", "Transportation engineering"],
    ["Which pavement type is made with concrete slabs?", "Rigid pavement", ["Flexible pavement", "Earthen road", "Water-bound macadam"], "Rigid pavements use PCC slabs.", "Transportation engineering"],
    ["What is the function of a spillway in a dam?", "Safely discharging excess flood water", ["Generating electricity", "Storing silt", "Providing irrigation only"], "It protects the dam from overtopping.", "Water resources"],
    ["What is potable water?", "Water safe for drinking", ["Seawater", "Wastewater", "Rainwater only"], "It meets drinking standards.", "Environmental engineering"],
    ["Which process removes suspended particles by settling?", "Sedimentation", ["Chlorination", "Aeration", "Softening"], "Particles settle under gravity.", "Environmental engineering"],
    ["What is the purpose of chlorination in water treatment?", "Disinfecting water by killing pathogens", ["Removing colour only", "Adding minerals", "Softening water"], "Chlorine kills bacteria.", "Environmental engineering"],
    ["What is the full form of BOD?", "Biochemical Oxygen Demand", ["Biological Organic Density", "Basic Oxygen Distribution", "Bulk Oxygen Discharge"], "BOD indicates organic pollution.", "Environmental engineering"],
    ["What is a septic tank?", "An underground tank where sewage settles and is partly decomposed", ["A water storage tank", "A fuel tank", "A rainwater tank"], "Used where there is no sewer system.", "Environmental engineering"],
    ["What is the purpose of a retaining wall?", "Holding back soil at different ground levels", ["Supporting a roof", "Storing water", "Dividing rooms"], "It resists lateral earth pressure.", "Structures"],
    ["What is the primary purpose of a column?", "Transferring vertical loads to the foundation", ["Spanning openings", "Retaining soil", "Draining water"], "Columns are compression members.", "Structural basics"],
    ["Which structural member mainly resists bending?", "Beam", ["Column", "Footing", "Tie"], "Beams carry transverse loads.", "Structural basics"],
    ["What is the purpose of cover in RCC?", "Protecting reinforcement from corrosion and fire", ["Increasing weight", "Reducing strength", "Improving finish only"], "Cover is the concrete over the bars.", "RCC"],
    ["What is the shape of the stress-strain curve for mild steel showing a yield point?", "Linear, then a distinct yield plateau", ["Purely curved from the start", "A straight line to failure", "No elastic region"], "Mild steel shows a clear yield point.", "Strength of materials"],
    ["What is a truss?", "A framework of members connected at joints forming triangles", ["A solid slab", "A single beam", "A type of foundation"], "Triangles make trusses rigid.", "Structures"],
    ["What is the purpose of expansion joints?", "Allowing structures to expand and contract without cracking", ["Increasing strength", "Joining two buildings permanently", "Improving appearance"], "Temperature changes cause movement.", "Building construction"],
    ["What does the chain surveying method measure?", "Linear distances on the ground", ["Angles only", "Elevations only", "Soil properties"], "Suitable for small, open areas.", "Surveying"],
    ["What is a total station?", "An electronic instrument combining a theodolite and distance meter", ["A railway station", "A water tank", "A cement plant"], "It measures angles and distances.", "Surveying"],
    ["What is the main ingredient of lime mortar?", "Lime", ["Cement", "Bitumen", "Gypsum"], "Lime mortar sets by carbonation.", "Building materials"],
    ["Which timber defect is caused by fungi?", "Rot (decay)", ["Knot", "Shake", "Twist"], "Moisture encourages fungal decay.", "Building materials"],
    ["What is the purpose of a soak pit?", "Absorbing wastewater into the surrounding soil", ["Storing drinking water", "Collecting rainwater for use", "Treating industrial waste"], "Used with septic tanks.", "Environmental engineering"],
    ["What is the function of a sluice gate?", "Controlling the flow of water in a channel", ["Storing water", "Measuring rainfall", "Generating power"], "Gates regulate discharge.", "Water resources"],
    ["What is meant by 'setting out' a building?", "Marking the building's position on site before construction", ["Painting the building", "Demolishing a building", "Inspecting the roof"], "It transfers the plan to the ground.", "Building construction"],
    ["What is plastering?", "Applying a protective, smooth coat to walls", ["Laying bricks", "Pouring concrete", "Fixing tiles on roofs"], "Plaster protects masonry.", "Building construction"],
    ["What is the purpose of a chajja (sunshade)?", "Protecting openings from sun and rain", ["Supporting floors", "Retaining soil", "Draining water"], "It projects over windows.", "Building construction"],
    ["What is the full form of IS in Indian codes?", "Indian Standard", ["International System", "Indian Structure", "Integrated Standard"], "Issued by the Bureau of Indian Standards.", "Codes"],
    ["Which IS code covers plain and reinforced concrete?", "IS 456", ["IS 800", "IS 875", "IS 1893"], "IS 800 covers steel structures.", "Codes"],
    ["Which IS code covers design loads (other than earthquake)?", "IS 875", ["IS 456", "IS 1893", "IS 383"], "Dead, live, wind and snow loads.", "Codes"],
    ["Which IS code covers earthquake-resistant design?", "IS 1893", ["IS 456", "IS 800", "IS 875"], "Criteria for seismic design.", "Codes"],
    ["What is the purpose of a road median?", "Separating opposing traffic", ["Draining water", "Parking vehicles", "Planting only"], "Medians improve safety.", "Transportation engineering"],
    ["What is the function of a manhole in a sewer?", "Providing access for inspection and cleaning", ["Storing sewage", "Treating wastewater", "Generating gas"], "Manholes are placed at intervals.", "Environmental engineering"],
    ["What is groundwater?", "Water stored beneath the earth's surface in soil and rock", ["Water in rivers", "Rainwater on roofs", "Seawater"], "It is accessed by wells.", "Water resources"],
    ["What is an aquifer?", "An underground layer that can store and transmit water", ["A dam", "A water tank", "A river bed"], "Wells draw water from aquifers.", "Water resources"],
  ],
  intermediate: [
    ["What does the Proctor compaction test determine?", "Maximum dry density and optimum moisture content", ["Bearing capacity", "Permeability", "Shear strength"], "It guides field compaction.", "Geotechnical engineering"],
    ["What is the coefficient of permeability a measure of?", "How easily water flows through soil", ["Soil strength", "Soil density", "Soil colour"], "Darcy's law v = ki.", "Geotechnical engineering"],
    ["What does Darcy's law state?", "Flow velocity through soil is proportional to the hydraulic gradient", ["Settlement equals load", "Shear strength equals cohesion", "Pressure is constant"], "v = ki.", "Geotechnical engineering"],
    ["What is the liquid limit of soil?", "The water content at which soil changes from plastic to liquid state", ["The maximum density", "The shrinkage point", "The saturation level"], "Found with Casagrande's apparatus.", "Geotechnical engineering"],
    ["What is the plasticity index?", "Liquid limit minus plastic limit", ["Plastic limit minus shrinkage limit", "Liquid limit plus plastic limit", "Water content times density"], "It indicates plasticity range.", "Geotechnical engineering"],
    ["Mohr–Coulomb shear strength equation is:", "τ = c + σ tan φ", ["τ = σ / c", "τ = c × φ", "τ = E ε"], "Cohesion plus frictional resistance.", "Geotechnical engineering"],
    ["What is the characteristic compressive strength of M25 concrete?", "25 MPa", ["2.5 MPa", "250 MPa", "52 MPa"], "Grade number = fck in MPa.", "Concrete technology"],
    ["What is the purpose of admixtures like plasticisers?", "Improving workability without adding water", ["Increasing water demand", "Reducing strength", "Colouring concrete"], "They reduce water-cement ratio for the same slump.", "Concrete technology"],
    ["What is the limit state of serviceability concerned with?", "Deflection, cracking and vibration under normal use", ["Collapse of the structure", "Construction cost", "Material availability"], "Structures must remain usable.", "RCC"],
    ["In limit state design, what is the partial safety factor for concrete (IS 456)?", "1.5", ["1.15", "1.0", "2.0"], "Steel uses 1.15.", "RCC"],
    ["What is the partial safety factor for steel (IS 456)?", "1.15", ["1.5", "1.0", "2.5"], "Steel is more reliable than concrete.", "RCC"],
    ["What is a doubly reinforced beam?", "A beam with reinforcement in both tension and compression zones", ["A beam with two spans", "A beam made of two materials", "A beam with double depth"], "Used when depth is restricted.", "RCC"],
    ["What is the purpose of stirrups in a beam?", "Resisting shear and holding main bars in place", ["Resisting bending", "Increasing cover", "Reducing weight"], "Stirrups are shear reinforcement.", "RCC"],
    ["What is the minimum clear cover for slabs as per IS 456 (mild exposure)?", "20 mm", ["5 mm", "75 mm", "100 mm"], "Covers depend on exposure condition.", "RCC"],
    ["What is a one-way slab?", "A slab whose longer-to-shorter span ratio is greater than 2", ["A slab supported on one side", "A slab with one bar", "A slab of one metre width"], "It bends mainly in one direction.", "RCC"],
    ["What is the effective length factor for a column fixed at both ends (theoretical)?", "0.5", ["1.0", "2.0", "0.7"], "Fixed ends greatly increase buckling resistance.", "Structural analysis"],
    ["What is the effective length factor for a cantilever column (fixed-free)?", "2.0", ["0.5", "1.0", "0.7"], "Free ends make columns slender.", "Structural analysis"],
    ["What is the degree of static indeterminacy of a fixed beam?", "3", ["0", "1", "2"], "6 reactions − 3 equilibrium equations.", "Structural analysis"],
    ["Which method analyses indeterminate beams by distributing moments at joints?", "Moment distribution method", ["Method of joints", "Method of sections", "Graphical method only"], "Hardy Cross developed it.", "Structural analysis"],
    ["What does the method of joints analyse?", "Forces in truss members using equilibrium at each joint", ["Beam deflection", "Soil pressure", "Column buckling"], "Each joint has ΣFx = ΣFy = 0.", "Structural analysis"],
    ["What is the superelevation of a road curve?", "Raising the outer edge to counteract centrifugal force", ["Widening the road", "Lowering the inner edge only", "Adding lanes"], "It improves safety on curves.", "Transportation engineering"],
    ["What does the CBR test evaluate?", "Strength of subgrade soil for pavement design", ["Cement strength", "Water quality", "Steel ductility"], "California Bearing Ratio.", "Transportation engineering"],
    ["What is the purpose of a transition curve?", "Gradually introducing curvature and superelevation", ["Connecting two roads at right angles", "Reducing road width", "Draining water"], "e.g. spiral curves.", "Transportation engineering"],
    ["What is the standard gauge width in Indian Railways' broad gauge?", "1676 mm", ["1000 mm", "1435 mm", "762 mm"], "Broad gauge is 1.676 m.", "Transportation engineering"],
    ["What is the hydraulic radius?", "Flow area divided by wetted perimeter", ["Pipe diameter", "Flow depth", "Channel width"], "R = A/P.", "Hydraulics"],
    ["What is critical flow in an open channel?", "Flow with Froude number equal to 1", ["Flow with zero velocity", "Turbulent flow only", "Flow in pipes"], "Specific energy is minimum.", "Hydraulics"],
    ["What is a hydraulic jump?", "A sudden rise in water level when supercritical flow becomes subcritical", ["A waterfall", "A pump failure", "A flood wave"], "It dissipates energy.", "Hydraulics"],
    ["What is the purpose of an energy dissipator below a spillway?", "Reducing the energy of falling water to prevent scour", ["Generating electricity", "Storing water", "Increasing flow speed"], "Stilling basins create hydraulic jumps.", "Water resources"],
    ["What is evapotranspiration?", "Combined water loss from evaporation and plant transpiration", ["Rainfall intensity", "Infiltration rate", "Runoff volume"], "Important for irrigation planning.", "Water resources"],
    ["What is the duty of irrigation water?", "Area irrigated per unit discharge", ["Depth of water applied", "Crop yield", "Canal length"], "Expressed in hectares per cumec.", "Water resources"],
    ["What is the purpose of a hydrograph?", "Showing discharge versus time at a point in a river", ["Showing rainfall only", "Showing soil layers", "Showing canal routes"], "Used for flood analysis.", "Hydrology"],
    ["What does the rational method estimate?", "Peak runoff (Q = CIA)", ["Groundwater level", "Evaporation", "Infiltration"], "C = runoff coefficient.", "Hydrology"],
    ["What is the main purpose of an activated sludge process?", "Biological treatment of wastewater using microorganisms", ["Disinfection with chlorine", "Removing grit only", "Softening water"], "Microbes consume organic matter.", "Environmental engineering"],
    ["What is the permissible limit of fluoride in drinking water (IS 10500, acceptable)?", "1.0 mg/L", ["10 mg/L", "0.01 mg/L", "50 mg/L"], "Excess fluoride causes fluorosis.", "Environmental engineering"],
    ["What does COD measure?", "Oxygen required to chemically oxidise organic matter", ["Biological oxygen demand", "Dissolved oxygen", "Water hardness"], "COD is usually higher than BOD.", "Environmental engineering"],
    ["What is the purpose of coagulation in water treatment?", "Destabilising fine particles so they clump together", ["Killing bacteria", "Adding fluoride", "Removing hardness"], "Alum is a common coagulant.", "Environmental engineering"],
    ["What is the 'Earned Value' concept used for in construction management?", "Measuring project performance against planned cost and schedule", ["Estimating land value", "Calculating taxes", "Pricing materials"], "It compares planned and actual progress.", "Construction management"],
    ["What is CPM in project management?", "Critical Path Method — finding the longest path of dependent activities", ["Cost Per Material", "Concrete Placement Method", "Contract Payment Model"], "It sets minimum project duration.", "Construction management"],
    ["What is PERT used for?", "Scheduling projects with uncertain activity durations", ["Testing concrete", "Surveying land", "Designing beams"], "It uses three time estimates.", "Construction management"],
    ["What is float (slack) in a schedule?", "Time an activity can be delayed without delaying the project", ["The critical path length", "The project cost", "The total duration"], "Critical activities have zero float.", "Construction management"],
    ["Why is fly ash used in concrete?", "To improve workability and durability and reduce cement use", ["To increase water demand", "To colour the concrete", "To reduce strength intentionally"], "It is a pozzolanic material.", "Concrete technology"],
    ["What is efflorescence on bricks?", "White salt deposits on the surface", ["Cracks in bricks", "Colour fading", "Moss growth"], "Soluble salts migrate with moisture.", "Building materials"],
    ["What is the purpose of a shear wall?", "Resisting lateral loads like wind and earthquakes", ["Supporting only vertical loads", "Dividing rooms", "Insulating sound"], "Shear walls increase stiffness.", "Structures"],
    ["What is soft storey failure?", "Collapse of a storey that is much weaker or more flexible than those above", ["Failure of a soft soil", "Roof leakage", "Plaster cracking"], "Common in open ground floors.", "Earthquake engineering"],
    ["What is liquefaction?", "Saturated loose sand losing strength during earthquake shaking", ["Melting of rocks", "Concrete curing", "Flooding of roads"], "Buildings may sink or tilt.", "Earthquake engineering"],
    ["What is negative skin friction on piles?", "Downward drag when surrounding soil settles more than the pile", ["Upward resistance", "Friction at the pile tip", "Lateral earth pressure"], "It adds load to piles.", "Foundations"],
    ["What is the purpose of a raft foundation?", "Spreading loads over a large area on weak soil", ["Supporting a single column only", "Storing water", "Providing basement walls only"], "A raft covers the whole footprint.", "Foundations"],
    ["What is consolidation of clay?", "Gradual volume reduction as water drains under sustained load", ["Instant compaction", "Freezing of soil", "Erosion"], "It causes long-term settlement.", "Geotechnical engineering"],
    ["What is the angle of repose?", "The steepest stable slope angle of loose granular material", ["The angle of a roof", "The angle of a ramp", "The angle of a road curve"], "Related to internal friction.", "Geotechnical engineering"],
    ["What is the function of a geotextile?", "Separation, filtration, drainage or reinforcement of soil", ["Waterproofing roofs", "Colouring concrete", "Insulating pipes"], "Used in roads and embankments.", "Geotechnical engineering"],
    ["What is prestressed concrete?", "Concrete with stresses induced before loading to counteract tension", ["Concrete cured under pressure", "Pre-mixed concrete", "Concrete with extra cement"], "Tendons compress the concrete.", "RCC"],
    ["What is the difference between pre-tensioning and post-tensioning?", "Pre-tensioning stresses tendons before casting; post-tensioning after the concrete hardens", ["They are identical", "Post-tensioning is done before casting", "Pre-tensioning uses no steel"], "Both introduce compression.", "RCC"],
    ["What is a cofferdam?", "A temporary enclosure that keeps water out for construction", ["A permanent dam", "A water tank", "A canal lining"], "Used for bridge piers.", "Construction"],
    ["What is the purpose of dewatering on a construction site?", "Lowering the water table to allow excavation", ["Watering plants", "Curing concrete", "Cleaning equipment"], "Uses pumps or well points.", "Construction"],
    ["What is the main advantage of precast construction?", "Faster construction with better quality control", ["Lower transport cost", "No cranes needed", "Unlimited sizes"], "Units are made in factories.", "Construction"],
    ["What does BIM stand for?", "Building Information Modelling", ["Basic Infrastructure Management", "Building Inspection Method", "Bulk Inventory Model"], "BIM integrates design data in 3D.", "Construction management"],
    ["What is a bill of quantities (BOQ)?", "An itemised list of materials, parts and labour with quantities", ["A building permit", "A soil report", "A design drawing"], "Used for tendering and costing.", "Construction management"],
    ["What is the purpose of a curing compound?", "Retaining moisture in concrete when water curing is difficult", ["Colouring concrete", "Increasing water content", "Speeding up setting only"], "It forms a membrane.", "Concrete technology"],
    ["What is honeycombing in concrete?", "Voids caused by poor compaction or improper mix", ["Surface cracks from drying", "Steel corrosion", "Colour change"], "It weakens the concrete.", "Concrete technology"],
    ["What is the purpose of a vibrator in concreting?", "Compacting concrete by removing entrapped air", ["Mixing concrete", "Cooling concrete", "Cutting concrete"], "Proper compaction increases strength.", "Concrete technology"],
  ],
  advanced: [
    ["What is the slenderness ratio of a column?", "Effective length divided by least radius of gyration", ["Length divided by width", "Load divided by area", "Height divided by depth"], "It indicates buckling tendency.", "Structural analysis"],
    ["What does the Rankine–Gordon formula estimate?", "Crippling load of columns of intermediate length", ["Soil pressure", "Beam deflection", "Wind load"], "It combines crushing and buckling.", "Structural analysis"],
    ["What is the principle of virtual work used for?", "Finding deflections and forces in structures", ["Designing mixes", "Estimating quantities", "Measuring rainfall"], "e.g. the unit-load method.", "Structural analysis"],
    ["What is the slope-deflection method?", "A displacement method relating end moments to joint rotations and deflections", ["A survey method", "A soil test", "A concrete test"], "Used for indeterminate frames.", "Structural analysis"],
    ["What is Castigliano's theorem used for?", "Finding deflection as the partial derivative of strain energy with respect to load", ["Finding soil bearing capacity", "Designing mixes", "Finding traffic volume"], "δ = ∂U/∂P.", "Structural analysis"],
    ["What is an influence line?", "A graph showing how a response at a point varies as a unit load moves across the structure", ["A graph of soil layers", "A contour line", "A load-deflection curve"], "Used for moving loads on bridges.", "Structural analysis"],
    ["Müller-Breslau principle is used to draw:", "Influence lines", ["Bending moment diagrams for static loads", "Contours", "Mohr's circles"], "The deflected shape gives the influence line.", "Structural analysis"],
    ["What is the plastic section modulus used for?", "Calculating the plastic moment capacity of a section", ["Calculating deflection", "Calculating weight", "Calculating cost"], "Mp = fy × Zp.", "Steel structures"],
    ["What is the shape factor of a rectangular section?", "1.5", ["1.0", "1.7", "2.0"], "Zp/Ze = 1.5 for rectangles.", "Steel structures"],
    ["What is lateral-torsional buckling?", "Buckling of a beam involving sideways deflection and twisting", ["Column crushing", "Soil failure", "Weld cracking"], "Occurs in unrestrained beams.", "Steel structures"],
    ["Which IS code covers general construction in steel?", "IS 800", ["IS 456", "IS 1893", "IS 875"], "It uses limit state design.", "Codes"],
    ["What is the response reduction factor (R) in seismic design?", "A factor accounting for ductility and overstrength to reduce design forces", ["A factor increasing loads", "A soil factor", "A wind factor"], "Ductile frames have higher R.", "Earthquake engineering"],
    ["What is base isolation?", "Decoupling a building from ground motion using flexible bearings", ["Strengthening foundations with piles", "Adding heavy roofs", "Removing basements"], "It reduces seismic forces.", "Earthquake engineering"],
    ["What is Terzaghi's bearing capacity equation used for?", "Ultimate bearing capacity of shallow foundations", ["Pile capacity only", "Slope stability", "Consolidation time"], "q = cNc + qNq + 0.5γBNγ.", "Foundations"],
    ["What is the factor of safety against sliding for retaining walls typically required?", "1.5", ["0.5", "1.0", "5.0"], "Resisting forces ÷ sliding forces ≥ 1.5.", "Foundations"],
    ["What is Rankine's earth pressure theory about?", "Lateral earth pressure assuming smooth vertical walls and plastic equilibrium", ["Bearing capacity", "Settlement", "Permeability"], "Ka = (1 − sinφ)/(1 + sinφ).", "Geotechnical engineering"],
    ["What is the coefficient of active earth pressure for φ = 30° (Rankine)?", "1/3", ["1", "3", "0.5"], "Ka = (1 − sin30°)/(1 + sin30°) = 0.5/1.5.", "Geotechnical engineering"],
    ["What is the effective stress principle?", "Total stress = effective stress + pore water pressure", ["Effective stress = total stress + pore pressure", "Pore pressure is always zero", "Total stress equals pore pressure"], "Terzaghi: σ = σ' + u.", "Geotechnical engineering"],
    ["What is quick sand condition?", "Upward seepage reduces effective stress to zero in cohesionless soil", ["Very dry sand", "Dense compacted sand", "Frozen sand"], "Soil loses strength completely.", "Geotechnical engineering"],
    ["What is the Swedish circle (slip circle) method used for?", "Slope stability analysis", ["Bearing capacity", "Pile design", "Pavement design"], "It checks circular failure surfaces.", "Geotechnical engineering"],
    ["What is the over-consolidation ratio (OCR)?", "Past maximum effective stress divided by current effective stress", ["Void ratio divided by porosity", "Liquid limit divided by plastic limit", "Load divided by area"], "OCR > 1 means over-consolidated.", "Geotechnical engineering"],
    ["What does the Westergaard analysis address?", "Stresses in rigid pavement slabs under wheel loads", ["Flexible pavement design", "Soil consolidation", "Bridge loading"], "Interior, edge and corner loading.", "Transportation engineering"],
    ["What is the passenger car unit (PCU)?", "A measure converting different vehicles to equivalent cars for traffic analysis", ["A car's engine power", "A road length unit", "A toll rate"], "Trucks have higher PCU values.", "Transportation engineering"],
    ["What is the design life of a flexible pavement typically?", "15–20 years", ["1–2 years", "100 years", "6 months"], "Based on cumulative standard axles.", "Transportation engineering"],
    ["What does the Marshall test evaluate?", "Stability and flow of bituminous mixes", ["Soil CBR", "Cement fineness", "Steel tensile strength"], "Used in bituminous mix design.", "Transportation engineering"],
    ["What is the Hardy Cross method used for in water networks?", "Balancing flows in pipe networks iteratively", ["Treating water", "Designing dams", "Estimating rainfall"], "It corrects loop flows.", "Hydraulics"],
    ["What is water hammer?", "A pressure surge when flowing water is stopped suddenly", ["A pump type", "A leak in a pipe", "A water treatment step"], "Surge tanks reduce it.", "Hydraulics"],
    ["What is the purpose of a surge tank?", "Absorbing pressure surges in penstocks", ["Storing drinking water", "Treating water", "Generating power"], "Protects pipes from water hammer.", "Water resources"],
    ["What is specific energy in open channel flow?", "Energy per unit weight measured relative to the channel bed", ["Kinetic energy only", "Pressure energy only", "Total head above sea level"], "E = y + V²/2g.", "Hydraulics"],
    ["What is the unit hydrograph?", "The direct runoff hydrograph from one unit of effective rainfall over a unit duration", ["Rainfall over one day", "A graph of groundwater", "A canal design chart"], "Used to predict floods.", "Hydrology"],
    ["What is the Muskingum method used for?", "Flood routing through river reaches", ["Groundwater recharge", "Irrigation scheduling", "Water treatment"], "It relates storage to inflow and outflow.", "Hydrology"],
    ["What is the purpose of a trickling filter?", "Biological treatment as wastewater trickles over media covered with microbes", ["Disinfection", "Sedimentation", "Filtration of drinking water only"], "An attached-growth process.", "Environmental engineering"],
    ["What is the sludge volume index (SVI)?", "A measure of the settleability of activated sludge", ["Sludge temperature", "Oxygen demand", "Sludge colour"], "High SVI indicates poor settling.", "Environmental engineering"],
    ["What is the purpose of an environmental impact assessment (EIA)?", "Evaluating a project's environmental effects before approval", ["Designing foundations", "Estimating costs", "Testing materials"], "EIA is legally required for major projects.", "Environmental engineering"],
    ["What is a sanitary landfill?", "An engineered site for safe disposal of solid waste with liners and covers", ["An open dump", "A recycling plant", "A water reservoir"], "It prevents groundwater pollution.", "Environmental engineering"],
    ["What is the main advantage of high-performance concrete?", "High strength and durability with low permeability", ["Low cost", "No curing needed", "Extra workability only"], "Uses silica fume and superplasticisers.", "Concrete technology"],
    ["What is self-compacting concrete?", "Concrete that flows and consolidates under its own weight without vibration", ["Concrete that never sets", "Concrete with no cement", "Concrete for roads only"], "Useful for congested reinforcement.", "Concrete technology"],
    ["What is carbonation of concrete?", "Reaction of CO₂ with calcium hydroxide lowering pH and risking steel corrosion", ["Strength gain", "Setting of cement", "Colour change only"], "Adequate cover delays it.", "Concrete technology"],
    ["What is creep in concrete?", "Time-dependent deformation under sustained load", ["Instant elastic strain", "Shrinkage due to drying only", "Cracking"], "It increases long-term deflection.", "Concrete technology"],
    ["What is the purpose of a bearing in bridges?", "Transferring loads while allowing movement and rotation", ["Increasing span", "Decorating the bridge", "Draining water"], "e.g. elastomeric bearings.", "Bridge engineering"],
    ["What is the IRC Class AA loading used for?", "Designing bridges for heavy tracked and wheeled vehicles", ["Designing houses", "Designing dams", "Designing pavements only"], "Indian Roads Congress standard.", "Bridge engineering"],
    ["What type of bridge carries its load through cables hanging from towers?", "Suspension bridge", ["Arch bridge", "Beam bridge", "Truss bridge"], "Main cables are in tension.", "Bridge engineering"],
    ["What is the purpose of a cable-stayed bridge's stays?", "Directly connecting the deck to the pylons to carry loads", ["Decorating the deck", "Draining water", "Supporting lights only"], "Stays are in tension.", "Bridge engineering"],
    ["What is the main criterion in green building rating systems?", "Reducing environmental impact through energy, water and material efficiency", ["Maximising height", "Using only glass", "Reducing construction time only"], "e.g. LEED, GRIHA.", "Sustainable construction"],
    ["What is the purpose of rainwater harvesting?", "Collecting and storing rainwater for reuse or recharge", ["Preventing rainfall", "Treating sewage", "Generating electricity"], "It recharges groundwater.", "Sustainable construction"],
    ["What is the function of GIS in civil engineering?", "Capturing, analysing and mapping spatial data", ["Designing beams", "Mixing concrete", "Testing steel"], "Used in planning and infrastructure.", "Surveying"],
    ["What is remote sensing?", "Acquiring information about the earth's surface from satellites or aircraft", ["Measuring soil with a chain", "Testing concrete in a lab", "Surveying with a level"], "Used for land-use mapping.", "Surveying"],
    ["What does GPS-based surveying (GNSS) provide?", "Precise positions using satellite signals", ["Soil strength", "Concrete strength", "Rainfall data"], "RTK GNSS gives centimetre accuracy.", "Surveying"],
    ["What is the purpose of value engineering?", "Improving value by reducing cost without sacrificing function", ["Increasing project cost", "Valuing land", "Estimating taxes"], "It analyses function vs cost.", "Construction management"],
    ["What is a liquidated damages clause in a contract?", "A pre-agreed compensation for delay by the contractor", ["A bonus for early completion", "A design change", "A payment schedule"], "It discourages delays.", "Construction management"],
    ["What is the FIDIC?", "An international federation that publishes standard construction contract forms", ["An Indian standard", "A concrete test", "A survey instrument"], "FIDIC contracts are widely used.", "Construction management"],
    ["What is the purpose of a resource histogram?", "Showing resource requirements over time to plan levelling", ["Showing soil layers", "Showing traffic flow", "Showing rainfall"], "Helps smooth labour demand.", "Construction management"],
    ["What is crashing in project management?", "Shortening activity durations by adding resources at extra cost", ["Stopping a project", "Demolishing a building", "Reducing quality"], "Applied to critical activities.", "Construction management"],
    ["What is the main advantage of steel fibre reinforced concrete?", "Improved crack resistance and toughness", ["Lower cost than plain concrete", "No need for curing", "Higher workability always"], "Fibres bridge cracks.", "Concrete technology"],
    ["What is the purpose of non-destructive testing (NDT) of concrete?", "Assessing quality and strength without damaging the structure", ["Breaking cubes", "Demolishing slabs", "Mixing concrete"], "e.g. rebound hammer, UPV.", "Concrete technology"],
    ["What does the rebound hammer test estimate?", "Surface hardness correlated to compressive strength", ["Steel corrosion", "Soil density", "Water content"], "Quick but approximate.", "Concrete technology"],
    ["What does an ultrasonic pulse velocity (UPV) test detect?", "Internal quality and cracks in concrete", ["Surface colour", "Steel grade", "Soil moisture"], "Higher velocity means denser concrete.", "Concrete technology"],
    ["What is the purpose of an expansion joint in a bridge deck?", "Accommodating thermal movement of the deck", ["Draining water only", "Supporting traffic signs", "Reducing weight"], "Prevents cracking.", "Bridge engineering"],
    ["What is the 'Heat of hydration' concern in mass concrete?", "Temperature rise causing thermal cracking", ["Concrete freezing", "Steel melting", "Faster curing being harmful always"], "Low-heat cement or cooling is used.", "Concrete technology"],
    ["What is the main purpose of a seismic zone map?", "Defining expected earthquake intensity for design in each region", ["Showing rainfall", "Showing roads", "Showing soil fertility"], "IS 1893 divides India into zones.", "Earthquake engineering"],
  ],
};

module.exports = { buildTechnicalTest: makeTechnicalBuilder(40000, TEMPLATES, BANK), BANK, TEMPLATES };
