export const PARTS = {
  esp32: {
    id: 'esp32',
    name: 'ESP32 Board',
    color: '#0284c7',
    description: 'A powerful microcontroller board with Wi-Fi and Bluetooth for IoT and embedded electronic projects.',
    typicalUses: 'IoT controllers, smart home devices, robotics, wireless data logging',
    operatingVoltage: '3.3V',
    pins: [
      { name: '3V3', side: 'right', type: 'power', voltage: '3.3V' },
      { name: '5V', side: 'right', type: 'power', voltage: '5V' },
      { name: 'GND', side: 'right', type: 'ground', voltage: '0V' },
      { name: 'GPIO2', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 2, adcChannel: 'ADC2' },
      { name: 'GPIO4', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 4, adcChannel: 'ADC2' },
      { name: 'GPIO5', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 5 },
      { name: 'GPIO18', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 18 },
      { name: 'GPIO21', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 21 },
      { name: 'GPIO22', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 22 },
      { name: 'GPIO32', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 32, adcChannel: 'ADC1' },
      { name: 'GPIO33', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 33, adcChannel: 'ADC1' },
      { name: 'GPIO34', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 34, adcChannel: 'ADC1', inputOnly: true },
      { name: 'GPIO35', side: 'right', type: 'gpio', voltage: '3.3V logic', gpioNumber: 35, adcChannel: 'ADC1', inputOnly: true },
    ],
  },
  led: {
    id: 'led',
    name: 'LED',
    color: '#dc2626',
    description: 'A semiconductor diode that illuminates when electric current flows from anode to cathode.',
    typicalUses: 'Status indicators, visual feedback, debugging outputs',
    operatingVoltage: '2.0V - 3.2V',
    pins: [
      { name: 'Anode (+)', side: 'left', type: 'signal', voltage: '2.0V - 3.2V' },
      { name: 'Cathode (-)', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  resistor: {
    id: 'resistor',
    name: 'Resistor (220Ω)',
    color: '#d97706',
    description: 'A passive component that limits current flow to protect sensitive components like LEDs from burnout.',
    typicalUses: 'Current limiting for LEDs, voltage dividers, pull-up and pull-down circuits',
    operatingVoltage: 'Passive',
    pins: [
      { name: 'Pin 1', side: 'left', type: 'signal', voltage: 'Passive' },
      { name: 'Pin 2', side: 'right', type: 'signal', voltage: 'Passive' },
    ],
  },
  button: {
    id: 'button',
    name: 'Push Button',
    color: '#16a34a',
    description: 'A momentary tactile switch that connects two circuit contacts while pressed down.',
    typicalUses: 'User input triggers, reset switches, interactive controls',
    operatingVoltage: 'Up to 5V',
    pins: [
      { name: 'Pin 1', side: 'left', type: 'signal', voltage: '3.3V / 5V' },
      { name: 'Pin 2', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  dht22: {
    id: 'dht22',
    name: 'DHT22 Sensor',
    color: '#0d9488',
    description: 'A calibrated digital sensor that measures ambient air temperature and relative humidity.',
    typicalUses: 'Weather stations, climate monitoring, HVAC environment controls',
    operatingVoltage: '3.3V to 5V',
    pins: [
      { name: 'VCC', side: 'left', type: 'power', voltage: '3.3V to 5V' },
      { name: 'DATA', side: 'left', type: 'signal', voltage: '3.3V logic' },
      { name: 'GND', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  hcsr04: {
    id: 'hcsr04',
    name: 'HC-SR04 Ultrasonic Sensor',
    color: '#4f46e5',
    description: 'An ultrasonic sensor that measures distance to objects by transmitting sound waves and timing the echo.',
    typicalUses: 'Obstacle avoidance for robots, distance measurement, presence detection',
    operatingVoltage: '5V',
    pins: [
      { name: 'VCC', side: 'left', type: 'power', voltage: '5V' },
      { name: 'TRIG', side: 'left', type: 'signal', voltage: '3.3V ok' },
      { name: 'ECHO', side: 'left', type: 'signal', voltage: 'outputs 5V' },
      { name: 'GND', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  potentiometer: {
    id: 'potentiometer',
    name: 'Potentiometer',
    color: '#9333ea',
    description: 'A three-terminal variable resistor providing an adjustable analog voltage based on dial position.',
    typicalUses: 'Volume knobs, dimmer controls, analog parameter tuning',
    operatingVoltage: '3.3V to 5V',
    pins: [
      { name: 'VCC', side: 'left', type: 'power', voltage: '3.3V to 5V' },
      { name: 'OUT', side: 'left', type: 'signal', voltage: '0V to 3.3V / 5V' },
      { name: 'GND', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  waterlevel: {
    id: 'waterlevel',
    name: 'Water Level Sensor',
    color: '#06b6d4',
    description: 'An analog sensor that detects water depth through exposed parallel conductor traces.',
    typicalUses: 'Water level monitoring, reservoir alerts, flood sensors, sump pump automation',
    operatingVoltage: '3.3V - 5V',
    pins: [
      { name: 'VCC', side: 'left', type: 'power', voltage: '3.3V' },
      { name: 'SIG', side: 'left', type: 'signal', voltage: '0V - 3.3V' },
      { name: 'GND', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  buzzer: {
    id: 'buzzer',
    name: 'Piezo Buzzer',
    color: '#ea580c',
    description: 'An acoustic transducer that produces sound or beeps when driven by an electrical voltage signal.',
    typicalUses: 'Audible alarm alerts, button press beeps, simple tone synthesis',
    operatingVoltage: '3.3V to 5V',
    pins: [
      { name: 'Positive (+)', side: 'left', type: 'signal', voltage: '3.3V to 5V' },
      { name: 'Negative (-)', side: 'left', type: 'ground', voltage: '0V' },
    ],
  },
  irled: {
    id: 'irled',
    name: 'IR LED (Transmitter)',
    color: '#7c2d12',
    description: 'An infrared LED that sends invisible light pulses. Remote controls use it to send commands to TVs and projectors.',
    typicalUses: 'Universal remotes, projector and TV control, IR communication',
    operatingVoltage: '1.2V - 1.6V (use a resistor)',
    pins: [
      { name: 'Anode (+)', side: 'left', type: 'signal', voltage: '1.2V - 1.6V' },
      { name: 'Cathode (-)', side: 'left', type: 'ground', voltage: '0V' },
      { name: 'IR Beam', side: 'right', type: 'signal', voltage: 'Infrared light' },
    ],
  },
  irreceiver: {
    id: 'irreceiver',
    name: 'IR Receiver (VS1838B)',
    color: '#475569',
    description: 'A sensor that detects infrared remote signals and outputs them as digital pulses. Used to capture codes from an original remote.',
    typicalUses: 'Learning remote codes, receiving IR commands, remote-controlled devices',
    operatingVoltage: '3.3V to 5V',
    pins: [
      { name: 'OUT', side: 'left', type: 'signal', voltage: '3.3V logic' },
      { name: 'GND', side: 'left', type: 'ground', voltage: '0V' },
      { name: 'VCC', side: 'left', type: 'power', voltage: '3.3V to 5V' },
    ],
  },
  projector: {
    id: 'projector',
    name: 'LCD Projector',
    color: '#1e293b',
    description: 'A virtual LCD projector with a built-in IR sensor. It reacts to supported IR codes such as Power, Input and Volume.',
    typicalUses: 'Classrooms, presentations, smart-classroom control projects',
    operatingVoltage: 'Mains powered (simulated)',
    pins: [
      { name: 'IR Sensor', side: 'left', type: 'signal', voltage: 'Infrared light' },
    ],
  },
}

export const GPIO_NUMBERS = {
  GPIO2: 2,
  GPIO4: 4,
  GPIO5: 5,
  GPIO18: 18,
  GPIO21: 21,
  GPIO22: 22,
  GPIO32: 32,
  GPIO33: 33,
  GPIO34: 34,
  GPIO35: 35,
}

export function getGpioNumber(pinName) {
  if (!pinName) return null
  if (GPIO_NUMBERS[pinName] !== undefined) {
    return GPIO_NUMBERS[pinName]
  }
  const match = pinName.match(/GPIO(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

export default PARTS