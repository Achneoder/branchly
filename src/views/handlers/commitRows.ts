import type { RawCommit } from '../../git/log';
import { parseDecoratedRefs } from '../../git/refs';
import { assignLanes } from '../../graph/lanes';
import type { CommitRow } from '../../shared/protocol';

export function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toCommitRows(raws: RawCommit[]): CommitRow[] {
  const laneResults = assignLanes(raws.map((c) => ({ hash: c.hash, parents: c.parents })));
  return raws.map((commit, i) => {
    const lane = laneResults[i];
    return {
      hash: commit.hash,
      abbrev: commit.hash.slice(0, 7),
      parents: commit.parents,
      subject: commit.subject,
      author: commit.authorName,
      authorEmail: commit.authorEmail,
      date: formatDate(commit.authorDate),
      timestamp: Date.parse(commit.authorDate) || 0,
      refs: parseDecoratedRefs(commit.refs),
      isMerge: lane.isMerge,
      lane: lane.lane,
      lines: lane.lines,
      links: lane.links,
      dots: lane.dots,
    };
  });
}
