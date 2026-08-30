// Message contract between the extension host and the webview panel.
// Both sides import this file so the payloads stay compile-checked in lockstep.

export type TabId = 'log' | 'commit' | 'conflicts' | 'rebase' | 'shelf' | 'history';

export interface AppearanceState {
  theme: 'dark' | 'light';
  density: 'comfortable' | 'compact';
  monoGraph: boolean;
  diffMode: 'split' | 'unified';
  showBlameGutter: boolean;
}

export interface RefBadge {
  name: string;
  kind: 'local-branch' | 'remote-branch' | 'tag' | 'head';
}

export interface GraphDot {
  x: number;
  color: string;
  fill: string;
}

export interface GraphLine {
  x: number;
  top: number;
  bottom: number;
  color: string;
}

export interface GraphLink {
  x: number;
  width: number;
  color: string;
}

export interface CommitRow {
  hash: string;
  abbrev: string;
  parents: string[];
  subject: string;
  author: string;
  authorEmail: string;
  date: string;
  timestamp: number;
  refs: RefBadge[];
  isMerge: boolean;
  lane: number;
  lines: GraphLine[];
  links: GraphLink[];
  dots: GraphDot[];
}

export interface FileChange {
  path: string;
  oldPath?: string;
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U' | '?' | '!';
  additions: number;
  deletions: number;
}

export interface CommitDetail {
  hash: string;
  abbrev: string;
  author: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
  stat: string;
  files: FileChange[];
}

export interface DiffLine {
  ln1: number | null;
  ln2: number | null;
  type: 'context' | 'add' | 'del' | 'meta';
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  hunks: DiffHunk[];
  binary: boolean;
}

export interface ChangelistGroup {
  id: 'default' | 'untracked';
  name: string;
  files: (FileChange & { staged: boolean })[];
}

export interface StashEntry {
  index: number;
  ref: string;
  kind: 'stash' | 'shelf';
  message: string;
  branch: string;
  date: string;
  fileCount: number;
}

export interface RebaseTodoItem {
  id: string;
  action: 'pick' | 'reword' | 'squash' | 'fixup' | 'drop';
  hash: string;
  abbrev: string;
  subject: string;
  author: string;
}

export interface RebaseStatus {
  inProgress: boolean;
  onto?: string;
  branch?: string;
  currentStep?: number;
  totalSteps?: number;
  conflicted: boolean;
}

export interface ConflictPane {
  label: 'base' | 'ours' | 'theirs';
  title: string;
  lines: string[];
}

export interface ConflictEntry {
  path: string;
  panes: ConflictPane[];
}

export interface BranchItem {
  name: string;
  kind: 'local' | 'remote' | 'tag';
  isCurrent: boolean;
  ahead?: number;
  behind?: number;
  lastCommitDate?: string;
}

export interface BlameLine {
  line: number;
  hash: string;
  abbrev: string;
  author: string;
  date: string;
  text: string;
}

export interface RepoStatusSummary {
  branch: string;
  ahead: number;
  behind: number;
  conflictCount: number;
  hasRepo: boolean;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  keybinding?: string;
  separator?: boolean;
}

// ---- Host -> Webview ----

export type HostToWebviewMessage =
  | { type: 'init'; appearance: AppearanceState; status: RepoStatusSummary }
  | { type: 'appearance'; appearance: AppearanceState }
  | { type: 'setTab'; tab: TabId }
  | { type: 'status'; status: RepoStatusSummary }
  | { type: 'log:rows'; rows: CommitRow[]; append: boolean; hasMore: boolean }
  | { type: 'log:detail'; detail: CommitDetail }
  | { type: 'log:diff'; diff: FileDiff }
  | { type: 'commit:changelists'; groups: ChangelistGroup[]; amend: boolean; message: string }
  | { type: 'commit:diff'; diff: FileDiff }
  | { type: 'commit:result'; ok: boolean; message?: string }
  | { type: 'history:activeFile'; path: string | undefined }
  | { type: 'history:entries'; path: string; entries: CommitRow[] }
  | { type: 'history:blame'; path: string; lines: BlameLine[] }
  | { type: 'shelf:list'; entries: StashEntry[] }
  | { type: 'shelf:diff'; diffs: FileDiff[] }
  | { type: 'conflicts:list'; entries: ConflictEntry[] }
  | { type: 'conflicts:resolved'; path: string }
  | { type: 'rebase:status'; status: RebaseStatus }
  | { type: 'rebase:todo'; items: RebaseTodoItem[] }
  | { type: 'rebase:preview'; items: { text: string; color: string }[] }
  | { type: 'branches:list'; branches: BranchItem[] }
  | { type: 'menu:open'; x: number; y: number; items: ContextMenuItem[]; contextHash: string }
  | { type: 'error'; message: string };

// ---- Webview -> Host ----

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'setTab'; tab: TabId }
  | { type: 'setAppearance'; patch: Partial<AppearanceState> }
  | { type: 'log:request'; query: string; filters: string[]; append: boolean }
  | { type: 'log:selectCommit'; hash: string }
  | { type: 'log:selectFile'; hash: string; path: string }
  | { type: 'log:contextMenu'; hash: string; x: number; y: number }
  | { type: 'log:contextAction'; hash: string; action: string }
  | { type: 'commit:request' }
  | { type: 'commit:toggleFile'; path: string; staged: boolean }
  | { type: 'commit:setMessage'; message: string }
  | { type: 'commit:setAmend'; amend: boolean }
  | { type: 'commit:selectFile'; path: string }
  | { type: 'commit:submit'; push: boolean }
  | { type: 'history:openFile'; path: string }
  | { type: 'history:selectCommit'; path: string; hash: string }
  | { type: 'shelf:request' }
  | { type: 'shelf:selectEntry'; index: number }
  | { type: 'shelf:create'; message: string; keepStaged: boolean }
  | { type: 'shelf:apply'; index: number; drop: boolean }
  | { type: 'shelf:drop'; index: number }
  | { type: 'conflicts:request' }
  | { type: 'conflicts:acceptOurs'; path: string }
  | { type: 'conflicts:acceptTheirs'; path: string }
  | { type: 'conflicts:keepBoth'; path: string }
  | { type: 'conflicts:openMergeEditor'; path: string }
  | { type: 'rebase:start'; base: string }
  | { type: 'rebase:reorder'; fromIndex: number; toIndex: number }
  | { type: 'rebase:setAction'; id: string; action: RebaseTodoItem['action'] }
  | { type: 'rebase:continue' }
  | { type: 'rebase:abort' }
  | { type: 'rebase:skip' }
  | { type: 'branches:request' }
  | { type: 'branches:checkout'; name: string }
  | { type: 'branches:compare'; name: string }
  | { type: 'branches:newFrom'; base: string; name: string };
