import { useState, useCallback, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    type Node,
    type Edge,
} from '@xyflow/react';
import dagre from 'dagre';
import FeatureNode from './FeatureNode';
import GroupEdge from './GroupEdge';
import { validateFeatureModel } from '../../utils/fm/validateFeatureModel';
import ConstraintBuilder, { constraintToString, type FMFeature } from './ConstraintBuilder';
import type { Constraint, FeatureData } from '../../types/featuremodel';
import { EMPTY_CONSTRAINT } from '../../types/featuremodel';

const nodeTypes = { feature: FeatureNode };
const edgeTypes = { group: GroupEdge };

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

export interface FeatureModelPanelRef {
    getFmExportData: () => {
        nodes: Node<FeatureData>[];
        edges: Edge[];
        constraints: Constraint[];
    };
    loadFmData: (nodes: Node<FeatureData>[], edges: Edge[], constraints: Constraint[]) => void;
}

interface Props {
    onFeaturesChange?: (features: FMFeature[]) => void;
}

function applyDagreLayout(nodes: Node<FeatureData>[], edges: Edge[]): Node<FeatureData>[] {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    dagre.layout(g);
    return nodes.map((node) => {
        const { x, y } = g.node(node.id);
        return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
    });
}

const FeatureModelPanel = forwardRef<FeatureModelPanelRef, Props>(function FeatureModelPanel({ onFeaturesChange }, ref) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<FeatureData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNode, setSelectedNode] = useState<Node<FeatureData> | null>(null);
    const [constraint, setConstraint] = useState<Constraint>(EMPTY_CONSTRAINT);
    const [savedConstraints, setSavedConstraints] = useState<Constraint[]>([]);

    const fmHistory = useRef<{ nodes: Node<FeatureData>[]; edges: Edge[] }[]>([{ nodes: [], edges: [] }]);
    const fmHistoryIndex = useRef(0);
    const featureCounter = useRef(0);
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);

    const featuresList = useMemo(
        () => nodes.filter(n => !n.data.root).map(n => ({ id: n.id, label: n.data.label })),
        [nodes]
    );

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);
    useEffect(() => { onFeaturesChange?.(featuresList); }, [featuresList, onFeaturesChange]);

    const relayout = useCallback((newNodes: Node<FeatureData>[], newEdges: Edge[]) => {
        if (newNodes.length === 0) return;
        const laid = applyDagreLayout(newNodes, newEdges);
        setNodes(laid);
    }, [setNodes]);

    const saveFmSnapshot = useCallback((newNodes: Node<FeatureData>[], newEdges: Edge[]) => {
        fmHistory.current = fmHistory.current.slice(0, fmHistoryIndex.current + 1);
        fmHistory.current.push({ nodes: newNodes, edges: newEdges });
        fmHistoryIndex.current = fmHistory.current.length - 1;
    }, []);

    const addRoot = useCallback(() => {
        if (nodes.some((n) => n.data.root)) {
            alert('Already has a root feature');
            return;
        }
        const newNode: Node<FeatureData> = {
            id: `f${Date.now()}`,
            type: 'feature',
            position: { x: 0, y: 0 },
            data: { label: 'Root', abstract: true, root: true },
        };
        const newNodes = [...nodes, newNode];
        relayout(newNodes, edges);
        setEdges(edges);
        saveFmSnapshot(newNodes, edges);
    }, [nodes, edges, relayout, setEdges, saveFmSnapshot]);

    const addChild = useCallback(() => {
        if (!selectedNode) {
            alert('Select a feature first');
            return;
        }
        const newNode: Node<FeatureData> = {
            id: `f${Date.now()}`,
            type: 'feature',
            position: { x: 0, y: 0 },
            data: { label: `Feature${++featureCounter.current}`, abstract: false, root: false },
        };
        const newEdge: Edge = {
            id: `fe${Date.now()}`,
            source: selectedNode.id,
            target: newNode.id,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#555' },
            style: { stroke: '#555', strokeWidth: 1.5 },
        };
        const newNodes = [...nodes, newNode];
        const newEdges = [...edges, newEdge];
        relayout(newNodes, newEdges);
        setEdges(newEdges);
        saveFmSnapshot(newNodes, newEdges);
    }, [selectedNode, nodes, edges, relayout, setEdges, saveFmSnapshot]);

    const addGroup = useCallback((groupType: 'or' | 'xor') => {
        if (!selectedNode) {
            alert('Select a feature first');
            return;
        }
        const id1 = `f${Date.now()}`;
        const id2 = `f${Date.now() + 1}`;
        const newNodes: Node<FeatureData>[] = [
            ...nodes,
            { id: id1, type: 'feature', position: { x: 0, y: 0 }, data: { label: `Feature${++featureCounter.current}`, abstract: false, root: false } },
            { id: id2, type: 'feature', position: { x: 0, y: 0 }, data: { label: `Feature${++featureCounter.current}`, abstract: false, root: false } },
        ];
        const newEdges: Edge[] = [
            ...edges,
            { id: `fe${Date.now()}`, source: selectedNode.id, target: id1, type: 'group', data: { groupType }, markerEnd: { type: MarkerType.ArrowClosed, color: '#555' }, style: { stroke: '#555', strokeWidth: 1.5 } },
            { id: `fe${Date.now() + 1}`, source: selectedNode.id, target: id2, type: 'group', data: { groupType }, markerEnd: { type: MarkerType.ArrowClosed, color: '#555' }, style: { stroke: '#555', strokeWidth: 1.5 } },
        ];
        relayout(newNodes, newEdges);
        setEdges(newEdges);
        saveFmSnapshot(newNodes, newEdges);
    }, [selectedNode, nodes, edges, relayout, setEdges, saveFmSnapshot]);

    const toggleMandatory = useCallback(() => {
        if (!selectedNode) return;
        const newMandatory = !selectedNode.data.mandatory;
        const newNodes = nodes.map((n) =>
            n.id === selectedNode.id ? { ...n, data: { ...n.data, mandatory: newMandatory } } : n
        );
        setNodes(newNodes);
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, mandatory: newMandatory } } : prev);
        saveFmSnapshot(newNodes, edges);
    }, [selectedNode, nodes, edges, setNodes, saveFmSnapshot]);

    const toggleAbstract = useCallback(() => {
        if (!selectedNode) return;
        const newAbstract = !selectedNode.data.abstract;
        const newNodes = nodes.map((n) =>
            n.id === selectedNode.id ? { ...n, data: { ...n.data, abstract: newAbstract } } : n
        );
        setNodes(newNodes);
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, abstract: newAbstract } } : prev);
        saveFmSnapshot(newNodes, edges);
    }, [selectedNode, nodes, edges, setNodes, saveFmSnapshot]);

    const saveConstraint = useCallback(() => {
        if (constraint.terms.length === 0) return;
        setSavedConstraints((prev) => [...prev, constraint]);
        setConstraint(EMPTY_CONSTRAINT);
    }, [constraint]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<FeatureData>);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { id, label } = (e as CustomEvent).detail;
            const duplicate = nodesRef.current.some((n) => n.id !== id && n.data.label === label);
            if (duplicate) {
                alert(`A feature named "${label}" already exists`);
                return;
            }
            setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
        };
        window.addEventListener('feature-label-change', handler);
        return () => window.removeEventListener('feature-label-change', handler);
    }, [setNodes]);

    const deleteSelected = useCallback(() => {
        if (!selectedNode) return;
        const newNodes = nodes.filter((n) => n.id !== selectedNode.id);
        const newEdges = edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id);
        if (newNodes.length === 0) {
            setNodes([]);
            setEdges([]);
        } else {
            relayout(newNodes, newEdges);
            setEdges(newEdges);
        }
        setSelectedNode(null);
        saveFmSnapshot(newNodes, newEdges);
    }, [selectedNode, nodes, edges, relayout, setNodes, setEdges, saveFmSnapshot]);

    const undoFm = useCallback(() => {
        if (fmHistoryIndex.current === 0) return;
        fmHistoryIndex.current -= 1;
        const snapshot = fmHistory.current[fmHistoryIndex.current];
        if (snapshot.nodes.length === 0) {
            setNodes([]);
            setEdges([]);
        } else {
            const laid = applyDagreLayout(snapshot.nodes, snapshot.edges);
            setNodes(laid);
            setEdges(snapshot.edges);
        }
    }, [setNodes, setEdges]);

    const redoFm = useCallback(() => {
        if (fmHistoryIndex.current === fmHistory.current.length - 1) return;
        fmHistoryIndex.current += 1;
        const snapshot = fmHistory.current[fmHistoryIndex.current];
        if (snapshot.nodes.length === 0) {
            setNodes([]);
            setEdges([]);
        } else {
            const laid = applyDagreLayout(snapshot.nodes, snapshot.edges);
            setNodes(laid);
            setEdges(snapshot.edges);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT') return;
            if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteSelected]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT') return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoFm();
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redoFm();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undoFm, redoFm]);

    const validationErrors = useMemo(
        () => nodes.length > 0 ? validateFeatureModel(nodes, edges) : [],
        [nodes, edges]
    );

    useImperativeHandle(ref, () => ({
        getFmExportData: () => ({ nodes, edges, constraints: savedConstraints }),
        loadFmData: (newNodes: Node<FeatureData>[], newEdges: Edge[], newConstraints: Constraint[]) => {
            if (newNodes.length > 0) {
                setNodes(applyDagreLayout(newNodes, newEdges));
            } else {
                setNodes([]);
            }
            setEdges(newEdges);
            setSavedConstraints(newConstraints);
            setConstraint(EMPTY_CONSTRAINT);
            setSelectedNode(null);
            featureCounter.current = 0;
            fmHistory.current = [{ nodes: newNodes, edges: newEdges }];
            fmHistoryIndex.current = 0;
        },
    }), [nodes, edges, savedConstraints, setNodes, setEdges]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Toolbar */}
            <div className="fm-toolbar" style={{
                display: 'flex', gap: 6, padding: '6px 12px',
                borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
                alignItems: 'center', flexWrap: 'wrap',
            }}>
                <button onClick={addRoot}>Add Root</button>
                <button onClick={addChild} disabled={!selectedNode}>Add Child</button>
                <button onClick={() => addGroup('or')} disabled={!selectedNode}>Add OR Group</button>
                <button onClick={() => addGroup('xor')} disabled={!selectedNode}>Add XOR Group</button>

                {selectedNode && !selectedNode.data.root && (
                    <>
                        <div style={{ width: 1, background: '#ddd', height: 20, margin: '0 4px' }} />
                        <button onClick={toggleMandatory}>
                            {selectedNode.data.mandatory ? 'Mandatory' : 'Optional'}
                        </button>
                        <button onClick={toggleAbstract}>
                            {selectedNode.data.abstract ? 'Abstract' : 'Concrete'}
                        </button>
                    </>
                )}

                <div style={{ width: 1, background: '#ddd', height: 20, margin: '0 4px' }} />
                <button onClick={deleteSelected} disabled={!selectedNode}>Delete</button>
                <button onClick={undoFm}>Undo</button>
                <button onClick={redoFm}>Redo</button>
            </div>

            {/* Feature Model Constraints builder */}
            {nodes.length > 0 && (
                <div style={{ padding: '6px 12px', borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Feature Model Constraints
                    </div>
                    <ConstraintBuilder features={featuresList} value={constraint} onChange={setConstraint} />
                    {constraint.terms.length > 0 && (
                        <button onClick={saveConstraint} style={{ marginTop: 6, fontSize: 12 }}>
                            Save Constraint
                        </button>
                    )}
                </div>
            )}

            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* Legend */}
                {nodes.length > 0 && (
                    <div style={{
                        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
                        background: 'white', border: '1px solid #ddd', borderRadius: 6,
                        padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', gap: 5,
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 11, color: '#555', marginBottom: 2 }}>Legend</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #555', background: '#555', flexShrink: 0 }} />
                            <span style={{ color: '#333' }}>Mandatory</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #555', background: 'white', flexShrink: 0 }} />
                            <span style={{ color: '#333' }}>Optional</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="14" viewBox="0 0 16 14" style={{ flexShrink: 0 }}>
                                <polygon points="8,1 15,13 1,13" fill="#333" stroke="#333" strokeWidth="1.5" />
                            </svg>
                            <span style={{ color: '#333' }}>OR Group</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="14" viewBox="0 0 16 14" style={{ flexShrink: 0 }}>
                                <polygon points="8,1 15,13 1,13" fill="white" stroke="#333" strokeWidth="1.5" />
                            </svg>
                            <span style={{ color: '#333' }}>XOR Group</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 16, height: 12, borderRadius: 2, border: '2px solid #9b7fd4', background: '#e8d5f5', flexShrink: 0 }} />
                            <span style={{ color: '#333' }}>Abstract</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 16, height: 12, borderRadius: 2, border: '2px solid #9b7fd4', background: '#c5cff5', flexShrink: 0 }} />
                            <span style={{ color: '#333' }}>Concrete</span>
                        </div>
                    </div>
                )}
                <ReactFlow
                    colorMode="light"
                    style={{ background: '#fafafa' }}
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    fitViewOptions={{ maxZoom: 0.8 }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ccc" />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
                <div style={{ padding: '8px 16px', borderTop: '2px solid #f5a623', background: '#fffbf2', flexShrink: 0 }}>
                    {validationErrors.map((err) => (
                        <div key={err.ruleId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b26200' }}>
                            <span>⚠</span>
                            <span>{err.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Saved Feature Model Constraints */}
            {savedConstraints.length > 0 && (
                <div style={{ padding: '8px 16px', borderTop: '1px solid #ddd', background: '#fff', flexShrink: 0, fontSize: 13 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Saved Constraints
                    </div>
                    {savedConstraints.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{constraintToString(c, featuresList)}</span>
                            <button
                                onClick={() => setSavedConstraints((prev) => prev.filter((_, j) => j !== i))}
                                style={{ fontSize: 11, padding: '1px 6px' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default FeatureModelPanel;
