# Circuit Builder: Hardware-Software Project Builder

A beginner-friendly virtual workspace where students can plan, wire, check, simulate and document ESP32 hardware-plus-software projects before spending money on physical parts.

## The Problem

Many college students want to build embedded, IoT and robotics projects, but getting started is hard. Components cost money, students may not know which parts are suitable, and wrong wiring takes time to find and fix. Repeatedly buying parts or rebuilding a circuit makes experimenting expensive and discouraging.

## The Solution

Circuit Builder supports the whole early development workflow in one place: choose components, connect them on a visual canvas, get plain-language explanations of wiring mistakes, test the logic virtually, and see the hardware data appear on a software dashboard.

## Features

- **Parts Library and Component Guide:** ESP32, LED, resistor, push button, DHT22, HC-SR04, potentiometer, water level sensor and piezo buzzer, each with a description, typical uses, operating voltage and a pin table.
- **Visual Wiring Canvas:** add parts, drag them around, and draw or delete wires between pins.
- **Smart Connection Checks:** rule-based checks flag short circuits, clashing pins, missing power or ground, LEDs without resistors, analog sensors on the wrong ADC pins, and 5V signals going into 3.3V pins. Each issue explains how to fix it, and problem wires turn red or orange.
- **Hardware Helper:** describe a project goal (for example "water level monitor") and get a recommended parts list with reasons, then add the parts and auto-wire a correct example circuit.
- **Simulation:** control virtual sensors with sliders, build IF-THEN logic rules, and watch LEDs and buzzers react live.
- **Live Dashboard:** a web-dashboard view fed by the simulation, with sensor cards, charts, editable alert thresholds, actuator states and a JSON data feed.
- **Build Guide:** generates a bill of materials, a wiring schedule, a schematic diagram, ESP32 Arduino code and a safety checklist, with Copy code, Download (.md) and Print / Save as PDF buttons.
- **Save and Load:** the project autosaves in the browser and can be saved to or loaded from a .json file.

## Tech Stack

- React
- Vite
- React Flow (@xyflow/react)

## Getting Started

Requirements: Node.js (LTS version) and npm.

```
git clone https://github.com/Srijakarthikeyan/circuit-builder.git
cd circuit-builder
npm install
npm run dev
```

Then open the address shown in the terminal (usually http://localhost:5173).

## How to Use

1. Open the **Hardware Helper** tab, choose an example such as "ESP32 Water Level Monitor", then click "Add parts to canvas" and "Auto-wire suggested connections".
2. Open the **Build** tab to see the circuit and the Connection Checks. Try making a wrong wire to see the checks explain the mistake.
3. Open the **Simulate** tab, click Start, move the sensor sliders and watch the outputs react to your logic rules.
4. Open the **Dashboard** tab to see the live sensor data and the JSON feed.
5. Open the **Build Guide** tab to get the parts list, wiring table and ESP32 code for building the real prototype.

## Project Structure

```
src/
  App.jsx                      Main app, tabs and shared circuit state
  parts.js                     Parts library definitions
  checks.js                    Rule-based wiring checks
  helper.js                    Project templates for the Hardware Helper
  simulation.js                Simulation logic
  codegen.js                   ESP32 Arduino code generator
  exportGuide.js               Build guide generator
  components/                  Tab and panel components
```

## Important Limitations

Circuit Builder is a learning tool. Its checks are rule-based and its simulation covers only simple logic and sensor values. It does not model real electrical behavior, timing, noise or sensor accuracy, and it cannot guarantee that a real circuit will work. Always check voltages, wire with the board unplugged, and verify on real hardware safely.

## Roadmap

- More boards and parts
- A resistor-aware check for button pull-ups and pull-downs
- Connecting the virtual hardware to a real web dashboard over WiFi
- Integration with an existing circuit simulation engine

## Author

Built by Srija (GitHub: Srijakarthikeyan).
