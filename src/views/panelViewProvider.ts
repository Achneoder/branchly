import * as vscode from 'vscode';
import type { Container } from '../core/container';
import { AbortRegistry } from '../core/abortRegistry';
import { readAppearance } from '../core/config';
import type { AppearanceState, WebviewToHostMessage } from '../shared/protocol';
import type { PanelContext } from './handlers/types';
import { getRepoStatus } from './handlers/shared';
import * as logHandler from './handlers/log';
import * as commitHandler from './handlers/commit';
import * as conflictsHandler from './handlers/conflicts';
import * as rebaseHandler from './handlers/rebase';
import * as shelfHandler from './handlers/shelf';
import * as historyHandler from './handlers/history';
import * as branchesHandler from './handlers/branches';

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

export class PanelViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'branchly.main';

  private view: vscode.WebviewView | undefined;
  private readonly aborts = new AbortRegistry();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly container: Container,
    private readonly extensionUri: vscode.Uri,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')],
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);

    const ctx: PanelContext = {
      container: this.container,
      post: (msg) => void this.view?.webview.postMessage(msg),
      extensionUri: this.extensionUri,
      aborts: this.aborts,
    };

    this.disposables.push(
      webviewView.webview.onDidReceiveMessage((msg: WebviewToHostMessage) =>
        this.dispatch(msg, ctx),
      ),
      this.container.repositoryManager.onDidChangeActiveRepository(() => void this.pushStatus(ctx)),
      this.container.repositoryManager.onDidChangeRepositoryState(() => {
        void this.pushStatus(ctx);
        void commitHandler.refresh(ctx);
      }),
      vscode.window.onDidChangeActiveColorTheme(() => this.pushAppearance(ctx)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('branchly')) this.pushAppearance(ctx);
      }),
      vscode.window.onDidChangeActiveTextEditor(
        (editor) => void historyHandler.pushActiveFile(ctx, editor?.document.uri),
      ),
    );

    webviewView.onDidDispose(() => {
      this.disposables.forEach((d) => d.dispose());
      this.disposables.length = 0;
      this.aborts.dispose();
    });
  }

  refresh(): void {
    if (!this.view) return;
    const ctx = this.contextFor(this.view);
    this.pushAppearance(ctx);
    void this.pushStatus(ctx);
  }

  private contextFor(view: vscode.WebviewView): PanelContext {
    return {
      container: this.container,
      post: (msg) => void view.webview.postMessage(msg),
      extensionUri: this.extensionUri,
      aborts: this.aborts,
    };
  }

  private pushAppearance(ctx: PanelContext): void {
    ctx.post({ type: 'appearance', appearance: readAppearance() });
  }

  private async pushStatus(ctx: PanelContext): Promise<void> {
    ctx.post({ type: 'status', status: await getRepoStatus(ctx) });
  }

  private async applyAppearancePatch(patch: Partial<AppearanceState>): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('branchly');
    const target = vscode.ConfigurationTarget.Global;
    const updates: Thenable<void>[] = [];
    if (patch.theme !== undefined)
      updates.push(cfg.update('appearance.theme', patch.theme, target));
    if (patch.density !== undefined)
      updates.push(cfg.update('appearance.density', patch.density, target));
    if (patch.monoGraph !== undefined)
      updates.push(cfg.update('appearance.monoGraph', patch.monoGraph, target));
    if (patch.diffMode !== undefined) updates.push(cfg.update('diff.mode', patch.diffMode, target));
    if (patch.showBlameGutter !== undefined)
      updates.push(cfg.update('blame.enabled', patch.showBlameGutter, target));
    await Promise.all(updates);
  }

  private async dispatch(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
    try {
      switch (true) {
        case msg.type === 'ready':
          ctx.post({
            type: 'init',
            appearance: readAppearance(),
            status: await getRepoStatus(ctx),
          });
          await historyHandler.pushActiveFile(ctx, vscode.window.activeTextEditor?.document.uri);
          return;
        case msg.type === 'setTab':
          return;
        case msg.type === 'setAppearance':
          await this.applyAppearancePatch(msg.patch);
          return;
        case msg.type.startsWith('log:'):
          return await logHandler.handle(msg, ctx);
        case msg.type.startsWith('commit:'):
          return await commitHandler.handle(msg, ctx);
        case msg.type.startsWith('conflicts:'):
          return await conflictsHandler.handle(msg, ctx);
        case msg.type.startsWith('rebase:'):
          return await rebaseHandler.handle(msg, ctx);
        case msg.type.startsWith('shelf:'):
          return await shelfHandler.handle(msg, ctx);
        case msg.type.startsWith('history:'):
          return await historyHandler.handle(msg, ctx);
        case msg.type.startsWith('branches:'):
          return await branchesHandler.handle(msg, ctx);
      }
    } catch (err) {
      this.container.logger.error('Failed to handle webview message', err);
      ctx.post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private renderHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.css'),
    );
    const csp = nonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; script-src 'nonce-${csp}';" />
<link rel="stylesheet" href="${styleUri}" />
</head>
<body>
<div id="app"></div>
<script nonce="${csp}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
