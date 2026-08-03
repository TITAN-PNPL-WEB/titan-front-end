import type { Node, Edge } from '@xyflow/react';
import type { PresenceCondition, PcExpression } from '../../types/petrinet';
import type { FMFeature } from '../../components/fm/ConstraintBuilder';

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (' \t\n\r'.includes(c)) { i++; continue; }
    if ('(),;='.includes(c)) { tokens.push(c); i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j++;
      tokens.push(text.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < text.length && !' \t\n\r(),;="'.includes(text[j])) j++;
    if (j > i) tokens.push(text.slice(i, j));
    i = j;
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private tokens: string[];
  private featureIdByLabel: Map<string, string>;
  private elemIdByLabel: Map<string, string>;

  constructor(
    tokens: string[],
    featureIdByLabel: Map<string, string>,
    elemIdByLabel: Map<string, string>,
  ) {
    this.tokens = tokens;
    this.featureIdByLabel = featureIdByLabel;
    this.elemIdByLabel = elemIdByLabel;
  }

  private peek(): string | undefined { return this.tokens[this.pos]; }
  private consume(): string { return this.tokens[this.pos++] ?? ''; }
  private expect(t: string): void {
    if (this.tokens[this.pos] !== t) return; // lenient — skip unknown
    this.pos++;
  }

  private parseExpr(): PcExpression {
    const t = this.peek();
    if (t === '(') {
      this.consume();
      const left = this.parseExpr();
      const opTok = this.consume().toLowerCase();
      const right = this.parseExpr();
      this.expect(')');
      if (opTok !== 'and' && opTok !== 'or' && opTok !== 'implies') {
        throw new Error(`Unknown operator: ${opTok}`);
      }
      const op = opTok === 'and' ? 'AND' : opTok === 'or' ? 'OR' : 'IMPLIES';
      return { type: 'binary', op, left, right };
    }
    if (t === 'not') {
      this.consume();
      if (this.peek() === '(') {
        this.consume();
        const inner = this.parseExpr();
        this.expect(')');
        return { type: 'not', right: inner };
      }
      const name = this.consume();
      return { type: 'not', right: { type: 'feature', featureId: this.featureIdByLabel.get(name) ?? name } };
    }
    const name = this.consume();
    return { type: 'feature', featureId: this.featureIdByLabel.get(name) ?? name };
  }

  parseAll(): PresenceCondition[] {
    const results: PresenceCondition[] = [];
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t === 'pn' || t === 'fm') { this.consume(); this.consume(); continue; }
      if (t !== 'PC') { this.consume(); continue; }
      this.consume(); // PC
      this.expect('for');

      const elementIds: string[] = [];
      while (this.peek() !== '=' && this.pos < this.tokens.length) {
        const tok = this.consume();
        if (tok === ',') continue;
        const id = this.elemIdByLabel.get(tok);
        if (id) elementIds.push(id);
      }
      this.expect('=');

      let expression: PcExpression | null = null;
      try { expression = this.parseExpr(); } catch { /* skip malformed */ }
      this.expect(';');

      if (elementIds.length > 0 && expression) {
        results.push({ id: `pc-imp-${results.length}`, elementIds, expression });
      }
    }
    return results;
  }
}

export function importVariability(
  vrb: string,
  pnNodes: Node[],
  pnEdges: Edge[],
  fmFeatures: FMFeature[],
): PresenceCondition[] {
  const elemIdByLabel = new Map<string, string>();
  for (const n of pnNodes) elemIdByLabel.set(n.data.label as string, n.id);
  for (const e of pnEdges) elemIdByLabel.set((e.data?.label as string) ?? '', e.id);

  const featureIdByLabel = new Map<string, string>(
    fmFeatures.map(f => [f.label, f.id])
  );

  const tokens = tokenize(vrb);
  const parser = new Parser(tokens, featureIdByLabel, elemIdByLabel);
  return parser.parseAll();
}
