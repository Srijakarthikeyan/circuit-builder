import React, { useState, useEffect, useMemo } from 'react'
import { PARTS } from '../parts'
import { checkComponentWiring } from '../simulation'

export function SimulateTab({
  nodes = [],
  edges = [],
  sensorValues = {},
  onSensorChange,
  logicRules = [],
  onAddRule,
  onDeleteRule,
  outputStates = {},
  isSimulating = true,
  onToggleSimulation,
  eventLogs = [],
}) {
  // Find all placed components and their wiring validity
  const placedComponents = useMemo(() => {
    return nodes.map((node) => {
      const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
      const part = PARTS[partKey] || PARTS.esp32
      const status = checkComponentWiring(node, nodes, edges)
      return { node, part, status }
    })
  }, [nodes, edges])

  // Build input options from placed components on canvas
  const inputOptions = useMemo(() => {
    const list = []
    placedComponents.forEach(({ node, part }) => {
      if (part.id === 'waterlevel') {
        list.push({
          id: `${node.id}:waterlevel`,
          inputPartId: node.id,
          inputValueName: 'Water Level',
          label: `Water Level (${node.id})`,
          sensorKey: 'waterlevel',
          defaultOp: '>',
          defaultThreshold: 60,
          isButton: false,
        })
      } else if (part.id === 'hcsr04') {
        list.push({
          id: `${node.id}:distance`,
          inputPartId: node.id,
          inputValueName: 'Distance',
          label: `Distance (${node.id})`,
          sensorKey: 'hcsr04',
          defaultOp: '<',
          defaultThreshold: 20,
          isButton: false,
        })
      } else if (part.id === 'dht22') {
        list.push({
          id: `${node.id}:temp`,
          inputPartId: node.id,
          inputValueName: 'Temperature',
          label: `Temperature (${node.id})`,
          sensorKey: 'dht22_temp',
          defaultOp: '>',
          defaultThreshold: 30,
          isButton: false,
        })
        list.push({
          id: `${node.id}:hum`,
          inputPartId: node.id,
          inputValueName: 'Humidity',
          label: `Humidity (${node.id})`,
          sensorKey: 'dht22_hum',
          defaultOp: '>',
          defaultThreshold: 70,
          isButton: false,
        })
      } else if (part.id === 'potentiometer') {
        list.push({
          id: `${node.id}:potentiometer`,
          inputPartId: node.id,
          inputValueName: 'Potentiometer',
          label: `Potentiometer (${node.id})`,
          sensorKey: 'potentiometer',
          defaultOp: '>',
          defaultThreshold: 50,
          isButton: false,
        })
      } else if (part.id === 'button') {
        list.push({
          id: `${node.id}:button`,
          inputPartId: node.id,
          inputValueName: 'Button',
          label: `Button (${node.id})`,
          sensorKey: 'button',
          defaultOp: 'is pressed',
          defaultThreshold: 1,
          isButton: true,
        })
      }
    })
    return list
  }, [placedComponents])

  // Build output options from placed components on canvas
  const outputOptions = useMemo(() => {
    return placedComponents
      .filter((c) => c.part.id === 'led' || c.part.id === 'buzzer')
      .map((c) => ({
        id: c.node.id,
        label: `${c.part.name} (${c.node.id})`,
        part: c.part,
      }))
  }, [placedComponents])

  // Form states
  const [selectedInputId, setSelectedInputId] = useState('')
  const [selectedOutputId, setSelectedOutputId] = useState('')
  const [selectedOp, setSelectedOp] = useState('>')
  const [selectedThreshold, setSelectedThreshold] = useState(60)
  const [selectedAction, setSelectedAction] = useState('ON')

  // BUG 1 FIX: Initialize and sync input dropdown state from first available option
  useEffect(() => {
    if (inputOptions.length > 0) {
      const exists = inputOptions.find((opt) => opt.id === selectedInputId)
      if (!exists) {
        const first = inputOptions[0]
        setSelectedInputId(first.id)
        setSelectedOp(first.defaultOp)
        setSelectedThreshold(first.defaultThreshold)
      }
    } else {
      setSelectedInputId('')
    }
  }, [inputOptions, selectedInputId])

  // BUG 1 FIX: Initialize and sync output dropdown state from first available option
  useEffect(() => {
    if (outputOptions.length > 0) {
      const exists = outputOptions.find((opt) => opt.id === selectedOutputId)
      if (!exists) {
        setSelectedOutputId(outputOptions[0].id)
      }
    } else {
      setSelectedOutputId('')
    }
  }, [outputOptions, selectedOutputId])

  const currentInputOpt = inputOptions.find((opt) => opt.id === selectedInputId) || inputOptions[0]
  const isButtonSelected = currentInputOpt?.isButton

  const handleInputChange = (inputId) => {
    setSelectedInputId(inputId)
    const opt = inputOptions.find((o) => o.id === inputId)
    if (opt) {
      setSelectedOp(opt.defaultOp)
      setSelectedThreshold(opt.defaultThreshold)
    }
  }

  const handleCreateRule = (e) => {
    e.preventDefault()
    const inputOpt = inputOptions.find((o) => o.id === selectedInputId) || inputOptions[0]
    const outputOpt = outputOptions.find((o) => o.id === selectedOutputId) || outputOptions[0]

    if (!outputOpt) {
      alert('Please select an output target component')
      return
    }
    if (!inputOpt) {
      alert('Please select an input sensor component')
      return
    }

    onAddRule({
      id: `rule-${Date.now()}`,
      inputPartId: inputOpt.inputPartId,
      inputValueName: inputOpt.inputValueName,
      sensorKey: inputOpt.sensorKey,
      operator: selectedOp,
      threshold: Number(selectedThreshold),
      outputPartId: outputOpt.id,
      outputState: selectedAction,
      targetNodeId: outputOpt.id,
      action: selectedAction,
    })
  }

  // Friendly name rule formatter (e.g. "IF Water Level > 60 THEN LED (led-1) ON")
  const formatRuleFriendly = (rule) => {
    const inputName = rule.inputValueName || rule.sensorKey || 'Sensor'
    const targetId = rule.outputPartId || rule.targetNodeId || 'Output'
    const targetNode = nodes.find((n) => n.id === targetId)
    const partKey = targetNode?.data?.partId || (PARTS[targetNode?.type] ? targetNode.type : null) || targetId.split('-')[0]
    const partName = PARTS[partKey]?.name || 'Output'
    const targetDisplay = `${partName} (${targetId})`
    const action = rule.outputState || rule.action || 'ON'

    if (rule.operator === 'is pressed') {
      return `IF ${inputName} is pressed THEN ${targetDisplay} ${action}`
    }
    return `IF ${inputName} ${rule.operator} ${rule.threshold} THEN ${targetDisplay} ${action}`
  }

  return (
    <div
      style={{
        padding: '20px 28px',
        maxWidth: 1200,
        margin: '0 auto',
        overflowY: 'auto',
        height: '100%',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Simulation Limits Banner */}
      <div
        style={{
          background: 'rgba(2, 132, 199, 0.15)',
          border: '1px solid #0284c7',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12.5,
          color: '#bae6fd',
        }}
      >
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <span>
          <strong>Simulation limits:</strong> this simulates logic and simple sensor values only. It does not model real electrical behavior, timing, noise, or sensor accuracy. Verify on real hardware.
        </span>
      </div>

      {/* Simulation Header & Play/Pause Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1e293b',
          padding: '12px 18px',
          borderRadius: 10,
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🧪</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>Interactive Virtual Simulation</h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Loop rate: 500 ms tick • {isSimulating ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: isSimulating ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isSimulating ? '#4ade80' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isSimulating ? '#22c55e' : '#ef4444',
                boxShadow: isSimulating ? '0 0 8px #22c55e' : 'none',
              }}
            />
            {isSimulating ? 'RUNNING' : 'STOPPED'}
          </div>

          <button
            type="button"
            onClick={onToggleSimulation}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: isSimulating ? '#ef4444' : '#22c55e',
              color: '#ffffff',
            }}
          >
            {isSimulating ? '⏹ Stop Simulation' : '▶ Start Simulation'}
          </button>
        </div>
      </div>

      {/* Grid: Virtual Sensor Controls + Live Visual Outputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Left Column: Virtual Sensor Inputs */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 10,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
            Virtual Sensor Inputs
          </div>

          {/* Render inputs based on placed components */}
          {placedComponents.filter(c => c.part.id !== 'esp32' && c.part.id !== 'resistor' && c.part.id !== 'led' && c.part.id !== 'buzzer').length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
              No sensor or button components on the canvas yet. Add some in the Build tab or Hardware Helper!
            </div>
          ) : (
            placedComponents.map(({ node, part, status }) => {
              if (part.id === 'esp32' || part.id === 'resistor' || part.id === 'led' || part.id === 'buzzer') return null

              return (
                <div
                  key={node.id}
                  style={{
                    background: '#0f172a',
                    border: status.isWired ? '1px solid #334155' : '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: part.color }} />
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                        {part.name} ({node.id})
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        background: status.isWired ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: status.isWired ? '#4ade80' : '#f87171',
                      }}
                    >
                      {status.isWired ? 'Wired OK' : 'Not wired correctly'}
                    </span>
                  </div>

                  {!status.isWired ? (
                    <div style={{ fontSize: 11.5, color: '#f87171', fontStyle: 'italic' }}>
                      Reason: {status.reason}
                    </div>
                  ) : (
                    <div>
                      {/* Button */}
                      {part.id === 'button' && (
                        <div>
                          <button
                            type="button"
                            onMouseDown={() => onSensorChange('button', 1)}
                            onMouseUp={() => onSensorChange('button', 0)}
                            onTouchStart={() => onSensorChange('button', 1)}
                            onTouchEnd={() => onSensorChange('button', 0)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: 6,
                              border: '1px solid #334155',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 13,
                              background: (sensorValues.button === 1) ? '#22c55e' : '#1e293b',
                              color: (sensorValues.button === 1) ? '#ffffff' : '#94a3b8',
                              transition: 'all 0.1s',
                            }}
                          >
                            {sensorValues.button === 1 ? 'PRESSING BUTTON (Active LOW = 0)' : 'Press & Hold Button'}
                          </button>
                        </div>
                      )}

                      {/* Potentiometer */}
                      {part.id === 'potentiometer' && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Dial Position:</span>
                            <span style={{ color: '#9333ea', fontWeight: 600 }}>{sensorValues.potentiometer ?? 0} %</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sensorValues.potentiometer ?? 0}
                            onChange={(e) => onSensorChange('potentiometer', Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#9333ea', cursor: 'pointer' }}
                          />
                        </div>
                      )}

                      {/* Water Level */}
                      {part.id === 'waterlevel' && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Liquid Depth Level:</span>
                            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{sensorValues.waterlevel ?? 0} %</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sensorValues.waterlevel ?? 0}
                            onChange={(e) => onSensorChange('waterlevel', Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
                          />
                        </div>
                      )}

                      {/* DHT22 */}
                      {part.id === 'dht22' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span>Temperature:</span>
                              <span style={{ color: '#f87171', fontWeight: 600 }}>{sensorValues.dht22_temp ?? 25} °C</span>
                            </div>
                            <input
                              type="range"
                              min="-40"
                              max="80"
                              value={sensorValues.dht22_temp ?? 25}
                              onChange={(e) => onSensorChange('dht22_temp', Number(e.target.value))}
                              style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span>Relative Humidity:</span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{sensorValues.dht22_hum ?? 50} %</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sensorValues.dht22_hum ?? 50}
                              onChange={(e) => onSensorChange('dht22_hum', Number(e.target.value))}
                              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* HC-SR04 */}
                      {part.id === 'hcsr04' && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Distance to Obstacle:</span>
                            <span style={{ color: '#818cf8', fontWeight: 600 }}>{sensorValues.hcsr04 ?? 100} cm</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="400"
                            value={sensorValues.hcsr04 ?? 100}
                            onChange={(e) => onSensorChange('hcsr04', Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#4f46e5', cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Live Actuators & Outputs */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 10,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
            Live Physical Outputs
          </div>

          {outputOptions.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
              No LED or Buzzer parts on the canvas yet. Add one in the Build tab to see it respond live to logic rules!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {outputOptions.map(({ id, label, part }) => {
                const node = nodes.find((n) => n.id === id)
                const status = checkComponentWiring(node, nodes, edges)
                const isOn = Boolean(outputStates[id])

                return (
                  <div
                    key={id}
                    style={{
                      background: '#0f172a',
                      border: status.isWired ? '1px solid #334155' : '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: 8,
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11.5, color: status.isWired ? '#94a3b8' : '#f87171' }}>
                        {status.isWired ? `Wired to ${status.gpio}` : `Wiring Error: ${status.reason}`}
                      </div>
                    </div>

                    {/* Actuator Visual Rendering */}
                    <div>
                      {part.id === 'led' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: isOn && status.isWired ? '#ef4444' : '#450a0a',
                              border: '2px solid #7f1d1d',
                              boxShadow: isOn && status.isWired
                                ? '0 0 25px 6px #ef4444, inset 0 0 10px #fca5a5'
                                : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: isOn && status.isWired ? '#f87171' : '#64748b' }}>
                            {isOn && status.isWired ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      )}

                      {part.id === 'buzzer' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              fontSize: 26,
                              transform: isOn && status.isWired ? 'scale(1.15)' : 'scale(1)',
                              filter: isOn && status.isWired ? 'drop-shadow(0 0 8px #f97316)' : 'grayscale(1)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isOn && status.isWired ? '🔊' : '🔈'}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isOn && status.isWired ? '#fb923c' : '#64748b' }}>
                            {isOn && status.isWired ? 'SOUNDING' : 'SILENT'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Logic Rules Editor */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: '16px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>
          Logic Rules Engine
        </div>

        {/* Existing Rules List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {logicRules.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 13, padding: '6px 0' }}>
              No logic rules configured yet. Wire components together or add a rule below!
            </div>
          ) : (
            logicRules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ color: '#38bdf8', fontWeight: 600, marginRight: 8 }}>Rule {idx + 1}:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                    {formatRuleFriendly(rule)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add New Rule Form */}
        <form
          onSubmit={handleCreateRule}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            background: '#0f172a',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px dashed #334155',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>IF</span>

          {/* Input Dropdown */}
          <select
            value={selectedInputId}
            onChange={(e) => handleInputChange(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {inputOptions.length === 0 ? (
              <option value="">No input sensors on canvas</option>
            ) : (
              inputOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            )}
          </select>

          {/* Operator Dropdown */}
          {isButtonSelected ? (
            <select
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 12.5,
              }}
            >
              <option value="is pressed">is pressed</option>
            </select>
          ) : (
            <select
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 12.5,
              }}
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="==">==</option>
            </select>
          )}

          {/* Threshold Input (hidden if button is selected) */}
          {!isButtonSelected && (
            <input
              type="number"
              value={selectedThreshold}
              onChange={(e) => setSelectedThreshold(e.target.value)}
              style={{
                width: 70,
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 12.5,
              }}
            />
          )}

          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>THEN SET</span>

          {/* Output Dropdown */}
          <select
            value={selectedOutputId}
            onChange={(e) => setSelectedOutputId(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {outputOptions.length === 0 ? (
              <option value="">No outputs on canvas</option>
            ) : (
              outputOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            )}
          </select>

          {/* Action Dropdown */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 8px',
              borderRadius: 4,
              fontSize: 12.5,
            }}
          >
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </select>

          <button
            type="submit"
            disabled={inputOptions.length === 0 || outputOptions.length === 0}
            style={{
              padding: '6px 14px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: (inputOptions.length > 0 && outputOptions.length > 0) ? 'pointer' : 'not-allowed',
              opacity: (inputOptions.length > 0 && outputOptions.length > 0) ? 1 : 0.5,
            }}
          >
            Add Rule
          </button>
        </form>
      </div>

      {/* Event Log */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
            Event Log (Last 20 Events)
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Updated on 500ms tick</span>
        </div>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: 11.5,
            maxHeight: 160,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {eventLogs.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic' }}>
              No events recorded yet. Adjust sensors or run simulation to see state updates.
            </div>
          ) : (
            eventLogs.map((log, idx) => (
              <div key={idx} style={{ color: log.includes('ALERT') || log.includes('ON') ? '#fbbf24' : '#94a3b8' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
export default SimulateTab
