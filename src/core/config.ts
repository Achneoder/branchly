import * as vscode from 'vscode';
import type { AppearanceState } from '../shared/protocol';

export function readAppearance(): AppearanceState {
  const cfg = vscode.workspace.getConfiguration('branchly');
  const themeSetting = cfg.get<'auto' | 'dark' | 'light'>('appearance.theme', 'auto');
  const kind = vscode.window.activeColorTheme.kind;
  const isLight =
    kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
  const resolvedTheme = themeSetting === 'auto' ? (isLight ? 'light' : 'dark') : themeSetting;

  return {
    theme: resolvedTheme,
    density: cfg.get('appearance.density', 'comfortable'),
    monoGraph: cfg.get('appearance.monoGraph', false),
    diffMode: cfg.get('diff.mode', 'split'),
    showBlameGutter: cfg.get('blame.enabled', true),
  };
}

export function getLogPageSize(): number {
  return vscode.workspace.getConfiguration('branchly').get('log.pageSize', 500);
}
