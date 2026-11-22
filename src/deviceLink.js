/**
 * ============================================================================
 * DEVICE LINK: Hardware-Software Data Pipeline & Protocol
 * ============================================================================
 * 
 * PROTOCOL SPECIFICATION:
 * - Transmission: Newline-delimited JSON (NDJSON) over USB / Serial (8-N-1) or virtual stream.
 * - Baud Rate: 115200 baud.
 * - Frequency: Approximately 2 lines per second (~500 ms intervals).
 * - Structure:
 *     {
 *       "t": 12345,
 *       "sensors": {
 *         "water_level_pct": 73,
 *         "temperature_c": 24.5,
 *         "humidity_pct": 52,
 *         "distance_cm": 85,
 *         "pot_pct": 40,
 *         "button": 0
 *       },
 *       "actuators": {
 *         "led-1": "ON",
 *         "buzzer-1": "OFF"
 *       }
 *     }
 * 
 * RULES:
 * 1. Only include sensors and actuators that actually exist in the circuit.
 * 2. Actuator keys must match canvas node IDs (e.g. "led-1", "buzzer-1").
 * 3. Sensor keys are standardized:
 *    - water_level_pct (0 to 100)
 *    - temperature_c (°C)
 *    - humidity_pct (% RH)
 *    - distance_cm (cm)
 *    - pot_pct (0 to 100)
 *    - button (1 = pressed, 0 = released)
 * ============================================================================
 */

import { PARTS } from './parts'
import { checkComponentWiring, evaluateLogicRules } from './simulation'

/**
 * Safely parse a newline-delimited JSON string from the device.
 * Returns the parsed payload if valid according to the protocol, or null.
 */
export function parseDeviceLine(line) {
  if (typeof line !== 'string') return null
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const data = JSON.parse(trimmed)
    if (!data || typeof data !== 'object') return null
    if (typeof data.t !== 'number' && !data.sensors && !data.actuators) return null
    return data
  } catch {
    return null
  }
}

/**
 * Validates whether a given raw line string is a valid Device Link JSON object.
 */
export function isValidJsonLine(line) {
  return parseDeviceLine(line) !== null
}

/**
 * Simulated Device:
 * Generates virtual telemetry lines every 500 ms matching the exact JSON format
 * that real ESP32 Arduino firmware emits over Serial at 115200 baud.
 */
export class SimulatedDevice {
  constructor({
    getSensorValues = () => ({}),
    getLogicRules = () => [],
    getNodes = () => [],
    getEdges = () => [],
  } = {}) {
    this.getSensorValues = getSensorValues
    this.getLogicRules = getLogicRules
    this.getNodes = getNodes
    this.getEdges = getEdges

    this.timer = null
    this.startTime = Date.now()
    this.lineCallbacks = new Set()
    this.statusCallbacks = new Set()
    this.status = 'Disconnected'
  }

  onLine(cb) {
    this.lineCallbacks.add(cb)
    return () => this.lineCallbacks.delete(cb)
  }

  onStatus(cb) {
    this.statusCallbacks.add(cb)
    cb(this.status)
    return () => this.statusCallbacks.delete(cb)
  }

