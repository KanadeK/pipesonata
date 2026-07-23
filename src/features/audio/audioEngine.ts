import type { WorkflowScore } from "../../core/model";

export interface PlaybackEvent {
  frequency: number;
  velocity: number;
  startsInSeconds: number;
  durationSeconds: number;
  failed: boolean;
}

export interface AudioSession {
  durationMs: number;
  stop: () => void;
}

export function createPlaybackPlan(score: WorkflowScore, maxPlaybackSeconds = 18): PlaybackEvent[] {
  const naturalSecondsPerBeat = 60 / score.tempoBpm;
  const compressedSecondsPerBeat =
    score.durationBeats === 0
      ? naturalSecondsPerBeat
      : Math.min(naturalSecondsPerBeat, maxPlaybackSeconds / score.durationBeats);

  return score.notes.map((note) => ({
    frequency: note.frequency,
    velocity: note.velocity,
    startsInSeconds: note.startBeat * compressedSecondsPerBeat,
    durationSeconds: Math.max(0.06, note.durationBeats * compressedSecondsPerBeat),
    failed: note.outcome === "failure" || note.outcome === "timed_out",
  }));
}

export function playScore(score: WorkflowScore): AudioSession {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    throw new Error("WebAudio is not supported by this browser.");
  }

  const context = new AudioContextConstructor();
  const master = context.createGain();
  const plan = createPlaybackPlan(score);
  const startAt = context.currentTime + 0.06;
  const oscillators: OscillatorNode[] = [];

  master.gain.setValueAtTime(0.42, startAt);
  master.connect(context.destination);

  for (const event of plan) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const eventStart = startAt + event.startsInSeconds;
    const eventEnd = eventStart + event.durationSeconds;
    const peak = Math.max(0.018, (event.velocity / 127) * 0.16);

    oscillator.type = event.failed ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(event.frequency, eventStart);
    envelope.gain.setValueAtTime(0.0001, eventStart);
    envelope.gain.exponentialRampToValueAtTime(peak, eventStart + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, eventEnd);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(eventStart);
    oscillator.stop(eventEnd + 0.02);
    oscillators.push(oscillator);
  }

  const durationSeconds = plan.reduce(
    (latest, event) => Math.max(latest, event.startsInSeconds + event.durationSeconds),
    0,
  );
  let stopped = false;

  return {
    durationMs: Math.ceil((durationSeconds + 0.12) * 1000),
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
        } catch {
          // An oscillator that reached its scheduled end is already stopped.
        }
      }
      void context.close();
    },
  };
}
