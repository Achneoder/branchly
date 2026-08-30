import * as vscode from 'vscode';
import type { Container } from '../core/container';
import type { PanelViewProvider } from '../views/panelViewProvider';
import type { BlameDecorationController } from '../editor/blameDecorations';

export function registerCommands(
  context: vscode.ExtensionContext,
  container: Container,
  panel: PanelViewProvider,
  blameDecorations: BlameDecorationController,
): void {
  const openTab = (tab: 'log' | 'commit' | 'conflicts' | 'rebase' | 'shelf' | 'history') =>
    vscode.commands.registerCommand(`branchly.open${capitalize(tab)}`, async () => {
      await vscode.commands.executeCommand('branchly.main.focus');
    });

  context.subscriptions.push(
    vscode.commands.registerCommand('branchly.refresh', () => panel.refresh()),
    openTab('log'),
    openTab('commit'),
    openTab('conflicts'),
    openTab('rebase'),
    openTab('shelf'),
    openTab('history'),
    vscode.commands.registerCommand('branchly.showBranchPopup', async () => {
      await vscode.commands.executeCommand('branchly.main.focus');
    }),
    vscode.commands.registerCommand('branchly.toggleBlame', () => blameDecorations.toggle()),
  );

  void container;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
