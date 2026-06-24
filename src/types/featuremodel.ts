export type ConstraintOperator = '∧' | '∨';

export interface ConstraintTerm {
  id: string;
  type: 'feature' | 'requires' | 'excludes';
  sourceId: string;
  targetId?: string;
}

export interface Constraint {
  terms: ConstraintTerm[];
  operators: ConstraintOperator[];
}

export const EMPTY_CONSTRAINT: Constraint = { terms: [], operators: [] };
