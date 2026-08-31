import { describe, expect, it } from 'vitest';
import {
  buildFileTree,
  collectFilePaths,
  folderCheckState,
  type FileTreeFile,
} from '../../webview/lib/fileTree';

function file(path: string, staged: boolean): FileTreeFile {
  return { path, status: 'M', additions: 0, deletions: 0, staged };
}

describe('buildFileTree', () => {
  it('nests files under their directory segments', () => {
    const tree = buildFileTree([file('src/git/log.ts', true), file('README.md', false)]);
    expect(tree.files.map((f) => f.path)).toEqual(['README.md']);
    expect(tree.children).toHaveLength(1);
    const src = tree.children[0];
    expect(src.name).toBe('src/git');
    expect(src.path).toBe('src/git');
    expect(src.files.map((f) => f.path)).toEqual(['src/git/log.ts']);
  });

  it('compresses a single-child directory chain into one row', () => {
    const tree = buildFileTree([file('src/views/handlers/commit.ts', true)]);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].name).toBe('src/views/handlers');
    expect(tree.children[0].children).toHaveLength(0);
  });

  it('does not compress past a branch point', () => {
    const tree = buildFileTree([file('src/git/log.ts', true), file('src/graph/lanes.ts', true)]);
    expect(tree.children).toHaveLength(1);
    const src = tree.children[0];
    expect(src.name).toBe('src');
    expect(src.children.map((c) => c.name).sort()).toEqual(['git', 'graph']);
  });

  it('does not compress past a directory that also holds files', () => {
    const tree = buildFileTree([file('src/index.ts', true), file('src/git/log.ts', true)]);
    expect(tree.children).toHaveLength(1);
    const src = tree.children[0];
    expect(src.name).toBe('src');
    expect(src.files.map((f) => f.path)).toEqual(['src/index.ts']);
    expect(src.children).toHaveLength(1);
    expect(src.children[0].name).toBe('git');
  });
});

describe('collectFilePaths', () => {
  it('gathers every leaf file path under a node', () => {
    const tree = buildFileTree([
      file('src/git/log.ts', true),
      file('src/git/status.ts', false),
      file('src/graph/lanes.ts', true),
    ]);
    expect(collectFilePaths(tree).sort()).toEqual([
      'src/git/log.ts',
      'src/git/status.ts',
      'src/graph/lanes.ts',
    ]);
  });
});

describe('folderCheckState', () => {
  it('is checked when every descendant file is staged', () => {
    const tree = buildFileTree([file('src/git/log.ts', true), file('src/git/status.ts', true)]);
    expect(folderCheckState(tree.children[0])).toBe('checked');
  });

  it('is unchecked when no descendant file is staged', () => {
    const tree = buildFileTree([file('src/git/log.ts', false), file('src/git/status.ts', false)]);
    expect(folderCheckState(tree.children[0])).toBe('unchecked');
  });

  it('is indeterminate when descendants are mixed', () => {
    const tree = buildFileTree([file('src/git/log.ts', true), file('src/git/status.ts', false)]);
    expect(folderCheckState(tree.children[0])).toBe('indeterminate');
  });

  it('is indeterminate when a nested subtree is mixed even if this level looks uniform', () => {
    const tree = buildFileTree([file('src/git/log.ts', true), file('src/graph/lanes.ts', false)]);
    expect(folderCheckState(tree.children[0])).toBe('indeterminate');
  });
});
