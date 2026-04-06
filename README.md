# TITAN Front-End

Web-based graphical editor for modeling Petri Nets, built as part of the TITAN PNPL Web project.

## Overview

This application allows users to create and edit Petri Net diagrams through an interactive canvas. It is the front-end component of the TITAN PNPL Web architecture, which exposes the TITAN analysis engine as a REST API.

## Features

- Add places (circles) and transitions (rectangles) by clicking on the canvas
- Connect elements with directed arcs (PTArc and TPArc)
- Select and edit element properties (label, tokens) via the properties panel
- Delete elements using the toolbar button or the `Delete` / `Backspace` keys
- Undo/Redo support (`Ctrl+Z` / `Ctrl+Shift+Z`)
- Zoom and pan controls

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [React Flow](https://reactflow.dev/) — node-based canvas
- [Vite](https://vitejs.dev/) — build tool and dev server

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

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

## Project Structure

```
src/
├── components/
│   ├── nodes/
│   │   ├── PlaceNode.tsx
│   │   └── TransitionNode.tsx
│   ├── PropertiesPanel.tsx
│   └── Toolbar.tsx
├── types/
│   └── petrinet.ts
├── App.tsx
└── main.tsx
```
