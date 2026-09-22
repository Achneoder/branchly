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

type ViewState = Record<string, unknown>;

function readViewState(): ViewState {
  const state = vscode.getState();
  return state && typeof state === 'object' ? (state as ViewState) : {};
}

/**
 * Purely presentational, per-webview UI state (pane widths and the like) that should survive
 * VS Code discarding and re-creating the view. Anything the host is authoritative about belongs
 * in a message instead.
 */
export function getViewState<T>(key: string, fallback: T): T {
  const value = readViewState()[key];
  return value === undefined ? fallback : (value as T);
}

export function setViewState(key: string, value: unknown): void {
  vscode.setState({ ...readViewState(), [key]: value });
}
