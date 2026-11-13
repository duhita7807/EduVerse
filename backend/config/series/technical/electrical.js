/** Technical series — Electrical / Electronics / E&TC. Entries: [question, answer, [wrong x3], why, topic]. */
const { makeTechnicalBuilder, numQ, round, int, pick } = require("./common");

const TEMPLATES = {
  beginner: {
    ohm: (r) => {
      const I = pick(r, [0.5, 1, 1.5, 2, 2.5, 3]), R = int(r, 2, 50);
      return numQ("Circuit basics", `A current of ${I} A flows through a ${R} Ω resistor. What is the voltage across it?`, round(I * R, 2), Math.max(1, round(I * R / 5, 0)), (x) => `${x} V`, `V = I × R = ${I} × ${R} = ${round(I * R, 2)} V.`);
    },
    series: (r) => {
      const a = int(r, 10, 100), b = int(r, 10, 100), c = int(r, 10, 100);
      return numQ("Circuit basics", `Resistors of ${a} Ω, ${b} Ω and ${c} Ω are connected in series. What is the total resistance?`, a + b + c, 10, (x) => `${x} Ω`, `Series: R = ${a} + ${b} + ${c} = ${a + b + c} Ω.`);
    },
    parallel: (r) => {
      const a = pick(r, [4, 6, 10, 12, 20]), b = pick(r, [5, 8, 15, 30, 60]);
      return numQ("Circuit basics", `What is the equivalent resistance of ${a} Ω and ${b} Ω in parallel?`, round((a * b) / (a + b), 2), 1, (x) => `${x} Ω`, `R = R1R2/(R1+R2) = ${a}×${b}/${a + b} = ${round((a * b) / (a + b), 2)} Ω.`);
    },
    power: (r) => {
      const V = pick(r, [12, 24, 110, 230]), I = pick(r, [0.5, 1, 2, 4, 5]);
      return numQ("Power", `A device draws ${I} A from a ${V} V supply. What power does it consume?`, round(V * I, 2), Math.max(2, round(V * I / 5, 0)), (x) => `${x} W`, `P = V × I = ${V} × ${I} = ${round(V * I, 2)} W.`);
    },
    energyCost: (r) => {
      const W = pick(r, [100, 500, 1000, 1500, 2000]), h = int(r, 2, 10), rate = pick(r, [5, 6, 7, 8]);
      const cost = round((W / 1000) * h * rate, 2);
      return numQ("Power", `A ${W} W appliance runs ${h} hours. At ₹${rate} per kWh, what does it cost?`, cost, Math.max(1, round(cost / 5, 0)), (x) => `₹${x}`, `Energy = ${W / 1000} kW × ${h} h = ${round((W / 1000) * h, 2)} kWh; cost = × ₹${rate} = ₹${cost}.`);
    },
  },
  intermediate: {
    transformer: (r) => {
      const Vp = pick(r, [230, 440, 11000]), Np = pick(r, [500, 1000, 2000]), Ns = pick(r, [50, 100, 200, 250]);
      const Vs = round((Vp * Ns) / Np, 2);
      return numQ("Machines", `A transformer has ${Np} primary and ${Ns} secondary turns. With ${Vp} V on the primary, what is the secondary voltage?`, Vs, Math.max(1, round(Vs / 5, 0)), (x) => `${x} V`, `Vs = Vp × Ns/Np = ${Vp} × ${Ns}/${Np} = ${Vs} V.`);
    },
    rcTau: (r) => {
      const R = pick(r, [1, 2, 4.7, 10]), C = pick(r, [10, 22, 47, 100]);
      return numQ("Circuits", `What is the time constant of an RC circuit with R = ${R} kΩ and C = ${C} µF?`, round(R * C, 2), Math.max(1, round(R * C / 5, 0)), (x) => `${x} ms`, `τ = RC = ${R} kΩ × ${C} µF = ${round(R * C, 2)} ms.`);
    },
    reactance: (r) => {
      const f = pick(r, [50, 60, 100, 1000]), L = pick(r, [0.1, 0.2, 0.5]);
      const X = round(2 * Math.PI * f * L, 2);
      return numQ("AC circuits", `What is the inductive reactance of a ${L} H inductor at ${f} Hz?`, X, Math.max(1, round(X / 5, 0)), (x) => `${x} Ω`, `XL = 2πfL = 2π × ${f} × ${L} = ${X} Ω.`);
    },
    divider: (r) => {
      const Vin = pick(r, [5, 9, 12, 24]), R1 = pick(r, [1, 2, 3, 4.7]), R2 = pick(r, [1, 2, 3.3, 10]);
      const Vo = round((Vin * R2) / (R1 + R2), 2);
      return numQ("Circuits", `A voltage divider has R1 = ${R1} kΩ (top) and R2 = ${R2} kΩ (bottom) across ${Vin} V. What is the output across R2?`, Vo, 0.5, (x) => `${x} V`, `Vout = Vin × R2/(R1+R2) = ${Vin} × ${R2}/${round(R1 + R2, 2)} = ${Vo} V.`);
    },
    threePhase: (r) => {
      const VL = pick(r, [400, 415, 440]), IL = int(r, 5, 30), pf = pick(r, [0.8, 0.85, 0.9]);
      const P = round((Math.sqrt(3) * VL * IL * pf) / 1000, 2);
      return numQ("Power systems", `A balanced 3-phase load draws ${IL} A at ${VL} V line voltage with power factor ${pf}. What is the real power?`, P, Math.max(0.5, round(P / 5, 1)), (x) => `${x} kW`, `P = √3 × VL × IL × pf = √3 × ${VL} × ${IL} × ${pf} = ${P} kW.`);
    },
  },
  advanced: {
    resonance: (r) => {
      const L = pick(r, [1, 10, 100]), C = pick(r, [1, 10, 100]);
      const f = round(1 / (2 * Math.PI * Math.sqrt(L * 1e-3 * C * 1e-9)) / 1000, 2);
      return numQ("AC circuits", `What is the resonant frequency of an LC circuit with L = ${L} mH and C = ${C} nF?`, f, Math.max(0.5, round(f / 5, 1)), (x) => `${x} kHz`, `f = 1/(2π√(LC)) = ${f} kHz.`);
    },
    syncSpeed: (r) => {
      const f = pick(r, [50, 60]), P = pick(r, [2, 4, 6, 8, 10]);
      return numQ("Machines", `What is the synchronous speed of a ${P}-pole motor on a ${f} Hz supply?`, (120 * f) / P, 100, (x) => `${x} rpm`, `Ns = 120f/P = 120 × ${f}/${P} = ${(120 * f) / P} rpm.`);
    },
    slip: (r) => {
      const Ns = pick(r, [1500, 1000, 3000]), s = pick(r, [2, 3, 4, 5]);
      const N = Ns * (1 - s / 100);
      return numQ("Machines", `An induction motor has synchronous speed ${Ns} rpm and runs at ${N} rpm. What is the slip?`, s, 1, (x) => `${x}%`, `s = (Ns − N)/Ns × 100 = (${Ns} − ${N})/${Ns} × 100 = ${s}%.`);
    },
    opamp: (r) => {
      const Rf = pick(r, [10, 22, 47, 100]), Ri = pick(r, [1, 2, 4.7, 10]), Vi = pick(r, [0.1, 0.2, 0.5]);
      const Vo = round((Rf / Ri) * Vi, 3);
      return numQ("Analog electronics", `An inverting amplifier has Rf = ${Rf} kΩ and Rin = ${Ri} kΩ. What is the output magnitude for a ${Vi} V input?`, Vo, Math.max(0.1, round(Vo / 5, 2)), (x) => `${x} V`, `|Vo| = (Rf/Rin) × Vin = (${Rf}/${Ri}) × ${Vi} = ${Vo} V (inverted).`);
    },
    adc: (r) => {
      const bits = pick(r, [8, 10, 12]), Vref = pick(r, [3.3, 5]);
      const res = round((Vref / 2 ** bits) * 1000, 3);
      return numQ("Digital electronics", `What is the resolution of a ${bits}-bit ADC with a ${Vref} V reference?`, res, Math.max(0.1, round(res / 5, 3)), (x) => `${x} mV`, `Resolution = Vref/2ⁿ = ${Vref}/${2 ** bits} = ${res} mV.`);
    },
  },
};

