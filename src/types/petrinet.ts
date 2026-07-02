// --- Place ---
export interface PlaceData {
  label: string;
  tokens: number;        // initial token count
}

// --- Transition ---
export interface TransitionData {
  label: string;
}

// --- Arc ---
export type ArcType = 'PT' | 'TP';   // Place→Transition or Transition→Place

export interface ArcData {
  arcType: ArcType;
  weight: number;        // arc weight (default 1)
}

// --- Editor tools ---
export type ToolType = 'select' | 'place' | 'transition' | 'delete';

// --- Multi-selection ---
export type PNElementType = 'place' | 'transition' | 'arc';

export interface PNSelectedElement {
  id: string;
  elementType: PNElementType;
  label: string;
}

// --- Presence Condition ---
import type { Constraint } from './featuremodel';

export interface PresenceCondition {
  id: string;
  elementIds: string[];
  expression: Constraint;
}