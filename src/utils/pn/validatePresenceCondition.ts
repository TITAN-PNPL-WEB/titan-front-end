import type { Node, Edge } from '@xyflow/react';
import type { Constraint } from '../../types/featuremodel';
import type { PresenceCondition } from '../../types/petrinet';
import type { FMFeature } from '../../components/fm/ConstraintBuilder';

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
}: {
  elementIds: string[];
  expression: Constraint;
  fmFeatures: FMFeature[];
  presenceConditions: PresenceCondition[];
  editingId?: string;
  pnNodes?: Node[];
  pnEdges?: Edge[];
}): PCValidationError[] {
  const errors: PCValidationError[] = [];

  // Rule 1
  if (elementIds.length === 0) {
    errors.push({ rule: 'no-elements', message: 'At least one Petri net element must be selected.' });
  }

  // Rule 2
  if (expression.terms.length === 0) {
    errors.push({ rule: 'empty-expression', message: 'The expression must not be empty.' });
  }

  // Rule 6 — structural integrity of the Constraint object
  if (expression.terms.length > 1 && expression.operators.length !== expression.terms.length - 1) {
    errors.push({ rule: 'invalid-syntax', message: 'The expression is syntactically invalid (operator/term count mismatch).' });
  }
  for (const term of expression.terms) {
    if ((term.type === 'requires' || term.type === 'excludes') && !term.targetId) {
      errors.push({ rule: 'invalid-syntax', message: `A "${term.type}" term is missing its target feature.` });
      break;
    }
  }

  // Rule 3 — every feature referenced must still exist in the FM
  if (expression.terms.length > 0) {
    const featureIdSet = new Set(fmFeatures.map(f => f.id));
    const missing = new Set<string>();
    for (const term of expression.terms) {
      if (term.sourceId && !featureIdSet.has(term.sourceId)) missing.add(term.sourceId);
      if (term.targetId && !featureIdSet.has(term.targetId)) missing.add(term.targetId);
    }
    if (missing.size > 0) {
      errors.push({
        rule: 'missing-features',
        message: `The expression references ${missing.size} feature(s) that no longer exist in the Feature Model.`,
      });
    }
  }

  // Rule 5 — no element may already have a different PC
  if (elementIds.length > 0) {
    const conflicts = presenceConditions.filter(
      pc => pc.id !== editingId && pc.elementIds.some(id => elementIds.includes(id))
    );
    if (conflicts.length > 0) {
      const conflictingIds = [...new Set(
        conflicts.flatMap(pc => pc.elementIds).filter(id => elementIds.includes(id))
      )];
      errors.push({
        rule: 'duplicate-pc',
        message: `${conflictingIds.length} selected element(s) already have a presence condition. Edit the existing condition instead.`,
      });
    }
  }

  // Rule 4 — every PN element must still exist (only when lists are provided)
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

  return errors;
}