  setStatus(newStatus) {
    this.status = newStatus
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(newStatus)
      } catch (err) {
        console.error('SimulatedDevice status callback error:', err)
      }
    })
  }

  emitLine(line) {
    this.lineCallbacks.forEach((cb) => {
      try {
        cb(line)
      } catch (err) {
        console.error('SimulatedDevice line callback error:', err)
      }
    })
  }

  start() {
    if (this.timer) return
    this.startTime = Date.now()
    this.setStatus('Simulated ESP32 running')

    this.timer = setInterval(() => {
      try {
        const nodes = this.getNodes() || []
        const edges = this.getEdges() || []
        const sensorValues = this.getSensorValues() || {}
        const logicRules = this.getLogicRules() || []

        // Compute component wiring statuses
        const componentStatuses = {}
        nodes.forEach((n) => {
          componentStatuses[n.id] = checkComponentWiring(n, nodes, edges)
        })

        // Identify placed & wired sensors
        const sensors = {}
        nodes.forEach((n) => {
          const partKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
          const part = PARTS[partKey]
          if (!part) return
          const status = componentStatuses[n.id]
          if (!status || !status.isWired) return

          if (part.id === 'waterlevel') {
            sensors.water_level_pct = Math.round(sensorValues.waterlevel ?? 0)
          } else if (part.id === 'hcsr04') {
            sensors.distance_cm = Math.round(sensorValues.hcsr04 ?? 100)
          } else if (part.id === 'dht22') {
            sensors.temperature_c = Number((sensorValues.dht22_temp ?? 25).toFixed(1))
            sensors.humidity_pct = Math.round(sensorValues.dht22_hum ?? 50)
          } else if (part.id === 'potentiometer') {
            sensors.pot_pct = Math.round(sensorValues.potentiometer ?? 0)
          } else if (part.id === 'button') {
            sensors.button = sensorValues.button === 1 ? 1 : 0
          }
        })

        // Identify placed actuators and evaluate logic rules
        const evaluatedOutputs = evaluateLogicRules(logicRules, sensorValues, componentStatuses)
        const actuators = {}
        nodes.forEach((n) => {
          const partKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
          const part = PARTS[partKey]
          if (part && (part.id === 'led' || part.id === 'buzzer')) {
            const isWired = componentStatuses[n.id]?.isWired
            const isOn = isWired && Boolean(evaluatedOutputs[n.id])
            actuators[n.id] = isOn ? 'ON' : 'OFF'
          }
        })

        const payload = {
          t: Date.now() - this.startTime,
          sensors,
          actuators,
        }

        const jsonLine = JSON.stringify(payload)
        this.emitLine(jsonLine)
      } catch (err) {
        console.error('SimulatedDevice tick error:', err)
      }
    }, 500)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.setStatus('Disconnected')
  }
}

/**
 * Web Serial Device:
 * Connects directly to a physical ESP32 over USB via the Web Serial API (115200 baud).
 */
export class WebSerialDevice {
  constructor() {
    this.port = null
    this.reader = null
    this.keepReading = false
    this.lineCallbacks = new Set()
    this.statusCallbacks = new Set()
    this.status = 'Disconnected'
  }

  static isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator
  }

  onLine(cb) {
    this.lineCallbacks.add(cb)
    return () => this.lineCallbacks.delete(cb)
  }

  onStatus(cb) {
    this.statusCallbacks.add(cb)
    cb(this.status)
    return () => this.statusCallbacks.delete(cb)
  }

  setStatus(newStatus) {
    this.status = newStatus
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(newStatus)
      } catch (err) {
        console.error('WebSerialDevice status callback error:', err)
      }
    })
  }

  emitLine(line) {
    this.lineCallbacks.forEach((cb) => {
      try {
        cb(line)
      } catch (err) {
        console.error('WebSerialDevice line callback error:', err)
      }
    })
  }

  async start() {
    if (!WebSerialDevice.isSupported()) {
      this.setStatus('Web Serial needs Chrome or Edge on a desktop')
      return
    }

    try {
      this.setStatus('Connecting...')
      this.port = await navigator.serial.requestPort()
      await this.port.open({ baudRate: 115200 })
      this.setStatus('Connected')
      this.keepReading = true

      // Handle physical unplug
      const handleDisconnect = () => {
        this.stop()
        this.setStatus('Disconnected: Board unplugged')
      }
      this.port.addEventListener?.('disconnect', handleDisconnect)

      const textDecoder = new TextDecoder()
      this.reader = this.port.readable.getReader()
      let buffer = ''

      while (this.keepReading) {
        const { value, done } = await this.reader.read()
        if (done) break
        if (value) {
          buffer += textDecoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '').trim()
            if (line.length > 0) {
              this.emitLine(line)
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        // User cancelled port selection dialog
        this.setStatus('Disconnected')
      } else {
        this.setStatus(`Error: ${err.message || 'Connection failed'}`)
      }
      await this.stop()
    }
  }

  async stop() {
    this.keepReading = false
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {})
        this.reader.releaseLock?.()
        this.reader = null
      }
      if (this.port) {
        await this.port.close().catch(() => {})
        this.port = null
      }
    } catch (err) {
      console.warn('Error closing serial port:', err)
    }
    if (this.status !== 'Web Serial needs Chrome or Edge on a desktop' && !this.status.startsWith('Disconnected:')) {
      this.setStatus('Disconnected')
    }
  }
}
