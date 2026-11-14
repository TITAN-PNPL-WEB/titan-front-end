/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the TITAN API, ending in /pnpl. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
