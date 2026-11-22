import React, { useState } from 'react'
import { PROJECT_TEMPLATES, matchProjectTemplate } from '../helper'

export function HardwareHelperTab({ onAddPartsToCanvas, onAutoWireTemplate }) {
  const [query, setQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(PROJECT_TEMPLATES[0])
  const [matchResult, setMatchResult] = useState(() => matchProjectTemplate(''))

  const handleSearch = (text) => {
    setQuery(text)
    const result = matchProjectTemplate(text)
    setMatchResult(result)
    if (result.template) {
      setSelectedTemplate(result.template)
    }
  }

  const handleSelectExample = (tmpl) => {
    setSelectedTemplate(tmpl)
    setQuery(tmpl.title)
    setMatchResult({ template: tmpl, isFallback: false })
  }

  return (
    <div
      style={{
        padding: '24px 32px',
        maxWidth: 1000,
        margin: '0 auto',
        overflowY: 'auto',
        height: '100%',
        color: '#e2e8f0',
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: 22, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>💡 Hardware Helper & Project Blueprints</span>
        </h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
          Describe what you want to build. The helper matches your goal against embedded project templates to recommend components and verify pin allocations.
        </p>
      </div>

      {/* Search Input Box */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Describe your project (e.g. 'water level monitor', 'distance sensor parking alarm', 'temperature alert')..."
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingLeft: 40,
              fontSize: 14,
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          <span style={{ position: 'absolute', left: 14, top: 12, fontSize: 16, color: '#94a3b8' }}>🔍</span>
          {query && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              style={{
                position: 'absolute',
                right: 12,
                top: 10,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 6 Clickable Example Projects */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          Or Select an Example Project:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {PROJECT_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate?.id === tmpl.id && !matchResult.isFallback
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectExample(tmpl)}
                style={{
                  padding: '10px 14px',
                  background: isSelected ? 'rgba(2, 132, 199, 0.2)' : '#1e293b',
                  border: isSelected ? '1px solid #0284c7' : '1px solid #334155',
                  borderRadius: 8,
                  color: '#f8fafc',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 18 }}>
                  {tmpl.id.includes('water') ? '💧' : tmpl.id.includes('temp') ? '🌡️' : tmpl.id.includes('distance') ? '🚗' : tmpl.id.includes('button') ? '🔘' : tmpl.id.includes('dimmer') ? '🎛️' : '🚨'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{tmpl.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Fallback Notice or Active Template Details */}
      {matchResult.isFallback ? (
        <div
          style={{
            padding: '24px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            textAlign: 'center',
            color: '#fbbf24',
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>💡</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No exact match found</div>
          <p style={{ margin: 0, color: '#e2e8f0', fontSize: 13.5 }}>
            {matchResult.fallbackMessage}
          </p>
        </div>
      ) : selectedTemplate && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>
                  {selectedTemplate.id.includes('water') ? '💧' : selectedTemplate.id.includes('temp') ? '🌡️' : selectedTemplate.id.includes('distance') ? '🚗' : selectedTemplate.id.includes('button') ? '🔘' : selectedTemplate.id.includes('dimmer') ? '🎛️' : '🚨'}
                </span>
                <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc' }}>{selectedTemplate.title}</h3>
              </div>
              <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: 13, lineHeight: '20px' }}>
                {selectedTemplate.summary}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => onAddPartsToCanvas(selectedTemplate.recommendedParts)}
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
                <span>➕ Add parts to canvas</span>
              </button>
              <button
                type="button"
                onClick={() => onAutoWireTemplate(selectedTemplate)}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⚡ Auto-wire suggested connections</span>
              </button>
            </div>
          </div>

          {/* Typical Pin Allocation */}
          <div style={{ background: '#0f172a', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginRight: 8 }}>
              Typical Pin Allocations:
            </span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>
              {selectedTemplate.pinsUsage}
            </span>
          </div>

          {/* Recommended Parts List */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Recommended Parts & Quantities:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {selectedTemplate.recommendedParts.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 11, background: '#334155', color: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>
                      Qty: {item.qty}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: '16px' }}>
                    {item.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default HardwareHelperTab
