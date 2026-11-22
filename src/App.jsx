import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  ConnectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { PARTS } from './parts'
import { analyzeCircuit } from './checks'
import { checkComponentWiring, evaluateLogicRules } from './simulation'
import Header from './components/Header'
import ConnectionChecksPanel from './components/ConnectionChecksPanel'
import HardwareHelperTab from './components/HardwareHelperTab'
import SimulateTab from './components/SimulateTab'
import DashboardTab from './components/DashboardTab'
import BuildGuideTab from './components/BuildGuideTab'

const boxStyle = {
  background: '#1e293b',
  borderRadius: 10,
  color: '#e2e8f0',
  fontSize: 13,
  minWidth: 155,
  overflow: 'hidden',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

const rowStyle = {
  position: 'relative',
  padding: '5px 12px',
}

function GenericPartNode({ id, data, selected }) {
  const partId = data?.partId || (PARTS[data?.type] ? data.type : null) || id.split('-')[0]
  const part = PARTS[partId] || PARTS.esp32

  return (
    <div
      style={{
        ...boxStyle,
        border: selected ? '2px solid #facc15' : `2px solid ${part.color || '#38bdf8'}`,
        boxShadow: selected
          ? '0 0 12px rgba(250, 204, 21, 0.5)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          background: part.color || '#0369a1',
          padding: '6px 10px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#ffffff',
          fontSize: 13,
        }}
      >
        {part.name}
      </div>
      {part.pins.map((pin) => {
        const isRight = pin.side === 'right'
        return (
          <div
            key={pin.name}
            style={{
              ...rowStyle,
              textAlign: isRight ? 'right' : 'left',
              color: '#e2e8f0',
            }}
          >
            {pin.name}
            <Handle
              type="source"
              id={pin.name}
              position={isRight ? Position.Right : Position.Left}
              style={{
                background: '#facc15',
                width: 10,
                height: 10,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

const nodeTypes = {
  part: GenericPartNode,
  esp32: GenericPartNode,
  led: GenericPartNode,
  resistor: GenericPartNode,
  button: GenericPartNode,
  dht22: GenericPartNode,
  hcsr04: GenericPartNode,
  potentiometer: GenericPartNode,
  waterlevel: GenericPartNode,
  buzzer: GenericPartNode,
}

const defaultInitialNodes = [
  {
    id: 'esp32',
    type: 'part',
    position: { x: 80, y: 200 },
    data: { partId: 'esp32' },
  },
]

const STORAGE_KEY = 'circuit-builder-saved-state'

function loadSavedCircuit() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        return {
          nodes: parsed.nodes,
          edges: Array.isArray(parsed.edges) ? parsed.edges : [],
          logicRules: Array.isArray(parsed.logicRules) ? parsed.logicRules : null,
        }
      }
    }
  } catch (err) {
    console.warn('Failed to restore from localStorage', err)
  }
  return null
}

function CircuitBuilder() {
  const savedState = useRef(loadSavedCircuit())
  const initialNodesState = savedState.current?.nodes || defaultInitialNodes
  const initialEdgesState = savedState.current?.edges || []

  // Shared circuit state
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodesState)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdgesState)
  const [activeTab, setActiveTab] = useState('build')

  const { screenToFlowPosition, fitView } = useReactFlow()
  const reactFlowWrapper = useRef(null)
  const initialFitDone = useRef(false)
  const spawnCountRef = useRef(nodes.length)

  // Simulation & Sensor States (Shared in App)
  const [sensorValues, setSensorValues] = useState({
    waterlevel: 35,
    hcsr04: 85,
    dht22_temp: 24,
    dht22_hum: 52,
    potentiometer: 40,
    button: 0,
  })

  const [sensorHistory, setSensorHistory] = useState({
    waterlevel: [35, 35, 35],
    hcsr04: [85, 85, 85],
    dht22_temp: [24, 24, 24],
    dht22_hum: [52, 52, 52],
    potentiometer: [40, 40, 40],
  })

  // BUG 1 FIX: Start logicRules empty instead of dummy unassigned rules
  const [logicRules, setLogicRules] = useState(
    savedState.current?.logicRules || []
  )

  const [isSimulating, setIsSimulating] = useState(true)
  const [isFeedPaused, setIsFeedPaused] = useState(false)
  const [eventLogs, setEventLogs] = useState([])

  const partCounts = useRef({
    esp32: 1,
    led: 0,
    resistor: 0,
    button: 0,
    dht22: 0,
    hcsr04: 0,
    potentiometer: 0,
    waterlevel: 0,
    buzzer: 0,
  })

  // Fit view once on load
  useEffect(() => {
    if (!initialFitDone.current) {
      initialFitDone.current = true
      fitView({ padding: 0.3 })
      const timer = setTimeout(() => {
        fitView({ padding: 0.3 })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [fitView])

  // Autosave to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ nodes, edges, logicRules })
      )
    } catch (err) {
      console.warn('Failed to save to localStorage', err)
    }
  }, [nodes, edges, logicRules])

  // Connection Checks
  const issues = useMemo(() => analyzeCircuit(nodes, edges), [nodes, edges])

  // Colored edges based on check issues
  const coloredEdges = useMemo(() => {
    const errorEdges = new Set()
    const warningEdges = new Set()

    issues.forEach((issue) => {
      if (issue.level === 'error') {
        issue.edgeIds.forEach((id) => errorEdges.add(id))
      } else if (issue.level === 'warning') {
        issue.edgeIds.forEach((id) => warningEdges.add(id))
      }
    })

    return edges.map((edge) => {
      if (errorEdges.has(edge.id)) {
        return {
          ...edge,
          style: { stroke: '#ef4444', strokeWidth: 3 },
        }
      }
      if (warningEdges.has(edge.id)) {
        return {
          ...edge,
          style: { stroke: '#f97316', strokeWidth: 2.5 },
        }
      }
      return {
        ...edge,
        style: { stroke: '#facc15', strokeWidth: 2 },
      }
    })
  }, [edges, issues])

  // Component statuses for simulation
  const componentStatuses = useMemo(() => {
    const map = {}
    nodes.forEach((n) => {
      map[n.id] = checkComponentWiring(n, nodes, edges)
    })
    return map
  }, [nodes, edges])

  // BUG 1 FIX: Automatically create example rule only if rules list is empty AND there is at least one wired input and one wired output
  useEffect(() => {
    if (logicRules.length > 0) return

    const wiredInputs = []
    nodes.forEach((node) => {
      const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
      const part = PARTS[partKey]
      if (!part) return
      const status = checkComponentWiring(node, nodes, edges)
      if (!status.isWired) return

      if (part.id === 'waterlevel') {
        wiredInputs.push({ inputPartId: node.id, inputValueName: 'Water Level', sensorKey: 'waterlevel', op: '>', threshold: 60 })
      } else if (part.id === 'hcsr04') {
        wiredInputs.push({ inputPartId: node.id, inputValueName: 'Distance', sensorKey: 'hcsr04', op: '<', threshold: 20 })
      } else if (part.id === 'dht22') {
        wiredInputs.push({ inputPartId: node.id, inputValueName: 'Temperature', sensorKey: 'dht22_temp', op: '>', threshold: 30 })
      } else if (part.id === 'potentiometer') {
        wiredInputs.push({ inputPartId: node.id, inputValueName: 'Potentiometer', sensorKey: 'potentiometer', op: '>', threshold: 50 })
      } else if (part.id === 'button') {
        wiredInputs.push({ inputPartId: node.id, inputValueName: 'Button', sensorKey: 'button', op: 'is pressed', threshold: 1 })
      }
    })

    const wiredOutputs = []
    nodes.forEach((node) => {
      const partKey = node.data?.partId || (PARTS[node.type] ? node.type : null) || node.id.split('-')[0]
      const part = PARTS[partKey]
      if (!part) return
      if (part.id === 'led' || part.id === 'buzzer') {
        const status = checkComponentWiring(node, nodes, edges)
        if (status.isWired) {
          wiredOutputs.push(node)
        }
      }
    })

    if (wiredInputs.length > 0 && wiredOutputs.length > 0) {
      const inp = wiredInputs[0]
      const outp = wiredOutputs[0]
      setLogicRules([
        {
          id: `rule-${Date.now()}`,
          inputPartId: inp.inputPartId,
          inputValueName: inp.inputValueName,
          sensorKey: inp.sensorKey,
          operator: inp.op,
          threshold: inp.threshold,
          outputPartId: outp.id,
          outputState: 'ON',
          targetNodeId: outp.id,
          action: 'ON',
        },
      ])
    }
  }, [nodes, edges, logicRules])

  // Output States evaluated by Logic Rules
  const outputStates = useMemo(() => {
    return evaluateLogicRules(logicRules, sensorValues, componentStatuses)
  }, [logicRules, sensorValues, componentStatuses])

  // Simulation tick loop (500 ms): Updates sensorHistory for Dashboard without overwriting user sliders
  useEffect(() => {
    if (!isSimulating || isFeedPaused) return

    const interval = setInterval(() => {
      setSensorHistory((prev) => {
        const maxSamples = 60
        return {
          waterlevel: [...(prev.waterlevel || []).slice(-maxSamples + 1), sensorValues.waterlevel ?? 0],
          hcsr04: [...(prev.hcsr04 || []).slice(-maxSamples + 1), sensorValues.hcsr04 ?? 100],
          dht22_temp: [...(prev.dht22_temp || []).slice(-maxSamples + 1), sensorValues.dht22_temp ?? 25],
          dht22_hum: [...(prev.dht22_hum || []).slice(-maxSamples + 1), sensorValues.dht22_hum ?? 50],
          potentiometer: [...(prev.potentiometer || []).slice(-maxSamples + 1), sensorValues.potentiometer ?? 0],
        }
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isSimulating, isFeedPaused, sensorValues])

  // Track output changes for event log
  const prevOutputStatesRef = useRef({})
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString()
    Object.entries(outputStates).forEach(([nodeId, state]) => {
      const prevState = prevOutputStatesRef.current[nodeId]
      if (prevState !== undefined && prevState !== state) {
        const msg = `[${timeStr}] ${nodeId} switched to ${state ? 'ON (ACTIVE)' : 'OFF (IDLE)'}`
        setEventLogs((prev) => [msg, ...prev.slice(0, 19)])
      }
    })
    prevOutputStatesRef.current = { ...outputStates }
  }, [outputStates])

  // Clean up connected edges if nodes are removed
  const onNodesChange = useCallback(
    (changes) => {
      onNodesChangeBase(changes)
      const removedIds = new Set(
        changes.filter((c) => c.type === 'remove').map((c) => c.id)
      )
      if (removedIds.size > 0) {
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              !removedIds.has(edge.source) && !removedIds.has(edge.target)
          )
        )
      }
    },
    [onNodesChangeBase, setEdges]
  )

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, style: { stroke: '#facc15', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  )

  const onNodeClick = useCallback(
    (_, clickedNode) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === clickedNode.id,
        }))
      )
    },
    [setNodes]
  )

  const onPaneClick = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
  }, [setNodes])

  // Handle Backspace or Delete to remove selected nodes or edges
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const activeTag = document.activeElement?.tagName
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return

        setNodes((nds) => {
          const toRemove = new Set(
            nds.filter((n) => n.selected).map((n) => n.id)
          )
          if (toRemove.size > 0) {
            setEdges((eds) =>
              eds.filter(
                (edge) =>
                  !edge.selected &&
                  !toRemove.has(edge.source) &&
                  !toRemove.has(edge.target)
              )
            )
            return nds.filter((n) => !toRemove.has(n.id))
          }
          return nds
        })

        setEdges((eds) => eds.filter((edge) => !edge.selected))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setNodes, setEdges])

  // Add part to canvas at visible center
  const addPart = (partKey) => {
    const nextNum = (partCounts.current[partKey] || 0) + 1
    partCounts.current[partKey] = nextNum
    const newId = `${partKey}-${nextNum}`

    let centerX = window.innerWidth / 2
    let centerY = window.innerHeight / 2

    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0) {
        centerX = bounds.left + bounds.width / 2
        centerY = bounds.top + bounds.height / 2
      }
    }

    const centerPos = screenToFlowPosition({ x: centerX, y: centerY })

    const offset = (spawnCountRef.current % 10) * 30
    spawnCountRef.current += 1

    const newNode = {
      id: newId,
      type: 'part',
      position: {
        x: Math.round(centerPos.x + offset),
        y: Math.round(centerPos.y + offset),
      },
      data: { partId: partKey },
      selected: true,
    }

    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: false })).concat(newNode)
    )
  }

  // Hardware helper handlers
  const handleAddHelperParts = (recommendedParts = []) => {
    recommendedParts.forEach((item) => {
      if (item.partId === 'esp32' && nodes.some((n) => n.id === 'esp32')) {
        return
      }
      for (let i = 0; i < item.qty; i++) {
        addPart(item.partId)
      }
    })
    setActiveTab('build')
    setTimeout(() => fitView({ padding: 0.3 }), 100)
  }

  const handleAutoWireTemplate = (template) => {
    if (!template?.wireTemplate) return
    const { nodes: newNodes, edges: newEdges } = template.wireTemplate()
    setNodes(newNodes)
    setEdges(newEdges)
    if (template.defaultRules) {
      setLogicRules(template.defaultRules)
    }
    setActiveTab('build')
    setTimeout(() => fitView({ padding: 0.3 }), 100)
  }

  // Save / Load / Clear project actions
  const handleSaveProject = () => {
    const project = {
      version: '2.0',
      title: 'ESP32 Virtual Lab Project',
      timestamp: new Date().toISOString(),
      nodes,
      edges,
      logicRules,
      sensorValues,
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'esp32_circuit_project.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadProject = (json) => {
    if (json && Array.isArray(json.nodes)) {
      setNodes(json.nodes)
      setEdges(Array.isArray(json.edges) ? json.edges : [])
      if (Array.isArray(json.logicRules)) setLogicRules(json.logicRules)
      if (json.sensorValues) setSensorValues(json.sensorValues)
      setActiveTab('build')
      setTimeout(() => fitView({ padding: 0.3 }), 80)
    }
  }

  const handleClearCanvas = () => {
    if (window.confirm('Reset canvas to starting ESP32? All current wires and parts will be cleared.')) {
      setNodes(defaultInitialNodes)
      setEdges([])
      setLogicRules([])
      setActiveTab('build')
      setTimeout(() => fitView({ padding: 0.3 }), 80)
    }
  }

  // Selected component for Component Guide
  const selectedNode = nodes.find((n) => n.selected)
  const selectedPartId = selectedNode
    ? selectedNode.data?.partId || selectedNode.id.split('-')[0]
    : null
  const selectedPart = selectedPartId ? PARTS[selectedPartId] : null

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        color: '#e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Top Header with 5 Tabs and Save/Load/Clear buttons */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onClearCanvas={handleClearCanvas}
      />

      {/* Main Workspace based on Active Tab */}
      <div style={{ flex: 1, height: 'calc(100vh - 52px)', overflow: 'hidden', position: 'relative' }}>
        {/* TAB 1: BUILD CANVAS */}
        {activeTab === 'build' && (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Left Sidebar (Parts Library) */}
            <aside
              style={{
                width: 230,
                minWidth: 230,
                maxWidth: 230,
                background: '#0f172a',
                borderRight: '1px solid #334155',
                padding: '14px 12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flexShrink: 0,
                zIndex: 5,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                  }}
                >
                  Parts Library
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Click to add to canvas
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {Object.values(PARTS).map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => addPart(part.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 13,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = part.color || '#38bdf8'
                      e.currentTarget.style.background = '#273549'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155'
                      e.currentTarget.style.background = '#1e293b'
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: part.color || '#38bdf8',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 500, flex: 1 }}>{part.name}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>+</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Center Canvas */}
            <main
              ref={reactFlowWrapper}
              style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              <ReactFlow
                nodes={nodes}
                edges={coloredEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                connectionMode={ConnectionMode.Loose}
                colorMode="dark"
                fitView
                fitViewOptions={{ padding: 0.3 }}
                onInit={(instance) => instance.fitView({ padding: 0.3 })}
                deleteKeyCode={['Backspace', 'Delete']}
              >
                <Background color="#334155" gap={16} />
                <Controls />
              </ReactFlow>
            </main>

            {/* Right Sidebar (Component Guide + Connection Checks) */}
            <aside
              style={{
                width: 290,
                minWidth: 290,
                maxWidth: 290,
                background: '#0f172a',
                borderLeft: '1px solid #334155',
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 5,
              }}
            >
              {/* Component Guide Section */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                  borderBottom: '1px solid #334155',
                  paddingBottom: 6,
                }}
              >
                Component Guide
              </div>

              {!selectedPart ? (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: 18,
                    color: '#64748b',
                    fontSize: 12.5,
                    fontStyle: 'italic',
                    padding: '0 8px',
                  }}
                >
                  Click a part to see its guide.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: selectedPart.color || '#38bdf8',
                        flexShrink: 0,
                      }}
                    />
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 15 }}>
                      {selectedPart.name}
                    </h3>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
                      Description
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: '17px' }}>
                      {selectedPart.description}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
                      Typical Uses
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: '17px' }}>
                      {selectedPart.typicalUses}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
                      Operating Voltage
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: 12, fontWeight: 500 }}>
                      {selectedPart.operatingVoltage}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                      Pins ({selectedPart.pins.length})
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '4px' }}>Pin</th>
                          <th style={{ padding: '4px' }}>Type</th>
                          <th style={{ padding: '4px' }}>Voltage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPart.pins.map((pin) => (
                          <tr key={pin.name} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '4px', color: '#f1f5f9', fontWeight: 500 }}>
                              {pin.name}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  fontSize: 9.5,
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  background:
                                    pin.type === 'power'
                                      ? 'rgba(239, 68, 68, 0.2)'
                                      : pin.type === 'ground'
                                      ? 'rgba(100, 116, 139, 0.25)'
                                      : pin.type === 'gpio'
                                      ? 'rgba(34, 197, 94, 0.2)'
                                      : 'rgba(56, 189, 248, 0.2)',
                                  color:
                                    pin.type === 'power'
                                      ? '#f87171'
                                      : pin.type === 'ground'
                                      ? '#94a3b8'
                                      : pin.type === 'gpio'
                                      ? '#4ade80'
                                      : '#38bdf8',
                                }}
                              >
                                {pin.type}
                              </span>
                            </td>
                            <td style={{ padding: '4px', color: '#cbd5e1' }}>{pin.voltage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Connection Checks Section */}
              <ConnectionChecksPanel issues={issues} />
            </aside>
          </div>
        )}

        {/* TAB 2: HARDWARE HELPER */}
        {activeTab === 'helper' && (
          <HardwareHelperTab
            onAddPartsToCanvas={handleAddHelperParts}
            onAutoWireTemplate={handleAutoWireTemplate}
          />
        )}

        {/* TAB 3: SIMULATE */}
        {activeTab === 'simulate' && (
          <SimulateTab
            nodes={nodes}
            edges={edges}
            sensorValues={sensorValues}
            onSensorChange={(key, val) => setSensorValues((prev) => ({ ...prev, [key]: val }))}
            logicRules={logicRules}
            onAddRule={(rule) => setLogicRules((prev) => [...prev, rule])}
            onDeleteRule={(id) => setLogicRules((prev) => prev.filter((r) => r.id !== id))}
            outputStates={outputStates}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating((prev) => !prev)}
            eventLogs={eventLogs}
          />
        )}

        {/* TAB 4: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            sensorValues={sensorValues}
            sensorHistory={sensorHistory}
            outputStates={outputStates}
            isFeedPaused={isFeedPaused}
            onToggleFeedPause={() => setIsFeedPaused((prev) => !prev)}
            nodes={nodes}
            edges={edges}
          />
        )}

        {/* TAB 5: BUILD GUIDE */}
        {activeTab === 'guide' && (
          <BuildGuideTab
            nodes={nodes}
            edges={edges}
            logicRules={logicRules}
            issues={issues}
          />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <CircuitBuilder />
    </ReactFlowProvider>
  )
}
export { CircuitBuilder }
