import React from 'react'

export function ConnectionChecksPanel({ issues = [] }) {
  const errorCount = issues.filter((i) => i.level === 'error').length
  const warningCount = issues.filter((i) => i.level === 'warning').length
  const okCount = issues.filter((i) => i.level === 'ok').length

  const getBadgeIcon = (level) => {
    switch (level) {
      case 'error':
        return '🔴'
      case 'warning':
        return '🟠'
      case 'info':
        return '🔵'
      case 'ok':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const getBorderColor = (level) => {
    switch (level) {
      case 'error':
        return 'rgba(239, 68, 68, 0.4)'
      case 'warning':
        return 'rgba(249, 115, 22, 0.4)'
      case 'info':
        return 'rgba(56, 189, 248, 0.4)'
      case 'ok':
        return 'rgba(34, 197, 94, 0.3)'
      default:
        return '#334155'
    }
  }

  const getBgColor = (level) => {
    switch (level) {
      case 'error':
        return 'rgba(239, 68, 68, 0.08)'
      case 'warning':
        return 'rgba(249, 115, 22, 0.08)'
      case 'info':
        return 'rgba(56, 189, 248, 0.08)'
      case 'ok':
        return 'rgba(34, 197, 94, 0.08)'
      default:
        return '#1e293b'
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        borderTop: '1px solid #334155',
        paddingTop: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Connection Checks
        </div>

        {/* Summary Line */}
        <div style={{ fontSize: 11, fontWeight: 600 }}>
          {errorCount > 0 && (
            <span style={{ color: '#f87171', marginRight: 6 }}>
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ color: '#fb923c', marginRight: 6 }}>
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && okCount > 0 && (
            <span style={{ color: '#4ade80' }}>All checks passed!</span>
          )}
          {issues.length === 0 && (
            <span style={{ color: '#64748b' }}>No connections</span>
          )}
        </div>
      </div>

      {issues.length === 0 ? (
        <div
          style={{
            padding: '24px 12px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 12,
            fontStyle: 'italic',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: 8,
            border: '1px dashed #334155',
          }}
        >
          Draw wires between the yellow dots to see checks here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
          {issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: getBgColor(issue.level),
                border: `1px solid ${getBorderColor(issue.level)}`,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, lineHeight: '16px' }}>{getBadgeIcon(issue.level)}</span>
                <span style={{ fontWeight: 600, color: '#f8fafc', lineHeight: '16px' }}>
                  {issue.title}
                </span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 11.5, lineHeight: '16px', paddingLeft: 22 }}>
                {issue.fix}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div
        style={{
          fontSize: 10,
          color: '#64748b',
          lineHeight: '14px',
          fontStyle: 'italic',
          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          paddingTop: 8,
          marginTop: 4,
        }}
      >
        These are rule-based checks, not a full electrical simulation. Always verify real hardware safely.
      </div>
    </div>
  )
}
export default ConnectionChecksPanel
