import { useCallback, useRef, useState, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PlaceNode from './components/pn/PlaceNode';
import TransitionNode from './components/pn/TransitionNode';
import Toolbar from './components/Toolbar';
import PetriNetToolbar from './components/pn/PetriNetToolbar';
import type { ToolType } from './types/petrinet';
import PropertiesPanel from './components/pn/PropertiesPanel';
import FeatureModelPanel from './components/fm/FeatureModelPanel';

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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const isConnecting = useRef(false);
  const history = useRef<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndex = useRef(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

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

      setEdges((currentEdges) => addEdge(
        {
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed }
        },
        currentEdges
      ));
      setTimeout(() => saveSnapshot(), 0);
    },
    [nodes, setEdges, saveSnapshot]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (selectedTool === 'select') {
        setSelectedNode(node);
        setSelectedEdge(null);
      }
    },
    [selectedTool]
  );

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setTimeout(() => saveSnapshot(), 0);
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      setTimeout(() => saveSnapshot(), 0);
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges, saveSnapshot]);

  const onLabelChange = useCallback((id: string, label: string) => {
    const node = nodes.find((n) => n.id === id);
    const duplicate = nodes.some((n) => n.id !== id && n.type === node?.type && n.data.label === label);
    if (duplicate) {
      alert(`A ${node?.type} named "${label}" already exists`);
      return;
    }
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, label } } : prev);
  }, [nodes, setNodes]);

  const onTokensChange = useCallback((id: string, tokens: number) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, tokens } } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, tokens } } : prev);
  }, [setNodes]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (selectedTool === 'select') {
        setSelectedEdge(edge);
        setSelectedNode(null);
      }
    },
    [selectedTool]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (isConnecting.current) return;
      setSelectedNode(null);
      setSelectedEdge(null);
      if (selectedTool !== 'place' && selectedTool !== 'transition') return;
      if (!reactFlowWrapper.current || !reactFlowInstance.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
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
      if (target.tagName === 'INPUT') return;
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
  }, [undo, redo, deleteSelected]);

  const [splitPos, setSplitPos] = useState(50); // percentage
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
            isEmpty={nodes.length === 0}
          />
          <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
            <PropertiesPanel
              node={selectedNode}
              onLabelChange={onLabelChange}
              onTokensChange={onTokensChange}
            />
            <ReactFlow
              style={{ background: '#f5f5f5' }}
              nodes={nodes}
              edges={edges}
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
              onInit={(instance) => { reactFlowInstance.current = instance; }}
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
          <FeatureModelPanel />
        </div>

      </div>
    </div>
  );
}

export default App;