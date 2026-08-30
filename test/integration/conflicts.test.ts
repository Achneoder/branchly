import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createFixtureRepo, makeConflict, resetToClean, type Fixture } from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { acceptOurs, getConflictStages, listConflictedPaths } from '../../src/git/worktree';

describe('conflict resolution (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());
  afterEach(() => resetToClean(fx));

  it('exposes the base/ours/theirs stages for a conflicted file', async () => {
    const { path } = makeConflict(fx);

    const conflicted = await listConflictedPaths(git);
    assert.deepEqual(conflicted, [path]);

    const stages = await getConflictStages(git, path);
    assert.equal(stages.ours?.trim(), 'ours line');
    assert.equal(stages.theirs?.trim(), 'theirs line');
    assert.equal(stages.base?.trim(), 'base line');
  });

  it('accept ours resolves the conflict and stages the resolved file', async () => {
    const { path } = makeConflict(fx);

    await acceptOurs(git, path);

    const conflicted = await listConflictedPaths(git);
    assert.deepEqual(conflicted, []);

    const content = readFileSync(join(fx.root, path), 'utf8');
    assert.equal(content.trim(), 'ours line');
  });
});
