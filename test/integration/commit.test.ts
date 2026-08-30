import * as assert from 'node:assert/strict';
import {
  createFixtureRepo,
  makeWorkingChanges,
  resetToClean,
  type Fixture,
} from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { getStatusEntries, toFileStatus } from '../../src/git/status';

describe('changelist staging + commit (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());
  afterEach(() => resetToClean(fx));

  it('reports a modified tracked file and an untracked file separately', async () => {
    const { modified, untracked } = makeWorkingChanges(fx);
    const entries = await getStatusEntries(git);

    const modifiedEntry = entries.find((e) => e.path === modified);
    assert.ok(modifiedEntry);
    assert.equal(toFileStatus(modifiedEntry!), 'M');

    const untrackedEntry = entries.find((e) => e.path === untracked);
    assert.ok(untrackedEntry);
    assert.equal(untrackedEntry!.kind, 'untracked');
  });

  it('committing only the selected file leaves the other one uncommitted', async () => {
    const { modified, untracked } = makeWorkingChanges(fx);

    await git.raw(['add', '--', modified]);
    await git.raw(['commit', '-m', 'Update src.txt only']);

    const entries = await getStatusEntries(git);
    assert.equal(
      entries.find((e) => e.path === modified),
      undefined,
      'the committed file should no longer show as a pending change',
    );
    assert.ok(
      entries.find((e) => e.path === untracked),
      'the untracked file should remain uncommitted',
    );

    const subject = (await git.raw(['log', '-1', '--format=%s'])).trim();
    assert.equal(subject, 'Update src.txt only');

    // undo the extra commit so afterEach's hard reset returns to the shared main tip
    await git.raw(['reset', '--hard', 'HEAD~1']);
  });
});
