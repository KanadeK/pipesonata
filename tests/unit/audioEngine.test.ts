import { describe, expect, it } from "vitest";

import { loadSample } from "../../src/adapters/sampleAdapter";
import { createPlaybackPlan } from "../../src/features/audio/audioEngine";

describe("createPlaybackPlan", () => {
  it("preserves every score note and compresses long runs deterministically", () => {
    const score = loadSample("serial-bottleneck").score;
    const first = createPlaybackPlan(score, 9);
    const second = createPlaybackPlan(score, 9);
    const last = first.at(-1);

    expect(first).toEqual(second);
    expect(first).toHaveLength(score.notes.length);
    expect(last).toBeDefined();
    expect((last?.startsInSeconds ?? 0) + (last?.durationSeconds ?? 0)).toBeLessThanOrEqual(9.1);
  });

  it("marks failed notes for a different oscillator voice", () => {
    const plan = createPlaybackPlan(loadSample("flaky").score);
    expect(plan.some((event) => event.failed)).toBe(true);
  });
});
