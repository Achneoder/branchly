import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Fixture {
  root: string;
  git(args: string[]): string;
  /** Runs a git command that is expected to fail (e.g. a merge that conflicts) without
   * throwing; returns nothing meaningful, the point is just not to blow up the test. */
  gitAllowFail(args: string[]): void;
  writeFile(relativePath: string, content: string): void;
  cleanup(): void;
}

/**
 * Builds a throwaway repository with a small linear-plus-merge history on `main`
 * (root commit, a second commit, a `feature` branch merged back with --no-ff), used
 * as the shared workspace for every integration test. Each test scenario layers its
 * own state on top via the helpers below and is responsible for restoring `main` in a
 * clean, unmerged state afterwards so scenarios stay order-independent.
 */
export function createFixtureRepo(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'branchly-fixture-'));

  const run = (args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });

  const runAllowFail = (args: string[]): void => {
    try {
      run(args);
    } catch {
      // expected for e.g. a merge that stops on conflict
    }
  };

  const write = (relativePath: string, content: string): void => {
    writeFileSync(join(root, relativePath), content, 'utf8');
  };

  run(['init', '-b', 'main']);
  run(['config', 'user.name', 'Branchly Test']);
  run(['config', 'user.email', 'test@branchly.dev']);
  run(['config', 'commit.gpgsign', 'false']);

  write('README.md', '# fixture\n');
  run(['add', '.']);
  run(['commit', '-m', 'Initial commit']);

  write('src.txt', 'line1\nline2\nline3\n');
  run(['add', '.']);
  run(['commit', '-m', 'Add src.txt']);

  run(['checkout', '-b', 'feature']);
  write('feature.txt', 'feature content\n');
  run(['add', '.']);
  run(['commit', '-m', 'Add feature.txt']);

  run(['checkout', 'main']);
  write('main-only.txt', 'main only\n');
  run(['add', '.']);
  run(['commit', '-m', 'Add main-only.txt']);

  run(['merge', '--no-ff', '-m', "Merge branch 'feature'", 'feature']);

  return {
    root,
    git: run,
    gitAllowFail: runAllowFail,
    writeFile: write,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** Leaves an uncommitted, tracked-file modification and an untracked file on `main`,
 * for exercising changelist staging. */
export function makeWorkingChanges(fx: Fixture): { modified: string; untracked: string } {
  fx.git(['checkout', 'main']);
  fx.writeFile('src.txt', 'line1\nline2 modified\nline3\n');
  fx.writeFile('new-file.txt', 'brand new\n');
  return { modified: 'src.txt', untracked: 'new-file.txt' };
}

/** Sets up two branches that both modify the same line of the same file, then attempts
 * to merge them, leaving the repo mid-merge with a real conflict on `conflict.txt`. */
export function makeConflict(fx: Fixture): { path: string } {
  const path = 'conflict.txt';
  fx.git(['checkout', 'main']);
  fx.writeFile(path, 'base line\n');
  fx.git(['add', '.']);
  // Idempotent across repeated calls within the same describe block: a re-run sees no
  // changes to commit (the file is already there from the first call) and that's fine.
  fx.gitAllowFail(['commit', '-m', 'Add conflict.txt']);

  fx.gitAllowFail(['branch', '-D', 'ours-branch']);
  fx.git(['checkout', '-b', 'ours-branch']);
  fx.writeFile(path, 'ours line\n');
  fx.git(['add', '.']);
  fx.git(['commit', '-m', 'ours change']);

  fx.git(['checkout', 'main']);
  fx.gitAllowFail(['branch', '-D', 'theirs-branch']);
  fx.git(['checkout', '-b', 'theirs-branch']);
  fx.writeFile(path, 'theirs line\n');
  fx.git(['add', '.']);
  fx.git(['commit', '-m', 'theirs change']);

  fx.git(['checkout', 'ours-branch']);
  fx.gitAllowFail(['merge', 'theirs-branch']);

  return { path };
}

/** Aborts any conflict left by makeConflict() and returns to a clean `main`. */
export function resetToClean(fx: Fixture): void {
  fx.gitAllowFail(['merge', '--abort']);
  fx.gitAllowFail(['rebase', '--abort']);
  fx.git(['checkout', 'main']);
  fx.git(['reset', '--hard', 'HEAD']);
  fx.git(['clean', '-fd']);
}

/** Creates a `rebase-target` branch three linear commits ahead of `main`, ready for a
 * scripted interactive rebase (e.g. drop the middle commit, squash the last into it). */
export function makeRebaseTarget(fx: Fixture): { base: string; branch: string } {
  const branch = 'rebase-target';
  fx.git(['checkout', 'main']);
  fx.gitAllowFail(['branch', '-D', branch]);
  fx.git(['checkout', '-b', branch]);
  for (const n of [1, 2, 3]) {
    fx.writeFile(`step${n}.txt`, `content ${n}\n`);
    fx.git(['add', '.']);
    fx.git(['commit', '-m', `Step ${n}`]);
  }
  return { base: 'main', branch };
}