const BANK = {
  beginner: [
    ["What is the SI unit of electric current?", "Ampere", ["Volt", "Ohm", "Watt"], "Current is charge per second.", "Basics"],
    ["What is the SI unit of resistance?", "Ohm", ["Farad", "Henry", "Tesla"], "R = V/I.", "Basics"],
    ["What does a capacitor store?", "Energy in an electric field", ["Energy in a magnetic field", "Charge as current", "Heat"], "E = ½CV².", "Components"],
    ["What does an inductor store?", "Energy in a magnetic field", ["Energy in an electric field", "Chemical energy", "Light"], "E = ½LI².", "Components"],
    ["What is the unit of capacitance?", "Farad", ["Henry", "Ohm", "Weber"], "1 F = 1 C/V.", "Components"],
    ["What is the unit of inductance?", "Henry", ["Farad", "Siemens", "Coulomb"], "Named after Joseph Henry.", "Components"],
    ["What is the frequency of the mains supply in India?", "50 Hz", ["60 Hz", "100 Hz", "25 Hz"], "The US uses 60 Hz.", "Power systems"],
    ["What is the standard single-phase domestic voltage in India?", "230 V", ["110 V", "415 V", "12 V"], "Three-phase line voltage is 415 V.", "Power systems"],
    ["Which material is the best conductor among these?", "Silver", ["Copper", "Aluminium", "Iron"], "Copper is used because it is cheaper.", "Materials"],
    ["What is a semiconductor commonly used in chips?", "Silicon", ["Copper", "Rubber", "Glass"], "Silicon is abundant and stable.", "Electronics"],
    ["What does a diode allow?", "Current to flow mainly in one direction", ["Current in both directions equally", "No current ever", "Only AC"], "It is a one-way valve.", "Electronics"],
    ["What is the forward voltage drop of a silicon diode approximately?", "0.7 V", ["0.3 V", "1.5 V", "5 V"], "Germanium is about 0.3 V.", "Electronics"],
    ["What does LED stand for?", "Light Emitting Diode", ["Low Energy Device", "Light Electric Display", "Linear Emitting Diode"], "LEDs emit light when forward biased.", "Electronics"],
    ["What is the function of a fuse?", "Protecting a circuit by melting under excess current", ["Increasing voltage", "Storing energy", "Measuring current"], "It breaks the circuit on overload.", "Protection"],
    ["Which instrument measures current?", "Ammeter", ["Voltmeter", "Ohmmeter", "Wattmeter"], "Connected in series.", "Measurements"],
    ["How is a voltmeter connected?", "In parallel with the component", ["In series", "Across the fuse only", "To earth only"], "It needs high resistance.", "Measurements"],
    ["What is Kirchhoff's current law?", "The sum of currents entering a node equals the sum leaving", ["Voltage around a loop is zero", "V = IR", "Power is conserved"], "Charge is conserved at nodes.", "Circuit laws"],
    ["What is Kirchhoff's voltage law?", "The sum of voltages around a closed loop is zero", ["Currents at a node sum to zero", "P = VI", "R increases with temperature"], "Energy is conserved in a loop.", "Circuit laws"],
    ["In a series circuit, which quantity is the same through all components?", "Current", ["Voltage", "Power", "Resistance"], "One path for current.", "Circuit basics"],
    ["In a parallel circuit, which quantity is the same across all branches?", "Voltage", ["Current", "Resistance", "Power"], "All branches share the same nodes.", "Circuit basics"],
    ["What does AC stand for?", "Alternating Current", ["Active Current", "Ampere Current", "Applied Charge"], "It reverses direction periodically.", "Basics"],
    ["What is the main advantage of AC for power transmission?", "Voltage can be easily changed using transformers", ["It never causes shocks", "It needs no wires", "It is always DC inside"], "High voltage reduces losses.", "Power systems"],
    ["What is the function of a transformer?", "Changing AC voltage levels", ["Converting AC to DC", "Storing energy", "Generating power"], "It works by mutual induction.", "Machines"],
    ["Can a transformer work on DC?", "No, it needs changing flux", ["Yes, always", "Only at high voltage", "Only at low current"], "DC produces constant flux.", "Machines"],
    ["What is the function of a rectifier?", "Converting AC to DC", ["Converting DC to AC", "Increasing frequency", "Reducing resistance"], "Uses diodes.", "Power electronics"],
    ["What does an inverter do?", "Converts DC to AC", ["Converts AC to DC", "Stores charge", "Measures power"], "Used in UPS and solar systems.", "Power electronics"],
    ["What is earthing used for?", "Safety by giving fault current a low-resistance path to ground", ["Increasing voltage", "Saving energy", "Reducing frequency"], "It protects people from shocks.", "Protection"],
    ["What is the colour of the earth wire in modern Indian wiring?", "Green (or green-yellow)", ["Red", "Black", "Blue"], "Phase is red/brown, neutral black/blue.", "Wiring"],
    ["What is an MCB?", "Miniature Circuit Breaker that trips on overload or short circuit", ["Main Control Board", "Magnetic Coil Box", "Motor Control Button"], "It can be reset, unlike a fuse.", "Protection"],
    ["What does an RCCB/ELCB protect against?", "Earth leakage currents that could cause shock", ["Overvoltage only", "Lightning only", "Low frequency"], "It detects imbalance between phase and neutral.", "Protection"],
    ["Which logic gate gives output 1 only when all inputs are 1?", "AND", ["OR", "NOT", "XOR"], "AND is a product.", "Digital electronics"],
    ["Which logic gate gives output 1 when at least one input is 1?", "OR", ["AND", "NAND", "XNOR"], "OR is a sum.", "Digital electronics"],
    ["What does a NOT gate do?", "Inverts the input", ["Adds inputs", "Stores a bit", "Amplifies"], "0 becomes 1 and 1 becomes 0.", "Digital electronics"],
    ["Which gates are called universal gates?", "NAND and NOR", ["AND and OR", "XOR and XNOR", "NOT and buffer"], "Any logic can be built from them.", "Digital electronics"],
    ["What is the binary equivalent of decimal 10?", "1010", ["1100", "1001", "0110"], "8 + 2 = 10.", "Digital electronics"],
    ["What is a transistor mainly used for?", "Amplification and switching", ["Storing charge", "Measuring voltage", "Generating light"], "BJTs and MOSFETs are common.", "Electronics"],
    ["What are the three terminals of a BJT?", "Emitter, base, collector", ["Gate, source, drain", "Anode, cathode, gate", "Input, output, ground"], "MOSFETs have gate, source, drain.", "Electronics"],
    ["What are the terminals of a MOSFET?", "Gate, source, drain", ["Emitter, base, collector", "Anode, cathode", "Primary, secondary"], "The gate is insulated.", "Electronics"],
    ["What does a resistor's colour code indicate?", "Its resistance value and tolerance", ["Its power rating only", "Its material", "Its age"], "Bands encode digits and multiplier.", "Components"],
    ["What is the effect of temperature on the resistance of metals?", "Resistance increases with temperature", ["Resistance decreases", "No effect", "It becomes zero"], "Metals have positive temperature coefficients.", "Materials"],
    ["What is the power factor of a purely resistive load?", "1", ["0", "0.5", "−1"], "Voltage and current are in phase.", "AC circuits"],
    ["What type of energy does a battery store?", "Chemical energy", ["Magnetic energy", "Nuclear energy", "Mechanical energy"], "Converted to electrical energy.", "Basics"],
    ["What is the unit of electrical energy used in billing?", "kWh", ["kW", "Joule per second", "Volt-ampere"], "1 unit = 1 kWh.", "Power"],
    ["What is the function of a switch?", "Opening or closing a circuit", ["Storing current", "Increasing voltage", "Measuring power"], "It controls current flow.", "Circuit basics"],
    ["What is a short circuit?", "A low-resistance path causing excessive current", ["An open circuit", "A circuit with high resistance", "A circuit with no supply"], "It can cause fires.", "Protection"],
    ["What is an open circuit?", "A break in the circuit so no current flows", ["A circuit with zero resistance", "A short circuit", "A parallel circuit"], "Infinite resistance.", "Circuit basics"],
    ["What device converts mechanical energy to electrical energy?", "Generator", ["Motor", "Transformer", "Rectifier"], "Motors do the reverse.", "Machines"],
    ["What device converts electrical energy to mechanical energy?", "Motor", ["Generator", "Battery", "Transformer"], "Based on force on current-carrying conductors.", "Machines"],
    ["What is Faraday's law about?", "An EMF is induced when magnetic flux linking a circuit changes", ["V = IR", "Like charges repel", "Current produces heat"], "e = −dΦ/dt.", "Electromagnetism"],
    ["What does Lenz's law state?", "Induced current opposes the change producing it", ["Induced current aids the change", "Flux is constant", "Current is always DC"], "Explains the minus sign in Faraday's law.", "Electromagnetism"],
    ["Fleming's right-hand rule applies to:", "Generators", ["Motors", "Transformers", "Batteries"], "Left-hand rule is for motors.", "Electromagnetism"],
    ["What is a solar cell made from usually?", "Silicon", ["Copper", "Lead", "Plastic"], "It converts light to electricity.", "Renewable energy"],
    ["What is the RMS value of AC?", "The equivalent DC value producing the same heating", ["The peak value", "The average of a half cycle", "Zero"], "Vrms = Vpeak/√2 for a sine wave.", "AC circuits"],
    ["What is a relay?", "An electrically operated switch", ["A type of resistor", "A capacitor", "A diode"], "A small current controls a larger one.", "Components"],
    ["What does a multimeter measure?", "Voltage, current and resistance", ["Only voltage", "Only temperature", "Only frequency"], "It combines several meters.", "Measurements"],
    ["What is the purpose of a heat sink?", "Dissipating heat from electronic components", ["Storing energy", "Increasing voltage", "Reducing current"], "Prevents overheating.", "Electronics"],
    ["Which component blocks DC but passes AC?", "Capacitor", ["Inductor", "Resistor", "Fuse"], "Its reactance falls with frequency.", "Components"],
    ["What is a PCB?", "Printed Circuit Board", ["Power Control Box", "Primary Circuit Breaker", "Portable Charging Battery"], "It mechanically supports and connects components.", "Electronics"],
    ["What is the speed of an electromagnetic wave in vacuum?", "3 × 10⁸ m/s", ["3 × 10⁶ m/s", "340 m/s", "1 × 10⁸ m/s"], "Speed of light.", "Basics"],
    ["What is a Zener diode mainly used for?", "Voltage regulation", ["Rectification at high current", "Amplification", "Light emission"], "It operates in reverse breakdown.", "Electronics"],
  ],
  intermediate: [
    ["What is the voltage regulation of a transformer?", "Change in secondary voltage from no load to full load as a percentage of full-load voltage", ["Ratio of turns", "Efficiency at full load", "Core loss per kVA"], "Lower regulation is better.", "Machines"],
    ["Which losses in a transformer are constant regardless of load?", "Core (iron) losses", ["Copper losses", "Stray load losses", "Dielectric losses only at full load"], "They depend on voltage and frequency.", "Machines"],
    ["When is transformer efficiency maximum?", "When copper loss equals core loss", ["At no load", "When copper loss is zero", "At double rated load"], "Variable loss = constant loss.", "Machines"],
    ["Which test determines a transformer's core losses?", "Open-circuit test", ["Short-circuit test", "Polarity test", "Load test only"], "SC test gives copper losses.", "Machines"],
    ["What is back EMF in a DC motor?", "EMF induced in the armature that opposes the supply voltage", ["The supply voltage", "Voltage across the field", "Brush drop"], "It limits armature current.", "Machines"],
    ["Why does a DC series motor never start without load?", "Its speed can rise dangerously high", ["It won't rotate", "It draws no current", "It reverses"], "Speed is inversely related to load.", "Machines"],
    ["Why are induction motors called asynchronous?", "The rotor runs slightly slower than synchronous speed", ["They run at synchronous speed", "They use DC", "They have no rotor"], "Slip is needed for torque.", "Machines"],
    ["What starter is common for large squirrel-cage induction motors?", "Star-delta starter", ["DOL only", "No starter", "Rheostat in the field"], "It reduces starting current.", "Machines"],
    ["What does power factor represent?", "cos φ — the ratio of real power to apparent power", ["The ratio of voltage to current", "The resistance of a load", "The frequency of supply"], "pf = P/S.", "AC circuits"],
    ["How is a lagging power factor usually corrected?", "Adding capacitors in parallel", ["Adding inductors in series", "Increasing resistance", "Reducing frequency"], "Capacitors supply reactive power.", "Power systems"],
    ["What is reactive power measured in?", "VAR", ["W", "VA", "kWh"], "Apparent power is VA.", "AC circuits"],
    ["What is Thevenin's theorem?", "Any linear network can be replaced by a voltage source in series with a resistance", ["Any network is a current source in series", "Power is maximum at zero load", "Currents divide equally"], "Norton uses a current source in parallel.", "Network theorems"],
    ["What is the maximum power transfer condition for a resistive load?", "Load resistance equals the source (Thevenin) resistance", ["Load resistance is zero", "Load resistance is infinite", "Load equals twice the source"], "Efficiency is then 50%.", "Network theorems"],
    ["What does the superposition theorem allow?", "Analysing each independent source separately and summing responses", ["Ignoring all sources", "Combining resistors only", "Analysing non-linear circuits"], "Applies to linear circuits.", "Network theorems"],
    ["In a pure inductor, current ___ voltage by 90°.", "lags", ["leads", "is in phase with", "is opposite to"], "ELI the ICE man.", "AC circuits"],
    ["In a pure capacitor, current ___ voltage by 90°.", "leads", ["lags", "is in phase with", "has no relation to"], "ICE: current before voltage.", "AC circuits"],
    ["What is the impedance of a series RLC circuit at resonance?", "Equal to R (minimum)", ["Infinite", "Zero", "Equal to XL + XC"], "XL and XC cancel.", "AC circuits"],
    ["What is the purpose of a filter capacitor after a rectifier?", "Smoothing ripple in the DC output", ["Increasing ripple", "Converting DC to AC", "Raising frequency"], "It charges on peaks and discharges between them.", "Power electronics"],
    ["What is the ripple frequency of a full-wave rectifier on 50 Hz mains?", "100 Hz", ["50 Hz", "25 Hz", "150 Hz"], "Both half cycles are used.", "Power electronics"],
    ["What is the peak inverse voltage requirement in a centre-tapped full-wave rectifier?", "2 Vm", ["Vm", "Vm/2", "4 Vm"], "Each diode sees twice the peak.", "Power electronics"],
    ["What is the characteristic of an ideal op-amp?", "Infinite gain and input impedance, zero output impedance", ["Zero gain", "Zero input impedance", "Infinite output impedance"], "Real op-amps approximate this.", "Analog electronics"],
    ["What is the gain of a voltage follower?", "1", ["0", "−1", "Infinite"], "Output follows input — used as a buffer.", "Analog electronics"],
    ["What is a flip-flop?", "A bistable circuit that stores one bit", ["A logic gate", "An amplifier", "A filter"], "Basic memory element.", "Digital electronics"],
    ["Which flip-flop toggles its output on each clock when input is 1?", "T flip-flop", ["D flip-flop", "SR latch", "Buffer"], "Used in counters.", "Digital electronics"],
    ["What is a multiplexer?", "A circuit selecting one of many inputs onto a single output", ["A circuit splitting one input to many outputs", "A memory", "An adder"], "Select lines choose the input.", "Digital electronics"],
    ["How many select lines does an 8:1 multiplexer need?", "3", ["2", "8", "4"], "2³ = 8.", "Digital electronics"],
    ["What is the 2's complement of binary 0101?", "1011", ["1010", "0110", "1101"], "Invert (1010) and add 1.", "Digital electronics"],
    ["What does a half adder produce?", "Sum and carry", ["Sum only", "Difference and borrow", "Product"], "Sum = A⊕B, Carry = AB.", "Digital electronics"],
    ["What is the Nyquist sampling rate?", "Twice the highest signal frequency", ["Equal to the highest frequency", "Half the highest frequency", "Ten times the bandwidth always"], "Sampling below it causes aliasing.", "Signals"],
    ["What is aliasing?", "Distortion when a signal is sampled below the Nyquist rate", ["Noise from resistors", "Loss of power", "Amplifier clipping"], "High frequencies appear as low ones.", "Signals"],
    ["What is amplitude modulation?", "Varying the carrier's amplitude with the message signal", ["Varying frequency", "Varying phase only", "Switching the carrier off"], "Used in AM radio.", "Communication"],
    ["What advantage does FM have over AM?", "Better noise immunity", ["Narrower bandwidth", "Simpler receivers always", "Longer wavelength"], "Noise mainly affects amplitude.", "Communication"],
    ["What is the bandwidth of an AM signal with message bandwidth fm?", "2fm", ["fm", "fm/2", "4fm"], "Two sidebands.", "Communication"],
    ["What does a PLC do in industry?", "Controls machines and processes using programmable logic", ["Generates power", "Measures temperature only", "Transmits radio"], "Programmable Logic Controller.", "Control systems"],
    ["What is a closed-loop control system?", "A system that uses feedback to adjust its output", ["A system without feedback", "A system with no input", "A manual system only"], "e.g. a thermostat.", "Control systems"],
    ["What is the transfer function of a system?", "Laplace transform of output over input with zero initial conditions", ["Output times input", "Time-domain output", "The system's power"], "G(s) = Y(s)/X(s).", "Control systems"],
    ["What are poles of a transfer function?", "Values of s that make the denominator zero", ["Values making the numerator zero", "Input frequencies", "Gain values"], "Poles determine stability.", "Control systems"],
    ["For stability, where must all poles of a continuous system lie?", "In the left half of the s-plane", ["In the right half", "On the imaginary axis", "At the origin"], "Negative real parts decay.", "Control systems"],
    ["What does a PID controller combine?", "Proportional, integral and derivative actions", ["Power, impedance and delay", "Phase, inductance and damping", "Pulse, input and data"], "Widely used in process control.", "Control systems"],
    ["What does integral action in PID remove?", "Steady-state error", ["Overshoot", "Noise", "Delay"], "It accumulates past error.", "Control systems"],
    ["What is the purpose of a Buchholz relay?", "Protecting oil-filled transformers against internal faults", ["Protecting motors from overload", "Measuring power", "Correcting power factor"], "Gas accumulation triggers it.", "Protection"],
    ["Why is power transmitted at high voltage?", "To reduce I²R losses by lowering current", ["To increase current", "To make it safer at home", "To reduce frequency"], "P = VI; higher V means lower I.", "Power systems"],
    ["What is the Ferranti effect?", "Receiving-end voltage exceeding sending-end voltage on lightly loaded long lines", ["Voltage drop at full load", "Frequency rise", "Current reversal"], "Caused by line capacitance.", "Power systems"],
    ["What is corona discharge?", "Ionisation of air around high-voltage conductors", ["Short circuit to ground", "Overheating of cables", "Transformer saturation"], "It causes power loss and noise.", "Power systems"],
    ["What is the skin effect?", "AC current concentrating near the conductor surface", ["Current flowing in the core", "Insulation failure", "Voltage drop at joints"], "Increases effective resistance.", "Power systems"],
    ["What does an SCR do?", "Acts as a controlled rectifier switch that turns on with a gate pulse", ["Stores charge", "Amplifies audio", "Measures current"], "Silicon Controlled Rectifier.", "Power electronics"],
    ["How is an SCR turned off?", "By reducing anode current below holding current", ["By removing the gate signal", "By increasing gate current", "It never turns off"], "Commutation is needed.", "Power electronics"],
    ["What is PWM used for?", "Controlling average power by varying pulse width", ["Increasing frequency", "Measuring resistance", "Filtering noise"], "Pulse Width Modulation.", "Power electronics"],
    ["What is a microcontroller?", "A single chip with CPU, memory and I/O peripherals", ["A power transistor", "A memory card", "An analog filter"], "e.g. Arduino's ATmega.", "Embedded systems"],
    ["Which protocol uses SDA and SCL lines?", "I²C", ["SPI", "UART", "CAN"], "Two-wire serial bus.", "Embedded systems"],
    ["What does UART stand for?", "Universal Asynchronous Receiver-Transmitter", ["Unified Analog Radio Transmitter", "Universal Array Register Transfer", "User Access Remote Terminal"], "Serial communication without a clock.", "Embedded systems"],
    ["What is an interrupt in a microcontroller?", "A signal that temporarily diverts the CPU to service an event", ["A power failure", "A memory error", "A clock signal"], "An ISR handles it.", "Embedded systems"],
    ["What is the function of a CT (current transformer)?", "Stepping down current for measurement and protection", ["Stepping up voltage", "Storing charge", "Converting AC to DC"], "Secondary must not be left open.", "Measurements"],
    ["Why must a CT's secondary never be open-circuited?", "Dangerously high voltage can develop", ["It will short-circuit", "It saves power", "The primary current stops"], "The core saturates.", "Measurements"],
    ["What does a Wheatstone bridge measure accurately?", "Unknown resistance", ["Current", "Frequency", "Power factor"], "Balanced when P/Q = R/S.", "Measurements"],
    ["What is the efficiency of a class A amplifier at most (resistive load)?", "25%", ["78.5%", "50%", "100%"], "Transformer-coupled class A reaches 50%.", "Analog electronics"],
    ["What is the maximum efficiency of a class B push-pull amplifier?", "78.5%", ["25%", "50%", "100%"], "Theoretical maximum is π/4.", "Analog electronics"],
    ["What is crossover distortion?", "Distortion in class B amplifiers near zero crossing", ["Distortion due to clipping", "Noise from power supply", "Frequency drift"], "Class AB reduces it.", "Analog electronics"],
    ["What does CMRR measure in an op-amp?", "Ability to reject signals common to both inputs", ["Output current", "Supply voltage", "Slew rate"], "Higher CMRR is better.", "Analog electronics"],
    ["What is slew rate?", "Maximum rate of change of an op-amp's output voltage", ["Input offset voltage", "Gain-bandwidth product", "Output resistance"], "Measured in V/µs.", "Analog electronics"],
  ],
  advanced: [
    ["What is the Routh–Hurwitz criterion used for?", "Determining stability without solving for roots", ["Finding gain margin", "Plotting Bode diagrams", "Measuring frequency"], "Sign changes count RHP roots.", "Control systems"],
    ["What does a Bode plot show?", "Magnitude and phase versus frequency on log scale", ["Pole-zero locations", "Time response", "Impulse response only"], "Used for frequency response design.", "Control systems"],
    ["What is gain margin?", "Additional gain before the system becomes unstable", ["Phase at crossover", "Steady-state error", "Bandwidth"], "Measured at phase crossover.", "Control systems"],
    ["What does the root locus show?", "How closed-loop poles move as gain varies", ["Frequency response", "Time-domain error", "Noise level"], "Evans' method.", "Control systems"],
    ["What is the damping ratio for a critically damped system?", "1", ["0", "0.5", "Greater than 2 only"], "No overshoot, fastest non-oscillatory response.", "Control systems"],
    ["What is state-space representation?", "Modelling a system with first-order differential equations in matrix form", ["A transfer function", "A Bode plot", "A Nyquist plot"], "ẋ = Ax + Bu.", "Control systems"],
    ["What is the Z-transform used for?", "Analysing discrete-time signals and systems", ["Continuous signals only", "Power flow", "Machine design"], "Discrete counterpart of the Laplace transform.", "Signals"],
    ["What is the DFT's fast algorithm called?", "FFT", ["DCT", "IIR", "PLL"], "Reduces O(N²) to O(N log N).", "Signals"],
    ["What is the key difference between FIR and IIR filters?", "FIR has no feedback; IIR uses feedback", ["IIR has no feedback", "FIR is analog only", "They are identical"], "FIR can have linear phase.", "Signals"],
    ["What does a PLL do?", "Locks an oscillator's phase to a reference signal", ["Amplifies power", "Rectifies AC", "Stores data"], "Used in frequency synthesis.", "Communication"],
    ["What is QAM?", "Modulation varying both amplitude and phase", ["Frequency-only modulation", "Pulse position modulation", "Analog AM only"], "Used in Wi-Fi and cable modems.", "Communication"],
    ["What does Shannon's capacity theorem give?", "Maximum error-free data rate C = B log₂(1 + S/N)", ["Minimum bandwidth", "Antenna gain", "Sampling rate"], "Depends on bandwidth and SNR.", "Communication"],
    ["What is OFDM?", "Transmitting data over many orthogonal subcarriers", ["A single-carrier scheme", "An antenna type", "A coding error"], "Used in 4G/5G and Wi-Fi.", "Communication"],
    ["What is the purpose of a load flow study?", "Finding voltages, currents and power flows in a power network", ["Designing transformers", "Measuring insulation", "Testing relays"], "Newton-Raphson or Gauss-Seidel.", "Power systems"],
    ["What is the swing equation about?", "The rotor dynamics of synchronous machines during disturbances", ["Transformer losses", "Cable heating", "Load forecasting"], "Basis of transient stability.", "Power systems"],
    ["What is the equal area criterion used for?", "Transient stability of a single machine connected to an infinite bus", ["Load flow", "Fault level", "Harmonic analysis"], "Accelerating area equals decelerating area.", "Power systems"],
    ["What is per-unit system used for?", "Normalising quantities to simplify power system calculations", ["Measuring energy bills", "Rating motors", "Testing insulation"], "Values relative to a base.", "Power systems"],
    ["Which fault is most common in power systems?", "Single line-to-ground fault", ["Three-phase symmetrical fault", "Line-to-line fault", "Double line-to-ground fault"], "About 70–80% of faults.", "Power systems"],
    ["Which fault is most severe usually?", "Three-phase symmetrical fault", ["Single line-to-ground", "Open conductor", "Line-to-line"], "It is used for breaker rating.", "Power systems"],
    ["What are symmetrical components used for?", "Analysing unbalanced faults", ["Balanced load flow", "Transformer design", "Insulation testing"], "Positive, negative and zero sequence.", "Power systems"],
    ["What does a distance relay measure?", "Impedance between the relay and the fault", ["Only current", "Only frequency", "Temperature"], "Used on transmission lines.", "Protection"],
    ["What does differential protection compare?", "Currents entering and leaving the protected zone", ["Voltages at two buses", "Frequency and phase", "Load and generation"], "Used for transformers and generators.", "Protection"],
    ["What is HVDC transmission's advantage for long distances?", "Lower losses and no reactive power/stability limits", ["Cheaper converters", "Simpler at short distances", "No need for insulation"], "Economic beyond a break-even distance.", "Power systems"],
    ["What is a FACTS device?", "Power-electronic equipment controlling AC transmission parameters", ["A type of fuse", "A metering device", "A cable joint"], "e.g. SVC, STATCOM.", "Power systems"],
    ["What is the main purpose of an MPPT controller in solar systems?", "Extracting maximum available power from PV panels", ["Storing energy", "Converting AC to DC", "Measuring sunlight"], "Tracks the maximum power point.", "Renewable energy"],
    ["What does a DFIG wind generator stand for?", "Doubly-Fed Induction Generator", ["Direct Flux Induction Generator", "Dual Frequency Inverter Grid", "Digital Field Induction Generator"], "Allows variable-speed operation.", "Renewable energy"],
    ["What is a buck converter?", "A DC-DC converter that steps voltage down", ["A converter that steps up", "An AC-AC converter", "A rectifier"], "Vo = D × Vin.", "Power electronics"],
    ["What is the output voltage of an ideal boost converter with duty cycle D?", "Vin/(1 − D)", ["D × Vin", "Vin × (1 − D)", "Vin/D"], "Steps voltage up.", "Power electronics"],
    ["What is an IGBT?", "A device combining MOSFET gate drive with BJT conduction", ["A type of diode", "A capacitor", "A magnetic sensor"], "Used in inverters and drives.", "Power electronics"],
    ["What is total harmonic distortion (THD)?", "Ratio of harmonic content to the fundamental", ["Total power loss", "Voltage drop", "Phase angle"], "Lower THD means cleaner waveforms.", "Power quality"],
    ["What is vector control of induction motors?", "Controlling flux and torque independently like a DC motor", ["Controlling speed by voltage only", "Starting motors with resistors", "Changing poles"], "Also called field-oriented control.", "Drives"],
    ["What is V/f control?", "Keeping voltage-to-frequency ratio constant to maintain flux", ["Varying voltage only", "Varying frequency only", "Changing poles"], "A scalar speed control method.", "Drives"],
    ["What is regenerative braking?", "Using the motor as a generator to return energy to the supply", ["Braking using friction", "Plugging", "Dynamic braking with resistors only"], "Used in EVs and trains.", "Drives"],
    ["What is the CMOS inverter's static power consumption ideally?", "Nearly zero", ["Very high", "Equal to dynamic power", "Infinite"], "One transistor is always off.", "VLSI"],
    ["What does dynamic power in CMOS depend on?", "C × V² × f (switching)", ["Only leakage", "Only temperature", "Only current"], "P = αCV²f.", "VLSI"],
    ["What is an FPGA?", "A reconfigurable chip of programmable logic blocks", ["A fixed microprocessor", "A memory chip only", "An analog amplifier"], "Programmed with HDL.", "VLSI"],
    ["Which languages are hardware description languages?", "Verilog and VHDL", ["Python and Java", "C and C++", "HTML and CSS"], "Used to design digital circuits.", "VLSI"],
    ["What is setup time in sequential circuits?", "Minimum time data must be stable before the clock edge", ["Time after the clock edge", "Clock period", "Propagation delay"], "Violations cause metastability.", "Digital electronics"],
    ["What is metastability?", "A flip-flop stuck between states due to timing violations", ["A stable state", "Power failure", "Clock gating"], "Synchronisers reduce the risk.", "Digital electronics"],
    ["What is a Moore machine?", "A state machine whose outputs depend only on the current state", ["Outputs depend on inputs and state", "A memory type", "An analog circuit"], "Mealy outputs depend on inputs too.", "Digital electronics"],
    ["What is the Miller effect?", "Amplification of feedback capacitance seen at the input", ["Reduction of gain", "Thermal runaway", "Noise in resistors"], "Limits high-frequency response.", "Analog electronics"],
    ["What is thermal runaway in BJTs?", "Rising temperature increasing current which raises temperature further", ["Cooling of transistors", "Breakdown of capacitors", "Voltage regulation"], "Proper biasing prevents it.", "Analog electronics"],
    ["What is the Barkhausen criterion?", "Loop gain magnitude 1 and phase shift 0° (or 360°) for oscillation", ["Gain of zero", "Phase shift of 90°", "Negative feedback"], "Condition for sustained oscillation.", "Analog electronics"],
    ["What is the characteristic impedance of a transmission line?", "√(L/C) for a lossless line", ["L × C", "R only", "1/(LC)"], "Matching it avoids reflections.", "Electromagnetics"],
    ["What is VSWR?", "Voltage standing wave ratio indicating impedance mismatch", ["Voltage supply rating", "A filter type", "A power unit"], "VSWR = 1 is a perfect match.", "Electromagnetics"],
    ["What does Maxwell's equation ∇·B = 0 imply?", "There are no magnetic monopoles", ["Electric charges don't exist", "Current is zero", "Fields are static"], "Magnetic field lines are closed.", "Electromagnetics"],
    ["What is the skin depth's dependence on frequency?", "It decreases as frequency increases", ["It increases with frequency", "It is independent of frequency", "It equals wavelength"], "δ ∝ 1/√f.", "Electromagnetics"],
    ["What is the gain of an antenna relative to?", "An isotropic radiator (dBi) or dipole (dBd)", ["The transmitter power", "The receiver noise", "The cable length"], "Directivity × efficiency.", "Communication"],
    ["What does the Friis equation give?", "Received power in free space", ["Antenna impedance", "Noise figure", "Bit error rate"], "Depends on distance and gains.", "Communication"],
    ["What is noise figure?", "The degradation of SNR caused by a component", ["Total noise power", "Signal amplitude", "Bandwidth"], "Lower is better.", "Communication"],
    ["What is the purpose of a smart grid?", "Using digital communication and control to manage electricity efficiently", ["Only increasing voltage", "Removing transformers", "Replacing all generators"], "Enables demand response and renewables integration.", "Power systems"],
    ["What is the purpose of SCADA in power systems?", "Supervisory control and data acquisition across the grid", ["Billing customers", "Designing machines", "Testing cables"], "Remote monitoring and control.", "Power systems"],
    ["What is the main issue with high penetration of inverter-based renewables?", "Reduced system inertia affecting frequency stability", ["Too much inertia", "No voltage at all", "Excess reactive power always"], "Grid-forming inverters help.", "Renewable energy"],
    ["What does BMS mean in EV batteries?", "Battery Management System", ["Basic Motor Supply", "Battery Measurement Scale", "Bus Monitoring Station"], "Monitors cells, SOC and safety.", "Electric vehicles"],
    ["What is state of charge (SOC)?", "Available battery capacity as a percentage of full capacity", ["Battery voltage only", "Battery temperature", "Number of cycles"], "Estimated by the BMS.", "Electric vehicles"],
    ["Which motor is common in modern EVs?", "Permanent magnet synchronous motor (PMSM)", ["DC series motor only", "Universal motor", "Stepper motor"], "High efficiency and power density.", "Electric vehicles"],
    ["What is the purpose of a snubber circuit?", "Limiting voltage spikes across switching devices", ["Increasing switching speed", "Storing energy long-term", "Measuring current"], "Typically RC networks.", "Power electronics"],
    ["What is soft switching?", "Switching at zero voltage or zero current to reduce losses", ["Switching slowly with friction", "Switching at maximum voltage", "Manual switching"], "ZVS and ZCS techniques.", "Power electronics"],
    ["What is sigma-delta ADC known for?", "High resolution using oversampling and noise shaping", ["Very high speed only", "Low resolution", "No digital filter"], "Common in audio.", "Mixed-signal"],
    ["What is the quantisation noise reduction per extra ADC bit?", "About 6 dB", ["About 1 dB", "About 20 dB", "About 3 dB"], "SNR ≈ 6.02N + 1.76 dB.", "Mixed-signal"],
  ],
};

module.exports = { buildTechnicalTest: makeTechnicalBuilder(50000, TEMPLATES, BANK), BANK, TEMPLATES };
