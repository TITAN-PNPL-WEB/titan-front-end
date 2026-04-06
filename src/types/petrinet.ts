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