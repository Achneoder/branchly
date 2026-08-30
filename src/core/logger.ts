import * as vscode from 'vscode';

export class Logger {
  private readonly channel: vscode.OutputChannel;

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name);
  }

  info(message: string): void {
    this.channel.appendLine(`[info] ${message}`);
  }

  warn(message: string): void {
    this.channel.appendLine(`[warn] ${message}`);
  }

  error(message: string, error?: unknown): void {
    const suffix =
      error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : '';
    this.channel.appendLine(`[error] ${message}${suffix}`);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
