import type { HostToWebviewMessage, WebviewToHostMessage } from '@shared/protocol';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

type Listener = (message: HostToWebviewMessage) => void;
const listeners = new Set<Listener>();

window.addEventListener('message', (event: MessageEvent<HostToWebviewMessage>) => {
  for (const listener of listeners) listener(event.data);
});

export function postToHost(message: WebviewToHostMessage): void {
  vscode.postMessage(message);
}

export function onHostMessage(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
