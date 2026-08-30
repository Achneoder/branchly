import * as vscode from 'vscode';
import type { Logger } from '../core/logger';

// Minimal shape of the built-in git extension's public API (vscode.git, version 1).
// We only declare the members we actually consume.
export interface GitExtensionRef {
  name?: string;
  type?: number;
  commit?: string;
  remote?: string;
}

export interface GitExtensionRepositoryState {
  readonly HEAD?: { name?: string; commit?: string; ahead?: number; behind?: number };
  readonly refs: readonly GitExtensionRef[];
  readonly onDidChange: vscode.Event<void>;
}

export interface GitExtensionRepository {
  readonly rootUri: vscode.Uri;
  readonly state: GitExtensionRepositoryState;
}

interface GitExtensionAPI {
  readonly repositories: GitExtensionRepository[];
  readonly onDidOpenRepository: vscode.Event<GitExtensionRepository>;
  readonly onDidCloseRepository: vscode.Event<GitExtensionRepository>;
}

interface GitExtensionExports {
  getAPI(version: 1): GitExtensionAPI;
}

/**
 * Discovers repositories via the built-in `vscode.git` extension instead of
 * watching the filesystem ourselves, so we inherit its multi-root and
 * submodule handling for free.
 */
export class RepositoryManager implements vscode.Disposable {
  private api: GitExtensionAPI | undefined;
  private activeRepo: GitExtensionRepository | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly watchedRoots = new Set<string>();

  private readonly _onDidChangeActiveRepository = new vscode.EventEmitter<
    GitExtensionRepository | undefined
  >();
  readonly onDidChangeActiveRepository = this._onDidChangeActiveRepository.event;

  private readonly _onDidChangeRepositoryState = new vscode.EventEmitter<void>();
  readonly onDidChangeRepositoryState = this._onDidChangeRepositoryState.event;

  constructor(private readonly logger: Logger) {}

  async activate(): Promise<boolean> {
    const ext = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
    if (!ext) {
      this.logger.warn('The built-in "vscode.git" extension is not installed or enabled.');
      return false;
    }
    const exports = ext.isActive ? ext.exports : await ext.activate();
    this.api = exports.getAPI(1);

    this.disposables.push(
      this.api.onDidOpenRepository((repo) => this.watchRepo(repo)),
      this.api.onDidCloseRepository(() => this.pickActive()),
    );
    for (const repo of this.api.repositories) this.watchRepo(repo);
    this.pickActive();
    return true;
  }

  private watchRepo(repo: GitExtensionRepository): void {
    const root = repo.rootUri.fsPath;
    if (this.watchedRoots.has(root)) return;
    this.watchedRoots.add(root);
    this.disposables.push(repo.state.onDidChange(() => this._onDidChangeRepositoryState.fire()));
    this.pickActive();
  }

  private pickActive(): void {
    const repos = this.api?.repositories ?? [];
    const next = repos[0];
    if (next?.rootUri.fsPath !== this.activeRepo?.rootUri.fsPath) {
      this.activeRepo = next;
      this._onDidChangeActiveRepository.fire(next);
    }
  }

  get active(): GitExtensionRepository | undefined {
    return this.activeRepo;
  }

  get repositories(): readonly GitExtensionRepository[] {
    return this.api?.repositories ?? [];
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this._onDidChangeActiveRepository.dispose();
    this._onDidChangeRepositoryState.dispose();
  }
}
