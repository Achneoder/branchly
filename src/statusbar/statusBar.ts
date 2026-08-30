import * as vscode from 'vscode';
import type { Container } from '../core/container';
import { getStatusSummary } from '../git/status';

export class BranchlyStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly container: Container) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'branchly.showBranchPopup';
    this.disposables.push(
      this.container.repositoryManager.onDidChangeActiveRepository(() => void this.refresh()),
      this.container.repositoryManager.onDidChangeRepositoryState(() => void this.refresh()),
    );
  }

  async refresh(): Promise<void> {
    const git = this.container.activeGitService;
    if (!git) {
      this.item.hide();
      return;
    }
    try {
      const status = await getStatusSummary(git);
      const parts = [`$(git-branch) ${status.branch || 'detached'}`];
      if (status.ahead) parts.push(`↑${status.ahead}`);
      if (status.behind) parts.push(`↓${status.behind}`);
      if (status.conflictCount) parts.push(`$(warning) ${status.conflictCount}`);
      this.item.text = parts.join(' ');
      this.item.show();
    } catch (err) {
      this.container.logger.error('Failed to refresh status bar', err);
      this.item.hide();
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.item.dispose();
  }
}
