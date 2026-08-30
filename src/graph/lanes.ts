import type { GraphDot, GraphLine, GraphLink } from '../shared/protocol';

export interface LaneInput {
  hash: string;
  parents: string[];
}

export interface LaneResult {
  lane: number;
  isMerge: boolean;
  lines: GraphLine[];
  links: GraphLink[];
  dots: GraphDot[];
}

const PALETTE = ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--a4)'];
const LANE_START = 10;
const LANE_SPACING = 18;

export function laneColor(lane: number): string {
  return PALETTE[lane % PALETTE.length];
}

export function laneX(lane: number): number {
  return LANE_START + lane * LANE_SPACING;
}

/**
 * Assigns each commit a lane and computes the vertical/horizontal segments
 * needed to render a `git log --graph`-style column, one row per input
 * commit (input order must match git log's default: children before their
 * parents).
 *
 * Model: `activeLanes[i]` holds the commit hash a lane is waiting to reach
 * next (or null once free). A commit occupies the lane already waiting for
 * its hash, or a newly freed one if it's an unseen branch tip. Its first
 * parent continues straight down in the same lane unless that parent is
 * already awaited elsewhere, in which case this lane folds into the
 * existing one (a link is drawn) and is freed for reuse. Additional
 * (merge) parents either fold into an already-tracked lane or spawn a new
 * one, each producing a link from the merge commit's lane.
 */
export function assignLanes(commits: LaneInput[]): LaneResult[] {
  const activeLanes: Array<string | null> = [];

  const allocateFreeLane = (): number => {
    const idx = activeLanes.indexOf(null);
    if (idx !== -1) return idx;
    activeLanes.push(null);
    return activeLanes.length - 1;
  };

  return commits.map((commit) => {
    let lane = activeLanes.indexOf(commit.hash);
    if (lane === -1) lane = allocateFreeLane();

    const beforeLanes = activeLanes.slice();
    activeLanes[lane] = null;

    const isMerge = commit.parents.length > 1;
    const links: Array<{ from: number; to: number }> = [];

    commit.parents.forEach((parentHash, idx) => {
      const existing = activeLanes.indexOf(parentHash);
      if (idx === 0) {
        if (existing !== -1) {
          links.push({ from: lane, to: existing });
        } else {
          activeLanes[lane] = parentHash;
        }
      } else if (existing !== -1) {
        links.push({ from: lane, to: existing });
      } else {
        const newLane = allocateFreeLane();
        activeLanes[newLane] = parentHash;
        links.push({ from: lane, to: newLane });
      }
    });

    const activeIndices = new Set<number>();
    beforeLanes.forEach((v, i) => v !== null && activeIndices.add(i));
    activeLanes.forEach((v, i) => v !== null && activeIndices.add(i));

    const lines: GraphLine[] = [...activeIndices]
      .sort((a, b) => a - b)
      .map((i) => ({ x: laneX(i), top: 0, bottom: 0, color: laneColor(i) }));

    const graphLinks: GraphLink[] = links.map(({ from, to }) => ({
      x: Math.min(laneX(from), laneX(to)),
      width: Math.abs(laneX(to) - laneX(from)),
      color: laneColor(to),
    }));

    const dots: GraphDot[] = [
      { x: laneX(lane), color: laneColor(lane), fill: isMerge ? laneColor(lane) : 'var(--panel)' },
    ];

    return { lane, isMerge, lines, links: graphLinks, dots };
  });
}
