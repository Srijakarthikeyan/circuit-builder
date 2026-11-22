import { PARTS, getGpioNumber } from './parts'
import { checkComponentWiring } from './simulation'

/**
 * Generates ready-to-flash Arduino C++ firmware for the ESP32
 * based on the placed components, their connections, and active logic rules.
 * 
 * Supports the Device Link JSON telemetry protocol over Serial at 115200 baud.
 */
export function generateArduinoCode(nodes = [], edges = [], logicRules = []) {
  const pinDefines = []
  const setupLines = []
  const loopReadings = []
  const loopActuatorInits = []
  const loopLogic = []
  const loopActuatorDrives = []
  const sensorJsonPrints = []
  const actuatorJsonPrints = []

  let hasDHT = false
  let hasHCSR04 = false

  // Inspect each placed component and generate corresponding code
  nodes.forEach((node) => {
    const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
    const part = PARTS[partKey]
    if (!part || part.id === 'esp32' || part.id === 'resistor') return

    const wiring = checkComponentWiring(node, nodes, edges)
    if (!wiring.isWired) return

    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()

    // --- LED ---
    if (part.id === 'led') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 2
      pinDefines.push(`#define PIN_${safeId} ${pinNum !== null ? pinNum : 2} // LED: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}, OUTPUT);`)
      setupLines.push(`  digitalWrite(PIN_${safeId}, LOW);`)

      loopActuatorInits.push(`  bool state_${safeId} = false;`)
      loopActuatorDrives.push(`  digitalWrite(PIN_${safeId}, state_${safeId} ? HIGH : LOW);`)
      actuatorJsonPrints.push({
        nodeId: node.id,
        printCode: `Serial.print("\\"${node.id}\\":\\""); Serial.print(state_${safeId} ? "ON" : "OFF"); Serial.print("\\"");`,
      })
    }

    // --- BUZZER ---
    if (part.id === 'buzzer') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId} ${pinNum !== null ? pinNum : 4} // Piezo Buzzer: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}, OUTPUT);`)
      setupLines.push(`  digitalWrite(PIN_${safeId}, LOW);`)

      loopActuatorInits.push(`  bool state_${safeId} = false;`)
      loopActuatorDrives.push(`  digitalWrite(PIN_${safeId}, state_${safeId} ? HIGH : LOW);`)
      actuatorJsonPrints.push({
        nodeId: node.id,
        printCode: `Serial.print("\\"${node.id}\\":\\""); Serial.print(state_${safeId} ? "ON" : "OFF"); Serial.print("\\"");`,
      })
    }

    // --- BUTTON ---
    if (part.id === 'button') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId} ${pinNum !== null ? pinNum : 4} // Push Button: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}, INPUT_PULLUP);`)
      loopReadings.push(`  // Button (active-low with internal pullup: pressed = 1, released = 0)`)
      loopReadings.push(`  int button_${safeId} = (digitalRead(PIN_${safeId}) == LOW) ? 1 : 0;`)
      sensorJsonPrints.push({
        name: 'button',
        printCode: `Serial.print("\\"button\\":"); Serial.print(button_${safeId});`,
      })
    }

    // --- DHT22 ---
    if (part.id === 'dht22') {
      hasDHT = true
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId}_DATA ${pinNum !== null ? pinNum : 4} // DHT22 Data: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}_DATA, INPUT);`)
      loopReadings.push(`  // DHT22 reading (Requires 'DHT sensor library by Adafruit' in real Arduino IDE)`)
      loopReadings.push(`  // float temp_${safeId} = dht.readTemperature();`)
      loopReadings.push(`  // float hum_${safeId} = dht.readHumidity();`)
      loopReadings.push(`  float temp_${safeId} = 24.5; // Production: dht.readTemperature();`)
      loopReadings.push(`  float hum_${safeId} = 52.0;  // Production: dht.readHumidity();`)
      sensorJsonPrints.push({
        name: 'dht22_temp',
        printCode: `Serial.print("\\"temperature_c\\":"); Serial.print(temp_${safeId}, 1);`,
      })
      sensorJsonPrints.push({
        name: 'dht22_hum',
        printCode: `Serial.print("\\"humidity_pct\\":"); Serial.print(hum_${safeId}, 1);`,
      })
    }

    // --- HC-SR04 ---
    if (part.id === 'hcsr04') {
      hasHCSR04 = true
      const trigPin = wiring.trigGpio ? getGpioNumber(wiring.trigGpio) : 5
      const echoPin = wiring.echoGpio ? getGpioNumber(wiring.echoGpio) : 18
      pinDefines.push(`#define PIN_${safeId}_TRIG ${trigPin !== null ? trigPin : 5} // Ultrasonic TRIG`)
      pinDefines.push(`#define PIN_${safeId}_ECHO ${echoPin !== null ? echoPin : 18} // Ultrasonic ECHO (via 5V->3.3V divider)`)
      setupLines.push(`  pinMode(PIN_${safeId}_TRIG, OUTPUT);`)
      setupLines.push(`  pinMode(PIN_${safeId}_ECHO, INPUT);`)
      loopReadings.push(`  // HC-SR04 ultrasonic distance measurement`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, LOW);`)
      loopReadings.push(`  delayMicroseconds(2);`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, HIGH);`)
      loopReadings.push(`  delayMicroseconds(10);`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, LOW);`)
      loopReadings.push(`  long duration_${safeId} = pulseIn(PIN_${safeId}_ECHO, HIGH, 30000);`)
      loopReadings.push(`  float distance_${safeId} = (duration_${safeId} > 0) ? (duration_${safeId} * 0.0343 / 2.0) : 400.0;`)
      sensorJsonPrints.push({
        name: 'distance_cm',
        printCode: `Serial.print("\\"distance_cm\\":"); Serial.print(distance_${safeId}, 1);`,
      })
    }

    // --- POTENTIOMETER ---
    if (part.id === 'potentiometer') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 32
      pinDefines.push(`#define PIN_${safeId}_ADC ${pinNum !== null ? pinNum : 32} // Potentiometer ADC1`)
      loopReadings.push(`  // Potentiometer 12-bit ADC reading (0 - 4095) converted to percentage`)
      loopReadings.push(`  int raw_${safeId} = analogRead(PIN_${safeId}_ADC);`)
      loopReadings.push(`  float pot_${safeId} = (raw_${safeId} / 4095.0) * 100.0;`)
      sensorJsonPrints.push({
        name: 'pot_pct',
        printCode: `Serial.print("\\"pot_pct\\":"); Serial.print(pot_${safeId}, 1);`,
      })
    }

    // --- WATER LEVEL SENSOR ---
    if (part.id === 'waterlevel') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 34
      pinDefines.push(`#define PIN_${safeId}_ADC ${pinNum !== null ? pinNum : 34} // Water Level Sensor ADC1`)
      loopReadings.push(`  // Water level 12-bit ADC reading (0 - 4095) converted to percentage`)
      loopReadings.push(`  int raw_wl_${safeId} = analogRead(PIN_${safeId}_ADC);`)
      loopReadings.push(`  float level_${safeId} = (raw_wl_${safeId} / 4095.0) * 100.0;`)
      sensorJsonPrints.push({
        name: 'water_level_pct',
        printCode: `Serial.print("\\"water_level_pct\\":"); Serial.print(level_${safeId}, 1);`,
      })
    }
  })

  // Logic Rules Translation
  if (logicRules.length > 0) {
    loopLogic.push(`  // --- Automated Logic Rules ---`)
    logicRules.forEach((rule, idx) => {
      const targetId = rule.outputPartId || rule.targetNodeId
      if (!targetId) return

      const safeTarget = targetId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
      const op = rule.operator === '==' || rule.operator === 'is pressed' ? '==' : rule.operator
      let valExpr = '0'

      const key = rule.sensorKey || ''
      const inputId = (rule.inputPartId || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()

      if (key.includes('waterlevel') || rule.inputValueName?.toLowerCase().includes('water')) {
        valExpr = inputId ? `level_${inputId}` : 'level_WATERLEVEL_1'
      } else if (key.includes('hcsr04') || rule.inputValueName?.toLowerCase().includes('dist')) {
        valExpr = inputId ? `distance_${inputId}` : 'distance_HCSR04_1'
      } else if (key.includes('potentiometer') || rule.inputValueName?.toLowerCase().includes('pot')) {
        valExpr = inputId ? `pot_${inputId}` : 'pot_POTENTIOMETER_1'
      } else if (key === 'dht22_temp' || rule.inputValueName?.toLowerCase().includes('temp')) {
        valExpr = inputId ? `temp_${inputId}` : 'temp_DHT22_1'
      } else if (key === 'dht22_hum' || rule.inputValueName?.toLowerCase().includes('hum')) {
        valExpr = inputId ? `hum_${inputId}` : 'hum_DHT22_1'
      } else if (key === 'button' || rule.inputValueName?.toLowerCase().includes('button')) {
        valExpr = inputId ? `button_${inputId}` : 'button_BUTTON_1'
      }

      const desiredState = (rule.outputState || rule.action || 'ON') === 'ON' ? 'true' : 'false'
      const elseState = desiredState === 'true' ? 'false' : 'true'

      loopLogic.push(`  // Rule ${idx + 1}: IF ${rule.inputValueName || key} ${rule.operator} ${rule.threshold} THEN ${targetId} ${rule.outputState || rule.action || 'ON'}`)
      loopLogic.push(`  if (${valExpr} ${op} ${rule.threshold}) {`)
      loopLogic.push(`    state_${safeTarget} = ${desiredState};`)
      loopLogic.push(`  } else {`)
      loopLogic.push(`    state_${safeTarget} = ${elseState};`)
      loopLogic.push(`  }`)
    })
  }

  // Generate Serial JSON Telemetry Lines
  const jsonOutputCode = []
  jsonOutputCode.push(`  // --- Device Link Telemetry (JSON over Serial at 115200 baud) ---`)
  jsonOutputCode.push(`  Serial.print("{\\"t\\":");`)
  jsonOutputCode.push(`  Serial.print(millis());`)
  jsonOutputCode.push(`  Serial.print(",\\"sensors\\":{");`)

  if (sensorJsonPrints.length > 0) {
    sensorJsonPrints.forEach((s, idx) => {
      if (idx > 0) {
        jsonOutputCode.push(`  Serial.print(",");`)
      }
      jsonOutputCode.push(`  ${s.printCode}`)
    })
  }

  jsonOutputCode.push(`  Serial.print("},\\"actuators\\":{");`)

  if (actuatorJsonPrints.length > 0) {
    actuatorJsonPrints.forEach((a, idx) => {
      if (idx > 0) {
        jsonOutputCode.push(`  Serial.print(",");`)
      }
      jsonOutputCode.push(`  ${a.printCode}`)
    })
  }

  jsonOutputCode.push(`  Serial.println("}}");`)

  return `/*
 * Circuit Builder - Generated ESP32 Firmware with Device Link
 * Auto-generated for: ESP32 Dev Module
 * Baud Rate: 115200 baud
 * 
${hasDHT ? ' * NOTE: To compile with real DHT sensors in Arduino IDE, install:\n *       - DHT sensor library by Adafruit\n *       - Adafruit Unified Sensor\n' : ''}${hasHCSR04 ? ' * NOTE: Ensure HC-SR04 ECHO pin passes through a voltage divider\n *       before entering the ESP32 (outputs 5V, ESP32 accepts 3.3V).\n' : ''} */

// Pin Definitions
${pinDefines.length > 0 ? pinDefines.join('\n') : '// No peripheral pins configured'}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 Device Link Initialized (115200 baud)");

${setupLines.length > 0 ? setupLines.join('\n') : '  // No custom pinModes required'}
  Serial.println("Setup Complete. Streaming sensor telemetry.");
}

void loop() {
${loopReadings.length > 0 ? loopReadings.join('\n') : '  // No sensors wired'}

${loopActuatorInits.length > 0 ? loopActuatorInits.join('\n') : ''}

${loopLogic.length > 0 ? loopLogic.join('\n') : ''}

${loopActuatorDrives.length > 0 ? loopActuatorDrives.join('\n') : ''}

${jsonOutputCode.join('\n')}

  delay(500); // 500 ms sampling rate (~2 lines per second)
}
`
}
