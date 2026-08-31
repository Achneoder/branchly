import type { FileChange } from '@shared/protocol';

export interface FileTreeFile extends FileChange {
  staged: boolean;
}

export interface FileTreeNode {
  /** '' for the root node, otherwise the full directory path, e.g. "src/git". */
  path: string;
  /** Last path segment; a compressed single-child chain joins segments with '/'. */
  name: string;
  children: FileTreeNode[];
  files: FileTreeFile[];
}

function getOrCreateChild(node: FileTreeNode, name: string, path: string): FileTreeNode {
  let child = node.children.find((c) => c.name === name);
  if (!child) {
    child = { path, name, children: [], files: [] };
    node.children.push(child);
  }
  return child;
}

/** Folds a directory node into its single child directory when it has no files of its
 * own, e.g. "src" -> "views" -> "handlers" becomes one "src/views/handlers" row. */
function compress(node: FileTreeNode): void {
  for (const child of node.children) compress(child);
  while (node.children.length === 1 && node.files.length === 0) {
    const only = node.children[0];
    node.name = `${node.name}/${only.name}`;
    node.path = only.path;
    node.children = only.children;
    node.files = only.files;
  }
}

export function buildFileTree(files: FileTreeFile[]): FileTreeNode {
  const root: FileTreeNode = { path: '', name: '', children: [], files: [] };
  for (const file of files) {
    const segments = file.path.split('/');
    const fileName = segments.pop();
    if (fileName === undefined) continue;
    let node = root;
    let path = '';
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      node = getOrCreateChild(node, segment, path);
    }
    node.files.push(file);
  }
  for (const child of root.children) compress(child);
  return root;
}

export function collectFilePaths(node: FileTreeNode): string[] {
  const paths = node.files.map((f) => f.path);
  for (const child of node.children) paths.push(...collectFilePaths(child));
  return paths;
}

export type FolderCheckState = 'checked' | 'unchecked' | 'indeterminate';

export function folderCheckState(node: FileTreeNode): FolderCheckState {
  let sawChecked = false;
  let sawUnchecked = false;
  for (const file of node.files) {
    if (file.staged) sawChecked = true;
    else sawUnchecked = true;
    if (sawChecked && sawUnchecked) return 'indeterminate';
  }
  for (const child of node.children) {
    const state = folderCheckState(child);
    if (state === 'indeterminate') return 'indeterminate';
    if (state === 'checked') sawChecked = true;
    else sawUnchecked = true;
    if (sawChecked && sawUnchecked) return 'indeterminate';
  }
  return sawChecked && !sawUnchecked ? 'checked' : 'unchecked';
}
