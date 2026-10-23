# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npx tsc --noEmit   # type-check without building (preferred for quick validation)
```

No test runner is configured.

---

## Architecture

TITAN is a split-panel editor with two canvases side by side:
- **Left — Petri Net editor**: places, transitions, arcs, selection, presence conditions
- **Right — Feature Model editor**: tree of features with group/constraint support

Both canvases use `@xyflow/react`. The Feature Model tree is auto-laid out with `dagre` on every structural change.

### State ownership

All Petri Net state lives in `App.tsx`: nodes, edges, tool selection, multi-selection (`pnSelection`), properties panel target (`propertiesNode` / `propertiesEdge`), presence conditions, PC modal state, analyze modal, and import status.

Feature Model state is entirely internal to `FeatureModelPanel.tsx`. The only data that flows out is the non-root feature list, via `onFeaturesChange: (features: FMFeature[]) => void`, which App stores as `fmFeatures` and passes into `PresenceConditionModal` and `AnalyzeModal`. A `fmPanelRef` (imperative ref) exposes `getFmExportData()` and `loadFmData()` for export/import without lifting FM state.

### Type files

| File | Contents |
|------|----------|
| `src/types/petrinet.ts` | `PlaceData`, `TransitionData`, `ArcData`, `ToolType`, `PNSelectedElement`, `PcExpression`, `PresenceCondition` |
| `src/types/featuremodel.ts` | `FeatureData`, `Constraint`, `ConstraintTerm`, `ConstraintOperator`, `EMPTY_CONSTRAINT` |

`PresenceCondition.expression` is a recursive `PcExpression` AST — **not** a string and not a `Constraint`. The AST nodes are `{ type: 'feature' }`, `{ type: 'not' }`, and `{ type: 'binary', op: 'AND'|'OR'|'IMPLIES' }`.

### Key shared types / exports

- `FMFeature` (`{ id, label }`) is defined and exported from `src/components/fm/ConstraintBuilder.tsx`. It is the canonical feature reference type used across the whole app (PC modal, PC list, exporters, importers, titanApi).
- `ModelFiles` is defined and exported from `src/components/AnalyzeModal.tsx`. It holds the three in-memory blobs (vrb, petrinets, featureModel) plus their filenames.
- `ImportStatus` is defined and exported from `src/components/ImportStatusModal.tsx`. It is a discriminated union: `'validating' | 'error' | 'invalid'`.

---

## Backend API

Backend base URL is configured at the top of `src/utils/api/titanApi.ts`:

```ts
const API_BASE = 'https://titan-api-pyts.onrender.com/pnpl';
```

The four functions and their contracts:

| Function | Method | Endpoint | Body | Returns |
|---|---|---|---|---|
| `uploadFiles` | POST | `/upload` | `multipart/form-data` (vrb, petrinets, featureModel) | `{ vrbPath, message }` |
| `validateModel` | POST | `/validate` | `{ vrbPath }` | `{ valid, issues[] }` |
| `getAnalyses` | GET | `/analyses` | — | `{ analyses[] }` |
| `runAnalysis` | POST | `/analyze` | `{ vrbPath, name, type }` | `AnalysisResult` |

`vrbPath` is a server-side temp path returned by `/upload` and reused in all subsequent calls within the same session.

---

## Presence Condition expression system

The `PcExpression` AST is built in `PcExpressionBuilder.tsx` using the intermediate `PcDraft` type, which mirrors `PcExpression` but allows `null` children while the user is constructing the tree. `toComplete(draft)` converts a draft to `PcExpression | null` — returns `null` if any node is incomplete.

Pure functions over `PcExpression` live in `src/utils/pn/pcExpression.ts`:
- `pcExpressionToString(expr, features)` — human-readable text
- `evaluatePcExpression(expr, config: Set<string>)` — evaluates against a set of active feature IDs
- `collectPcFeatureIds(expr)` — returns `Set<string>` of all referenced feature IDs

`src/utils/pn/evaluatePresenceCondition.ts` is a re-export shim kept for backwards compatibility.

---

## Import / Export file formats

| Format | Extension | Notes |
|---|---|---|
| Petri Net | `.petrinets` | XMI/EMF XML. Arc cross-references use XPath index notation (`//@places.0`). |
| Feature Model | `.xml` | FeatureIDE XML. Root is always `<and>`. Group type inferred from edge `groupType` data. |
| Variability | `.vrb` | Custom text. `PC for <labels> = <expr> ;` per line. Operators lowercase: `and`, `or`, `implies`. |

The `.vrb` importer is a hand-written recursive-descent parser (`tokenize` + `Parser` class in `src/utils/import/importVariability.ts`). Unknown operators throw inside `parseExpr`, caught by the outer `try/catch` in `parseAll`, causing that PC to be silently skipped.

---

## Import validation flow

When the user selects files that include a `.vrb`, **all three files must be selected together**. App.tsx gates rendering on a backend upload+validate round-trip:

1. Show `ImportStatusModal` with `phase: 'validating'`
2. Call `uploadFiles` → `validateModel`
3. If invalid: show `phase: 'invalid'` with issue list — block render
4. If network error: show `phase: 'error'` — block render
5. If valid: `setImportStatus(null)` and proceed with local import

FM-only and PN-only imports bypass the backend entirely.

---

## Analyze flow

`AnalyzeModal` owns the entire async pipeline. It receives `generateFiles: () => ModelFiles` as a prop and runs:

