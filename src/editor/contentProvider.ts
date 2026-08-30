import * as vscode from 'vscode';
import type { Container } from '../core/container';

export const BRANCHLY_SCHEME = 'branchly-git';

interface UriPayload {
  root: string;
  hash: string;
}

export function encodeGitUri(root: string, hash: string, relativePath: string): vscode.Uri {
  const payload: UriPayload = { root, hash };
  return vscode.Uri.from({
    scheme: BRANCHLY_SCHEME,
    path: '/' + relativePath,
    query: JSON.stringify(payload),
  });
}

/** Serves read-only file content at an arbitrary revision (`git show <hash>:<path>`), so the
 * native diff editor can compare it against the working tree without checking anything out. */
export class GitContentProvider implements vscode.TextDocumentContentProvider {
  constructor(private readonly container: Container) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { root, hash } = JSON.parse(uri.query) as UriPayload;
    const relativePath = uri.path.replace(/^\//, '');
    const git = this.container.getGitService(root);
    try {
      return await git.raw(['show', `${hash}:${relativePath}`]);
    } catch {
      return '';
    }
  }
}
