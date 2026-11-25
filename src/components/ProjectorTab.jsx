import React, { useState, useRef, useEffect } from 'react'
import { PARTS } from '../parts'
import { checkComponentWiring } from '../simulation'

// Example NEC codes for the simulation.
// For a REAL projector, capture the true codes from its original remote with the IR Receiver.
const IR_CODES = {
  POWER: { label: 'Power', code: '0x00FF02FD' },
  INPUT: { label: 'Input', code: '0x00FF30CF' },
  VOL_UP: { label: 'Vol +', code: '0x00FF18E7' },
  VOL_DOWN: { label: 'Vol -', code: '0x00FF7A85' },
}

const INPUTS = ['HDMI 1', 'HDMI 2', 'VGA']

const getPartId = (node) =>
  node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]

const card = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: 16,
}

export function ProjectorTab({ nodes = [], edges = [] }) {
  const [proj, setProj] = useState({ on: false, input: 0, volume: 5 })
  const [stage, setStage] = useState(0) // 0 = idle, 1 = phone, 2 = ESP32, 3 = IR LED, 4 = projector
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])
  const projRef = useRef({ on: false, input: 0, volume: 5 })
  const timers = useRef([])

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  // Find the projector in the circuit and check the wiring
  const projectorNode = nodes.find((n) => getPartId(n) === 'projector')
  const status = projectorNode
    ? checkComponentWiring(projectorNode, nodes, edges)
    : { isWired: false, reason: 'Add an LCD Projector to the canvas (Build tab)' }
  const ready = Boolean(status.isWired)
  const gpio = status.gpio || 'GPIO'

  const addLog = (from, text) => {
    const time = new Date().toLocaleTimeString()
    setLog((prev) => [{ time, from, text }, ...prev].slice(0, 30))
  }

  const applyCommand = (key) => {
    const cur = projRef.current
    const next = { ...cur }
    let msg = ''

    if (!cur.on && key !== 'POWER') {
      msg = `Projector is off, so it ignored ${IR_CODES[key].label}`
    } else if (key === 'POWER') {
      next.on = !cur.on
      msg = next.on ? 'Projector turned ON' : 'Projector turned OFF'
    } else if (key === 'INPUT') {
      next.input = (cur.input + 1) % INPUTS.length
      msg = `Input changed to ${INPUTS[next.input]}`
    } else if (key === 'VOL_UP') {
      next.volume = Math.min(10, cur.volume + 1)
      msg = `Volume ${next.volume}/10`
    } else if (key === 'VOL_DOWN') {
      next.volume = Math.max(0, cur.volume - 1)
      msg = `Volume ${next.volume}/10`
    }

    projRef.current = next
    setProj(next)
    addLog('Projector', msg)
  }

  const sendCommand = (key) => {
    if (busy || !ready) return
    const { label, code } = IR_CODES[key]
    setBusy(true)

    const steps = [
      { delay: 0, run: () => { setStage(1); addLog('Phone', `Tapped ${label}: HTTP GET /cmd?key=${key}`) } },
      { delay: 700, run: () => { setStage(2); addLog('ESP32', `Received ${key}, looked up NEC code ${code}, driving ${gpio} at 38 kHz`) } },
      { delay: 1400, run: () => { setStage(3); addLog('IR LED', `Transmitting ${code} as infrared pulses`) } },
      { delay: 2100, run: () => { setStage(4); applyCommand(key) } },
      { delay: 2800, run: () => { setStage(0); setBusy(false) } },
    ]

    steps.forEach((s) => {
      timers.current.push(setTimeout(s.run, s.delay))
    })
  }

  const stageBox = (index, title, subtitle) => {
    const active = stage === index
    return (
      <div
        style={{
          flex: 1,
          minWidth: 110,
          padding: '10px 8px',
          textAlign: 'center',
          borderRadius: 8,
          border: `1px solid ${active ? '#38bdf8' : '#334155'}`,
          background: active ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
          color: active ? '#e0f2fe' : '#94a3b8',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>{subtitle}</div>
      </div>
    )
  }

  const phoneButton = (key, extra = {}) => (
    <button
      key={key}
      type="button"
      onClick={() => sendCommand(key)}
      disabled={!ready || busy}
      style={{
        padding: '12px 0',
        fontSize: 14,
        fontWeight: 600,
        color: '#ffffff',
        background: ready ? '#0284c7' : '#334155',
        border: 'none',
        borderRadius: 10,
        cursor: ready && !busy ? 'pointer' : 'not-allowed',
        opacity: busy ? 0.6 : 1,
        ...extra,
      }}
    >
      {IR_CODES[key].label}
    </button>
  )

  return (
    <div style={{ padding: 20, color: '#e2e8f0', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Phone-Controlled LCD Projector</h2>
      <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#94a3b8' }}>
        Phone → Wi-Fi → ESP32 → IR LED → Projector. Everything here is simulated.
      </p>

      {/* Circuit status */}
      <div
        style={{
          ...card,
          marginBottom: 16,
          borderColor: ready ? '#16a34a' : '#b45309',
          background: ready ? 'rgba(22, 163, 74, 0.1)' : 'rgba(180, 83, 9, 0.1)',
          fontSize: 13,
        }}
      >
        {ready
          ? `Circuit ready: ESP32 ${gpio} drives the IR LED, and the IR Beam reaches the projector.`
          : `Circuit not ready: ${status.reason}. Fix it in the Build tab.`}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Phone */}
        <div style={{ ...card, width: 250 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Phone web page</div>
          <div
            style={{
              background: '#020617',
              border: '3px solid #475569',
              borderRadius: 28,
              padding: '18px 14px',
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              Projector Remote
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {phoneButton('POWER', { background: ready ? '#dc2626' : '#334155' })}
              {phoneButton('INPUT')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {phoneButton('VOL_DOWN')}
                {phoneButton('VOL_UP')}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline and log */}
        <div style={{ ...card, flex: 1, minWidth: 320 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Signal path</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stageBox(1, 'Phone', 'HTTP over Wi-Fi')}
            {stageBox(2, 'ESP32', 'Finds IR code')}
            {stageBox(3, 'IR LED', 'Sends pulses')}
            {stageBox(4, 'Projector', 'Reacts')}
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8', margin: '16px 0 8px' }}>Activity log</div>
          <div
            style={{
              background: '#020617',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: 10,
              height: 190,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {log.length === 0 && (
              <div style={{ color: '#64748b' }}>Tap a button on the phone to start.</div>
            )}
            {log.map((entry, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>{entry.time} </span>
                <span style={{ color: '#38bdf8' }}>[{entry.from}] </span>
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projector */}
        <div style={{ ...card, width: 300 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Virtual projector</div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, border: '1px solid #475569' }}>
            <div
              style={{
                height: 130,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: proj.on
                  ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
                  : '#020617',
                color: proj.on ? '#ffffff' : '#475569',
                transition: 'all 0.3s ease',
                boxShadow: proj.on ? '0 0 24px rgba(56, 189, 248, 0.5)' : 'none',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {proj.on ? INPUTS[proj.input] : 'Standby'}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {proj.on ? 'Projecting…' : 'Screen off'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: proj.on ? '#22c55e' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              <span>{proj.on ? 'Lamp on' : 'Standby'}</span>
              <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>Volume {proj.volume}/10</span>
            </div>
            <div style={{ height: 6, background: '#0f172a', borderRadius: 3, marginTop: 6 }}>
              <div
                style={{
                  height: 6,
                  width: `${proj.volume * 10}%`,
                  background: '#38bdf8',
                  borderRadius: 3,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
        The IR codes shown are examples. A real projector needs its own codes, which you can capture from its
        original remote with an IR receiver. Compatibility varies by projector model.
      </p>
    </div>
  )
}

export default ProjectorTab
