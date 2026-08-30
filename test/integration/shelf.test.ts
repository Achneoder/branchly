import * as assert from 'node:assert/strict';
import {
  createFixtureRepo,
  makeWorkingChanges,
  resetToClean,
  type Fixture,
} from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { getStatusEntries } from '../../src/git/status';
import { applyStash, createStash, dropStash, listStashes } from '../../src/git/stash';

describe('shelf / stash round-trip (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());
  afterEach(() => resetToClean(fx));

  it('applying (pop) restores the stashed working change', async () => {
    const { modified } = makeWorkingChanges(fx);
    await createStash(git, 'test shelf', false);

    let entries = await getStatusEntries(git);
    assert.equal(
      entries.find((e) => e.path === modified),
      undefined,
      'the change should be stashed away',
    );

    const [stash] = await listStashes(git);
    assert.ok(stash);

    await applyStash(git, stash.ref, true);

    entries = await getStatusEntries(git);
    assert.ok(
      entries.find((e) => e.path === modified),
      'the change should be restored to the working tree',
    );
    assert.equal((await listStashes(git)).length, 0, 'a popped stash should be gone');
  });

  it('dropping a stash removes it without applying it', async () => {
    const { modified } = makeWorkingChanges(fx);
    await createStash(git, 'to be dropped', false);

    const [stash] = await listStashes(git);
    await dropStash(git, stash.ref);

    assert.equal((await listStashes(git)).length, 0);
    const entries = await getStatusEntries(git);
    assert.equal(
      entries.find((e) => e.path === modified),
      undefined,
      'a dropped stash must not reapply its change',
    );
  });
});
