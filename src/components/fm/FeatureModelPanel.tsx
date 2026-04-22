import { useState, useCallback, useEffect, useRef } from 'react';
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

const nodeTypes = { feature: FeatureNode };
const edgeTypes = { group: GroupEdge };

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

interface FeatureData extends Record<string, unknown> {
    label: string;
    abstract: boolean;
    root: boolean;
    mandatory?: boolean;
}

type ConstraintOperator = '∧' | '∨';

interface ConstraintTerm {
    id: string;
    type: 'feature' | 'requires' | 'excludes';
    sourceId: string;
    targetId?: string;
}

interface Constraint {
    terms: ConstraintTerm[];
    operators: ConstraintOperator[];
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

export default function FeatureModelPanel() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<FeatureData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNode, setSelectedNode] = useState<Node<FeatureData> | null>(null);

    const [constraint, setConstraint] = useState<Constraint>({ terms: [], operators: [] });
    const [addingTerm, setAddingTerm] = useState(false);
    const [termType, setTermType] = useState<'feature' | 'requires' | 'excludes'>('feature');
    const [termSource, setTermSource] = useState('');
    const [termTarget, setTermTarget] = useState('');
    const [pendingOperator, setPendingOperator] = useState<ConstraintOperator>('∧');
    const [savedConstraints, setSavedConstraints] = useState<Constraint[]>([]);

    const fmHistory = useRef<{ nodes: Node<FeatureData>[]; edges: Edge[] }[]>([{ nodes: [], edges: [] }]);
    const fmHistoryIndex = useRef(0);
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);

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
    }, [nodes, edges, relayout, setEdges]);

    const addChild = useCallback(() => {
        if (!selectedNode) {
            alert('Select a feature first');
            return;
        }
        const newNode: Node<FeatureData> = {
            id: `f${Date.now()}`,
            type: 'feature',
            position: { x: 0, y: 0 },
            data: { label: 'Feature', abstract: false, root: false },
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
    }, [selectedNode, nodes, edges, relayout, setEdges]);

    const addGroup = useCallback((groupType: 'or' | 'xor') => {
        if (!selectedNode) {
            alert('Select a feature first');
            return;
        }
        const id1 = `f${Date.now()}`;
        const id2 = `f${Date.now() + 1}`;
        const newNodes: Node<FeatureData>[] = [
            ...nodes,
            { id: id1, type: 'feature', position: { x: 0, y: 0 }, data: { label: 'Feature', abstract: false, root: false } },
            { id: id2, type: 'feature', position: { x: 0, y: 0 }, data: { label: 'Feature', abstract: false, root: false } },
        ];
        const newEdges: Edge[] = [
            ...edges,
            { id: `fe${Date.now()}`, source: selectedNode.id, target: id1, type: 'group', data: { groupType }, markerEnd: { type: MarkerType.ArrowClosed, color: '#555' }, style: { stroke: '#555', strokeWidth: 1.5 } },
            { id: `fe${Date.now() + 1}`, source: selectedNode.id, target: id2, type: 'group', data: { groupType }, markerEnd: { type: MarkerType.ArrowClosed, color: '#555' }, style: { stroke: '#555', strokeWidth: 1.5 } },
        ];
        relayout(newNodes, newEdges);
        setEdges(newEdges);
        saveFmSnapshot(newNodes, newEdges);
    }, [selectedNode, nodes, edges, relayout, setEdges]);

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

    const addTerm = useCallback(() => {
        if (!termSource) return;
        if ((termType === 'requires' || termType === 'excludes') && !termTarget) return;
        if (termSource === termTarget) {
            alert('Source and target must be different');
            return;
        }
        const newTerm: ConstraintTerm = {
            id: `t${Date.now()}`,
            type: termType,
            sourceId: termSource,
            targetId: termTarget || undefined,
        };
        setConstraint((prev) => ({
            terms: [...prev.terms, newTerm],
            operators: prev.terms.length > 0 ? [...prev.operators, pendingOperator] : prev.operators,
        }));
        setAddingTerm(false);
        setTermSource('');
        setTermTarget('');
    }, [termType, termSource, termTarget, pendingOperator]);

    const saveConstraint = useCallback(() => {
        if (constraint.terms.length === 0) return;
        setSavedConstraints((prev) => [...prev, constraint]);
        setConstraint({ terms: [], operators: [] });
    }, [constraint]);

    const termLabel = (term: ConstraintTerm) => {
        const src = nodes.find((n) => n.id === term.sourceId)?.data.label ?? '';
        const tgt = nodes.find((n) => n.id === term.targetId)?.data.label ?? '';
        if (term.type === 'feature') return src;
        if (term.type === 'requires') return `${src} ⇒ ${tgt}`;
        return `${src} excludes ${tgt}`;
    };

    const constraintLabel = (c: Constraint) =>
        c.terms.map((t, i) => {
            const label = termLabel(t);
            const wrapped = c.terms.length > 1 ? `(${label})` : label;
            return i === 0 ? wrapped : ` ${c.operators[i - 1]} ${wrapped}`;
        }).join('');

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<FeatureData>);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { id, label } = (e as CustomEvent).detail;
            const duplicate = nodes.some((n) => n.id !== id && n.data.label === label);
            if (duplicate) {
                alert(`A feature named "${label}" already exists`);
                return;
            }
            setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
        };
        window.addEventListener('feature-label-change', handler);
        return () => window.removeEventListener('feature-label-change', handler);
    }, [setNodes, nodes]);

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
            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelected();
            }
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

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

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
                <button onClick={() => setAddingTerm(true)} disabled={nodes.length === 0}>Add Constraint Term</button>
                {constraint.terms.length > 0 && (
                    <button onClick={saveConstraint}>Save Constraint</button>
                )}
                <div style={{ width: 1, background: '#ddd', height: 20, margin: '0 4px' }} />
                <button onClick={deleteSelected} disabled={!selectedNode}>Delete</button>
                <button onClick={undoFm}>Undo</button>
                <button onClick={redoFm}>Redo</button>
            </div>

            {/* Constraint form */}
            {addingTerm && (
                <div style={{
                    display: 'flex', gap: 8, padding: '6px 12px', alignItems: 'center',
                    borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0, flexWrap: 'wrap',
                }}>
                    {constraint.terms.length > 0 && (
                        <select value={pendingOperator} onChange={(e) => setPendingOperator(e.target.value as ConstraintOperator)}>
                            <option value="∧">AND (∧)</option>
                            <option value="∨">OR (∨)</option>
                        </select>
                    )}
                    <select value={termType} onChange={(e) => setTermType(e.target.value as 'feature' | 'requires' | 'excludes')}>
                        <option value="feature">Feature</option>
                        <option value="requires">Requires (⇒)</option>
                        <option value="excludes">Excludes</option>
                    </select>
                    <select value={termSource} onChange={(e) => setTermSource(e.target.value)}>
                        <option value="">Select feature</option>
                        {nodes.filter((n) => !n.data.root).map((n) => (
                            <option key={n.id} value={n.id}>{n.data.label}</option>
                        ))}
                    </select>
                    {(termType === 'requires' || termType === 'excludes') && (
                        <select value={termTarget} onChange={(e) => setTermTarget(e.target.value)}>
                            <option value="">Select feature B</option>
                            {nodes.filter((n) => !n.data.root).map((n) => (
                                <option key={n.id} value={n.id}>{n.data.label}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={addTerm}>Add</button>
                    <button onClick={() => setAddingTerm(false)}>Cancel</button>
                </div>
            )}

            {constraint.terms.length > 0 && (
                <div style={{
                    padding: '4px 16px', borderBottom: '1px solid #ddd',
                    background: '#f9f9f9', fontSize: 13, color: '#555',
                }}>
                    Current: {constraintLabel(constraint)}
                </div>
            )}

            {/* Canvas */}
            <div style={{ flex: 1 }}>
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

            {/* Constraints list */}
            {savedConstraints.length > 0 && (
                <div style={{
                    padding: '8px 16px', borderTop: '1px solid #ddd',
                    background: '#fff', flexShrink: 0, fontSize: 13,
                }}>
                    {savedConstraints.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span>{constraintLabel(c)}</span>
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
}