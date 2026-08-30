import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import {
  createFixtureRepo,
  makeRebaseTarget,
  resetToClean,
  type Fixture,
} from '../fixtures/makeRepo';
import { GitService } from '../../src/git/gitService';
import { getLog } from '../../src/git/log';
import { startInteractiveRebase } from '../../src/git/rebase';
import type { RebaseTodoItem } from '../../src/shared/protocol';

function extensionRoot(): string {
  const ext = vscode.extensions.getExtension('achneoder.branchly');
  if (!ext) throw new Error('branchly extension not found in the test host');
  return ext.extensionPath;
}

describe('interactive rebase (real repo)', () => {
  let fx: Fixture;
  let git: GitService;

  before(() => {
    fx = createFixtureRepo();
    git = new GitService(fx.root);
  });

  after(() => fx.cleanup());
  afterEach(() => resetToClean(fx));

  it('drop + squash produce the expected resulting history', async () => {
    const { base, branch } = makeRebaseTarget(fx);
    const commits = await getLog(git, { revisionRange: `${base}..${branch}` });
    assert.equal(commits.length, 3, 'expected Step 1, 2, 3 ahead of main');

    // getLog returns newest first: [Step 3, Step 2, Step 1]. Build an oldest-first todo:
    // pick Step 1, drop Step 2, squash Step 3 into Step 1.
    const [step3, step2, step1] = commits;
    const toItem = (
      c: (typeof commits)[number],
      action: RebaseTodoItem['action'],
    ): RebaseTodoItem => ({
      id: c.hash,
      action,
      hash: c.hash,
      abbrev: c.hash.slice(0, 7),
      subject: c.subject,
      author: c.authorName,
    });
    const todo: RebaseTodoItem[] = [
      toItem(step1, 'pick'),
      toItem(step2, 'drop'),
      toItem(step3, 'squash'),
    ];

    await startInteractiveRebase(git, base, todo, { extensionPath: extensionRoot() });

    // Commits unique to the branch relative to its base: drop removes Step 2 entirely,
    // squash folds Step 3 into Step 1, leaving exactly one surviving commit.
    const resultLog = await getLog(git, { revisionRange: `${base}..${branch}` });
    assert.equal(resultLog.length, 1);

    // Our GIT_EDITOR shim overwrites the squash's combined-message prompt with the
    // squash item's own subject (see src/git/rebase.ts), so the surviving commit's
    // final message is "Step 3", not "Step 1".
    assert.equal(resultLog[0].subject, 'Step 3');

    const survivorFiles = (await git.raw(['show', '--name-only', '--format=', resultLog[0].hash]))
      .trim()
      .split('\n')
      .filter(Boolean);
    assert.deepEqual(survivorFiles.sort(), ['step1.txt', 'step3.txt']);
  });
});
