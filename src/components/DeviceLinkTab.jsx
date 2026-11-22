import React, { useState, useEffect, useRef } from 'react'
import { isValidJsonLine } from '../deviceLink'

export function DeviceLinkTab({
  activeSourceType = 'simulated',
  onChangeSourceType,
  deviceStatus = 'Disconnected',
  isSourceRunning = false,
  onStartSource,
  onStopSource,
  serialLogs = [],
  onClearLogs,
  isWebSerialSupported = true,
}) {
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const terminalEndRef = useRef(null)

  // Auto-scroll terminal to bottom when new logs arrive (unless paused)
  useEffect(() => {
    if (!isAutoScrollPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [serialLogs, isAutoScrollPaused])

  const handleCopyLogs = () => {
    const text = serialLogs.join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected =
    deviceStatus === 'Simulated ESP32 running' || deviceStatus === 'Connected'
  const isConnecting = deviceStatus === 'Connecting...'

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
      {/* Top Banner / Heading */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1e293b',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid #334155',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🔌 Device Link: Hardware-Software Pipeline</span>
          </h2>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
            Stream telemetry between your virtual canvas, the Dashboard, and a physical ESP32 over USB at 115200 baud.
          </div>
        </div>

        {/* Global status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            background: isConnected
              ? 'rgba(34, 197, 94, 0.15)'
              : isConnecting
              ? 'rgba(234, 179, 8, 0.15)'
              : 'rgba(100, 116, 139, 0.2)',
            border: `1px solid ${
              isConnected
                ? '#22c55e'
                : isConnecting
                ? '#eab308'
                : '#475569'
            }`,
            fontSize: 12.5,
            fontWeight: 600,
            color: isConnected
              ? '#4ade80'
              : isConnecting
              ? '#fde047'
              : '#94a3b8',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected
                ? '#22c55e'
                : isConnecting
                ? '#eab308'
                : '#64748b',
              boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
            }}
          />
          {deviceStatus}
        </div>
      </div>

      {/* Main Grid: Data Source Config & Protocol Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
          gap: 20,
        }}
      >
        {/* Card 1: Data Source Selector */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Telemetry Data Source
          </div>

          {/* Radio Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Option A: Simulated ESP32 */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background:
                  activeSourceType === 'simulated' ? '#0f172a' : '#1e293b',
                border: `1px solid ${
                  activeSourceType === 'simulated' ? '#0284c7' : '#334155'
                }`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="dataSource"
                value="simulated"
                checked={activeSourceType === 'simulated'}
                onChange={() => onChangeSourceType('simulated')}
                style={{ marginTop: 3, accentColor: '#38bdf8' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>
                  Simulated ESP32 (built-in)
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  Runs virtual firmware every 500 ms using Simulate tab sliders and logic rules. No hardware required.
                </div>
              </div>
            </label>

            {/* Option B: Real ESP32 via USB */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background:
                  activeSourceType === 'serial' ? '#0f172a' : '#1e293b',
                border: `1px solid ${
                  activeSourceType === 'serial' ? '#0284c7' : '#334155'
                }`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="dataSource"
                value="serial"
                checked={activeSourceType === 'serial'}
                onChange={() => onChangeSourceType('serial')}
                style={{ marginTop: 3, accentColor: '#38bdf8' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>
                  Real ESP32 via USB (Web Serial)
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  Connects to a physical board plugged into your computer via USB at 115200 baud.
                </div>
              </div>
            </label>
          </div>

          {/* Web Serial Browser Compatibility Warning */}
          {activeSourceType === 'serial' && !isWebSerialSupported && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: 12,
                lineHeight: '18px',
              }}
            >
              ⚠️ <strong>Web Serial needs Chrome or Edge on a desktop.</strong> The Web Serial API is not supported in this browser. You can still use the built-in Simulated ESP32 mode.
            </div>
          )}

          {/* Actions: Start/Connect vs Stop/Disconnect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            {!isSourceRunning ? (
              <button
                type="button"
                onClick={onStartSource}
                disabled={activeSourceType === 'serial' && !isWebSerialSupported}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 6,
                  background:
                    activeSourceType === 'serial' && !isWebSerialSupported
                      ? '#334155'
                      : '#0284c7',
                  color:
                    activeSourceType === 'serial' && !isWebSerialSupported
                      ? '#64748b'
                      : '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor:
                    activeSourceType === 'serial' && !isWebSerialSupported
                      ? 'not-allowed'
                      : 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <span>⚡</span>
                {activeSourceType === 'serial' ? 'Connect to ESP32 (USB)' : 'Start Simulated ESP32'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopSource}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 6,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <span>⏹</span>
                {activeSourceType === 'serial' ? 'Disconnect USB' : 'Stop Simulated ESP32'}
              </button>
            )}

            <span style={{ fontSize: 12, color: '#64748b' }}>
              Baud: 115200 | Rate: ~2 Hz
            </span>
          </div>

          {/* Educational Notes */}
          <div
            style={{
              marginTop: 6,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              fontSize: 11.5,
              color: '#94a3b8',
              lineHeight: '17px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>
              📌 <em>Real hardware mode needs an ESP32 running the firmware from the Build Guide tab, connected by USB.</em>
            </div>
            <div>
              💡 <em>Real ESP32 mode follows the Web Serial standard but needs a real board, and the simulated source is for learning the workflow.</em>
            </div>
          </div>
        </div>

        {/* Card 2: Data Protocol Card */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Device Link Protocol Specification
          </div>

          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: '18px' }}>
            The pipeline communicates using <strong>Newline-Delimited JSON (NDJSON)</strong> at <strong>115200 baud</strong>. Real firmware and simulated firmware both emit this exact structure:
          </div>

          {/* JSON Protocol Box */}
          <div
            style={{
              background: '#090d16',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '12px 14px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: 11.5,
              color: '#38bdf8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: '19px',
            }}
          >
            {`{"t":12345,"sensors":{"water_level_pct":73,"temperature_c":24.5,"humidity_pct":52,"distance_cm":85,"pot_pct":40,"button":0},"actuators":{"led-1":"ON","buzzer-1":"OFF"}}`}
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: '#94a3b8',
              lineHeight: '17px',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <div>
              • <strong>`t`</strong>: Milliseconds elapsed on device (via <code>millis()</code>).
            </div>
            <div>
              • <strong>`sensors`</strong>: Normalized metrics for sensors wired on your canvas.
            </div>
            <div>
              • <strong>`actuators`</strong>: Canvas part IDs (<code>led-1</code>, <code>buzzer-1</code>) and their state (<code>"ON"</code> or <code>"OFF"</code>).
            </div>
            <div>
              • <strong>Arduino Firmware</strong>: Built automatically in the <strong>Build Guide</strong> tab using native <code>Serial.print()</code> (no external libraries required).
            </div>
          </div>
        </div>
      </div>

      {/* Serial Monitor Panel */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          minHeight: 380,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
            paddingBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🖥️</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>
              Serial Monitor (115200 baud)
            </span>
            <span
              style={{
                fontSize: 11,
                background: '#0f172a',
                color: '#94a3b8',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #334155',
              }}
            >
              {serialLogs.length} / 200 lines
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setIsAutoScrollPaused((prev) => !prev)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: isAutoScrollPaused ? '#475569' : '#0f172a',
                color: isAutoScrollPaused ? '#f8fafc' : '#94a3b8',
                border: '1px solid #334155',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isAutoScrollPaused ? '▶ Auto-scroll: Paused' : '⏸ Auto-scroll: Active'}
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyLogs}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: copied ? '#059669' : '#0f172a',
                color: '#ffffff',
                border: '1px solid #334155',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>

            {/* Clear button */}
            <button
              type="button"
              onClick={onClearLogs}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: '#0f172a',
                color: '#f87171',
                border: '1px solid #334155',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Terminal Screen */}
        <div
          style={{
            flex: 1,
            background: '#020617',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '14px',
            overflowY: 'auto',
            maxHeight: 420,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 12,
            lineHeight: '19px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {serialLogs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#475569',
                padding: '40px 10px',
                fontStyle: 'italic',
                fontSize: 13,
              }}
            >
              Serial monitor is idle. Click "{activeSourceType === 'serial' ? 'Connect to ESP32 (USB)' : 'Start Simulated ESP32'}" above to view live telemetry.
            </div>
          ) : (
            serialLogs.map((line, index) => {
              const isJson = isValidJsonLine(line)
              return (
                <div
                  key={index}
                  style={{
                    color: isJson ? '#38bdf8' : '#64748b',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  <span style={{ color: '#334155', userSelect: 'none', marginRight: 8, fontSize: 10.5 }}>
                    {(index + 1).toString().padStart(3, '0')}
                  </span>
                  {line}
                </div>
              )
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  )
}
export default DeviceLinkTab
