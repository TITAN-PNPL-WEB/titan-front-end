import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  MarkerType,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PlaceNode from './components/pn/PlaceNode';
import TransitionNode from './components/pn/TransitionNode';
import Toolbar from './components/Toolbar';
import PetriNetToolbar from './components/pn/PetriNetToolbar';
import type { ToolType, PNSelectedElement, PresenceCondition, PcExpression } from './types/petrinet';
import type { FMFeature } from './components/fm/ConstraintBuilder';
import { pcExpressionToString } from './utils/pn/pcExpression';
import PropertiesPanel from './components/pn/PropertiesPanel';
import FeatureModelPanel from './components/fm/FeatureModelPanel';
import PresenceConditionModal from './components/pn/PresenceConditionModal';
import PresenceConditionList from './components/pn/PresenceConditionList';
import { validatePresenceCondition } from './utils/pn/validatePresenceCondition';

const nodeTypes = {
  place: PlaceNode,
  transition: TransitionNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [pnSelection, setPnSelection] = useState<PNSelectedElement[]>([]);
  const [propertiesNode, setPropertiesNode] = useState<Node | null>(null);
  const [propertiesEdge, setPropertiesEdge] = useState<Edge | null>(null);
  const [pcModalOpen, setPcModalOpen] = useState(false);
  const [pcElements, setPcElements] = useState<PNSelectedElement[]>([]);
  const [editingPcId, setEditingPcId] = useState<string | null>(null);
  const [presenceConditions, setPresenceConditions] = useState<PresenceCondition[]>([]);
  const [fmFeatures, setFmFeatures] = useState<FMFeature[]>([]);
  const [highlightedPcId, setHighlightedPcId] = useState<string | null>(null);
  const [showPCLabels, setShowPCLabels] = useState(true);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const isConnecting = useRef(false);
  const arcCounter = useRef(0);
  const history = useRef<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndex = useRef(0);
  const selectedToolRef = useRef(selectedTool);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);

  const saveSnapshot = useCallback(() => {
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    historyIndex.current = history.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndex.current === 0) return;
    historyIndex.current -= 1;
    const snapshot = history.current[historyIndex.current];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex.current === history.current.length - 1) return;
    historyIndex.current += 1;
    const snapshot = history.current[historyIndex.current];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      const isValidType =
        (sourceNode?.type === 'place' && targetNode?.type === 'transition') ||
        (sourceNode?.type === 'transition' && targetNode?.type === 'place');

      if (!isValidType) {
        alert('Invalid connection: only place → transition or transition → place is allowed');
        return;
      }

      const isDuplicate = edgesRef.current.some(
        (e) => e.source === connection.source && e.target === connection.target
      );

      if (isDuplicate) {
        alert('An arc between these two elements already exists');
        return;
      }

      let arcLabel: string;
      do {
        arcLabel = `arc${++arcCounter.current}`;
      } while (edgesRef.current.some(e => (e.data?.label as string) === arcLabel));
      setEdges((currentEdges) => addEdge(
        {
          ...connection,
          label: arcLabel,
          labelStyle: { fontSize: 11 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 3,
          data: { label: arcLabel },
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        currentEdges
      ));
      setTimeout(() => saveSnapshot(), 0);
    },
    [nodes, setEdges, saveSnapshot]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (selectedToolRef.current !== 'select') return;
    setPropertiesNode(node);
    setPropertiesEdge(null);
    setPnSelection([{
      id: node.id,
      elementType: node.type as 'place' | 'transition',
      label: (node.data.label as string) ?? '',
    }]);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (selectedToolRef.current !== 'select') return;
    setPropertiesNode(null);
    setPropertiesEdge(edge);
    setPnSelection([{ id: edge.id, elementType: 'arc', label: (edge.data?.label as string) ?? '' }]);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    if (isConnecting.current) return;
    if (selectedToolRef.current !== 'select') return;

    const total = selNodes.length + selEdges.length;
    if (total === 0) {
      setPnSelection([]);
      setPropertiesNode(null);
      setPropertiesEdge(null);
      return;
    }
    if (total === 1) return;

    const elements: PNSelectedElement[] = [
      ...selNodes.map(n => ({
        id: n.id,
        elementType: n.type as 'place' | 'transition',
        label: (n.data.label as string) ?? '',
      })),
      ...selEdges.map(e => ({
        id: e.id,
        elementType: 'arc' as const,
        label: (e.data?.label as string) ?? '',
      })),
    ];
    setPnSelection(elements);
    setPropertiesNode(null);
  }, []);

  const deleteSelected = useCallback(() => {
    if (pnSelection.length === 0) return;
    const nodeIds = new Set(pnSelection.filter(e => e.elementType !== 'arc').map(e => e.id));
    const edgeIds = new Set(pnSelection.filter(e => e.elementType === 'arc').map(e => e.id));
    setNodes(nds => nds.filter(n => !nodeIds.has(n.id)));
    setEdges(eds => eds.filter(e =>
      !edgeIds.has(e.id) &&
      !nodeIds.has(e.source) &&
      !nodeIds.has(e.target)
    ));
    setPnSelection([]);
    setPropertiesNode(null);
    setTimeout(() => saveSnapshot(), 0);
  }, [pnSelection, setNodes, setEdges, saveSnapshot]);

  const onLabelChange = useCallback((id: string, label: string) => {
    const node = nodes.find((n) => n.id === id);
    const duplicate = nodes.some((n) => n.id !== id && n.type === node?.type && n.data.label === label);
    if (duplicate) {
      alert(`A ${node?.type} named "${label}" already exists`);
      return;
    }
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
    setPropertiesNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, label } } : prev);
  }, [nodes, setNodes]);

  const onEdgeLabelChange = useCallback((id: string, label: string) => {
    const duplicate = edgesRef.current.some(e => e.id !== id && (e.data?.label as string) === label);
    if (duplicate) {
      alert(`An arc named "${label}" already exists`);
      return;
    }
    setEdges(eds => eds.map(e => e.id === id ? { ...e, label, data: { ...e.data, label } } : e));
    setPropertiesEdge(prev => prev?.id === id ? { ...prev, label, data: { ...prev.data, label } } : prev);
  }, [setEdges]);

  const onTokensChange = useCallback((id: string, tokens: number) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, tokens } } : n));
    setPropertiesNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, tokens } } : prev);
  }, [setNodes]);

  const updatePresenceCondition = useCallback((id: string, updates: Partial<Omit<PresenceCondition, 'id'>>) => {
    setPresenceConditions(prev => prev.map(pc => pc.id === id ? { ...pc, ...updates } : pc));
  }, []);

  const removePresenceCondition = useCallback((id: string) => {
    setPresenceConditions(prev => prev.filter(pc => pc.id !== id));
  }, []);

  const handleRemovePC = useCallback((pcId: string) => {
    const pc = presenceConditions.find(p => p.id === pcId);
    if (!pc) return;
    if (pc.elementIds.length > 1) {
      const labels = pc.elementIds.map(id => {
        const node = nodesRef.current.find(n => n.id === id);
        if (node) return (node.data.label as string) ?? id;
        const edge = edgesRef.current.find(e => e.id === id);
        return (edge?.data?.label as string) ?? id;
      });
      const ok = window.confirm(
        `This presence condition applies to ${pc.elementIds.length} elements: ${labels.join(', ')}.\n\nRemoving it will clear the annotation from all of them. Continue?`
      );
      if (!ok) return;
    }
    removePresenceCondition(pcId);
  }, [presenceConditions, removePresenceCondition]);

  const handleConfirmPC = useCallback((expression: PcExpression | null, confirmedElements: PNSelectedElement[]) => {
    const newElementIds = confirmedElements.map(e => e.id);
    const elementLabels = Object.fromEntries(confirmedElements.map(e => [e.id, e.label || e.id]));
    const errors = validatePresenceCondition({
      elementIds: newElementIds,
      expression,
      fmFeatures,
      presenceConditions,
      editingId: editingPcId ?? undefined,
      pnNodes: nodesRef.current,
      pnEdges: edgesRef.current,
      elementLabels,
    });
    if (errors.length > 0) {
      alert(errors.map(e => e.message).join('\n'));
      return;
    }
    if (!expression) return; // narrowed: validation already caught this above
    if (editingPcId) {
      updatePresenceCondition(editingPcId, { expression, elementIds: newElementIds });
    } else {
      setPresenceConditions(prev => [
        ...prev,
        { id: `pc-${Date.now()}`, elementIds: newElementIds, expression },
      ]);
    }
    setEditingPcId(null);
    setPcModalOpen(false);
  }, [fmFeatures, presenceConditions, editingPcId, updatePresenceCondition]);

  const handleEditPC = useCallback((pcId: string) => {
    const pc = presenceConditions.find(p => p.id === pcId);
    if (!pc) return;
    const elements: PNSelectedElement[] = pc.elementIds.flatMap((id): PNSelectedElement[] => {
      const node = nodesRef.current.find(n => n.id === id);
      if (node) return [{ id: node.id, elementType: node.type as 'place' | 'transition', label: (node.data.label as string) ?? '' }];
      const edge = edgesRef.current.find(e => e.id === id);
      if (edge) return [{ id: edge.id, elementType: 'arc' as const, label: (edge.data?.label as string) ?? '' }];
      return [];
    });
    setPcElements(elements);
    setEditingPcId(pcId);
    setPcModalOpen(true);
  }, [presenceConditions]);

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (isConnecting.current) return;
      if (selectedTool !== 'place' && selectedTool !== 'transition') return;
      if (!reactFlowWrapper.current || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (selectedTool === 'place') {
        const placeCount = nodes.filter((node) => node.type === 'place').length + 1;
        const newNode: Node = {
          id: `p${Date.now()}`,
          type: 'place',
          position,
          data: { label: `P${placeCount}`, tokens: 0 },
        };
        setNodes((currentNodes) => [...currentNodes, newNode]);
        setTimeout(() => saveSnapshot(), 0);
      }

      if (selectedTool === 'transition') {
        const transitionCount = nodes.filter((node) => node.type === 'transition').length + 1;
        const newNode: Node = {
          id: `t${Date.now()}`,
          type: 'transition',
          position,
          data: { label: `T${transitionCount}` },
        };
        setNodes((currentNodes) => [...currentNodes, newNode]);
        setTimeout(() => saveSnapshot(), 0);
      }
    },
    [nodes, selectedTool, setNodes, saveSnapshot]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (pcModalOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, pcModalOpen]);

  const [splitPos, setSplitPos] = useState(50);
  const isDragging = useRef(false);

  const onDividerMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.classList.add('dragging-divider');

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const pct = (e.clientX / window.innerWidth) * 100;
      setSplitPos(Math.min(Math.max(pct, 20), 80));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.classList.remove('dragging-divider');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const displayNodes = useMemo(() => {
    const pcMap = new Map<string, string>();
    presenceConditions.forEach(pc => {
      const label = pcExpressionToString(pc.expression, fmFeatures);
      pc.elementIds.forEach(id => pcMap.set(id, label));
    });
    const highlightIds = highlightedPcId
      ? new Set(presenceConditions.find(p => p.id === highlightedPcId)?.elementIds ?? [])
      : new Set<string>();
    return nodes.map(n => {
      const pcLabel = showPCLabels ? pcMap.get(n.id) : undefined;
      const pcHighlight = highlightIds.has(n.id);
      if (!pcLabel && !pcHighlight) return n;
      return { ...n, data: { ...n.data, ...(pcLabel ? { pcLabel } : {}), ...(pcHighlight ? { pcHighlight: true } : {}) } };
    });
  }, [nodes, presenceConditions, fmFeatures, highlightedPcId, showPCLabels]);

  const displayEdges = useMemo(() => {
    const pcMap = new Map<string, string>();
    presenceConditions.forEach(pc => {
      const label = pcExpressionToString(pc.expression, fmFeatures);
      pc.elementIds.forEach(id => pcMap.set(id, label));
    });
    const highlightIds = highlightedPcId
      ? new Set(presenceConditions.find(p => p.id === highlightedPcId)?.elementIds ?? [])
      : new Set<string>();
    return edges.map(e => {
      const pcLabel = showPCLabels ? pcMap.get(e.id) : undefined;
      const isHighlighted = highlightIds.has(e.id);
      const arcName = (e.data?.label as string) ?? '';
      return {
        ...e,
        ...(pcLabel ? { label: `${arcName} [${pcLabel}]` } : {}),
        ...(isHighlighted ? { style: { stroke: '#f5a623', strokeWidth: 2 } } : {}),
      };
    });
  }, [edges, presenceConditions, fmFeatures, highlightedPcId, showPCLabels]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      <Toolbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Petri Net panel */}
        <div style={{ width: `${splitPos}%`, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 13, fontWeight: 'bold', borderBottom: '1px solid #ddd', background: '#fff' }}>
            Petri Net
          </div>
          <PetriNetToolbar
            activeTool={selectedTool}
            onToolChange={setSelectedTool}
            onUndo={undo}
            onRedo={redo}
            onDelete={deleteSelected}
            onAddPC={() => { setPcElements([...pnSelection]); setPcModalOpen(true); }}
            showPCLabels={showPCLabels}
            onTogglePCLabels={() => setShowPCLabels(v => !v)}
            noNodes={nodes.length === 0}
            hasSelection={pnSelection.length > 0}
          />
          <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
            <PresenceConditionList
              presenceConditions={presenceConditions}
              fmFeatures={fmFeatures}
              allPnNodes={nodes}
              allPnEdges={edges}
              highlightedPcId={highlightedPcId}
              onHighlight={id => setHighlightedPcId(id)}
              onEdit={handleEditPC}
              onRemove={handleRemovePC}
            />
            <PropertiesPanel
              node={propertiesNode}
              edge={propertiesEdge}
              onLabelChange={onLabelChange}
              onEdgeLabelChange={onEdgeLabelChange}
              onTokensChange={onTokensChange}
              presenceConditions={presenceConditions}
              fmFeatures={fmFeatures}
              allPnNodes={nodes}
              allPnEdges={edges}
              onEditPC={handleEditPC}
              onRemovePC={handleRemovePC}
            />
            <ReactFlow
              style={{ background: '#f5f5f5' }}
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={() => {
                isConnecting.current = true;
                reactFlowWrapper.current?.classList.add('connecting');
              }}
              onConnectEnd={() => {
                setTimeout(() => {
                  isConnecting.current = false;
                  reactFlowWrapper.current?.classList.remove('connecting');
                }, 0);
              }}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onSelectionChange={onSelectionChange}
              onInit={(instance) => { reactFlowInstance.current = instance; }}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ maxZoom: 1 }}
              connectionMode={ConnectionMode.Loose}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ccc" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </div>

        {/* Divider */}
        <div
          onMouseDown={onDividerMouseDown}
          style={{ width: 4, background: '#ccc', cursor: 'col-resize', flexShrink: 0, userSelect: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#999')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ccc')}
        />

        {/* Feature Model panel */}
        <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 13, fontWeight: 'bold', borderBottom: '1px solid #ddd', background: '#fff' }}>
            Feature Model
          </div>
          <FeatureModelPanel onFeaturesChange={setFmFeatures} />
        </div>

      </div>

      {pcModalOpen && (
        <PresenceConditionModal
          elements={pcElements}
          allPnNodes={nodes}
          allPnEdges={edges}
          fmFeatures={fmFeatures}
          presenceConditions={presenceConditions}
          initialExpression={editingPcId ? presenceConditions.find(p => p.id === editingPcId)?.expression : undefined}
          editingId={editingPcId ?? undefined}
          onConfirm={handleConfirmPC}
          onCancel={() => { setEditingPcId(null); setPcModalOpen(false); }}
        />
      )}
    </div>
  );
}

export default App;
