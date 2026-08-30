import * as assert from 'node:assert/strict';
import { createFixtureRepo, type Fixture } from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { getLog } from '../../src/git/log';
import { assignLanes } from '../../src/graph/lanes';

describe('git log + commit lane assignment (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());

  it('returns every commit reachable from main, including the merge', async () => {
    const commits = await getLog(git, { revisionRange: 'main' });
    // root, add src.txt, add feature.txt, add main-only.txt, merge commit
    assert.equal(commits.length, 5);

    const merge = commits.find((c) => c.parents.length > 1);
    assert.ok(merge, 'expected a merge commit in the history');
    assert.equal(merge!.parents.length, 2);
  });

  it('assigns the merge commit a filled dot and a link to its second parent', async () => {
    const commits = await getLog(git, { revisionRange: 'main' });
    const rows = assignLanes(commits.map((c) => ({ hash: c.hash, parents: c.parents })));

    const mergeIndex = commits.findIndex((c) => c.parents.length > 1);
    assert.ok(mergeIndex >= 0);
    assert.equal(rows[mergeIndex].isMerge, true);
    assert.equal(rows[mergeIndex].links.length, 1);

    const maxLane = Math.max(...rows.map((r) => r.lane));
    assert.ok(maxLane <= 2, `expected at most 2 lanes for one branch + merge, got ${maxLane}`);
  });
});
