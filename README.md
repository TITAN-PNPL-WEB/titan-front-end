# TITAN Front-End

Web-based graphical editor for modeling **Petri Nets** annotated with **Presence Conditions** over a **Feature Model**. Built as the front-end component of the TITAN PNPL Web project.

## Overview

TITAN is a split-panel editor with two interactive canvases side by side:

- **Left — Petri Net editor**: create places, transitions, and arcs; annotate elements with presence conditions.
- **Right — Feature Model editor**: build a feature tree with group semantics (AND / OR / XOR) and cross-tree constraints.

Both panels are backed by `@xyflow/react`. The Feature Model tree is auto-laid out with `dagre` on every structural change. Presence Condition expressions are structured ASTs (NOT / AND / OR / IMPLIES) and are serialized to/from a custom `.vrb` text format.

---

## Features

### Petri Net editor
- Add **places** (circles) and **transitions** (rectangles) by clicking on the canvas
- Draw directed arcs (PT and TP) between elements
- Select and edit element properties (label, token count, arc weight) via the properties panel
- Multi-select elements for bulk operations
- Delete elements via toolbar button or `Delete` / `Backspace` keys
- Undo / Redo (`Ctrl+Z` / `Ctrl+Shift+Z`)
- Zoom, pan, and fit-view controls

### Feature Model editor
- Add, rename, and delete features
- Set features as abstract or mandatory
- Connect features with **AND**, **OR** (at-least-one), or **XOR** (exactly-one) group edges
- Add cross-tree **requires** and **excludes** constraints via the ConstraintBuilder
- Tree is re-laid out automatically (top-down with dagre) after every change

### Presence Conditions
- Annotate one or more PN elements with a boolean expression over FM features
- Expressions support NOT, AND, OR, and IMPLIES operators (recursive AST)
- Each element can have at most one presence condition
- PC labels are shown as annotation nodes on the canvas (toggleable)
- Edit or remove PCs from the sidebar list

### Import / Export
| Format | Extension | Description |
|---|---|---|
| Petri Net | `.petrinets` | XMI / EMF XML |
| Feature Model | `.xml` | FeatureIDE XML |
| Variability | `.vrb` | Custom text format — PC declarations |

**Import rules:**
- FM and PN files can be imported individually.
- Importing a PN requires the FM to already be loaded (feature IDs must be resolved).
- If a `.vrb` file is selected, **all three files must be selected together**. They are uploaded to the backend for validation before being rendered. If validation fails, errors are displayed and the import is blocked.

### Analyze
Click **Analyze** in the top toolbar to:
1. Generate the current model as in-memory files (no disk write needed)
2. Upload them to the backend
3. Validate the model — any validation errors are shown inline
4. Choose from the list of available analyses grouped by type (`PNPL` / `Products`)
5. Run the selected analysis and view the result (pass/fail + message + timing)

The **Analyze** button is disabled when the canvas is empty.

