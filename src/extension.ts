import * as vscode from 'vscode';
import { Container } from './core/container';
import { PanelViewProvider } from './views/panelViewProvider';
import { BranchlyStatusBar } from './statusbar/statusBar';
import { registerCommands } from './commands';
import { BRANCHLY_SCHEME, GitContentProvider } from './editor/contentProvider';
import { BlameDecorationController } from './editor/blameDecorations';

let container: Container | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  container = new Container(context);
  context.subscriptions.push(container);

  const hasGit = await container.activate();
  if (!hasGit) {
    container.logger.warn(
      'Branchly needs the built-in Git extension (vscode.git). Enable it to use the panel.',
    );
  }

  const panel = new PanelViewProvider(container, context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PanelViewProvider.viewType, panel),
    vscode.workspace.registerTextDocumentContentProvider(
      BRANCHLY_SCHEME,
      new GitContentProvider(container),
    ),
  );

  const statusBar = new BranchlyStatusBar(container);
  context.subscriptions.push(statusBar);
  void statusBar.refresh();

  const blameDecorations = new BlameDecorationController(container);
  context.subscriptions.push(blameDecorations);

  registerCommands(context, container, panel, blameDecorations);
}

export function deactivate(): void {
  container = undefined;
}
