import { PARTS, getGpioNumber } from './parts'

/**
 * Union-Find implementation for grouping circuit pins into electrical nets
 */
export class UnionFind {
  constructor() {
    this.parent = new Map()
    this.edgeMap = new Map() // root -> Set of edgeIds
  }

  find(item) {
    if (!this.parent.has(item)) {
      this.parent.set(item, item)
      this.edgeMap.set(item, new Set())
      return item
    }
    if (this.parent.get(item) !== item) {
      this.parent.set(item, this.find(this.parent.get(item)))
    }
    return this.parent.get(item)
  }

  union(a, b, edgeId) {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA)
      const setA = this.edgeMap.get(rootA) || new Set()
      const setB = this.edgeMap.get(rootB) || new Set()
      if (edgeId) setA.add(edgeId)
      for (const id of setB) setA.add(id)
      this.edgeMap.set(rootA, setA)
    } else if (edgeId) {
      const setA = this.edgeMap.get(rootA) || new Set()
      setA.add(edgeId)
      this.edgeMap.set(rootA, setA)
    }
  }

  getEdgesForNet(root) {
    return Array.from(this.edgeMap.get(this.find(root)) || [])
  }
}

/**
 * Analyzes a circuit given nodes and edges, returning a list of issues
 * sorted by severity (error -> warning -> info -> ok)
 */
