# Branchly — engineering notes for Claude

Branchly is a VS Code extension that puts JetBrains-style Git tooling in a bottom-panel tool
window: a lane-rendered commit graph, changelist-based staging, an interactive rebase editor, a
three-pane conflict resolver, a shelf (stash), and file history with blame. The visual target is
the "Orbit Git" Claude Design mockup; keep new UI work consistent with its density, palette, and
layout conventions (see "Mockup fidelity" below) unless the user asks for a different look.

## Architecture

Two build targets share one repository and one message protocol:

- **Extension host** (`src/`) — Node/CommonJS, bundled by esbuild to `dist/extension.js` (plus a
  standalone `dist/editor/rebaseEditor.js`, see below). This is where all git access, VS Code API
  calls, and business logic live.
- **Webview panel** (`webview/`) — Svelte 5 (runes), bundled by Vite to `dist/webview/{main.js,main.css}`.
  Pure UI: it never touches git or the filesystem directly, only the host.

They communicate over `vscode.Webview.postMessage` using the single typed contract in
`src/shared/protocol.ts` (`HostToWebviewMessage` / `WebviewToHostMessage`). **Both sides import
this file — extend it before adding any new message**, and prefer exhaustive `switch (msg.type)`
handling so a missing case is a type error, not a silent no-op.

### Directory map

```
src/
  extension.ts            activate()/deactivate(); wires Container, PanelViewProvider,
                           status bar, blame decorations, commands, content provider
  core/
    container.ts           holds Logger, RepositoryManager, and one GitService per repo root
    config.ts               reads branchly.* settings into AppearanceState
    abortRegistry.ts        "cancel the previous request for this key" helper
    logger.ts, disposable.ts
  git/                      one module per concern; each exports pure parsers (unit-tested,
                             no git binary needed) alongside the impure `git.raw(...)` callers
    gitService.ts           serialized, cooperatively-cancellable simple-git wrapper
    repositoryManager.ts     repo discovery via the built-in `vscode.git` extension API
    log.ts, refs.ts, status.ts, diff.ts, blame.ts, stash.ts, worktree.ts, rebase.ts
  graph/lanes.ts            assignLanes(): commit list -> per-row lane/line/link/dot layout
  editor/
    contentProvider.ts       read-only `branchly-git:` scheme serving `git show <rev>:<path>`
    blameDecorations.ts      end-of-line current-line blame in the text editor
    rebaseEditor.ts          separate esbuild entrypoint; git spawns this as
                             GIT_SEQUENCE_EDITOR/GIT_EDITOR (see "Interactive rebase" below)
  views/
    panelViewProvider.ts     WebviewViewProvider: builds the webview HTML/CSP, dispatches
                             incoming messages to the right handler by type prefix, and
                             fans out repo-state-change events to every tab's refresh()
    handlers/<tab>.ts        one file per tab (log, commit, conflicts, rebase, shelf,
                             history, branches) — the only place each tab's business logic
                             lives; `shared.ts` has the common status-refresh helper,
                             `commitRows.ts` the RawCommit -> CommitRow conversion shared
                             by Log and History
  statusbar/statusBar.ts
  commands/index.ts
  shared/protocol.ts

webview/
  main.ts, App.svelte        mounts the app; tab bar, appearance toggles, status bar, branch popup
  lib/
    bridge.ts                 postMessage wrapper + typed listener registry
    state.svelte.ts           app-wide state (appearance, status, active tab, branch popup)
    branchesState.svelte.ts, BranchPopup.svelte
    tokens.css, theme.css     CSS custom properties ported from the mockup
    VirtualList.svelte        generic windowed list (used by Log and History)
    DiffView.svelte, diffZip.ts   split/unified diff rendering
    ContextMenu.svelte
  tabs/<Tab>.svelte + <tab>State.svelte.ts   one state module + one component per tab
```

### Per-tab pattern

