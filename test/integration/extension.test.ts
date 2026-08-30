import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

describe('Branchly extension activation', () => {
  it('activates and registers its commands', async () => {
    const ext = vscode.extensions.getExtension('achneoder.branchly');
    assert.ok(ext, 'extension should be discoverable by id');
    await ext!.activate();
    assert.equal(ext!.isActive, true);

    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      'branchly.refresh',
      'branchly.openLog',
      'branchly.openCommit',
      'branchly.openConflicts',
      'branchly.openRebase',
      'branchly.openShelf',
      'branchly.openHistory',
      'branchly.showBranchPopup',
      'branchly.toggleBlame',
    ]) {
      assert.ok(commands.includes(command), `expected command "${command}" to be registered`);
    }
  });

  it('resolves the bottom-panel webview view without throwing', async () => {
    await vscode.commands.executeCommand('branchly.main.focus');
  });
});
