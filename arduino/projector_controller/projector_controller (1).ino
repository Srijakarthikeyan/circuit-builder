/*
  Phone-Controlled LCD Projector
  ESP32 + IR LED, controlled from a phone web page over Wi-Fi.

  Wiring (same as the Circuit Builder design):
    ESP32 GPIO4  -> 220 ohm resistor -> IR LED Anode (+)
    IR LED Cathode (-) -> ESP32 GND

  Library needed (Arduino IDE -> Library Manager):
    "IRremote" by shirriff, z3t0, ArminJo (version 4.x)

  IMPORTANT: the IR codes below are EXAMPLES from the simulation.
  A real projector needs its own codes. Capture them from the original
  remote with an IR receiver, then replace the CMD_ values below.
*/

#include <WiFi.h>
#include <WebServer.h>
#include <IRremote.hpp>

// ---------- Settings you must change ----------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---------- Hardware ----------
const uint8_t IR_LED_PIN = 4;   // GPIO4, as wired in Circuit Builder

// ---------- IR codes (NEC protocol, EXAMPLES - replace for your projector) ----------
const uint16_t IR_ADDRESS  = 0x00;
const uint8_t  CMD_POWER   = 0x02;  // raw code 0x00FF02FD
const uint8_t  CMD_INPUT   = 0x30;  // raw code 0x00FF30CF
const uint8_t  CMD_VOL_UP  = 0x18;  // raw code 0x00FF18E7
const uint8_t  CMD_VOL_DOWN = 0x7A; // raw code 0x00FF7A85

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
