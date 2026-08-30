import * as vscode from 'vscode';
import { Container } from './core/container';
import { PanelViewProvider } from './views/panelViewProvider';
import { BranchlyStatusBar } from './statusbar/statusBar';
import { registerCommands } from './commands';

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
  );

  const statusBar = new BranchlyStatusBar(container);
  context.subscriptions.push(statusBar);
  void statusBar.refresh();

  registerCommands(context, container, panel);
}

export function deactivate(): void {
  container = undefined;
}
