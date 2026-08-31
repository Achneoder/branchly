import * as vscode from 'vscode';
import type { AppearanceState } from '../shared/protocol';

export function readAppearance(): AppearanceState {
  const cfg = vscode.workspace.getConfiguration('branchly');
  const themeSetting = cfg.get<'auto' | 'dark' | 'light'>('appearance.theme', 'auto');

  return {
    theme: themeSetting,
    density: cfg.get('appearance.density', 'comfortable'),
    monoGraph: cfg.get('appearance.monoGraph', false),
    diffMode: cfg.get('diff.mode', 'split'),
    showBlameGutter: cfg.get('blame.enabled', true),
  };
}

export function getLogPageSize(): number {
  return vscode.workspace.getConfiguration('branchly').get('log.pageSize', 500);
}
