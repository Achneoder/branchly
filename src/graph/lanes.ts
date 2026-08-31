import type { GraphDot, GraphSegment } from '../shared/protocol';

export interface LaneInput {
  hash: string;
  parents: string[];
}

export interface LaneResult {
  lane: number;
  isMerge: boolean;
  segments: GraphSegment[];
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
 * Assigns each commit a lane and computes the graph segments needed to
 * render a `git log --graph`-style column, one row per input commit (input
 * order must match git log's default: children before their parents).
 *
 * Model: `activeLanes[i]` holds the commit hash a lane is waiting to reach
 * next (or null once free). A commit occupies the lane already waiting for
 * its hash, or a newly freed one if it's an unseen branch tip. Each row is
 * split at its own commit dot (the row's vertical center): a top-half
 * segment carries the lane down from the row above into the dot (only when
 * something above was actually waiting for this commit), and one bottom-half
 * segment per parent carries the dot out to whichever lane that parent lands
 * in — the same lane if it just continues, a fold into an already-tracked
 * lane, or a freshly allocated one. Any other lane still waiting on a hash
 * passes through the row untouched as a full-height segment.
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
    const hasIncoming = lane !== -1;
    if (!hasIncoming) lane = allocateFreeLane();

    const beforeLanes = activeLanes.slice();
    activeLanes[lane] = null;

    const isMerge = commit.parents.length > 1;
    const segments: GraphSegment[] = [];

    if (hasIncoming) {
      segments.push({ x1: laneX(lane), y1: 0, x2: laneX(lane), y2: 50, color: laneColor(lane) });
    }

    commit.parents.forEach((parentHash, idx) => {
      const existing = activeLanes.indexOf(parentHash);
      let targetLane: number;
      if (idx === 0 && existing === -1) {
        activeLanes[lane] = parentHash;
        targetLane = lane;
      } else if (existing !== -1) {
        targetLane = existing;
      } else {
        targetLane = allocateFreeLane();
        activeLanes[targetLane] = parentHash;
      }
      segments.push({
        x1: laneX(lane),
        y1: 50,
        x2: laneX(targetLane),
        y2: 100,
        color: laneColor(targetLane),
      });
    });

    beforeLanes.forEach((hash, i) => {
      if (hash !== null && i !== lane) {
        segments.push({ x1: laneX(i), y1: 0, x2: laneX(i), y2: 100, color: laneColor(i) });
      }
    });

    const dots: GraphDot[] = [
      { x: laneX(lane), color: laneColor(lane), fill: isMerge ? laneColor(lane) : 'var(--panel)' },
    ];

    return { lane, isMerge, segments, dots };
  });
}