Every tab follows the same shape: a `<name>State.svelte.ts` module (Svelte 5 runes, a plain
object with getters, imported as a singleton) owns that tab's client state and talks to the host
via `postToHost`/`onHostMessage` from `webview/lib/bridge.ts`; a `<Name>Tab.svelte` component
renders it. On the host side, `views/handlers/<name>.ts` exports `handle(msg, ctx)` (dispatched by
type prefix from `panelViewProvider.ts`) and usually a `refresh(ctx)` used to push fresh data after
any command mutates the repo. Follow this pattern for new tabs or panels rather than inventing a
new shape.

**Authoritative state lives on the host**, not the webview, whenever it isn't purely presentational
(the Commit tab's "included in next commit" checkboxes, the Rebase tab's todo list). This keeps a
single source of truth and means a webview reload (e.g. the view was hidden and VS Code discarded
it) can't desync from reality — `ready` always gets a fresh push.

## Build, test, debug

```bash
npm install
npm run build              # esbuild (host + rebaseEditor) + vite (webview), production mode
npm run watch:ext          # esbuild --watch (used by the default build task / F5)
npm run watch:webview      # vite build --watch
npm run lint                # eslint . --ext .ts,.svelte
npm run format               # prettier --check .   (prettier --write . to fix)
npm run check                 # tsc --noEmit + svelte-check
npm test                       # vitest — pure-function unit tests only (no git/vscode needed)
npm run test:integration        # @vscode/test-cli against a generated fixture repo
npm run package                   # build + vsce package -> .vsix
```

Press **F5** ("Run Extension") to launch an Extension Development Host with Branchly loaded; the
default build task runs `watch:ext` so host changes reload on relaunch. Webview changes need
`watch:webview` running too (or a `npm run build` + relaunch) since the panel loads the built
`dist/webview/*` files, not source.

Before committing, run `npm run lint && npm run check && npm test` at minimum; run `npm run build`
if you touched anything under `webview/` or changed a build config, since svelte-check alone
doesn't catch every Vite-only issue.

## Conventional commits

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint +
husky's `commit-msg` hook (`commitlint.config.js`, `.husky/commit-msg`) — a badly-formed commit
message is rejected locally, not just in CI. Use `feat`, `fix`, `refactor`, `test`, `docs`,
`chore`, etc., with an optional scope, e.g. `feat(ui): add shelf apply-and-drop`,
`fix(git): handle detached HEAD in status summary`. One logical change per commit; prefer several
small commits over one that mixes unrelated concerns.

## VS Code API constraints worth remembering

- **Webview CSP**: `panelViewProvider.ts` sets a nonce'd `script-src` and restricts
  `localResourceRoots` to `dist/webview`. `style-src` allows `'unsafe-inline'` because the UI
  relies heavily on dynamic per-row inline `style="..."` (colors, positions from git data) —
  don't try to route that through static CSS classes, it isn't worth the churn.
- **No filesystem/child_process access from the webview.** Anything that needs git or disk goes
  through a message to a host handler. Don't add `fs`/`child_process` imports under `webview/`.
- **GitService cancellation is cooperative, not preemptive.** `simple-git` doesn't expose the
  underlying child process, so `AbortSignal` support in `git/gitService.ts` discards stale results
  and skips queued follow-ups rather than killing an in-flight `git` process. This is normally
  invisible; it only matters if you're debugging why a huge `git log` still burns CPU briefly
  after the user changed the query.
- **Repo discovery rides on the built-in `vscode.git` extension**, not our own file watchers
  (`git/repositoryManager.ts`). If it's disabled or missing, Branchly logs a warning and the panel
  has no active repo — don't add a filesystem-watcher fallback; ask the user to enable the Git
  extension instead.
