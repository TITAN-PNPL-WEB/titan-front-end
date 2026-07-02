import type { Constraint, ConstraintTerm } from '../../types/featuremodel';

function evalTerm(term: ConstraintTerm, config: Set<string>): boolean {
  switch (term.type) {
    case 'feature':
      return config.has(term.sourceId);
    case 'requires':
      return !config.has(term.sourceId) || config.has(term.targetId ?? '');
    case 'excludes':
      return !(config.has(term.sourceId) && config.has(term.targetId ?? ''));
  }
}

/**
 * Evaluates a presence condition expression against a feature configuration.
 * Returns true if the expression holds for the given set of selected feature IDs.
 * An empty expression is considered always-true (unconditionally present).
 */
export function evaluateConstraint(constraint: Constraint, config: Set<string>): boolean {
  if (constraint.terms.length === 0) return true;

  let result = evalTerm(constraint.terms[0], config);
  for (let i = 0; i < constraint.operators.length; i++) {
    const next = evalTerm(constraint.terms[i + 1], config);
    result = constraint.operators[i] === '∧' ? result && next : result || next;
  }
  return result;
}
