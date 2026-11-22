import React, { useState } from 'react'
import { getComponentList, getWiringTable, generateMarkdownGuide } from '../exportGuide'
import { generateArduinoCode } from '../codegen'
import { PARTS } from '../parts'

export function BuildGuideTab({ nodes = [], edges = [], logicRules = [], issues = [] }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const components = getComponentList(nodes)
  const wiring = getWiringTable(nodes, edges)
  const code = generateArduinoCode(nodes, edges, logicRules)
  const hasErrors = issues.some((i) => i.level === 'error')

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownGuide(nodes, edges, logicRules, issues)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ESP32_Circuit_Build_Guide.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  // Simple SVG Wiring Diagram coordinates computation
  const svgWidth = 840
  const svgHeight = 440

  return (
    <div
      style={{
        padding: '24px 36px',
        maxWidth: 1100,
        margin: '0 auto',
        overflowY: 'auto',
        height: '100%',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      {/* Top Header & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid #334155',
          paddingBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📖 Hardware-Software Build Guide & Documentation</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: 13.5 }}>
            Automated fabrication document, point-to-point pinout schedule, schematic diagram, and production C++ firmware.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: copiedCode ? '#16a34a' : '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{copiedCode ? '✓ Copied!' : '📋 Copy Code'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📥 Download Guide (.md)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🖨️ Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Safety Warning if errors exist */}
      {hasErrors && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid #ef4444',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            fontSize: 13.5,
            lineHeight: '20px',
          }}
        >
          <span style={{ fontSize: 24, lineHeight: '24px' }}>⚠️</span>
          <div>
            <strong style={{ color: '#ffffff' }}>CIRCUIT SAFETY WARNING:</strong>
            <div>
              Your circuit currently contains critical electrical errors. Powering real components with these connections may cause permanent hardware damage or USB controller shutdowns. Please resolve all red error items in the Build tab before following this guide.
            </div>
          </div>
        </div>
      )}

      {/* 1. Component List / Bill of Materials */}
      <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>1. Bill of Materials (Component List)</span>
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px' }}>Part Name</th>
              <th style={{ padding: '8px 10px', width: 70, textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '8px 10px' }}>Operating Voltage</th>
              <th style={{ padding: '8px 10px' }}>Typical Uses & Notes</th>
            </tr>
          </thead>
          <tbody>
            {components.map(({ part, qty, instances }) => (
              <tr key={part.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: part.color }} />
                    <span>{part.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>({instances.join(', ')})</span>
                  </div>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                  {qty}
                </td>
                <td style={{ padding: '8px 10px', color: '#cbd5e1' }}>{part.operatingVoltage}</td>
                <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{part.typicalUses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 2. Point-to-Point Wiring Table */}
      <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#f8fafc' }}>
          2. Point-to-Point Wiring Schedule
        </h3>
        {wiring.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic', padding: '10px 0' }}>
            No wires connected on the canvas yet. Add wires in the Build tab to view the connection schedule.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: 60 }}>#</th>
                <th style={{ padding: '8px 10px' }}>From (Component & Pin)</th>
                <th style={{ padding: '8px 10px' }}>To (Component & Pin)</th>
                <th style={{ padding: '8px 10px' }}>Connection Purpose</th>
              </tr>
            </thead>
            <tbody>
              {wiring.map((w, idx) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#38bdf8' }}>{w.from}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#facc15' }}>{w.to}</td>
                  <td style={{ padding: '8px 10px', color: '#cbd5e1' }}>{w.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 3. Simple SVG Wiring Diagram */}
      <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#f8fafc' }}>
          3. Schematic Wiring Diagram
        </h3>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
          <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ minWidth: 700 }}>
            <rect width="100%" height="100%" fill="#0b1120" rx="8" />

            {/* Render Edges as yellow connecting lines */}
            {edges.map((e) => {
              const srcNode = nodes.find((n) => n.id === e.source)
              const tgtNode = nodes.find((n) => n.id === e.target)
              if (!srcNode || !tgtNode) return null

              // Scale positions into SVG viewBox
              const x1 = Math.max(20, Math.min(svgWidth - 60, (srcNode.position?.x || 100) * 0.9 + 40))
              const y1 = Math.max(30, Math.min(svgHeight - 40, (srcNode.position?.y || 100) * 0.8 + 40))
              const x2 = Math.max(20, Math.min(svgWidth - 60, (tgtNode.position?.x || 300) * 0.9 + 40))
              const y2 = Math.max(30, Math.min(svgHeight - 40, (tgtNode.position?.y || 200) * 0.8 + 40))

              const isError = issues.some((iss) => iss.level === 'error' && iss.edgeIds.includes(e.id))
              const strokeColor = isError ? '#ef4444' : '#facc15'

              return (
                <g key={e.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeDasharray={isError ? '4 4' : 'none'}
                  />
                  <circle cx={x1} cy={y1} r="3.5" fill="#facc15" />
                  <circle cx={x2} cy={y2} r="3.5" fill="#facc15" />
                </g>
              )
            })}

            {/* Render Nodes as labeled block diagrams */}
            {nodes.map((node) => {
              const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
              const part = PARTS[partKey] || PARTS.esp32
              const x = Math.max(20, Math.min(svgWidth - 140, (node.position?.x || 100) * 0.9))
              const y = Math.max(20, Math.min(svgHeight - 80, (node.position?.y || 100) * 0.8))

              return (
                <g key={node.id} transform={`translate(${x}, ${y})`}>
                  <rect
                    width="120"
                    height="60"
                    rx="6"
                    fill="#1e293b"
                    stroke={part.color || '#0284c7'}
                    strokeWidth="2"
                  />
                  <rect
                    width="120"
                    height="20"
                    rx="5"
                    fill={part.color || '#0284c7'}
                  />
                  <text
                    x="60"
                    y="14"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {part.name.length > 15 ? part.name.slice(0, 14) + '...' : part.name}
                  </text>
                  <text
                    x="60"
                    y="42"
                    fill="#cbd5e1"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    ID: {node.id}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </section>

      {/* 4. Generated ESP32 Arduino C++ Code */}
      <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>
            4. Generated Arduino C++ Firmware (ESP32)
          </h3>
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {copiedCode ? '✓ Copied' : 'Copy Firmware'}
          </button>
        </div>

        <pre
          style={{
            margin: 0,
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '16px',
            fontSize: 12,
            fontFamily: 'Consolas, monospace',
            color: '#e2e8f0',
            overflowX: 'auto',
            lineHeight: '18px',
          }}
        >
          {code}
        </pre>
      </section>

      {/* 5. Next Steps Checklist */}
      <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#f8fafc' }}>
          5. Student Assembly Checklist & Safety Rules
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Inspect & Procure Parts:</strong> Verify all items in the Bill of Materials table above.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Check Logic Voltages:</strong> Remember that ESP32 input GPIO pins tolerate only up to 3.3V. Ensure 5V sensors like HC-SR04 ECHO run through a voltage divider.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Wire with USB Disconnected:</strong> Always build and insert wires while the ESP32 board is completely unplugged from power.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Check Series Resistors:</strong> Double-check that every LED Anode pin connects through a 220Ω resistor before touching a GPIO pin.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Multimeter Check:</strong> Perform a continuity test between 3.3V and GND to ensure there is zero short circuit before first power-up.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginTop: 3 }} />
            <span>
              <strong>Flash Code & Test:</strong> Paste generated code into Arduino IDE, select "ESP32 Dev Module", upload, and open Serial Monitor at 115200 baud!
            </span>
          </label>
        </div>
      </section>
    </div>
  )
}
export default BuildGuideTab
