import { PARTS, getGpioNumber } from './parts'
import { UnionFind } from './checks'

/**
 * Checks if a specific component is correctly wired to power, ground, and ESP32 GPIO
 */
export function checkComponentWiring(node, nodes, edges) {
  if (!node) return { isWired: false, reason: 'No node provided' }
  const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
  const part = PARTS[partKey]
  if (!part) return { isWired: false, reason: 'Unknown part' }

  // If this is the ESP32 itself, it's always ready
  if (part.id === 'esp32') {
    return { isWired: true, ready: true }
  }

  // Build nets
  const uf = new UnionFind()
  const connectedPins = new Set()
  edges.forEach((e) => {
    connectedPins.add(`${e.source}:${e.sourceHandle}`)
    connectedPins.add(`${e.target}:${e.targetHandle}`)
    uf.union(`${e.source}:${e.sourceHandle}`, `${e.target}:${e.targetHandle}`, e.id)
  })

  // Get every pin that is in the same net as a given pin of ANY node
  const getNetOf = (nodeId, pinName) => {
    const key = `${nodeId}:${pinName}`
    if (!connectedPins.has(key)) return null
    const root = uf.find(key)
    const pinsInNet = []
    nodes.forEach((n) => {
      const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
      const p = PARTS[pKey]
      if (p?.pins) {
        p.pins.forEach((pn) => {
          const pk = `${n.id}:${pn.name}`
          if (connectedPins.has(pk) && uf.find(pk) === root) {
            pinsInNet.push({ nodeId: n.id, partId: p.id, pinName: pn.name, pinDef: pn })
          }
        })
      }
    })
    return pinsInNet
  }

  // Same as above, but for a pin of the component being checked
  const getNet = (pinName) => getNetOf(node.id, pinName)

  // --- LED ---
  if (part.id === 'led') {
    const anodeNet = getNet('Anode (+)')
    const cathodeNet = getNet('Cathode (-)')
    if (!anodeNet) return { isWired: false, reason: 'Anode (+) is not connected' }
    if (!cathodeNet) return { isWired: false, reason: 'Cathode (-) is not connected' }

    const hasGND = cathodeNet.some((p) => p.pinName === 'GND' || p.pinDef?.type === 'ground')
    if (!hasGND) return { isWired: false, reason: 'Cathode must connect to Ground (GND)' }

    const gpioPin = anodeNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    const hasResistor = anodeNet.some((p) => p.partId === 'resistor')

    return {
      isWired: true,
      gpio: gpioPin?.pinName || (hasResistor ? 'GPIO via Resistor' : 'Connected'),
      hasResistor,
    }
  }

  // --- IR LED (TRANSMITTER) ---
  if (part.id === 'irled') {
    const anodeNet = getNet('Anode (+)')
    const cathodeNet = getNet('Cathode (-)')
    const beamNet = getNet('IR Beam')

    if (!anodeNet) return { isWired: false, reason: 'Anode (+) is not connected' }
    if (!cathodeNet) return { isWired: false, reason: 'Cathode (-) is not connected' }

    const hasGND = cathodeNet.some((p) => p.pinName === 'GND' || p.pinDef?.type === 'ground')
    if (!hasGND) return { isWired: false, reason: 'Cathode must connect to Ground (GND)' }

    // The IR LED needs a resistor between the ESP32 GPIO and the Anode
    const resistorPin = anodeNet.find((p) => p.partId === 'resistor')
    if (!resistorPin) {
      return { isWired: false, reason: 'Add a 220Ω resistor between an ESP32 GPIO and the IR LED Anode (+)' }
    }

    // Follow the resistor to its other pin to find the GPIO
    const otherPin = resistorPin.pinName === 'Pin 1' ? 'Pin 2' : 'Pin 1'
    const resistorOtherNet = getNetOf(resistorPin.nodeId, otherPin)
    const gpioPin = resistorOtherNet?.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    if (!gpioPin) return { isWired: false, reason: 'The resistor must connect to an ESP32 GPIO pin' }

    if (!beamNet) return { isWired: false, reason: 'IR Beam must be connected to the projector IR Sensor' }
    const projectorPin = beamNet.find((p) => p.partId === 'projector')
    if (!projectorPin) return { isWired: false, reason: 'IR Beam must point at the projector IR Sensor' }

    return {
      isWired: true,
      gpio: gpioPin.pinName,
      hasResistor: true,
      projectorNodeId: projectorPin.nodeId,
    }
  }

  // --- IR RECEIVER (VS1838B) ---
  if (part.id === 'irreceiver') {
    const outNet = getNet('OUT')
    const gndNet = getNet('GND')
    const vccNet = getNet('VCC')

    if (!vccNet) return { isWired: false, reason: 'Missing VCC power connection (3.3V)' }
    if (!gndNet) return { isWired: false, reason: 'Missing Ground connection (GND)' }
    if (!outNet) return { isWired: false, reason: 'Missing OUT connection to an ESP32 GPIO' }

    const hasPower = vccNet.some((p) => p.pinName === '3V3' || p.pinName === '5V')
    const hasGND = gndNet.some((p) => p.pinName === 'GND')
    const gpioPin = outNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')

    if (!hasPower) return { isWired: false, reason: 'VCC must connect to 3.3V or 5V' }
    if (!hasGND) return { isWired: false, reason: 'GND must connect to Ground' }
    if (!gpioPin) return { isWired: false, reason: 'OUT must connect to an ESP32 GPIO' }

    return { isWired: true, gpio: gpioPin.pinName }
  }

  // --- LCD PROJECTOR ---
  if (part.id === 'projector') {
    const sensorNet = getNet('IR Sensor')
    if (!sensorNet) return { isWired: false, reason: 'IR Sensor is not connected to an IR LED' }

    const beamPin = sensorNet.find((p) => p.partId === 'irled' && p.pinName === 'IR Beam')
    if (!beamPin) return { isWired: false, reason: 'IR Sensor must receive the IR Beam from an IR LED' }

    // The projector only works if the IR LED feeding it is wired correctly too
    const ledNode = nodes.find((n) => n.id === beamPin.nodeId)
    const ledStatus = checkComponentWiring(ledNode, nodes, edges)
    if (!ledStatus.isWired) {
      return { isWired: false, reason: `IR LED problem: ${ledStatus.reason}` }
    }

    return { isWired: true, gpio: ledStatus.gpio, irLedNodeId: beamPin.nodeId }
  }

  // --- BUZZER ---
  if (part.id === 'buzzer') {
    const posNet = getNet('Positive (+)')
    const negNet = getNet('Negative (-)')
    if (!posNet) return { isWired: false, reason: 'Positive (+) is not connected' }
    if (!negNet) return { isWired: false, reason: 'Negative (-) is not connected' }

    const hasGND = negNet.some((p) => p.pinName === 'GND')
    const gpioPin = posNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    if (!hasGND) return { isWired: false, reason: 'Negative (-) must connect to Ground' }
    if (!gpioPin) return { isWired: false, reason: 'Positive (+) must connect to an ESP32 GPIO' }

    return { isWired: true, gpio: gpioPin.pinName }
  }

  // --- BUTTON ---
  if (part.id === 'button') {
    const p1Net = getNet('Pin 1')
    const p2Net = getNet('Pin 2')
    if (!p1Net || !p2Net) return { isWired: false, reason: 'Both pins must be connected' }

    const gpioPin = (p1Net.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio') ||
                     p2Net.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio'))
    const hasGND = (p1Net.some((p) => p.pinName === 'GND') || p2Net.some((p) => p.pinName === 'GND'))

    if (!gpioPin) return { isWired: false, reason: 'One pin must connect to an ESP32 GPIO' }
    if (!hasGND) return { isWired: false, reason: 'One pin must connect to Ground (GND)' }

    return { isWired: true, gpio: gpioPin.pinName }
  }

  // --- DHT22 ---
  if (part.id === 'dht22') {
    const vccNet = getNet('VCC')
    const gndNet = getNet('GND')
    const dataNet = getNet('DATA')

    if (!vccNet) return { isWired: false, reason: 'Missing VCC power connection (3.3V)' }
    if (!gndNet) return { isWired: false, reason: 'Missing Ground connection (GND)' }
    if (!dataNet) return { isWired: false, reason: 'Missing DATA connection to GPIO' }

    const hasPower = vccNet.some((p) => p.pinName === '3V3' || p.pinName === '5V')
    const hasGND = gndNet.some((p) => p.pinName === 'GND')
    const gpioPin = dataNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')

    if (!hasPower) return { isWired: false, reason: 'VCC must connect to 3.3V or 5V' }
    if (!hasGND) return { isWired: false, reason: 'GND must connect to Ground' }
    if (!gpioPin) return { isWired: false, reason: 'DATA must connect to an ESP32 GPIO' }

    return { isWired: true, gpio: gpioPin.pinName }
  }

  // --- HC-SR04 ---
  if (part.id === 'hcsr04') {
    const vccNet = getNet('VCC')
    const gndNet = getNet('GND')
    const trigNet = getNet('TRIG')
    const echoNet = getNet('ECHO')

    if (!vccNet || !gndNet || !trigNet || !echoNet) {
      return { isWired: false, reason: 'HC-SR04 requires VCC, GND, TRIG, and ECHO to be wired' }
    }

    const trigGpio = trigNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    const echoGpio = echoNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')

    if (!trigGpio) return { isWired: false, reason: 'TRIG must connect to an ESP32 GPIO' }
    if (!echoGpio) return { isWired: false, reason: 'ECHO must connect to an ESP32 GPIO' }

    return { isWired: true, trigGpio: trigGpio.pinName, echoGpio: echoGpio.pinName }
  }

  // --- POTENTIOMETER ---
  if (part.id === 'potentiometer') {
    const vccNet = getNet('VCC')
    const gndNet = getNet('GND')
    const outNet = getNet('OUT')

    if (!vccNet) return { isWired: false, reason: 'Missing VCC connection' }
    if (!gndNet) return { isWired: false, reason: 'Missing GND connection' }
    if (!outNet) return { isWired: false, reason: 'Missing OUT signal connection' }

    const espGpio = outNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    if (!espGpio) return { isWired: false, reason: 'OUT must connect to an ADC1 GPIO pin (32-35)' }

    return { isWired: true, gpio: espGpio.pinName }
  }

  // --- WATER LEVEL SENSOR ---
  if (part.id === 'waterlevel') {
    const vccNet = getNet('VCC')
    const gndNet = getNet('GND')
    const sigNet = getNet('SIG')

    if (!vccNet) return { isWired: false, reason: 'Missing VCC power connection' }
    if (!gndNet) return { isWired: false, reason: 'Missing GND connection' }
    if (!sigNet) return { isWired: false, reason: 'Missing SIG connection' }

    const espGpio = sigNet.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
    if (!espGpio) return { isWired: false, reason: 'SIG must connect to an ADC1 GPIO pin (32-35)' }

    return { isWired: true, gpio: espGpio.pinName }
  }

  // --- RESISTOR ---
  if (part.id === 'resistor') {
    const p1 = getNet('Pin 1')
    const p2 = getNet('Pin 2')
    return { isWired: Boolean(p1 && p2), reason: p1 && p2 ? '' : 'Both resistor pins must be in circuit' }
  }

  return { isWired: true }
}

/**
 * Evaluates logic rules against current sensor values and components status.
 * Supports button (pressed), potentiometer, DHT22 (temp & hum), HC-SR04, and waterlevel.
 */
export function evaluateLogicRules(rules = [], sensorValues = {}, componentStatuses = {}) {
  const outputs = {} // nodeId -> boolean (true = ON)

  rules.forEach((rule) => {
    const targetNodeId = rule.outputPartId || rule.targetNodeId
    if (!targetNodeId) return

    // Verify target output is properly wired
    const targetStatus = componentStatuses[targetNodeId]
    if (!targetStatus || !targetStatus.isWired) {
      outputs[targetNodeId] = false
      return
    }

    // Resolve current sensor value based on sensorKey or inputValueName
    const key = rule.sensorKey || ''
    const valName = rule.inputValueName || ''
    let currentVal = sensorValues[key]

    if (currentVal === undefined) {
      if (valName.toLowerCase().includes('temp') || key.includes('temp')) {
        currentVal = sensorValues.dht22_temp ?? 25
      } else if (valName.toLowerCase().includes('hum') || key.includes('hum')) {
        currentVal = sensorValues.dht22_hum ?? 50
      } else if (valName.toLowerCase().includes('dist') || key.includes('hcsr04')) {
        currentVal = sensorValues.hcsr04 ?? 100
      } else if (valName.toLowerCase().includes('water') || key.includes('waterlevel')) {
        currentVal = sensorValues.waterlevel ?? 0
      } else if (valName.toLowerCase().includes('pot') || key.includes('potentiometer')) {
        currentVal = sensorValues.potentiometer ?? 0
      } else if (valName.toLowerCase().includes('button') || key.includes('button')) {
        currentVal = sensorValues.button ?? 0
      } else {
        currentVal = 0
      }
    }

    let conditionMet = false
    const op = rule.operator
    const threshold = rule.threshold

    // Button handling
    if (key === 'button' || valName.toLowerCase().includes('button') || op === 'is pressed') {
      const isPressed = Boolean(sensorValues.button === 1 || currentVal === 1)
      if (op === 'is pressed') {
        conditionMet = isPressed
      } else if (op === '==' || op === '=') {
        conditionMet = Boolean(currentVal) === Boolean(threshold)
      } else {
        conditionMet = isPressed
      }
    } else {
      // Numeric comparisons for analog and sensor values
      if (op === '>') {
        conditionMet = currentVal > threshold
      } else if (op === '<') {
        conditionMet = currentVal < threshold
      } else if (op === '==' || op === '=') {
        conditionMet = currentVal === threshold
      }
    }

    const action = rule.outputState || rule.action || 'ON'
    if (conditionMet) {
      outputs[targetNodeId] = action === 'ON'
    } else if (outputs[targetNodeId] === undefined) {
      outputs[targetNodeId] = false
    }
  })

  return outputs
}