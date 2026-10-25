/// <reference types="vite/client" />

declare global {
  interface Window {
    eyroz?: {
      probeCodex(): Promise<{ connected: boolean; detail: string }>;
      identity(): Promise<{ workspace: string }>;
      listSessions(workspace: string): Promise<Array<{ id: string; name?: string; updatedAt?: number; status: string }>>;
      chooseWorkspace(): Promise<string | undefined>;
      installBridge(workspace: string): Promise<{ workspace: string; label: string; detail: string }>;
      onSessionEvent(listener: (snapshot: unknown) => void): () => void;
      openWorkspace(workspace?: string): Promise<boolean>;
      resize(expanded: boolean): void;
      close(): void;
    };
  }
}

export {};
