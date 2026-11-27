import { PARTS, getGpioNumber } from './parts'
import { checkComponentWiring } from './simulation'

const getPartKey = (node) =>
  node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]

/**
 * Generates the complete ESP32 firmware for the Phone-Controlled LCD Projector:
 * Wi-Fi + phone web page + IR transmitter (NEC) on the wired GPIO pin.
 */
function generateProjectorFirmware({ pin, ignored = [] }) {
  const ignoredNote =
    ignored.length > 0
      ? ` * NOTE: These wired parts are not included in this sketch yet: ${ignored.join(', ')}\n`
      : ''

  return `/*
 * Circuit Builder - Generated ESP32 Firmware (Phone-Controlled LCD Projector)
 * Auto-generated for: ESP32 Dev Module
 *
 * Wiring (from your design):
 *   ESP32 GPIO${pin} -> 220 ohm resistor -> IR LED Anode (+)
 *   IR LED Cathode (-) -> ESP32 GND
 *
 * Library needed (Arduino IDE -> Library Manager):
 *   "IRremote" by shirriff, z3t0, ArminJo (version 4.x)
 *
${ignoredNote} * IMPORTANT: the IR codes below are EXAMPLES.
 * A real projector needs its own codes. Capture them from the original
 * remote with an IR receiver, then replace the CMD_ values below.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <IRremote.hpp>

// ---------- Settings you must change ----------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---------- Hardware ----------
const uint8_t IR_LED_PIN = ${pin};   // GPIO${pin}, as wired in Circuit Builder

// ---------- IR codes (NEC protocol, EXAMPLES - replace for your projector) ----------
const uint16_t IR_ADDRESS   = 0x00;
const uint8_t  CMD_POWER    = 0x02;  // raw code 0x00FF02FD
const uint8_t  CMD_INPUT    = 0x30;  // raw code 0x00FF30CF
const uint8_t  CMD_VOL_UP   = 0x18;  // raw code 0x00FF18E7
const uint8_t  CMD_VOL_DOWN = 0x7A;  // raw code 0x00FF7A85

WebServer server(80);

// ---------- Phone web page ----------
const char PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Projector Remote</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0b1120; color: #e2e8f0;
           text-align: center; margin: 0; padding: 20px; }
    h2 { margin-top: 10px; }
    button { display: block; width: 100%; max-width: 320px; margin: 12px auto;
             padding: 18px; font-size: 18px; font-weight: bold; color: #fff;
             background: #0284c7; border: none; border-radius: 12px; }
    button.power { background: #dc2626; }
    .row { display: flex; gap: 12px; max-width: 320px; margin: 0 auto; }
    .row button { margin: 12px 0; }
    #status { margin-top: 20px; color: #94a3b8; min-height: 24px; }
  </style>
</head>
<body>
  <h2>Projector Remote</h2>
  <button class="power" onclick="sendKey('POWER')">Power</button>
  <button onclick="sendKey('INPUT')">Input</button>
  <div class="row">
    <button onclick="sendKey('VOL_DOWN')">Vol -</button>
    <button onclick="sendKey('VOL_UP')">Vol +</button>
  </div>
  <div id="status">Ready</div>
  <script>
    function sendKey(key) {
      var status = document.getElementById('status');
      status.textContent = 'Sending ' + key + '...';
      fetch('/cmd?key=' + key)
        .then(function (r) { return r.text(); })
        .then(function (t) { status.textContent = t; })
        .catch(function () { status.textContent = 'ESP32 not reachable'; });
    }
  </script>
</body>
</html>
)rawliteral";

// ---------- Handlers ----------
void handleRoot() {
  server.send_P(200, "text/html", PAGE);
}

void handleCmd() {
  String key = server.arg("key");
  uint8_t command = 0;
  bool known = true;

  if (key == "POWER") {
    command = CMD_POWER;
  } else if (key == "INPUT") {
    command = CMD_INPUT;
  } else if (key == "VOL_UP") {
    command = CMD_VOL_UP;
  } else if (key == "VOL_DOWN") {
    command = CMD_VOL_DOWN;
  } else {
    known = false;
  }

  if (!known) {
    server.send(400, "text/plain", "Unknown command");
    return;
  }

  Serial.print("Sending IR command: ");
  Serial.println(key);
  IrSender.sendNEC(IR_ADDRESS, command, 0);
  server.send(200, "text/plain", "Sent " + key);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

// ---------- Setup and loop ----------
void setup() {
  Serial.begin(115200);
  delay(500);

  IrSender.begin(IR_LED_PIN);

  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. Open this on your phone: http://");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/cmd", handleCmd);
  server.onNotFound(handleNotFound);
  server.begin();
}

void loop() {
  server.handleClient();
}
`
}

/**
 * Generates ready-to-flash Arduino C++ firmware for the ESP32
 * based on the placed components, their connections, and active logic rules.
 * 
 * Supports the Device Link JSON telemetry protocol over Serial at 115200 baud.
 *
 * If a correctly wired LCD Projector (ESP32 -> resistor -> IR LED -> projector)
 * is on the canvas, it generates the phone-controlled projector firmware instead.
 */
export function generateArduinoCode(nodes = [], edges = [], logicRules = []) {
  // --- Phone-Controlled Projector mode ---
  const projectorNode = nodes.find((n) => getPartKey(n) === 'projector')
  if (projectorNode) {
    const projectorStatus = checkComponentWiring(projectorNode, nodes, edges)
    if (projectorStatus.isWired) {
      const gpioNum = projectorStatus.gpio ? getGpioNumber(projectorStatus.gpio) : null
      const handledParts = ['esp32', 'resistor', 'irled', 'irreceiver', 'projector']
      const ignored = []
      nodes.forEach((n) => {
        const key = getPartKey(n)
        const p = PARTS[key]
        if (!p || handledParts.includes(p.id)) return
        if (checkComponentWiring(n, nodes, edges).isWired) ignored.push(p.name)
      })
      return generateProjectorFirmware({ pin: gpioNum !== null ? gpioNum : 4, ignored })
    }
  }

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
