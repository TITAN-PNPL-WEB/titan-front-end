import type { Node, Edge } from '@xyflow/react';
import type { PcExpression, PresenceCondition } from '../../types/petrinet';
import type { FMFeature } from '../../components/fm/ConstraintBuilder';
import { collectPcFeatureIds } from './pcExpression';

export interface PCValidationError {
  rule: string;
  message: string;
}

export function validatePresenceCondition({
  elementIds,
  expression,
  fmFeatures,
  presenceConditions,
  editingId,
  pnNodes,
  pnEdges,
  elementLabels,
}: {
  elementIds: string[];
  expression: PcExpression | null;
  fmFeatures: FMFeature[];
  presenceConditions: PresenceCondition[];
  editingId?: string;
  pnNodes?: Node[];
  pnEdges?: Edge[];
  elementLabels?: Record<string, string>;
}): PCValidationError[] {
  const errors: PCValidationError[] = [];

  // Rule 1 — at least one element
  if (elementIds.length === 0) {
    errors.push({ rule: 'no-elements', message: 'At least one Petri net element must be selected.' });
  }

  // Rule 2 — expression must be complete (no null/missing nodes)
  if (expression === null) {
    errors.push({ rule: 'empty-expression', message: 'The expression must not be empty. Fill in all expression nodes.' });
  }

  // Rule 3 — every referenced feature must still exist in the FM
  if (expression !== null) {
    const featureIdSet = new Set(fmFeatures.map(f => f.id));
    const referenced = collectPcFeatureIds(expression);
    const missing = [...referenced].filter(id => !featureIdSet.has(id));
    if (missing.length > 0) {
      errors.push({
        rule: 'missing-features',
        message: `The expression references ${missing.length} feature(s) that no longer exist in the Feature Model.`,
      });
    }
  }

  // Rule 4 — every PN element must still exist
  if (pnNodes && pnEdges && elementIds.length > 0) {
    const existing = new Set([...pnNodes.map(n => n.id), ...pnEdges.map(e => e.id)]);
    const missing = elementIds.filter(id => !existing.has(id));
    if (missing.length > 0) {
      errors.push({
        rule: 'missing-elements',
        message: `${missing.length} selected element(s) no longer exist in the Petri net.`,
      });
    }
  }

  // Rule 5 — each element may belong to at most one presence condition
  if (elementIds.length > 0) {
    const conflicts = presenceConditions.filter(
      pc => pc.id !== editingId && pc.elementIds.some(id => elementIds.includes(id))
    );
    if (conflicts.length > 0) {
      const conflictingIds = [...new Set(
        conflicts.flatMap(pc => pc.elementIds).filter(id => elementIds.includes(id))
      )];
      const names = conflictingIds.map(id => elementLabels?.[id] ?? id).join(', ');
      errors.push({
        rule: 'duplicate-pc',
        message: `The following element(s) already have a presence condition: ${names}. Use Edit to modify it.`,
      });
    }
  }

  return errors;
}
