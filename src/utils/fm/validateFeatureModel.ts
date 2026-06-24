import type { Node, Edge } from '@xyflow/react';

export interface ValidationError {
    ruleId: string;
    message: string;
}

export function validateFeatureModel(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Rule 1: Exactly one root feature (node with no incoming edge)
    const roots = nodes.filter(n => !edges.some(e => e.target === n.id));
    if (roots.length !== 1) {
        errors.push({
            ruleId: 'single-root',
            message: 'Feature model must contain exactly one root feature.',
        });
    }

    if (roots.length === 1 && roots[0].data.abstract !== true) {
        errors.push({
            ruleId: 'root-is-abstract',
            message: 'Root feature must be abstract.',
        });
    }

    const hasLeafAbstract = nodes.some(
        n => n.data.abstract === true && !edges.some(e => e.source === n.id)
    );

    const hasConcreteWithChildren = nodes.some(
        n => n.data.abstract === false && edges.some(e => e.source === n.id)
    );
    if (hasConcreteWithChildren) {
        errors.push({
            ruleId: 'concrete-no-children',
            message: 'Concrete feature must not have child features.',
        });
    }
    if (hasLeafAbstract) {
        errors.push({
            ruleId: 'abstract-has-child',
            message: 'Abstract feature must have at least one child feature.',
        });
    }

    const hasEmptyName = nodes.some(n => (n.data.label as string).trim().length === 0);
    if (hasEmptyName) {
        errors.push({
            ruleId: 'non-empty-name',
            message: 'Feature name cannot be empty.',
        });
    }

    const normalizedNames = nodes.map(n => (n.data.label as string).trim().toLowerCase());
    const hasDuplicateNames = normalizedNames.some((name, i) => normalizedNames.indexOf(name) !== i);
    if (hasDuplicateNames) {
        errors.push({
            ruleId: 'unique-names',
            message: 'Feature names must be unique.',
        });
    }

    return errors;
}
