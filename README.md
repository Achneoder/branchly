# Branchly

JetBrains-grade Git tooling for VS Code — a commit graph, changelist-based staging, an
interactive rebase editor, a three-pane conflict resolver, a shelf, and inline blame, all in
one bottom panel.

## Features

- **Log** — commit graph with lane rendering, speed search (subject/author/hash), branch/user/
  date/path filters, split and unified diff.
- **Commit** — changelists with per-file staging, commit / commit-and-push, amend.
- **Conflicts** — three-pane resolver (base / ours / theirs) with accept-yours, accept-theirs,
  and keep-both.
- **Rebase** — drag-to-reorder interactive rebase with pick/reword/squash/fixup/drop actions and
  a result preview.
- **Shelf** — stash/shelve, apply, drop, unshelve, with a preview diff.
- **History** — per-file commit history with a full blame column, plus inline editor blame.

## Installation

Branchly isn't published to the VS Code Marketplace — install it from a `.vsix` release build.

**One-line install** (downloads the latest release and installs it):

```bash
curl -L -o branchly.vsix https://github.com/Achneoder/branchly/releases/latest/download/branchly.vsix && code --install-extension branchly.vsix
```

PowerShell:

```powershell
Invoke-WebRequest -Uri https://github.com/Achneoder/branchly/releases/latest/download/branchly.vsix -OutFile branchly.vsix; code --install-extension branchly.vsix
```

**Manual install**

1. Download `branchly.vsix` from the [latest release](https://github.com/Achneoder/branchly/releases/latest).
2. In VS Code, open the Extensions view, click the `...` menu in the top right, and choose
   **Install from VSIX...**, then select the downloaded file.
   - Or from the command line: `code --install-extension /path/to/branchly.vsix`
3. Reload the window if prompted. The Branchly panel appears in the bottom panel group.

New releases are cut by pushing a `vX.Y.Z` tag, which triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml) to build and attach the `.vsix`
to a GitHub release automatically.

## Development

```bash
npm install
npm run build       # bundle extension host (esbuild) + webview (vite)
npm run lint         # eslint
npm run check        # tsc --noEmit + svelte-check
npm test             # vitest unit tests
npm run test:integration  # @vscode/test-cli against a generated fixture repo
```

Press `F5` in VS Code ("Run Extension") to launch an Extension Development Host with Branchly
loaded.

## Configuration

| Setting                         | Default       | Description                |
| ------------------------------- | ------------- | -------------------------- |
| `branchly.appearance.theme`     | `auto`        | Panel color theme.         |
| `branchly.appearance.density`   | `comfortable` | Row density.               |
| `branchly.appearance.monoGraph` | `false`       | Single-color commit graph. |
| `branchly.diff.mode`            | `split`       | Default diff view mode.    |
| `branchly.blame.enabled`        | `true`        | Inline editor blame.       |
| `branchly.log.pageSize`         | `500`         | Commits fetched per page.  |

## License

MIT
