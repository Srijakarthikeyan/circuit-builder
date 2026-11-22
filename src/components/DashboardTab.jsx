import React, { useState } from 'react'
import { PARTS } from '../parts'
import { checkComponentWiring } from '../simulation'

/**
 * Zero-dependency inline SVG line chart for rendering real-time sensor streams
 */
function InlineSvgChart({ data = [], min = 0, max = 100, color = '#38bdf8', unit = '' }) {
  const width = 280
  const height = 75
  const padding = 6

  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 11 }}>
        Waiting for stream points...
      </div>
    )
  }

  const range = max - min || 1
  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding)
      const clamped = Math.max(min, Math.min(max, val))
      const y = height - padding - ((clamped - min) / range) * (height - 2 * padding)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        <line x1="0" y1={padding} x2={width} y2={padding} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
        <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

        {/* Line graph */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#64748b', marginTop: 2 }}>
        <span>Min: {min}{unit}</span>
        <span>60 samples</span>
        <span>Max: {max}{unit}</span>
      </div>
    </div>
  )
}

export function DashboardTab({
  isSourceRunning = false,
  deviceStatus = 'Disconnected',
  latestDeviceData = null,
  sensorValues = {},
  sensorHistory = {},
  outputStates = {},
  isFeedPaused = false,
  onToggleFeedPause,
  nodes = [],
  edges = [],
}) {
  // Threshold settings editable by the student
  const [thresholds, setThresholds] = useState({
    waterlevel: 70,
    hcsr04: 20,
    dht22_temp: 32,
    dht22_hum: 75,
    potentiometer: 80,
  })

  const [copied, setCopied] = useState(false)

  const handleThresholdChange = (key, val) => {
    setThresholds((prev) => ({ ...prev, [key]: Number(val) }))
  }

  // Active incoming sensors and actuators from Device Link telemetry
  const incomingSensors = latestDeviceData?.sensors || {}
  const incomingActuators = latestDeviceData?.actuators || {}

  // Resolve current sensor values from active data source, falling back to simulated values
  const currentWaterLevel = incomingSensors.water_level_pct !== undefined
    ? incomingSensors.water_level_pct
    : (sensorValues.waterlevel ?? 0)

  const currentDistance = incomingSensors.distance_cm !== undefined
    ? incomingSensors.distance_cm
    : (sensorValues.hcsr04 ?? 100)

  const currentTemp = incomingSensors.temperature_c !== undefined
    ? incomingSensors.temperature_c
    : (sensorValues.dht22_temp ?? 25)

  const currentHum = incomingSensors.humidity_pct !== undefined
    ? incomingSensors.humidity_pct
    : (sensorValues.dht22_hum ?? 50)

  const currentPot = (incomingSensors.pot_pct ?? incomingSensors.potentiometer_pct) !== undefined
    ? (incomingSensors.pot_pct ?? incomingSensors.potentiometer_pct)
    : (sensorValues.potentiometer ?? 0)

  const currentButton = incomingSensors.button !== undefined
    ? incomingSensors.button === 1
    : (sensorValues.button === 1)

  // Identify sensors wired on canvas OR present in incoming data stream
  const hasWiredWaterLevel = nodes.some((n) => {
    const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
    return pKey === 'waterlevel' && checkComponentWiring(n, nodes, edges).isWired
  })

  const hasWiredHcsr04 = nodes.some((n) => {
    const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
    return pKey === 'hcsr04' && checkComponentWiring(n, nodes, edges).isWired
  })

  const hasWiredDht22 = nodes.some((n) => {
    const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
    return pKey === 'dht22' && checkComponentWiring(n, nodes, edges).isWired
  })

  const hasWiredPotentiometer = nodes.some((n) => {
    const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
    return pKey === 'potentiometer' && checkComponentWiring(n, nodes, edges).isWired
  })

  const hasWiredButton = nodes.some((n) => {
    const pKey = n.data?.partId || (PARTS[n.type] ? n.type : null) || n.id.split('-')[0]
    return pKey === 'button' && checkComponentWiring(n, nodes, edges).isWired
  })

  // Show card if wired in circuit OR present in incoming telemetry data
  const hasWaterLevel = hasWiredWaterLevel || incomingSensors.water_level_pct !== undefined
  const hasHcsr04 = hasWiredHcsr04 || incomingSensors.distance_cm !== undefined
  const hasDht22 = hasWiredDht22 || incomingSensors.temperature_c !== undefined || incomingSensors.humidity_pct !== undefined
  const hasPotentiometer = hasWiredPotentiometer || incomingSensors.pot_pct !== undefined || incomingSensors.potentiometer_pct !== undefined

  const activeSensorsCount = (hasWaterLevel ? 1 : 0) +
                             (hasHcsr04 ? 1 : 0) +
                             (hasDht22 ? 1 : 0) +
                             (hasPotentiometer ? 1 : 0)

  // Identify actuators on canvas or present in incoming data
  const placedActuators = nodes
    .map((node) => {
      const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
      const part = PARTS[partKey]
      if (!part || (part.id !== 'led' && part.id !== 'buzzer')) return null
      const status = checkComponentWiring(node, nodes, edges)
      const isActive = incomingActuators[node.id] !== undefined
        ? (incomingActuators[node.id] === 'ON' || incomingActuators[node.id] === true)
        : Boolean(outputStates[node.id])
      return { node, part, status, isActive }
    })
    .filter(Boolean)

  // Active alerts calculation
  const alerts = []
  if (hasWaterLevel && currentWaterLevel > thresholds.waterlevel) {
    alerts.push(`Water Level exceeds alert threshold (${currentWaterLevel}% > ${thresholds.waterlevel}%)`)
  }
  if (hasHcsr04 && currentDistance < thresholds.hcsr04) {
    alerts.push(`Proximity Alert: Distance is critical (${currentDistance} cm < ${thresholds.hcsr04} cm)`)
  }
  if (hasDht22) {
    if (currentTemp > thresholds.dht22_temp) {
      alerts.push(`High Temperature Alert: ${currentTemp} °C > ${thresholds.dht22_temp} °C`)
    }
    if (currentHum > thresholds.dht22_hum) {
      alerts.push(`High Humidity Alert: ${currentHum} % > ${thresholds.dht22_hum} %`)
    }
  }
  if (hasPotentiometer && currentPot > thresholds.potentiometer) {
    alerts.push(`Potentiometer Alert: ${currentPot}% > ${thresholds.potentiometer}%`)
  }

  // JSON Feed representation
  const activeSensorsJson = {}
  if (hasWaterLevel) activeSensorsJson.water_level_pct = currentWaterLevel
  if (hasHcsr04) activeSensorsJson.distance_cm = currentDistance
  if (hasDht22) {
    activeSensorsJson.temperature_c = currentTemp
    activeSensorsJson.humidity_pct = currentHum
  }
  if (hasPotentiometer) activeSensorsJson.pot_pct = currentPot
  if (hasWiredButton || incomingSensors.button !== undefined) {
    activeSensorsJson.button = currentButton ? 1 : 0
  }

  const activeActuatorsJson = {}
  placedActuators.forEach(({ node, isActive }) => {
    activeActuatorsJson[node.id] = isActive ? 'ON' : 'OFF'
  })

  const jsonFeed = {
    t: latestDeviceData?.t ?? Math.floor(Date.now() % 1000000),
    device_id: 'esp32_station_01',
    source: deviceStatus,
    timestamp: new Date().toISOString(),
    sensors: activeSensorsJson,
    actuators: activeActuatorsJson,
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonFeed, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        padding: '24px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        overflowY: 'auto',
        height: '100%',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Dashboard Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1e293b',
          padding: '14px 20px',
          borderRadius: 12,
          border: '1px solid #334155',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊 IoT Cloud Telemetry Dashboard</span>
          </h2>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
            Live data fed from active source: <span style={{ color: isSourceRunning ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>{deviceStatus}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onToggleFeedPause}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              background: isFeedPaused ? '#0284c7' : '#334155',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isFeedPaused ? '▶ Resume Live Feed' : '⏸ Pause Live Feed'}
          </button>
        </div>
      </div>

      {/* Alert Banner if any thresholds crossed */}
      {alerts.length > 0 && isSourceRunning && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#fca5a5',
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️ THRESHOLD ALERTS ACTIVE:</span>
          </div>
          {alerts.map((alt, i) => (
            <div key={i} style={{ paddingLeft: 18 }}>• {alt}</div>
          ))}
        </div>
      )}

      {/* CONDITIONAL RENDER: SOURCE NOT RUNNING */}
      {!isSourceRunning ? (
        <div
          style={{
            background: '#1e293b',
            border: '1px dashed #334155',
            borderRadius: 12,
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔌</div>
          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 16, marginBottom: 8 }}>
            Start a data source in the Device Link tab to see live data.
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 460, margin: '0 auto' }}>
            Open the <strong>Device Link</strong> tab to start the built-in Simulated ESP32 or connect a physical ESP32 board over USB (Web Serial).
          </div>
        </div>
      ) : activeSensorsCount === 0 ? (
        /* CONDITIONAL RENDER: SOURCE RUNNING BUT NO SENSORS WIRED */
        <div
          style={{
            background: '#1e293b',
            border: '1px dashed #334155',
            borderRadius: 12,
            padding: '36px 24px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
          <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
            No sensors are wired yet. Build a circuit in the Build tab, then control sensor values in the Simulate tab.
          </div>
        </div>
      ) : (
        /* SENSOR METRIC CARDS */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Water Level */}
          {hasWaterLevel && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>Water Depth</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {currentWaterLevel} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Alert &gt; </span>
                  <input
                    type="number"
                    value={thresholds.waterlevel}
                    onChange={(e) => handleThresholdChange('waterlevel', e.target.value)}
                    style={{ width: 45, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
                  />
                </div>
              </div>
              <InlineSvgChart data={sensorHistory.waterlevel || []} min={0} max={100} color="#06b6d4" unit="%" />
            </div>
          )}

          {/* HC-SR04 Distance */}
          {hasHcsr04 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>Proximity Distance</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {currentDistance} <span style={{ fontSize: 14, color: '#94a3b8' }}>cm</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Alert &lt; </span>
                  <input
                    type="number"
                    value={thresholds.hcsr04}
                    onChange={(e) => handleThresholdChange('hcsr04', e.target.value)}
                    style={{ width: 45, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
                  />
                </div>
              </div>
              <InlineSvgChart data={sensorHistory.hcsr04 || []} min={2} max={400} color="#818cf8" unit="cm" />
            </div>
          )}

          {/* DHT22 Temperature */}
          {hasDht22 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>Ambient Temp</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {currentTemp} <span style={{ fontSize: 14, color: '#94a3b8' }}>°C</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Alert &gt; </span>
                  <input
                    type="number"
                    value={thresholds.dht22_temp}
                    onChange={(e) => handleThresholdChange('dht22_temp', e.target.value)}
                    style={{ width: 45, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
                  />
                </div>
              </div>
              <InlineSvgChart data={sensorHistory.dht22_temp || []} min={0} max={60} color="#f87171" unit="°C" />
            </div>
          )}

          {/* DHT22 Humidity */}
          {hasDht22 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Relative Humidity</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {currentHum} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Alert &gt; </span>
                  <input
                    type="number"
                    value={thresholds.dht22_hum}
                    onChange={(e) => handleThresholdChange('dht22_hum', e.target.value)}
                    style={{ width: 45, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
                  />
                </div>
              </div>
              <InlineSvgChart data={sensorHistory.dht22_hum || []} min={0} max={100} color="#38bdf8" unit="%" />
            </div>
          )}

          {/* Potentiometer */}
          {hasPotentiometer && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>Analog Knob</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {currentPot} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Alert &gt; </span>
                  <input
                    type="number"
                    value={thresholds.potentiometer}
                    onChange={(e) => handleThresholdChange('potentiometer', e.target.value)}
                    style={{ width: 45, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
                  />
                </div>
              </div>
              <InlineSvgChart data={sensorHistory.potentiometer || []} min={0} max={100} color="#fbbf24" unit="%" />
            </div>
          )}
        </div>
      )}

      {/* Actuators Status & JSON Feed Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: 16 }}>
        {/* Connected Actuators Status */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Connected Actuators Status
          </div>
          {placedActuators.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', padding: '10px 0' }}>
              No actuators (LEDs or buzzers) placed on canvas.
            </div>
          ) : (
            placedActuators.map(({ node, part, isActive }) => (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: part.color || '#38bdf8' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{node.id} ({part.name})</span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: isActive ? '#4ade80' : '#94a3b8',
                  }}
                >
                  {isActive ? 'ON' : 'OFF'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Data Feed (JSON) */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Data Feed (JSON)
            </div>
            <button
              type="button"
              onClick={handleCopyJson}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: copied ? '#059669' : '#334155',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre
            style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: 6,
              border: '1px solid #334155',
              fontSize: 11,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              color: '#38bdf8',
              overflowX: 'auto',
              maxHeight: 180,
              margin: 0,
            }}
          >
            {JSON.stringify(jsonFeed, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
export default DashboardTab
