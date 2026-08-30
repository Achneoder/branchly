import * as vscode from 'vscode';
import { Logger } from './logger';
import { RepositoryManager } from '../git/repositoryManager';
import { GitService } from '../git/gitService';

export class Container implements vscode.Disposable {
  readonly logger = new Logger('Branchly');
  readonly repositoryManager = new RepositoryManager(this.logger);
  private readonly gitServices = new Map<string, GitService>();

  constructor(readonly extensionContext: vscode.ExtensionContext) {}

  async activate(): Promise<boolean> {
    return this.repositoryManager.activate();
  }

  getGitService(root: string): GitService {
    let service = this.gitServices.get(root);
    if (!service) {
      service = new GitService(root);
      this.gitServices.set(root, service);
    }
    return service;
  }

  get activeRoot(): string | undefined {
    return this.repositoryManager.active?.rootUri.fsPath;
  }

  get activeGitService(): GitService | undefined {
    const root = this.activeRoot;
    return root ? this.getGitService(root) : undefined;
  }

  dispose(): void {
    this.repositoryManager.dispose();
    this.logger.dispose();
  }
}
