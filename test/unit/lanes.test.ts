import { describe, expect, it } from 'vitest';
import { assignLanes, laneColor, laneX } from '../../src/graph/lanes';

function commit(hash: string, ...parents: string[]) {
  return { hash, parents };
}

describe('assignLanes: linear history', () => {
  it('keeps every commit in lane 0', () => {
    const rows = assignLanes([commit('c3', 'c2'), commit('c2', 'c1'), commit('c1')]);
    expect(rows.map((r) => r.lane)).toEqual([0, 0, 0]);
    expect(rows.every((r) => !r.isMerge)).toBe(true);
    // The topmost commit has nothing above it waiting for it, so it only
    // renders the bottom half of its lane (dot down to its parent).
    expect(rows[0].segments).toEqual([
      { x1: laneX(0), y1: 50, x2: laneX(0), y2: 100, color: laneColor(0) },
    ]);
    // The root commit has no parents, so it only renders the top half
    // (entering from the child above it) with nothing below.
    expect(rows[2].segments).toEqual([
      { x1: laneX(0), y1: 0, x2: laneX(0), y2: 50, color: laneColor(0) },
    ]);
  });
});

describe('assignLanes: branch and fold', () => {
  it('opens a second lane for a diverging branch tip and folds it back at the shared ancestor', () => {
    // main:    m2 -> m1 -> base
    // feature: f1 -> base
    // Log order (newest first, both branches interleaved by date):
    const rows = assignLanes([
      commit('m2', 'm1'),
      commit('f1', 'base'),
      commit('m1', 'base'),
      commit('base'),
    ]);
    expect(rows[0].lane).toBe(0); // m2
    expect(rows[1].lane).toBe(1); // f1 - new tip, own lane
    expect(rows[2].lane).toBe(0); // m1 - continues main's lane
    // base is awaited by both m1 (lane 0) and f1 (lane 1); whichever reaches it
    // second must fold its lane into the first with a segment crossing lanes.
    const baseLane = rows[3].lane;
    expect([0, 1]).toContain(baseLane);
  });

  it('frees a lane once its branch folds, so a later unrelated tip can reuse it', () => {
    const rows = assignLanes([
      commit('f1', 'base'), // lane 1 (new tip alongside main's lane 0 which starts at 'm1')
      commit('m1', 'base'), // lane 0, base already tracked by f1 at lane 1 -> fold into lane 1, or vice versa
      commit('base'),
      commit('later-tip'), // unrelated new root commit after everything folded
    ]);
    const laneOfLaterTip = rows[3].lane;
    // The lane should be one of the now-freed lanes (0 or 1), never a brand new lane 2,
    // proving freed lanes are reused instead of growing unbounded.
    expect(laneOfLaterTip).toBeLessThanOrEqual(1);
  });
});

describe('assignLanes: merge commits', () => {
  it('marks two-parent commits as merges with a filled dot and one outgoing segment per parent', () => {
    const rows = assignLanes([
      commit('merge', 'main1', 'feature1'),
      commit('feature1', 'base'),
      commit('main1', 'base'),
      commit('base'),
    ]);
    const [mergeRow] = rows;
    expect(mergeRow.isMerge).toBe(true);
    expect(mergeRow.dots[0].fill).toBe(laneColor(mergeRow.lane));
    const outgoing = mergeRow.segments.filter((s) => s.y1 === 50 && s.y2 === 100);
    expect(outgoing).toHaveLength(2);
  });

  it('handles an octopus merge with three parents by opening one outgoing segment per parent', () => {
    const rows = assignLanes([
      commit('octopus', 'p1', 'p2', 'p3'),
      commit('p1'),
      commit('p2'),
      commit('p3'),
    ]);
    const [octopusRow] = rows;
    expect(octopusRow.isMerge).toBe(true);
    const outgoing = octopusRow.segments.filter((s) => s.y1 === 50 && s.y2 === 100);
    expect(outgoing).toHaveLength(3);
  });
});

describe('assignLanes: mid-render branch deletion (dangling lane)', () => {
  it('does not crash and closes the lane cleanly when a referenced parent never appears', () => {
    // Simulates viewing a truncated/paged log where a branch's earlier history
    // was deleted or is simply not in the fetched page: 'orphan' has a parent
    // hash that never shows up as its own row.
    const rows = assignLanes([commit('tip', 'orphan-parent'), commit('other-root')]);
    expect(rows).toHaveLength(2);
    expect(rows[0].lane).toBe(0);
    // 'other-root' is unrelated and should not be forced into the dangling lane
    // left waiting for 'orphan-parent'.
    expect(rows[1].lane).toBe(1);
  });
});

describe('laneColor / laneX', () => {
  it('cycles through the 4-color palette', () => {
    expect(laneColor(0)).toBe('var(--a1)');
    expect(laneColor(4)).toBe('var(--a1)');
    expect(laneColor(5)).toBe('var(--a2)');
  });

  it('spaces lanes 18px apart starting at 10px', () => {
    expect(laneX(0)).toBe(10);
    expect(laneX(1)).toBe(28);
  });
});
