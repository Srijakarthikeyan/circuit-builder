import React, { useState } from 'react'
import { PARTS } from '../parts'
import { checkComponentWiring } from '../simulation'

/**
 * Simple, zero-dependency inline SVG line chart for rendering real-time sensor streams
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

  // BUG 2 FIX: Identify sensors that are on the canvas AND correctly wired
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

  const wiredSensorsCount = (hasWiredWaterLevel ? 1 : 0) +
                            (hasWiredHcsr04 ? 1 : 0) +
                            (hasWiredDht22 ? 1 : 0) +
                            (hasWiredPotentiometer ? 1 : 0)

  // Identify actuators really on canvas
  const placedActuators = nodes
    .map((node) => {
      const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
      const part = PARTS[partKey]
      if (!part || (part.id !== 'led' && part.id !== 'buzzer')) return null
      const status = checkComponentWiring(node, nodes, edges)
      return { node, part, status }
    })
    .filter(Boolean)

  // Active alerts calculation (ONLY for wired sensors)
  const alerts = []
  if (hasWiredWaterLevel && (sensorValues.waterlevel || 0) > thresholds.waterlevel) {
    alerts.push(`Water Level exceeds alert threshold (${sensorValues.waterlevel}% > ${thresholds.waterlevel}%)`)
  }
  if (hasWiredHcsr04 && (sensorValues.hcsr04 || 100) < thresholds.hcsr04) {
    alerts.push(`Proximity Alert: Distance is critical (${sensorValues.hcsr04} cm < ${thresholds.hcsr04} cm)`)
  }
  if (hasWiredDht22) {
    if ((sensorValues.dht22_temp || 25) > thresholds.dht22_temp) {
      alerts.push(`High Temperature Alert: ${sensorValues.dht22_temp} °C > ${thresholds.dht22_temp} °C`)
    }
    if ((sensorValues.dht22_hum || 50) > thresholds.dht22_hum) {
      alerts.push(`High Humidity Alert: ${sensorValues.dht22_hum} % > ${thresholds.dht22_hum} %`)
    }
  }
  if (hasWiredPotentiometer && (sensorValues.potentiometer || 0) > thresholds.potentiometer) {
    alerts.push(`Potentiometer Alert: ${sensorValues.potentiometer}% > ${thresholds.potentiometer}%`)
  }

  // JSON Feed representation: ONLY sensors and actuators really on canvas and wired
  const activeSensorsJson = {}
  if (hasWiredWaterLevel) {
    activeSensorsJson.water_level_pct = sensorValues.waterlevel ?? 0
  }
  if (hasWiredHcsr04) {
    activeSensorsJson.distance_cm = sensorValues.hcsr04 ?? 100
  }
  if (hasWiredDht22) {
    activeSensorsJson.temperature_c = sensorValues.dht22_temp ?? 25
    activeSensorsJson.humidity_pct = sensorValues.dht22_hum ?? 50
  }
  if (hasWiredPotentiometer) {
    activeSensorsJson.potentiometer_pct = sensorValues.potentiometer ?? 0
  }
  if (hasWiredButton) {
    activeSensorsJson.button_pressed = sensorValues.button === 1
  }

  const activeActuatorsJson = {}
  placedActuators.forEach(({ node }) => {
    activeActuatorsJson[node.id] = outputStates[node.id] ? 'ON' : 'OFF'
  })

  const jsonFeed = {
    device_id: 'esp32_station_01',
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
            Live web dashboard showing data strictly for components wired on your canvas.
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
      {alerts.length > 0 && (
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

      {/* Sensor Metric Cards: ONLY FOR WIRED SENSORS */}
      {wiredSensorsCount === 0 ? (
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Water Level */}
          {hasWiredWaterLevel && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>Water Depth</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {sensorValues.waterlevel ?? 0} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
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
          {hasWiredHcsr04 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>Proximity Distance</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {sensorValues.hcsr04 ?? 100} <span style={{ fontSize: 14, color: '#94a3b8' }}>cm</span>
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
          {hasWiredDht22 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>Ambient Temp</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {sensorValues.dht22_temp ?? 25} <span style={{ fontSize: 14, color: '#94a3b8' }}>°C</span>
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
          {hasWiredDht22 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Relative Humidity</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {sensorValues.dht22_hum ?? 50} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
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
          {hasWiredPotentiometer && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9333ea', textTransform: 'uppercase' }}>Potentiometer Dial</span>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                    {sensorValues.potentiometer ?? 0} <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
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
              <InlineSvgChart data={sensorHistory.potentiometer || []} min={0} max={100} color="#9333ea" unit="%" />
            </div>
          )}
        </div>
      )}

      {/* Actuators Output Status Section */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
          Connected Actuators Status
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {placedActuators.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
              No actuators (LED / Buzzer) are on the canvas yet.
            </div>
          ) : (
            placedActuators.map(({ node, part, status }) => {
              const isLED = part.id === 'led'
              const isOn = Boolean(outputStates[node.id])
              return (
                <div
                  key={node.id}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{isLED ? '💡' : '🔊'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                      {part.name} ({node.id})
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isOn && status.isWired
                          ? (isLED ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)')
                          : '#1e293b',
                        color: isOn && status.isWired
                          ? (isLED ? '#f87171' : '#fb923c')
                          : '#64748b',
                      }}
                    >
                      {!status.isWired
                        ? 'NOT WIRED'
                        : isOn
                        ? 'STATE: ACTIVE (ON)'
                        : 'STATE: IDLE (OFF)'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Data feed (JSON) Section */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
              Data Feed (JSON Stream)
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Real firmware would serialize sensor readings and publish this payload over Wi-Fi via MQTT or HTTP POST to your cloud backend.
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyJson}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: copied ? '#16a34a' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{copied ? '✓ Copied!' : '📋 Copy JSON'}</span>
          </button>
        </div>

        <pre
          style={{
            margin: 0,
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#38bdf8',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(jsonFeed, null, 2)}
        </pre>
      </div>
    </div>
  )
}
export default DashboardTab
