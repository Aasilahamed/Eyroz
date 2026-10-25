/// <reference types="vite/client" />

declare global {
  interface Window {
    eyroz?: {
      probeCodex(): Promise<{ connected: boolean; detail: string }>;
      identity(): Promise<{ workspace: string }>;
      openWorkspace(workspace?: string): Promise<boolean>;
      resize(expanded: boolean): void;
      close(): void;
    };
  }
}

export {};
