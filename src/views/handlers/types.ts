import type * as vscode from 'vscode';
import type { Container } from '../../core/container';
import type { AbortRegistry } from '../../core/abortRegistry';
import type { HostToWebviewMessage } from '../../shared/protocol';

export interface PanelContext {
  container: Container;
  post(message: HostToWebviewMessage): void;
  extensionUri: vscode.Uri;
  aborts: AbortRegistry;
}