- **Interactive rebase never opens a blocking terminal editor.** `git/rebase.ts` points
  `GIT_SEQUENCE_EDITOR`/`GIT_EDITOR` at `dist/editor/rebaseEditor.js` (a tiny, dependency-free
  script git spawns as its own process — it cannot import anything from the extension host bundle,
  which is why it's a separate esbuild entrypoint). The todo list and any reword/squash messages
  are decided in the panel _before_ `git rebase -i` runs and handed to the shim via temp files
  referenced by env vars (`BRANCHLY_REBASE_TODO_FILE`, `BRANCHLY_REBASE_MSG_QUEUE`). If you touch
  this flow, keep the shim editor-agnostic of the extension's TypeScript so it stays a plain `.js`
  file with no bundling surprises.
- **Git parsing must be format-string based, never locale/porcelain-text based**: `log.ts`/`refs.ts`
  use `%x1f`/`%x1e` field/record separators with explicit `--format`; `status.ts` uses
  `--porcelain=v2 -z`. Don't parse human-facing git output (e.g. plain `git status`) — it's
  locale-dependent and not stable across git versions.
- **Commit-tab staging never mutates the index behind the user's back.** The checkboxes are an
  in-memory "included in next commit" selection on the host (`views/handlers/commit.ts`); `git add`
  only runs at the moment Commit is pressed, scoped to the selected paths.

## Mockup fidelity

`webview/lib/tokens.css` ports the mockup's CSS variables. By default (`appearance.theme: "auto"`)
every token resolves through a `--vscode-*` variable with the mockup's literal hex as the `var()`
fallback, so Branchly follows the user's editor theme. Setting the theme explicitly to dark/light
overrides those tokens with the mockup's exact palette instead. `[data-density="compact"]` and
`[data-mono="1"]` mirror the mockup's own attribute-driven overrides — keep new appearance toggles
following that pattern (a data attribute on the root `.orb` element, tokens redefined per value)
rather than component-local conditionals.

Row heights, the 6-tab bottom-panel layout, the lane-graph column, and per-tab pane widths (268px
commit detail, 360px changes list, 330px shelf list, 340px history list, 300px rebase preview) all
come directly from the mockup's own `Orbit Git.dc.html`. If you need to revisit the mockup, it's
Claude Design project `33942ddf-7afe-4c47-9996-cfffa5035cd7` ("Git browser UI mockups").

## Dependency policy

Prefer battle-tested libraries over hand-rolled code when one clearly earns its place; keep the
extension host bundle self-contained (esbuild bundles everything except `vscode` into
`dist/extension.js`/`dist/editor/rebaseEditor.js`, so **no `node_modules` needs to ship in the
`.vsix`** — `.vscodeignore` excludes it).

Currently in use, and why:

| Package                                      | Role                                                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simple-git`                                 | Git process spawning/queueing/escaping; we call `.raw()` exclusively with explicit format strings rather than its higher-level parsed helpers, since those assume porcelain text we don't want to depend on.            |
| `parse-diff`                                 | Unified-diff → hunks/lines for `git/diff.ts`.                                                                                                                                                                           |
| `fuse.js` (webview only)                     | Client-side fuzzy "speed search" over already-loaded Log rows — deliberately _not_ sent to the host as a filter; server-side filtering is reserved for the branch/author/date/path chips, which map onto real git args. |
| `svelte` 5 (runes)                           | Webview UI. `*.svelte.ts` files hold reactive state modules; components stay presentational.                                                                                                                            |
| `esbuild` / `vite`                           | Host and webview bundlers respectively.                                                                                                                                                                                 |
| `vitest`                                     | Unit tests for every pure parser/algorithm (`git/*.ts`, `graph/lanes.ts`, `webview/lib/diffZip.ts`).                                                                                                                    |
| `@vscode/test-cli` + `@vscode/test-electron` | Integration tests against a generated fixture repo (`test/fixtures/makeRepo.ts`).                                                                                                                                       |

Deliberately **not** used, so don't reintroduce them without a real reason: `@vscode/webview-ui-toolkit`
(deprecated/archived upstream), `diff2html` (ships its own DOM/CSS that would fight the mockup's
styling), `isomorphic-git` (too slow on large repos, no interactive rebase support).

## Testing philosophy

Every parser and algorithm that doesn't need a live git repo or the VS Code API is a pure function
with unit tests in `test/unit/`: git output parsing (`log`, `refs`, `status`, `diff`, `blame`,
`stash`), the lane-layout algorithm, and the split-diff zipping logic. When you add a new parser,
add its test alongside it in the same commit — these are cheap to write and are what actually
catches git-format regressions. Reserve `test/integration/` for things that genuinely need a real
repository and a real VS Code instance (staging, committing, stashing, conflict resolution,
rebasing end to end).
