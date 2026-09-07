import * as assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createFixtureRepo,
  makeRebaseTarget,
  resetToClean,
  type Fixture,
} from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { deleteLocalBranch, listBranches } from '../../src/git/refs';

describe('branch management (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());
  afterEach(() => resetToClean(fx));

  it('renames a local branch', async () => {
    fx.git(['branch', 'rename-me', 'main']);
    await git.raw(['branch', '-m', 'rename-me', 'renamed']);

    const branches = await listBranches(git);
    assert.ok(!branches.some((b) => b.kind === 'local' && b.name === 'rename-me'));
    assert.ok(branches.some((b) => b.kind === 'local' && b.name === 'renamed'));
  });

  it('deletes a merged local branch with -d', async () => {
    fx.git(['branch', 'merged-branch', 'main']);
    await deleteLocalBranch(git, 'merged-branch', false);

    const branches = await listBranches(git);
    assert.ok(!branches.some((b) => b.kind === 'local' && b.name === 'merged-branch'));
  });

  it('refuses -d on an unmerged branch but -D forces it through', async () => {
    fx.git(['checkout', '-b', 'unmerged-branch']);
    fx.writeFile('unmerged-only.txt', 'not on main\n');
    fx.git(['add', '.']);
    fx.git(['commit', '-m', 'commit only on unmerged-branch']);
    fx.git(['checkout', 'main']);

    await assert.rejects(deleteLocalBranch(git, 'unmerged-branch', false));
    await deleteLocalBranch(git, 'unmerged-branch', true);

    const branches = await listBranches(git);
    assert.ok(!branches.some((b) => b.kind === 'local' && b.name === 'unmerged-branch'));
  });

  it('merges a branch into the current branch', async () => {
    fx.git(['checkout', '-b', 'merge-me']);
    fx.writeFile('merge-me.txt', 'merged content\n');
    fx.git(['add', '.']);
    fx.git(['commit', '-m', 'Add merge-me.txt']);
    fx.git(['checkout', 'main']);

    await git.raw(['merge', '--no-edit', 'merge-me']);

    assert.ok(existsSync(join(fx.root, 'merge-me.txt')));
  });

  it('rebases the current branch onto another', async () => {
    const { base, branch } = makeRebaseTarget(fx);
    fx.git(['checkout', branch]);

    await git.raw(['rebase', base]);

    // makeRebaseTarget stacks 3 commits on top of `base`; after rebasing onto the
    // (now-unchanged) tip of `base` again, those 3 commits should still be there, replayed
    // directly on top of it.
    const mergeBase = (await git.raw(['merge-base', base, branch])).trim();
    const baseHead = (await git.raw(['rev-parse', base])).trim();
    assert.equal(mergeBase, baseHead, 'base should be an ancestor of the rebased branch');

    const ahead = (await git.raw(['rev-list', '--count', `${base}..${branch}`])).trim();
    assert.equal(ahead, '3', 'all 3 commits should have been replayed on top of base');
  });

  it('reports the merged flag against real ref topology', async () => {
    fx.git(['checkout', '-b', 'not-merged-branch']);
    fx.writeFile('not-merged.txt', 'not merged\n');
    fx.git(['add', '.']);
    fx.git(['commit', '-m', 'commit only on not-merged-branch']);
    fx.git(['checkout', 'main']);

    const branches = await listBranches(git);
    const feature = branches.find((b) => b.kind === 'local' && b.name === 'feature');
    const notMerged = branches.find((b) => b.kind === 'local' && b.name === 'not-merged-branch');
    assert.equal(feature?.merged, true, 'feature was merged into main by the fixture setup');
    assert.equal(notMerged?.merged, false);
  });
});
