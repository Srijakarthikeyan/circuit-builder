import { PARTS, getGpioNumber } from './parts'
import { checkComponentWiring } from './simulation'

/**
 * Generates ready-to-flash Arduino C++ firmware for the ESP32
 * based on the placed components, their connections, and active logic rules.
 */
export function generateArduinoCode(nodes = [], edges = [], logicRules = []) {
  const pinDefines = []
  const setupLines = []
  const loopReadings = []
  const loopLogic = []
  const serialPrints = []

  let hasDHT = false
  let hasHCSR04 = false
  let hasAnalog = false

  // Inspect each placed component
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
    }

    // --- BUZZER ---
    if (part.id === 'buzzer') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId} ${pinNum !== null ? pinNum : 4} // Piezo Buzzer: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}, OUTPUT);`)
      setupLines.push(`  digitalWrite(PIN_${safeId}, LOW);`)
    }

    // --- BUTTON ---
    if (part.id === 'button') {
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId} ${pinNum !== null ? pinNum : 4} // Push Button: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}, INPUT_PULLUP);`)
      loopReadings.push(`  // Active-low button (pressed = LOW = 0)`)
      loopReadings.push(`  int val_${safeId} = (digitalRead(PIN_${safeId}) == LOW) ? 1 : 0;`)
      serialPrints.push(`  Serial.print("Button ${node.id}: "); Serial.println(val_${safeId} ? "PRESSED" : "RELEASED");`)
    }

    // --- DHT22 ---
    if (part.id === 'dht22') {
      hasDHT = true
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 4
      pinDefines.push(`#define PIN_${safeId}_DATA ${pinNum !== null ? pinNum : 4} // DHT22 Data: ${node.id}`)
      setupLines.push(`  pinMode(PIN_${safeId}_DATA, INPUT);`)
      loopReadings.push(`  // Reading DHT22 sensor (Requires Adafruit DHT library in real Arduino IDE)`)
      loopReadings.push(`  // float temp_${safeId} = dht.readTemperature();`)
      loopReadings.push(`  // float hum_${safeId} = dht.readHumidity();`)
      loopReadings.push(`  float temp_${safeId} = 24.5; // Simulated reading`)
      loopReadings.push(`  float hum_${safeId} = 55.0;  // Simulated reading`)
      serialPrints.push(`  Serial.print("Temp ${node.id}: "); Serial.print(temp_${safeId}); Serial.println(" °C");`)
      serialPrints.push(`  Serial.print("Humidity ${node.id}: "); Serial.print(hum_${safeId}); Serial.println(" %");`)
    }

    // --- HC-SR04 ---
    if (part.id === 'hcsr04') {
      hasHCSR04 = true
      const trigPin = wiring.trigGpio ? getGpioNumber(wiring.trigGpio) : 5
      const echoPin = wiring.echoGpio ? getGpioNumber(wiring.echoGpio) : 18
      pinDefines.push(`#define PIN_${safeId}_TRIG ${trigPin !== null ? trigPin : 5} // Ultrasonic TRIG`)
      pinDefines.push(`#define PIN_${safeId}_ECHO ${echoPin !== null ? echoPin : 18} // Ultrasonic ECHO (via divider)`)
      setupLines.push(`  pinMode(PIN_${safeId}_TRIG, OUTPUT);`)
      setupLines.push(`  pinMode(PIN_${safeId}_ECHO, INPUT);`)
      loopReadings.push(`  // Send 10us ultrasonic pulse`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, LOW);`)
      loopReadings.push(`  delayMicroseconds(2);`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, HIGH);`)
      loopReadings.push(`  delayMicroseconds(10);`)
      loopReadings.push(`  digitalWrite(PIN_${safeId}_TRIG, LOW);`)
      loopReadings.push(`  long duration_${safeId} = pulseIn(PIN_${safeId}_ECHO, HIGH, 30000);`)
      loopReadings.push(`  float distance_${safeId} = (duration_${safeId} > 0) ? (duration_${safeId} * 0.0343 / 2.0) : 400.0;`)
      serialPrints.push(`  Serial.print("Distance ${node.id}: "); Serial.print(distance_${safeId}); Serial.println(" cm");`)
    }

    // --- POTENTIOMETER ---
    if (part.id === 'potentiometer') {
      hasAnalog = true
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 32
      pinDefines.push(`#define PIN_${safeId}_ADC ${pinNum !== null ? pinNum : 32} // Potentiometer ADC1`)
      setupLines.push(`  // Analog input ADC1 channel`)
      loopReadings.push(`  int raw_${safeId} = analogRead(PIN_${safeId}_ADC); // 12-bit ADC (0 - 4095)`)
      loopReadings.push(`  float pct_${safeId} = (raw_${safeId} / 4095.0) * 100.0;`)
      serialPrints.push(`  Serial.print("Potentiometer ${node.id}: "); Serial.print(pct_${safeId}); Serial.println(" %");`)
    }

    // --- WATER LEVEL SENSOR ---
    if (part.id === 'waterlevel') {
      hasAnalog = true
      const pinNum = wiring.gpio ? getGpioNumber(wiring.gpio) : 34
      pinDefines.push(`#define PIN_${safeId}_ADC ${pinNum !== null ? pinNum : 34} // Water Level Sensor ADC1`)
      loopReadings.push(`  int raw_wl_${safeId} = analogRead(PIN_${safeId}_ADC); // 12-bit ADC (0 - 4095)`)
      loopReadings.push(`  float level_${safeId} = (raw_wl_${safeId} / 4095.0) * 100.0;`)
      serialPrints.push(`  Serial.print("Water Level ${node.id}: "); Serial.print(level_${safeId}); Serial.println(" %");`)
    }
  })

  // Logic Rules Translation
  if (logicRules.length > 0) {
    loopLogic.push(`  // --- Automated Logic Rules ---`)
    logicRules.forEach((rule, idx) => {
      const { sensorKey, operator, threshold, targetNodeId, action } = rule
      if (!targetNodeId) return

      const safeTarget = targetNodeId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
      const op = operator === '==' || operator === 'is pressed' ? '==' : operator
      let valExpr = '0'

      if (sensorKey.includes('waterlevel')) valExpr = 'level_WATERLEVEL_1'
      else if (sensorKey.includes('hcsr04') || sensorKey === 'distance') valExpr = 'distance_HCSR04_1'
      else if (sensorKey.includes('potentiometer')) valExpr = 'pct_POTENTIOMETER_1'
      else if (sensorKey === 'dht22_temp') valExpr = 'temp_DHT22_1'
      else if (sensorKey === 'dht22_hum') valExpr = 'hum_DHT22_1'
      else if (sensorKey === 'button') valExpr = 'val_BUTTON_1'

      const highLow = action === 'ON' ? 'HIGH' : 'LOW'
      const elseHighLow = action === 'ON' ? 'LOW' : 'HIGH'

      loopLogic.push(`  // Rule ${idx + 1}: IF ${sensorKey} ${op} ${threshold} THEN ${targetNodeId} ${action}`)
      loopLogic.push(`  if (${valExpr} ${op} ${threshold}) {`)
      loopLogic.push(`    digitalWrite(PIN_${safeTarget}, ${highLow});`)
      loopLogic.push(`  } else {`)
      loopLogic.push(`    digitalWrite(PIN_${safeTarget}, ${elseHighLow});`)
      loopLogic.push(`  }`)
    })
  }

  return `/*
 * Circuit Builder - Generated ESP32 Firmware
 * Auto-generated for: ESP32 Dev Module
 * 
${hasDHT ? ' * NOTE: To compile with real DHT sensors in Arduino IDE, install:\n *       - DHT sensor library by Adafruit\n *       - Adafruit Unified Sensor\n' : ''}${hasHCSR04 ? ' * NOTE: Ensure HC-SR04 ECHO pin passes through a voltage divider\n *       before entering the ESP32 (outputs 5V, ESP32 accepts 3.3V).\n' : ''} */

// Pin Definitions
${pinDefines.length > 0 ? pinDefines.join('\n') : '// No peripheral pins configured'}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 Circuit Starting...");

${setupLines.length > 0 ? setupLines.join('\n') : '  // No custom pinModes required'}
  Serial.println("Setup Complete. Running main loop.");
}

void loop() {
${loopReadings.length > 0 ? loopReadings.join('\n') : '  // Add sensors to view readings here'}

${loopLogic.length > 0 ? loopLogic.join('\n') : ''}

${serialPrints.length > 0 ? serialPrints.join('\n') : ''}

  delay(500); // 500 ms sampling rate
}
`
}
