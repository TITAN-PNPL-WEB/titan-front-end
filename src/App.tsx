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
import PlaceNode from './components/nodes/PlaceNode';
import TransitionNode from './components/nodes/TransitionNode';
import Toolbar from './components/Toolbar';
import type { ToolType } from './types/petrinet';
import PropertiesPanel from './components/PropertiesPanel';

const nodeTypes = {
  place: PlaceNode,
  transition: TransitionNode,
};

const initialNodes: Node[] = [
  {
    id: 'p1',
    type: 'place',
    position: { x: 100, y: 100 },
    data: { label: 'P1', tokens: 0 },  // added tokens
  },
  {
    id: 't1',
    type: 'transition',
    position: { x: 300, y: 100 },
    data: { label: 'T1' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'p1',
    target: 't1',
    sourceHandle: 'right',
    targetHandle: 'left',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

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

      const isValid =
        (sourceNode?.type === 'place' && targetNode?.type === 'transition') ||
        (sourceNode?.type === 'transition' && targetNode?.type === 'place');

      if (!isValid) {
        alert('Invalid connection: only place ↔ transition is allowed');
        return;
      }

      setEdges((currentEdges) => addEdge(
        { ...connection, markerEnd: { type: MarkerType.ArrowClosed } },
        currentEdges
      ));
      setTimeout(() => saveSnapshot(), 0);
    },
    [nodes, setEdges]
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
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, label } } : prev);
  }, [setNodes]);

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
      setSelectedNode(null); // deselect on canvas click
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
    [nodes, selectedTool, setNodes]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh', boxSizing: 'border-box', paddingTop: 48 }}>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          fontSize: 20,
          fontWeight: 'bold',
        }}
      >
        Test PN
      </div>

      {/* Toolbar */}
      <Toolbar
        activeTool={selectedTool}
        onToolChange={setSelectedTool}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelected}
      />

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
        }}
        onConnectEnd={() => {
          setTimeout(() => {
            isConnecting.current = false;
          }, 0);
        }}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        connectionMode={ConnectionMode.Loose}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ccc" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default App;