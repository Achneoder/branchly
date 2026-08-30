import type { GitService } from './gitService';
import type { BranchItem, RefBadge } from '../shared/protocol';

const FIELD = '\x1f';

/** Turns `%D`-style decorate strings (from `git log --decorate=full`) into ref badges. */
export function parseDecoratedRefs(refs: string[]): RefBadge[] {
  const result: RefBadge[] = [];
  for (const raw of refs) {
    let name = raw.trim();
    if (!name) continue;
    if (name.startsWith('HEAD -> ')) {
      name = name.slice('HEAD -> '.length);
    } else if (name === 'HEAD') {
      result.push({ name: 'HEAD', kind: 'head' });
      continue;
    }
    if (name.startsWith('tag: ')) {
      result.push({ name: name.slice('tag: '.length).replace(/^refs\/tags\//, ''), kind: 'tag' });
    } else if (name.startsWith('refs/heads/')) {
      result.push({ name: name.replace(/^refs\/heads\//, ''), kind: 'local-branch' });
    } else if (name.startsWith('refs/remotes/')) {
      result.push({ name: name.replace(/^refs\/remotes\//, ''), kind: 'remote-branch' });
    } else {
      result.push({ name, kind: 'local-branch' });
    }
  }
  return result;
}

export function buildForEachRefArgs(): string[] {
  return [
    'for-each-ref',
    `--format=%(refname)${FIELD}%(HEAD)${FIELD}%(upstream:track)${FIELD}%(committerdate:iso-strict)`,
    'refs/heads',
    'refs/remotes',
    'refs/tags',
  ];
}

export function parseForEachRef(raw: string): BranchItem[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [refname, head, track, date] = line.split(FIELD);
      const ahead = /ahead (\d+)/.exec(track ?? '');
      const behind = /behind (\d+)/.exec(track ?? '');

      let kind: BranchItem['kind'] = 'local';
      let name = refname;
      if (refname.startsWith('refs/heads/')) {
        kind = 'local';
        name = refname.slice('refs/heads/'.length);
      } else if (refname.startsWith('refs/remotes/')) {
        kind = 'remote';
        name = refname.slice('refs/remotes/'.length);
      } else if (refname.startsWith('refs/tags/')) {
        kind = 'tag';
        name = refname.slice('refs/tags/'.length);
      }

      return {
        name,
        kind,
        isCurrent: head === '*',
        ahead: ahead ? Number(ahead[1]) : undefined,
        behind: behind ? Number(behind[1]) : undefined,
        lastCommitDate: date,
      };
    });
}

export async function listBranches(git: GitService, signal?: AbortSignal): Promise<BranchItem[]> {
  const raw = await git.raw(buildForEachRefArgs(), signal);
  return parseForEachRef(raw);
}

export async function getCurrentBranch(git: GitService, signal?: AbortSignal): Promise<string> {
  const raw = await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'], signal);
  return raw.trim();
}