---

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [@xyflow/react](https://reactflow.dev/) — node-based canvas for both panels
- [dagre](https://github.com/dagrejs/dagre) — automatic tree layout for the Feature Model
- [Vite](https://vitejs.dev/) — dev server and build tool

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- TITAN backend running at `http://localhost:8080` (required for Analyze and import validation)

### Installation

```bash
git clone https://github.com/TITAN-PNPL-WEB/titan-front-end.git
cd titan-front-end
npm install
```

### Running locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Building for production

```bash
npm run build
```

### Linting and type-checking

```bash
npm run lint          # ESLint
npx tsc --noEmit      # type-check without building
```

---

## Backend API

All backend calls go to `http://localhost:8080/pnpl` (configured in `src/utils/api/titanApi.ts`).

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/pnpl/upload` | `multipart/form-data` with `vrb`, `petrinets`, `featureModel` files | `{ vrbPath, message }` |
| `POST` | `/pnpl/validate` | `{ vrbPath }` | `{ valid, issues[] }` |
| `GET` | `/pnpl/analyses` | — | `{ analyses[] }` |
| `POST` | `/pnpl/analyze` | `{ vrbPath, name, type }` | `{ analysis, allProducts, timeMs, message }` |

The `vrbPath` returned by `/upload` is the server-side temp path used in subsequent requests within the same session.

---

## Project Structure

```
src/
├── App.tsx                        # Root — all PN state; renders both panels and modals
├── components/
│   ├── AnalyzeModal.tsx           # Full analyze flow (upload → validate → select → run → result)
│   ├── ImportStatusModal.tsx      # Import validation feedback (validating / invalid / error)
│   ├── Toolbar.tsx                # Top bar (Import, Export, Analyze buttons)
│   ├── fm/
│   │   ├── FeatureModelPanel.tsx  # Self-contained FM editor with dagre layout
│   │   ├── FeatureNode.tsx        # Custom FM node (inline rename, abstract badge)
│   │   ├── GroupEdge.tsx          # Custom edge rendering OR/XOR group arcs
│   │   └── ConstraintBuilder.tsx  # Controlled constraint editor (shared by FM and PC modal)
│   └── pn/
│       ├── PlaceNode.tsx          # Custom PN place node
│       ├── TransitionNode.tsx     # Custom PN transition node
│       ├── PcAnnotationNode.tsx   # Floating PC label node on the canvas
│       ├── PetriNetToolbar.tsx    # In-canvas tool selector (select / place / transition / delete)
│       ├── PropertiesPanel.tsx    # Element properties editor (right sidebar of PN panel)
│       ├── PresenceConditionModal.tsx  # Add / edit a PC for selected elements
│       ├── PresenceConditionList.tsx   # Sidebar list of all PCs
│       └── PcExpressionBuilder.tsx     # Recursive UI for building PC expressions
├── types/
│   ├── petrinet.ts                # PlaceData, TransitionData, ArcData, PresenceCondition, PcExpression
│   └── featuremodel.ts            # Constraint, ConstraintTerm, ConstraintOperator, FeatureData
└── utils/
    ├── api/
    │   └── titanApi.ts            # uploadFiles, validateModel, getAnalyses, runAnalysis
    ├── export/
    │   ├── exportPetriNet.ts      # Nodes + edges → XMI XML string
    │   ├── exportFeatureModel.ts  # FM nodes + edges + constraints → FeatureIDE XML string
    │   └── exportVariability.ts   # PCs → .vrb text format
    ├── import/
    │   ├── importPetriNet.ts      # XMI XML → nodes + edges
    │   ├── importFeatureModel.ts  # FeatureIDE XML → FM nodes + edges + constraints
    │   └── importVariability.ts   # .vrb text → PresenceCondition[] (recursive descent parser)
    ├── fm/
    │   └── validateFeatureModel.ts  # Structural validation (useMemo, returns ValidationError[])
    └── pn/
        ├── pcExpression.ts           # pcExpressionToString, collectFeatureIds
        ├── evaluatePresenceCondition.ts
        └── validatePresenceCondition.ts
```

---

## File Formats

### `.petrinets` (XMI)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ex:PetriNet xmi:version="2.0" xmlns:xmi="..." xmlns:ex="http://www.petrinets.org/">
  <places name="P1" marking="1" outputs="//@arcs.0"/>
  <trans name="T1" inputs="//@arcs.0" outputs="//@arcs.1"/>
  <arcs xsi:type="ex:PTArc" name="arc1" input="//@places.0" output="//@trans.0"/>
</ex:PetriNet>
```

### `.xml` (FeatureIDE)

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<featureModel>
  <struct>
    <and mandatory="true" name="Root">
      <feature mandatory="true" name="FeatureA"/>
      <or name="FeatureB">
        <feature name="Child1"/>
        <feature name="Child2"/>
      </or>
    </and>
  </struct>
  <constraints>
    <rule><imp><var>FeatureA</var><var>Child1</var></imp></rule>
  </constraints>
</featureModel>
```

### `.vrb` (Variability / Presence Conditions)

```
pn "model.petrinets"
fm "model.xml"

PC for P1 = FeatureA ;
PC for T1 , arc1 = ( FeatureA and FeatureB ) ;
PC for P2 = ( not FeatureA implies FeatureB ) ;
```

Supported operators: `and`, `or`, `implies`, `not`. Unknown operators cause the PC to be silently skipped during import.