1. Call `generateFiles()` to build in-memory blobs from current state
2. `uploadFiles` → `validateModel` (phase: `uploading`)
3. On invalid: phase `invalid` with issue list
4. `getAnalyses` → show analysis list grouped by type (phase: `select`)
5. User picks one → `runAnalysis` (phase: `running`)
6. Show result: pass/fail, message, time in ms (phase: `result`)
7. "Run another" returns to `select` reusing the same `vrbPath` — no re-upload

`generateModelFiles` in `App.tsx` builds the `ModelFiles` by calling `exportPetriNet`, `exportFeatureModel` (via `fmPanelRef`), and `exportVariability`.

---

## ReactFlow conventions

**Custom nodes must wire `selected` manually.** ReactFlow passes `selected: boolean` as a prop but does not style fully custom nodes. Add a conditional border or outline based on `selected`.

**Never use `selectionOnDrag`.** It makes ReactFlow treat all pointer events as drag-selection, breaking normal click-to-select. Use `onNodeClick` / `onEdgeClick` handlers instead.

**`onSelectionChange` fires when any toolbar button steals focus**, which clears the ReactFlow selection before the button's `onClick` runs. Always snapshot the selection into a separate state variable before opening modals:
```ts
onAddPC={() => { setPcElements([...pnSelection]); setPcModalOpen(true); }}
```

**`onNodeClick` and `onSelectionChange` both fire on a single click.** The pattern used here: `onNodeClick` is the source of truth for single-click (sets both `propertiesNode` and `pnSelection`); `onSelectionChange` only acts when `total > 1` (multi-select). Ignore `total === 1` in `onSelectionChange`.

**Disable ReactFlow's built-in delete key** with `deleteKeyCode={null}`. Without this, ReactFlow and the custom keyboard handler both fire and deletions can happen twice or at the wrong time.

**Arc labels:** set both `label` (ReactFlow SVG rendering) and `data.label` (app state) when creating/updating edges. Always read from `edge.data?.label` in app code.

**`PcAnnotationNode`** is a custom node type (`pcAnnotation`) registered in `nodeTypes`. Its `data` carries `label: string` and `highlighted: boolean`. Positions are tracked separately in `pcAnnotationPositions` state (not inside the node data) to avoid triggering unnecessary re-renders.

---

## Naming counters

Use `useRef` counters that only increment, never reset. On creation, skip names already taken by a renamed element:

```ts
let label: string;
do {
  label = `arc${++arcCounter.current}`;
} while (edgesRef.current.some(e => (e.data?.label as string) === label));
```

The same pattern applies to `featureCounter` in `FeatureModelPanel`.

---

## Keyboard handler guards

Every `keydown` listener must guard:

```ts
if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
if (modalIsOpen) return;
```

Missing the `TEXTAREA` guard causes Backspace to trigger deletion while the user types in a modal.

---

## Feature Model specifics

- **Label changes** from `FeatureNode` are communicated via the custom DOM event `feature-label-change` (dispatched on `window` in the node component, handled in `FeatureModelPanel`).
- **Root is excluded** from all constraint and presence-condition feature dropdowns.
- **Validation** (`src/utils/fm/validateFeatureModel.ts`) runs reactively via `useMemo([nodes, edges])` and returns `ValidationError[]`. Root detection uses structure (no incoming edge), not a data flag.
- **GroupEdge** (`src/components/fm/GroupEdge.tsx`) draws the group arc/sector SVG. Only the first sibling edge in a group renders the arc; it reads all sibling edges from the ReactFlow store to compute the angular span. OR groups render a filled sector; XOR groups render an open arc.
- **ConstraintBuilder** (`src/components/fm/ConstraintBuilder.tsx`) is used only in the FM panel for cross-tree constraints. The PC modal uses `PcExpressionBuilder` instead (different data model: `Constraint` vs `PcExpression`).

---

## Vercel / build

`tsconfig.app.json` sets `tsBuildInfoFile: ".tsbuildinfo"` (project root, gitignored). This prevents Vercel from caching a stale incremental build file inside `node_modules/.tmp/` between deploys, which previously caused `tsc -b` to fail with "Cannot find module" for newly added files even though they were committed.

## Related repositories and how they connect

- **titan-api-poc**: https://github.com/TITAN-PNPL-WEB/titan-api-poc
  Spring Boot REST API. It is the only backend this front talks to, and it owns the contract described in "Backend API" above. Its CLAUDE.md is the source of truth for endpoints, DTO fields and CORS.
- **titan-core-fork**: https://github.com/TITAN-PNPL-WEB/titan-core-fork
  TITAN core with the headless path. The front never talks to it directly; analyses and `.vrb` validation reach it through the API.

Flow: front exports the three files -> `POST /upload` -> `vrbPath` -> `POST /validate` -> `POST /analyze` -> core.

### Contract rules
- The API owns the contract. If a response field changes, update `src/utils/api/titanApi.ts` and the types that use it (`AnalysisResult`, `ModelFiles`, the issue list in `ImportStatusModal`), not the other way around.
- The three exported files must match what the core parses: `.petrinets` as XMI with XPath index references, `model.xml` as FeatureIDE XML, `.vrb` with `pn "..."` and `fm "..."` pointing to the other two by relative name. If you change an exporter, check it against the format in "Import / Export file formats".
- A new front-end origin (another domain or port) has to be added to `CorsConfig` in titan-api-poc, or the browser will block the calls.

### Where a change belongs
- UI, editing, import/export of the three files: this repo.
- Endpoints, DTO fields, validation rules, CORS: titan-api-poc.
- Analysis results, headless loading, new analyses: titan-core-fork.

If a task needs a change in another repo, say so up front and list what would change there. Do not edit other repos from here unless asked.