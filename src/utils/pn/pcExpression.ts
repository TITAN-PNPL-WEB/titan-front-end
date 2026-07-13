import type { PcExpression } from '../../types/petrinet';
import type { FMFeature } from '../../components/fm/ConstraintBuilder';

export function pcExpressionToString(expr: PcExpression, features: FMFeature[]): string {
  const featureLabel = (id: string) => features.find(f => f.id === id)?.label ?? id;

  function str(e: PcExpression): string {
    switch (e.type) {
      case 'feature':
        return featureLabel(e.featureId);
      case 'not': {
        const inner = str(e.right);
        return e.right.type === 'binary' ? `NOT (${inner})` : `NOT ${inner}`;
      }
      case 'binary': {
        const needsParensL = e.left.type === 'binary' && e.left.op !== e.op;
        const needsParensR = e.right.type === 'binary' && e.right.op !== e.op;
        const l = needsParensL ? `(${str(e.left)})` : str(e.left);
        const r = needsParensR ? `(${str(e.right)})` : str(e.right);
        return `${l} ${e.op} ${r}`;
      }
    }
  }

  return str(expr);
}

export function evaluatePcExpression(expr: PcExpression, config: Set<string>): boolean {
  switch (expr.type) {
    case 'feature': return config.has(expr.featureId);
    case 'not': return !evaluatePcExpression(expr.right, config);
    case 'binary':
      switch (expr.op) {
        case 'AND': return evaluatePcExpression(expr.left, config) && evaluatePcExpression(expr.right, config);
        case 'OR': return evaluatePcExpression(expr.left, config) || evaluatePcExpression(expr.right, config);
        case 'IMPLIES': return !evaluatePcExpression(expr.left, config) || evaluatePcExpression(expr.right, config);
      }
  }
}

export function collectPcFeatureIds(expr: PcExpression): Set<string> {
  const ids = new Set<string>();
  function visit(e: PcExpression) {
    if (e.type === 'feature') ids.add(e.featureId);
    else if (e.type === 'not') visit(e.right);
    else { visit(e.left); visit(e.right); }
  }
  visit(expr);
  return ids;
}
