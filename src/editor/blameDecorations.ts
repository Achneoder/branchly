import * as vscode from 'vscode';
import type { Container } from '../core/container';
import { getBlame } from '../git/blame';
import { toRepoRelativePath } from '../views/handlers/history';
import type { BlameLine } from '../shared/protocol';

const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 3em',
    color: new vscode.ThemeColor('editorCodeLens.foreground'),
    fontStyle: 'italic',
  },
});

const MAX_CACHE_ENTRIES = 20;

/** Shows an end-of-line annotation for the cursor's current line (author, date, short
 * hash), similar to GitLens's current-line blame. Cached per document version so moving
 * the cursor around an unchanged, saved file doesn't re-run `git blame`. */
export class BlameDecorationController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly cache = new Map<string, Map<number, BlameLine>>();
  private enabled: boolean;

  constructor(private readonly container: Container) {
    this.enabled = vscode.workspace.getConfiguration('branchly').get('blame.enabled', true);
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => void this.update(editor)),
      vscode.window.onDidChangeTextEditorSelection((e) => void this.update(e.textEditor)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration('branchly.blame.enabled')) return;
        this.enabled = vscode.workspace.getConfiguration('branchly').get('blame.enabled', true);
        if (this.enabled) void this.update(vscode.window.activeTextEditor);
        else this.clearAll();
      }),
    );
  }

  toggle(): void {
    void vscode.workspace
      .getConfiguration('branchly')
      .update('blame.enabled', !this.enabled, vscode.ConfigurationTarget.Global);
  }

  private clearAll(): void {
    for (const editor of vscode.window.visibleTextEditors)
      editor.setDecorations(decorationType, []);
  }

  private async update(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor || !this.enabled) return;
    const root = this.container.activeRoot;
    const relativePath = root ? toRepoRelativePath(root, editor.document.uri) : undefined;
    if (!root || !relativePath) {
      editor.setDecorations(decorationType, []);
      return;
    }

    const line = editor.selection.active.line;
    const cacheKey = `${editor.document.uri.toString()}::${editor.document.version}`;
    let lineMap = this.cache.get(cacheKey);
    if (!lineMap) {
      if (editor.document.isDirty) {
        editor.setDecorations(decorationType, []);
        return;
      }
      try {
        const git = this.container.getGitService(root);
        const blame = await getBlame(git, relativePath);
        lineMap = new Map(blame.map((b) => [b.line - 1, b]));
        this.cache.set(cacheKey, lineMap);
        if (this.cache.size > MAX_CACHE_ENTRIES) {
          const oldest = this.cache.keys().next().value;
          if (oldest) this.cache.delete(oldest);
        }
      } catch {
        editor.setDecorations(decorationType, []);
        return;
      }
    }

    const info = lineMap.get(line);
    if (!info) {
      editor.setDecorations(decorationType, []);
      return;
    }
    editor.setDecorations(decorationType, [
      {
        range: editor.document.lineAt(line).range,
        renderOptions: {
          after: { contentText: `  ${info.author}, ${info.date} · ${info.abbrev}` },
        },
      },
    ]);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    decorationType.dispose();
  }
}
