import * as vscode from 'vscode';

export class DisposableStore implements vscode.Disposable {
  private readonly items: vscode.Disposable[] = [];
  private disposed = false;

  add<T extends vscode.Disposable>(item: T): T {
    if (this.disposed) {
      item.dispose();
      return item;
    }
    this.items.push(item);
    return item;
  }

  dispose(): void {
    this.disposed = true;
    while (this.items.length) {
      this.items.pop()?.dispose();
    }
  }
}