export function analyzeCircuit(nodes = [], edges = []) {
  const issues = []
  let issueCounter = 1

  const addIssue = (level, title, fix, edgeIds = []) => {
    issues.push({
      id: `issue-${issueCounter++}`,
      level, // 'error' | 'warning' | 'info' | 'ok'
      title,
      fix,
      edgeIds: Array.isArray(edgeIds) ? edgeIds : [edgeIds],
    })
  }

  if (!nodes || nodes.length === 0) {
    return issues
  }

  // 1. Build pin index and Node lookup
  const nodeMap = new Map()
  const pinLookup = new Map() // key: 'nodeId:pinName' -> { nodeId, pinName, node, part, pinDef }
  const connectedPins = new Set()
  const connectedNodes = new Set()

  nodes.forEach((node) => {
    nodeMap.set(node.id, node)
    const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
    const part = PARTS[partKey] || PARTS.esp32
    if (part && part.pins) {
      part.pins.forEach((pin) => {
        const key = `${node.id}:${pin.name}`
        pinLookup.set(key, {
          nodeId: node.id,
          pinName: pin.name,
          node,
          part,
          partId: part.id,
          pinDef: pin,
        })
      })
    }
  })

  // 2. Build nets with Union-Find
  const uf = new UnionFind()

  // Track same-part wires directly
  edges.forEach((edge) => {
    connectedPins.add(`${edge.source}:${edge.sourceHandle}`)
    connectedPins.add(`${edge.target}:${edge.targetHandle}`)
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)

    // Rule: Wire between two pins of the same part (error)
    if (edge.source === edge.target) {
      const node = nodeMap.get(edge.source)
      const partKey = node?.data?.partId || edge.source.split('-')[0]
      const partName = PARTS[partKey]?.name || 'Component'
      addIssue(
        'error',
        `Self-loop: Wire between two pins on the same part (${partName})`,
        `A wire connects '${edge.sourceHandle}' and '${edge.targetHandle}' on the same component (${edge.source}). Disconnect this wire to avoid looping pins together.`,
        [edge.id]
      )
    }

    const sourceKey = `${edge.source}:${edge.sourceHandle}`
    const targetKey = `${edge.target}:${edge.targetHandle}`
    uf.union(sourceKey, targetKey, edge.id)
  })

  // Group pins by net root
  const nets = new Map() // root -> { root, pins: [], edgeIds: [] }
  pinLookup.forEach((pinInfo, pinKey) => {
    if (connectedPins.has(pinKey)) {
      const root = uf.find(pinKey)
      if (!nets.has(root)) {
        nets.set(root, {
          root,
          pins: [],
          edgeIds: uf.getEdgesForNet(root),
        })
      }
      nets.get(root).pins.push(pinInfo)
    }
  })

  const getNetForPin = (nodeId, pinName) => {
    const key = `${nodeId}:${pinName}`
    if (!connectedPins.has(key)) return null
    return nets.get(uf.find(key))
  }

  // 3. Rule: Check completely disconnected parts
  nodes.forEach((node) => {
    if (!connectedNodes.has(node.id)) {
      const partKey = node.data?.partId || node.id.split('-')[0]
      const part = PARTS[partKey] || PARTS.esp32
      addIssue(
        'warning',
        `${part.name} (${node.id}) is not connected yet`,
        `Connect its pins to the ESP32 or companion components using wires.`,
        []
      )
    }
  })

  // 4. Net-level electrical rules
  nets.forEach((net) => {
    const espPins = net.pins.filter((p) => p.partId === 'esp32')
    const has3V3 = espPins.some((p) => p.pinName === '3V3')
    const has5V = espPins.some((p) => p.pinName === '5V')
    const hasGND = espPins.some((p) => p.pinName === 'GND')
    const hasPower = has3V3 || has5V || net.pins.some((p) => p.pinDef?.type === 'power')
    const hasGround = hasGND || net.pins.some((p) => p.pinDef?.type === 'ground')

    // Rule: ESP32 3V3 / 5V and GND in the same net (Short Circuit Error)
    if ((has3V3 || has5V) && hasGND) {
      const rail = has3V3 ? '3.3V' : '5V'
      addIssue(
        'error',
        `Critical Short Circuit: ESP32 ${rail} and GND in same net`,
        `Power (${rail}) is directly shorted to Ground (GND). This will draw infinite current and burn out your ESP32 board or USB port. Remove the shorting wire immediately!`,
        net.edgeIds
      )
    } else if (hasPower && hasGround) {
      // General VCC to GND short
      addIssue(
        'error',
        `Power and Ground Short Circuit`,
        `A power rail pin (VCC/3V3/5V) and a Ground pin (GND) are sharing the same electrical net. Remove the wire connecting them.`,
        net.edgeIds
      )
    }

    // Rule: Two different ESP32 pins in one net (error)
    if (espPins.length >= 2) {
      const names = espPins.map((p) => p.pinName).join(' and ')
      // Avoid duplicate report if already reported as 3V3/GND short
      if (!((has3V3 || has5V) && hasGND)) {
        addIssue(
          'error',
          `Clashing ESP32 Pins: ${names} connected together`,
          `Two or more pins on the ESP32 are directly connected to each other (${names}). This can cause pin contention or high current on output drivers.`,
          net.edgeIds
        )
      }
    }

    // Rule: Any signal pin in a net with 3V3 or GND (error)
    // Applies to active sensor signals like DHT22 DATA, Potentiometer OUT, Water Level SIG, HC-SR04 TRIG/ECHO
    const activeSensors = ['dht22', 'potentiometer', 'waterlevel', 'hcsr04']
    net.pins.forEach((pin) => {
      if (activeSensors.includes(pin.partId) && pin.pinDef?.type === 'signal') {
        if (hasGND) {
          addIssue(
            'error',
            `Sensor signal shorted to Ground: ${pin.part.name} ${pin.pinName}`,
            `The ${pin.pinName} pin on ${pin.part.name} is wired to Ground. It must be connected to an ESP32 GPIO pin to read sensor data.`,
            net.edgeIds
          )
        } else if (has3V3 || has5V) {
          addIssue(
            'error',
            `Sensor signal shorted to Power: ${pin.part.name} ${pin.pinName}`,
            `The ${pin.pinName} pin on ${pin.part.name} is wired to a power rail. It must be connected to an ESP32 GPIO pin for software reading.`,
            net.edgeIds
          )
        }
      }
    })
  })

  // 5. Component-specific rules
  nodes.forEach((node) => {
    const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
    const part = PARTS[partKey]
    if (!part) return

    // --- LED RULES ---
    if (part.id === 'led') {
      const anodeNet = getNetForPin(node.id, 'Anode (+)')
      const cathodeNet = getNetForPin(node.id, 'Cathode (-)')

      if (!anodeNet && cathodeNet) {
        addIssue(
          'warning',
          `${node.id}: LED Anode (+) is unconnected`,
          `The Anode (+) pin of the LED needs to connect to an ESP32 GPIO pin through a 220Ω resistor.`,
          cathodeNet.edgeIds
        )
      } else if (anodeNet && !cathodeNet) {
        addIssue(
          'warning',
          `${node.id}: LED Cathode (-) is unconnected`,
          `The Cathode (-) pin of the LED must connect to an ESP32 GND pin to complete the circuit.`,
          anodeNet.edgeIds
        )
      } else if (anodeNet && cathodeNet) {
        // Polarity checks
        const anodeHasGND = anodeNet.pins.some((p) => p.pinDef?.type === 'ground' || p.pinName === 'GND')
        const cathodeHasGPIO = cathodeNet.pins.some((p) => p.pinDef?.type === 'gpio')
        const cathodeHasPower = cathodeNet.pins.some((p) => p.pinDef?.type === 'power' || p.pinName === '3V3' || p.pinName === '5V')

        if (anodeHasGND) {
          addIssue(
            'error',
            `${node.id}: Reversed LED Polarity (Anode on GND)`,
            `LED Anode (+) is wired to Ground (GND). Anodes must receive positive voltage; current cannot flow backward through an LED.`,
            anodeNet.edgeIds
          )
        }
        if (cathodeHasGPIO || cathodeHasPower) {
          addIssue(
            'error',
            `${node.id}: Reversed LED Polarity (Cathode on High/GPIO)`,
            `LED Cathode (-) is wired to a GPIO or Power rail. Cathodes must connect to Ground (GND).`,
            cathodeNet.edgeIds
          )
        }

        // Current-limiting resistor check: does Anode net connect directly to an ESP32 GPIO?
        const anodeHasDirectGPIO = anodeNet.pins.some((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
        const anodeHasResistor = anodeNet.pins.some((p) => p.partId === 'resistor')

        if (anodeHasDirectGPIO && !anodeHasResistor) {
          addIssue(
            'warning',
            `${node.id}: LED connected to GPIO without a current-limiting resistor`,
            `LEDs have virtually zero internal resistance. Connecting an LED directly to an ESP32 GPIO will draw excess current and may destroy the GPIO pin or the LED. Place a 220Ω resistor in series!`,
            anodeNet.edgeIds
          )
        } else if (anodeHasResistor && !anodeHasGND && !cathodeHasGPIO && !cathodeHasPower) {
          addIssue(
            'ok',
            `${node.id}: LED wired correctly with current-limiting resistor`,
            `Anode connects through a resistor and Cathode connects to Ground.`
          )
        }
      }
    }

    // --- BUTTON RULES ---
    if (part.id === 'button') {
      const pin1Net = getNetForPin(node.id, 'Pin 1')
      const pin2Net = getNetForPin(node.id, 'Pin 2')

      if ((pin1Net && !pin2Net) || (!pin1Net && pin2Net)) {
        addIssue(
          'warning',
          `${node.id}: Push button has only one pin wired`,
          `A button is a switch: one pin must go to an ESP32 GPIO and the other to GND.`,
          (pin1Net || pin2Net).edgeIds
        )
      } else if (pin1Net && pin2Net) {
        const net1HasGPIO = pin1Net.pins.some((p) => p.pinDef?.type === 'gpio')
        const net1HasGND = pin1Net.pins.some((p) => p.pinName === 'GND')
        const net1Has3V3 = pin1Net.pins.some((p) => p.pinName === '3V3')

        const net2HasGPIO = pin2Net.pins.some((p) => p.pinDef?.type === 'gpio')
        const net2HasGND = pin2Net.pins.some((p) => p.pinName === 'GND')
        const net2Has3V3 = pin2Net.pins.some((p) => p.pinName === '3V3')

        const hasGPIO = net1HasGPIO || net2HasGPIO
        const hasGND = net1HasGND || net2HasGND
        const has3V3 = net1Has3V3 || net2Has3V3

        if (hasGPIO && hasGND) {
          addIssue(
            'ok',
            `${node.id}: Button correctly wired to GPIO and GND`,
            `Uses active-low logic compatible with ESP32 internal pull-up resistors (pinMode INPUT_PULLUP).`
          )
        } else if (hasGPIO && has3V3) {
          addIssue(
            'warning',
            `${node.id}: Button wired to 3.3V instead of GND`,
            `Wiring to 3.3V requires an external pull-down resistor to prevent floating. Connecting between GPIO and GND is cleaner because the ESP32 has built-in pull-up resistors.`,
            [...pin1Net.edgeIds, ...pin2Net.edgeIds]
          )
        }
      }
    }

    // --- BUZZER RULES ---
    if (part.id === 'buzzer') {
      const posNet = getNetForPin(node.id, 'Positive (+)')
      const negNet = getNetForPin(node.id, 'Negative (-)')

      if (posNet && negNet) {
        const posHasGPIO = posNet.pins.some((p) => p.pinDef?.type === 'gpio')
        const posHasGND = posNet.pins.some((p) => p.pinName === 'GND')
        const negHasGND = negNet.pins.some((p) => p.pinName === 'GND')
        const negHasGPIO = negNet.pins.some((p) => p.pinDef?.type === 'gpio')

        if (posHasGND) {
          addIssue(
            'error',
            `${node.id}: Buzzer Positive (+) wired to Ground`,
            `The Positive (+) pin of the buzzer must connect to an ESP32 GPIO pin for tone generation.`,
            posNet.edgeIds
          )
        }
        if (negHasGPIO) {
          addIssue(
            'error',
            `${node.id}: Buzzer Negative (-) wired to GPIO`,
            `The Negative (-) pin of the buzzer should connect directly to Ground (GND).`,
            negNet.edgeIds
          )
        }
        if (posHasGPIO && negHasGND) {
          addIssue(
            'ok',
            `${node.id}: Buzzer correctly wired to GPIO and GND`,
            `Positive (+) on GPIO and Negative (-) on GND ready for tone / alarm output.`
          )
        }
      } else if (posNet || negNet) {
        addIssue(
          'warning',
          `${node.id}: Buzzer is only partially connected`,
          `Buzzer requires both Positive (+) on a GPIO and Negative (-) on GND.`,
          (posNet || negNet).edgeIds
        )
      }
    }

    // --- DHT22 SENSOR RULES ---
    if (part.id === 'dht22') {
      const vccNet = getNetForPin(node.id, 'VCC')
      const dataNet = getNetForPin(node.id, 'DATA')
      const gndNet = getNetForPin(node.id, 'GND')

      const vccOk = vccNet && vccNet.pins.some((p) => p.pinName === '3V3' || p.pinName === '5V')
      const gndOk = gndNet && gndNet.pins.some((p) => p.pinName === 'GND')
      const dataGpio = dataNet && dataNet.pins.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')

      if (vccOk && gndOk && dataGpio) {
        addIssue(
          'ok',
          `${node.id}: DHT22 Sensor correctly wired to ${dataGpio.pinName}`,
          `VCC is on power, GND on ground, and DATA is connected to ${dataGpio.pinName}.`
        )
      } else {
        if (!vccOk && (dataNet || gndNet)) {
          addIssue(
            'warning',
            `${node.id}: DHT22 VCC must connect to 3.3V or 5V`,
            `Connect the DHT22 VCC pin to an ESP32 3.3V or 5V power pin.`,
            vccNet ? vccNet.edgeIds : []
          )
        }
        if (!gndOk && (vccNet || dataNet)) {
          addIssue(
            'warning',
            `${node.id}: DHT22 GND must connect to Ground`,
            `Connect the DHT22 GND pin to an ESP32 GND pin.`,
            gndNet ? gndNet.edgeIds : []
          )
        }
        if (!dataGpio && (vccNet || gndNet)) {
          addIssue(
            'warning',
            `${node.id}: DHT22 DATA must connect to an ESP32 GPIO pin`,
            `Connect the DATA pin to a digital GPIO pin (such as GPIO4 or GPIO5) to read temperature and humidity.`,
            dataNet ? dataNet.edgeIds : []
          )
        }
      }
    }

    // --- POTENTIOMETER & WATER LEVEL SENSOR (ADC1 checks) ---
    if (part.id === 'potentiometer' || part.id === 'waterlevel') {
      const sigPinName = part.id === 'potentiometer' ? 'OUT' : 'SIG'
      const sigNet = getNetForPin(node.id, sigPinName)
      const vccNet = getNetForPin(node.id, 'VCC')
      const gndNet = getNetForPin(node.id, 'GND')

      if (sigNet) {
        const espGpio = sigNet.pins.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
        if (espGpio) {
          const pinName = espGpio.pinName
          // Rule: error on GPIO5, 18, 21, 22 (no analog input)
          if (['GPIO5', 'GPIO18', 'GPIO21', 'GPIO22'].includes(pinName)) {
            addIssue(
              'error',
              `${node.id}: ${part.name} connected to ${pinName} (No Analog ADC)`,
              `${pinName} does not support analog input (ADC) on the ESP32. Move signal wire to an ADC1 pin (GPIO32, GPIO33, GPIO34, or GPIO35).`,
              sigNet.edgeIds
            )
          } else if (['GPIO2', 'GPIO4'].includes(pinName)) {
            // Rule: warning on GPIO2 or GPIO4 (ADC2 does not work with WiFi)
            addIssue(
              'warning',
              `${node.id}: ${part.name} on ${pinName} (ADC2 Wi-Fi conflict)`,
              `${pinName} is on ADC2, which is disabled whenever ESP32 Wi-Fi is active. Use ADC1 pins (GPIO32, GPIO33, GPIO34, or GPIO35) for reliable readings.`,
              sigNet.edgeIds
            )
          } else if (['GPIO32', 'GPIO33', 'GPIO34', 'GPIO35'].includes(pinName)) {
            addIssue(
              'ok',
              `${node.id}: ${part.name} correctly wired to ADC1 pin (${pinName})`,
              `Connected to a dedicated ADC1 analog input channel that functions even with Wi-Fi enabled.`
            )
          }
        }
      }

      if ((vccNet || gndNet || sigNet) && (!vccNet || !gndNet)) {
        addIssue(
          'warning',
          `${node.id}: ${part.name} missing power or ground`,
          `Ensure VCC is connected to 3.3V and GND is connected to Ground for proper voltage divider operation.`,
          (vccNet || gndNet || sigNet).edgeIds
        )
      }
    }

    // --- HC-SR04 ULTRASONIC SENSOR RULES ---
    if (part.id === 'hcsr04') {
      const vccNet = getNetForPin(node.id, 'VCC')
      const trigNet = getNetForPin(node.id, 'TRIG')
      const echoNet = getNetForPin(node.id, 'ECHO')
      const gndNet = getNetForPin(node.id, 'GND')

      if (vccNet) {
        const has5V = vccNet.pins.some((p) => p.pinName === '5V')
        const has3V3 = vccNet.pins.some((p) => p.pinName === '3V3')
        if (has3V3 && !has5V) {
          addIssue(
            'warning',
            `${node.id}: HC-SR04 VCC connected to 3.3V instead of 5V`,
            `Standard HC-SR04 ultrasonic sensors require 5V to fire the transducer accurately. Running on 3.3V can cause false zeroes or erratic distance measurements.`,
            vccNet.edgeIds
          )
        }
      }

      if (echoNet) {
        const echoGpio = echoNet.pins.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
        if (echoGpio) {
          addIssue(
            'warning',
            `${node.id}: HC-SR04 ECHO outputs 5V (Requires Voltage Divider)`,
            `HC-SR04 ECHO sends a 5V logic pulse, but ESP32 GPIO pins only accept up to 3.3V. Use a voltage divider (e.g. 1kΩ and 2kΩ resistors) between ECHO and ${echoGpio.pinName} to protect the ESP32.`,
            echoNet.edgeIds
          )
        }
      }

      if (trigNet && echoNet && vccNet && gndNet) {
        const trigGpio = trigNet.pins.find((p) => p.partId === 'esp32' && p.pinDef?.type === 'gpio')
        if (trigGpio) {
          addIssue(
            'ok',
            `${node.id}: HC-SR04 TRIG connected to ${trigGpio.pinName}`,
            `TRIG pulse trigger ready on ${trigGpio.pinName}.`
          )
        }
      }
    }

    // --- RESISTOR RULES ---
    if (part.id === 'resistor') {
      const pin1Net = getNetForPin(node.id, 'Pin 1')
      const pin2Net = getNetForPin(node.id, 'Pin 2')

      if ((pin1Net && !pin2Net) || (!pin1Net && pin2Net)) {
        addIssue(
          'warning',
          `${node.id}: Resistor has only one pin connected`,
          `A resistor must be connected in series with both Pin 1 and Pin 2 wired into the circuit path.`,
          (pin1Net || pin2Net).edgeIds
        )
      }
    }
  })

  // Sort issues: error -> warning -> info -> ok
  const severityScore = { error: 0, warning: 1, info: 2, ok: 3 }
  issues.sort((a, b) => severityScore[a.level] - severityScore[b.level])

  return issues
}
