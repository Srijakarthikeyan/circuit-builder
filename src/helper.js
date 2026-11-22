import { PARTS } from './parts'

export const PROJECT_TEMPLATES = [
  {
    id: 'water-level-monitor',
    title: 'ESP32 Water Level Monitor',
    keywords: ['water', 'level', 'depth', 'liquid', 'flood', 'tank', 'sump', 'rain', 'reservoir'],
    summary: 'Monitors fluid depth in real-time using an analog sensor on ADC1 and triggers LED and buzzer alerts when high levels or flood conditions are detected.',
    pinsUsage: 'SIG -> GPIO34 (ADC1), LED -> GPIO2 (via 220Ω resistor), Buzzer -> GPIO4, Power -> 3.3V & GND',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Main microcontroller running logic and Wi-Fi data telemetry.' },
      { partId: 'waterlevel', name: 'Water Level Sensor', qty: 1, reason: 'Measures fluid depth via parallel traces reading analog voltage.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'Current-limiting protection for the warning LED.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Visual warning light when fluid level exceeds safe thresholds.' },
      { partId: 'buzzer', name: 'Piezo Buzzer', qty: 1, reason: 'Audible alarm that beeps when flood threshold is crossed.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'waterlevel-1', inputValueName: 'Water Level', sensorKey: 'waterlevel', operator: '>', threshold: 75, outputPartId: 'buzzer-1', outputState: 'ON', targetNodeId: 'buzzer-1', action: 'ON' },
      { id: 'rule-2', inputPartId: 'waterlevel-1', inputValueName: 'Water Level', sensorKey: 'waterlevel', operator: '>', threshold: 60, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'waterlevel-1', type: 'part', position: { x: 380, y: 80 }, data: { partId: 'waterlevel' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 260 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 260 }, data: { partId: 'led' } },
        { id: 'buzzer-1', type: 'part', position: { x: 380, y: 440 }, data: { partId: 'buzzer' } },
      ],
      edges: [
        { id: 'e-wl-vcc', source: 'esp32', sourceHandle: '3V3', target: 'waterlevel-1', targetHandle: 'VCC', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-wl-gnd', source: 'esp32', sourceHandle: 'GND', target: 'waterlevel-1', targetHandle: 'GND', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-wl-sig', source: 'esp32', sourceHandle: 'GPIO34', target: 'waterlevel-1', targetHandle: 'SIG', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gpio', source: 'esp32', sourceHandle: 'GPIO4', target: 'buzzer-1', targetHandle: 'Positive (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gnd', source: 'esp32', sourceHandle: 'GND', target: 'buzzer-1', targetHandle: 'Negative (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: 'temp-humidity-monitor',
    title: 'Smart Temperature & Humidity Station',
    keywords: ['temperature', 'humidity', 'temp', 'weather', 'climate', 'dht', 'dht22', 'heat', 'cool'],
    summary: 'Reads ambient temperature and relative humidity using the digital DHT22 sensor and provides visual heat or humidity alerts.',
    pinsUsage: 'DHT22 DATA -> GPIO4, LED -> GPIO2 (via 220Ω resistor), Power -> 3.3V & GND',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Controls sampling timing and logs environment telemetry.' },
      { partId: 'dht22', name: 'DHT22 Sensor', qty: 1, reason: 'Accurate combined temperature and relative humidity digital sensor.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'Protects LED from overcurrent burnout.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Lights up when temperature or humidity exceeds preset thresholds.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'dht22-1', inputValueName: 'Temperature', sensorKey: 'dht22_temp', operator: '>', threshold: 30, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
      { id: 'rule-2', inputPartId: 'dht22-1', inputValueName: 'Humidity', sensorKey: 'dht22_hum', operator: '>', threshold: 70, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'dht22-1', type: 'part', position: { x: 380, y: 100 }, data: { partId: 'dht22' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 320 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 320 }, data: { partId: 'led' } },
      ],
      edges: [
        { id: 'e-dht-vcc', source: 'esp32', sourceHandle: '3V3', target: 'dht22-1', targetHandle: 'VCC', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-dht-gnd', source: 'esp32', sourceHandle: 'GND', target: 'dht22-1', targetHandle: 'GND', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-dht-data', source: 'esp32', sourceHandle: 'GPIO4', target: 'dht22-1', targetHandle: 'DATA', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: 'distance-alarm',
    title: 'Ultrasonic Distance & Parking Alarm',
    keywords: ['distance', 'parking', 'ultrasonic', 'obstacle', 'range', 'proximity', 'sonar', 'hcsr04', 'car'],
    summary: 'Calculates object distance using high frequency ultrasound echoes. Warns drivers or robots with pulsed beeps as obstacles get closer.',
    pinsUsage: 'TRIG -> GPIO5, ECHO -> GPIO18, Buzzer -> GPIO4, LED -> GPIO2, Power -> 5V & GND',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Issues microsecond sonic pulses and times return soundwaves.' },
      { partId: 'hcsr04', name: 'HC-SR04 Ultrasonic Sensor', qty: 1, reason: 'Transmits ultrasound bursts and outputs return pulse duration.' },
      { partId: 'buzzer', name: 'Piezo Buzzer', qty: 1, reason: 'Emits proximity warning beeps when obstacles enter danger range.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'Current limiting for visual indicator LED.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Visual red proximity indicator.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'hcsr04-1', inputValueName: 'Distance', sensorKey: 'hcsr04', operator: '<', threshold: 25, outputPartId: 'buzzer-1', outputState: 'ON', targetNodeId: 'buzzer-1', action: 'ON' },
      { id: 'rule-2', inputPartId: 'hcsr04-1', inputValueName: 'Distance', sensorKey: 'hcsr04', operator: '<', threshold: 15, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'hcsr04-1', type: 'part', position: { x: 380, y: 80 }, data: { partId: 'hcsr04' } },
        { id: 'buzzer-1', type: 'part', position: { x: 380, y: 280 }, data: { partId: 'buzzer' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 440 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 440 }, data: { partId: 'led' } },
      ],
      edges: [
        { id: 'e-us-vcc', source: 'esp32', sourceHandle: '5V', target: 'hcsr04-1', targetHandle: 'VCC', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-us-gnd', source: 'esp32', sourceHandle: 'GND', target: 'hcsr04-1', targetHandle: 'GND', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-us-trig', source: 'esp32', sourceHandle: 'GPIO5', target: 'hcsr04-1', targetHandle: 'TRIG', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-us-echo', source: 'esp32', sourceHandle: 'GPIO18', target: 'hcsr04-1', targetHandle: 'ECHO', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gpio', source: 'esp32', sourceHandle: 'GPIO4', target: 'buzzer-1', targetHandle: 'Positive (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gnd', source: 'esp32', sourceHandle: 'GND', target: 'buzzer-1', targetHandle: 'Negative (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: 'button-led-controller',
    title: 'Push Button LED Controller',
    keywords: ['button', 'led', 'toggle', 'switch', 'blink', 'press', 'light', 'pushbutton'],
    summary: 'A classic beginner physical computing project: press the momentary tactile switch to toggle or illuminate an LED safely.',
    pinsUsage: 'Button -> GPIO4 & GND (internal pull-up), LED -> GPIO2 (via 220Ω resistor) & GND',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Reads input pin and controls digital output states.' },
      { partId: 'button', name: 'Push Button', qty: 1, reason: 'User tactile interaction device.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'Limits LED forward current to protect both ESP32 and LED.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Visual light output triggered by button press.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'button-1', inputValueName: 'Button', sensorKey: 'button', operator: 'is pressed', threshold: 1, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'button-1', type: 'part', position: { x: 380, y: 120 }, data: { partId: 'button' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 300 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 300 }, data: { partId: 'led' } },
      ],
      edges: [
        { id: 'e-btn-gpio', source: 'esp32', sourceHandle: 'GPIO4', target: 'button-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-btn-gnd', source: 'esp32', sourceHandle: 'GND', target: 'button-1', targetHandle: 'Pin 2', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: 'analog-dimmer',
    title: 'Analog Potentiometer Dimmer',
    keywords: ['plant', 'moisture', 'light', 'soil', 'potentiometer', 'analog', 'dial', 'knob', 'garden', 'dimmer'],
    summary: 'Reads an adjustable analog voltage divider on ADC1 (GPIO32) and maps the reading to visual output or device thresholds.',
    pinsUsage: 'OUT -> GPIO32 (ADC1), VCC -> 3.3V, GND -> GND, LED -> GPIO2 (via 220Ω resistor)',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Sample 12-bit analog-to-digital converter (0-4095).' },
      { partId: 'potentiometer', name: 'Potentiometer', qty: 1, reason: 'Provides variable voltage input to simulate sensors or control dials.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'Current limiter for the LED output.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Light output that switches or brightens based on potentiometer angle.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'potentiometer-1', inputValueName: 'Potentiometer', sensorKey: 'potentiometer', operator: '>', threshold: 50, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'potentiometer-1', type: 'part', position: { x: 380, y: 100 }, data: { partId: 'potentiometer' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 320 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 320 }, data: { partId: 'led' } },
      ],
      edges: [
        { id: 'e-pot-vcc', source: 'esp32', sourceHandle: '3V3', target: 'potentiometer-1', targetHandle: 'VCC', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-pot-gnd', source: 'esp32', sourceHandle: 'GND', target: 'potentiometer-1', targetHandle: 'GND', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-pot-out', source: 'esp32', sourceHandle: 'GPIO32', target: 'potentiometer-1', targetHandle: 'OUT', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: 'buzzer-security-alarm',
    title: 'High-Pitch Security Alarm Siren',
    keywords: ['alarm', 'buzzer', 'sound', 'beep', 'siren', 'alert', 'intruder', 'security', 'tripwire'],
    summary: 'Security tripwire setup that sounds a loud audible alert and blinks an emergency beacon when triggered by an input.',
    pinsUsage: 'Button -> GPIO4, Buzzer -> GPIO18, LED -> GPIO2 (via 220Ω resistor), Power -> 3.3V & GND',
    recommendedParts: [
      { partId: 'esp32', name: 'ESP32 Board', qty: 1, reason: 'Handles alarm latching logic and tone frequencies.' },
      { partId: 'button', name: 'Push Button', qty: 1, reason: 'Simulates a door contact switch or tripwire trigger.' },
      { partId: 'buzzer', name: 'Piezo Buzzer', qty: 1, reason: 'Loud acoustic sound generator for alarms.' },
      { partId: 'resistor', name: 'Resistor (220Ω)', qty: 1, reason: 'LED current-limiting protection.' },
      { partId: 'led', name: 'LED', qty: 1, reason: 'Visual strobe / warning beacon.' },
    ],
    defaultRules: [
      { id: 'rule-1', inputPartId: 'button-1', inputValueName: 'Button', sensorKey: 'button', operator: 'is pressed', threshold: 1, outputPartId: 'buzzer-1', outputState: 'ON', targetNodeId: 'buzzer-1', action: 'ON' },
      { id: 'rule-2', inputPartId: 'button-1', inputValueName: 'Button', sensorKey: 'button', operator: 'is pressed', threshold: 1, outputPartId: 'led-1', outputState: 'ON', targetNodeId: 'led-1', action: 'ON' },
    ],
    wireTemplate: () => ({
      nodes: [
        { id: 'esp32', type: 'part', position: { x: 60, y: 180 }, data: { partId: 'esp32' } },
        { id: 'button-1', type: 'part', position: { x: 380, y: 90 }, data: { partId: 'button' } },
        { id: 'buzzer-1', type: 'part', position: { x: 380, y: 250 }, data: { partId: 'buzzer' } },
        { id: 'resistor-1', type: 'part', position: { x: 380, y: 410 }, data: { partId: 'resistor' } },
        { id: 'led-1', type: 'part', position: { x: 620, y: 410 }, data: { partId: 'led' } },
      ],
      edges: [
        { id: 'e-btn-gpio', source: 'esp32', sourceHandle: 'GPIO4', target: 'button-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-btn-gnd', source: 'esp32', sourceHandle: 'GND', target: 'button-1', targetHandle: 'Pin 2', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gpio', source: 'esp32', sourceHandle: 'GPIO18', target: 'buzzer-1', targetHandle: 'Positive (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-bz-gnd', source: 'esp32', sourceHandle: 'GND', target: 'buzzer-1', targetHandle: 'Negative (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gpio', source: 'esp32', sourceHandle: 'GPIO2', target: 'resistor-1', targetHandle: 'Pin 1', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-res-led', source: 'resistor-1', sourceHandle: 'Pin 2', target: 'led-1', targetHandle: 'Anode (+)', style: { stroke: '#facc15', strokeWidth: 2 } },
        { id: 'e-led-gnd', source: 'esp32', sourceHandle: 'GND', target: 'led-1', targetHandle: 'Cathode (-)', style: { stroke: '#facc15', strokeWidth: 2 } },
      ],
    }),
  },
]

export function matchProjectTemplate(query = '') {
  if (!query || typeof query !== 'string') {
    return { template: PROJECT_TEMPLATES[0], isFallback: false }
  }

  const normalized = query.toLowerCase()
  let bestMatch = null
  let maxScore = 0

  for (const template of PROJECT_TEMPLATES) {
    let score = 0
    for (const kw of template.keywords) {
      if (normalized.includes(kw)) {
        score += kw.length > 4 ? 2 : 1
      }
    }
    if (score > maxScore) {
      maxScore = score
      bestMatch = template
    }
  }

  if (maxScore > 0 && bestMatch) {
    return { template: bestMatch, isFallback: false }
  }

  return {
    template: null,
    isFallback: true,
    fallbackMessage: `We could not find an exact template for "${query}". Try searching for words like "water", "temperature", "distance", "button", or "alarm" to see guided blueprints!`,
  }
}
