import React, { useRef } from 'react'

export function Header({
  activeTab,
  onTabChange,
  onSaveProject,
  onLoadProject,
  onClearCanvas,
}) {
  const fileInputRef = useRef(null)

  const tabs = [
    { id: 'build', label: 'Build' },
    { id: 'helper', label: 'Hardware Helper' },
    { id: 'simulate', label: 'Simulate' },
    { id: 'projector', label: 'Projector Demo' },
    { id: 'devicelink', label: 'Device Link' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'guide', label: 'Build Guide' },
  ]

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result)
        onLoadProject(json)
      } catch (err) {
        alert('Invalid project JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header
      style={{
        height: 52,
        background: '#0b1120',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        color: '#e2e8f0',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Title & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, color: '#38bdf8' }}>⚡</span>
          <span style={{ fontWeight: 'bold', fontSize: 17, letterSpacing: '0.2px' }}>
            Circuit Builder
          </span>
          <span
            style={{
              fontSize: 10,
              background: '#0369a1',
              color: '#e0f2fe',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            ESP32 Lab
          </span>
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, background: '#1e293b', padding: 3, borderRadius: 8 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#0284c7' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* Action Buttons: Save, Load, Clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={onSaveProject}
          title="Download circuit project as a .json file"
          style={{
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 500,
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Save project
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Load circuit from a .json file"
          style={{
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 500,
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Load project
        </button>
        <button
          type="button"
          onClick={onClearCanvas}
          title="Reset canvas to initial ESP32"
          style={{
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 500,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Clear canvas
        </button>
      </div>
    </header>
  )
}
export default Header
