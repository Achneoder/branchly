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

const REF_FORMAT = [
  '%(refname)',
  '%(HEAD)',
  '%(upstream:short)',
  '%(upstream:remotename)',
  '%(upstream:track)',
  '%(objectname)',
  '%(objectname:short)',
  '%(subject)',
  '%(authorname)',
  '%(committerdate:iso-strict)',
].join(FIELD);

export function buildForEachRefArgs(): string[] {
  return ['for-each-ref', `--format=${REF_FORMAT}`, 'refs/heads', 'refs/remotes', 'refs/tags'];
}

export function parseForEachRef(raw: string): BranchItem[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [refname, head, upstream, upstreamRemote, track, hash, abbrev, subject, author, date] =
        line.split(FIELD);
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
        upstream: kind === 'local' && upstream ? upstream : undefined,
        remoteName:
          kind === 'local' && upstreamRemote
            ? upstreamRemote
            : kind === 'remote'
              ? name.slice(0, name.indexOf('/'))
              : undefined,
        lastCommitHash: hash || undefined,
        lastCommitAbbrev: abbrev || undefined,
        lastCommitSubject: subject || undefined,
        lastCommitAuthor: author || undefined,
        lastCommitDate: date,
      };
    });
}

export function parseMergedRefNames(raw: string): Set<string> {
  return new Set(
    raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  );
}

export async function getMergedRefs(
  git: GitService,
  into = 'HEAD',
  signal?: AbortSignal,
): Promise<Set<string>> {
  const raw = await git.raw(
    ['for-each-ref', `--merged=${into}`, '--format=%(refname)', 'refs/heads', 'refs/remotes'],
    signal,
  );
  return parseMergedRefNames(raw);
}

function refnameFor(item: Pick<BranchItem, 'kind' | 'name'>): string {
  switch (item.kind) {
    case 'local':
      return `refs/heads/${item.name}`;
    case 'remote':
      return `refs/remotes/${item.name}`;
    case 'tag':
      return `refs/tags/${item.name}`;
  }
}

export async function listBranches(git: GitService, signal?: AbortSignal): Promise<BranchItem[]> {
  const [raw, merged] = await Promise.all([
    git.raw(buildForEachRefArgs(), signal),
    getMergedRefs(git, 'HEAD', signal),
  ]);
  return parseForEachRef(raw).map((item) => ({
    ...item,
    merged: item.kind === 'tag' ? undefined : merged.has(refnameFor(item)),
  }));
}

export async function getCurrentBranch(git: GitService, signal?: AbortSignal): Promise<string> {
  const raw = await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'], signal);
  return raw.trim();
}

export async function deleteLocalBranch(
  git: GitService,
  name: string,
  force: boolean,
): Promise<void> {
  await git.raw(['branch', force ? '-D' : '-d', name]);
}

export async function deleteRemoteBranch(
  git: GitService,
  remote: string,
  name: string,
): Promise<void> {
  await git.raw(['push', remote, '--delete', name]);
}

export async function listRemoteNames(git: GitService, signal?: AbortSignal): Promise<string[]> {
  const raw = await git.raw(['remote'], signal);
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
