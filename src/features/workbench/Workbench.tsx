import {
  ArrowSquareOut,
  Code,
  DownloadSimple,
  FileText,
  Image,
  Moon,
  Play,
  SpeakerHigh,
  SpeakerX,
  Stop,
  Sun,
  UploadSimple,
  Waveform,
  WarningCircle,
} from "@phosphor-icons/react";
import { type ChangeEvent, type RefObject, useEffect, useRef, useState } from "react";

import { analyzeWorkflowFiles } from "../../adapters/fileAdapter";
import { loadSample, samples, type SampleId } from "../../adapters/sampleAdapter";
import { createEngineeringReport, createMidiLikeJson } from "../../core/exporters";
import type { WorkflowAnalysis } from "../../core/model";
import { APP_VERSION } from "../../core/version";
import { playScore, type AudioSession } from "../audio/audioEngine";
import { downloadPng, downloadSvg, downloadText, safeFileStem } from "../export/exportArtifacts";
import { TimelineScore } from "../score/TimelineScore";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { JobLedger } from "./JobLedger";
import { SummaryStrip } from "./SummaryStrip";

type Theme = "dark" | "light";

function initialTheme(): Theme {
  const stored = window.localStorage.getItem("pipesonata-theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function fileStemFor(analysis: WorkflowAnalysis): string {
  return safeFileStem(
    `${analysis.workflow.source.repository}-${analysis.workflow.name}-${analysis.workflow.id}`,
  );
}

function stopSession(
  sessionRef: RefObject<AudioSession | null>,
  timerRef: RefObject<number | null>,
): void {
  sessionRef.current?.stop();
  sessionRef.current = null;
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export function Workbench() {
  const [analysis, setAnalysis] = useState<WorkflowAnalysis>(() => loadSample("fast"));
  const [selectedSample, setSelectedSample] = useState<SampleId>("fast");
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("Fast fan-out sample loaded.");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const audioTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("pipesonata-theme", theme);
  }, [theme]);

  useEffect(
    () => () => {
      stopSession(audioSessionRef, audioTimerRef);
    },
    [],
  );

  const stopPlayback = () => {
    stopSession(audioSessionRef, audioTimerRef);
    setIsPlaying(false);
  };

  const selectSample = (id: SampleId) => {
    stopPlayback();
    setSelectedSample(id);
    setAnalysis(loadSample(id));
    setError(null);
    const sample = samples.find((candidate) => candidate.id === id);
    setMessage(`${sample?.label ?? "Sample"} loaded from the checked-in fixture.`);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    stopPlayback();
    setIsBusy(true);
    setError(null);
    setMessage(`Analyzing ${files.length} local JSON file${files.length === 1 ? "" : "s"}...`);
    try {
      const imported = await analyzeWorkflowFiles(files);
      setAnalysis(imported);
      setMessage(
        `Imported ${imported.summary.jobCount} jobs and ${imported.summary.stepCount} steps locally.`,
      );
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unknown import error.";
      setError(detail);
      setMessage("Import failed. The previous analysis remains available.");
    } finally {
      setIsBusy(false);
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      stopPlayback();
    }
    setSoundEnabled((enabled) => !enabled);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      setMessage("Playback stopped.");
      return;
    }
    if (!soundEnabled) {
      setMessage("Enable sound before playing the score.");
      return;
    }
    try {
      const session = playScore(analysis.score);
      audioSessionRef.current = session;
      setIsPlaying(true);
      setMessage("Playing a time-compressed WebAudio rendering.");
      audioTimerRef.current = window.setTimeout(() => {
        stopSession(audioSessionRef, audioTimerRef);
        setIsPlaying(false);
        setMessage("Playback complete.");
      }, session.durationMs);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audio playback failed.");
    }
  };

  const exportSvg = () => {
    if (!svgRef.current) {
      setError("The visual score is not ready.");
      return;
    }
    downloadSvg(svgRef.current, `${fileStemFor(analysis)}.svg`);
    setMessage("SVG score exported.");
  };

  const exportPng = async () => {
    if (!svgRef.current) {
      setError("The visual score is not ready.");
      return;
    }
    setIsBusy(true);
    try {
      const background = theme === "dark" ? "#15191a" : "#f3f5f1";
      await downloadPng(svgRef.current, `${fileStemFor(analysis)}.png`, background);
      setMessage("PNG score exported at 2x resolution.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PNG export failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const exportNotes = () => {
    downloadText(
      createMidiLikeJson(analysis),
      `${fileStemFor(analysis)}.notes.json`,
      "application/json;charset=utf-8",
    );
    setMessage("MIDI-like note schedule exported.");
  };

  const exportReport = () => {
    downloadText(
      createEngineeringReport(analysis),
      `${fileStemFor(analysis)}.report.md`,
      "text/markdown;charset=utf-8",
    );
    setMessage("Credential-redacted engineering report exported.");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#workspace" aria-label="PipeSonata workspace">
          <Waveform size={25} weight="duotone" aria-hidden />
          <span>PipeSonata</span>
        </a>
        <div className="header-actions">
          <label className="sample-control">
            <span>Fixture</span>
            <select
              value={selectedSample}
              onChange={(event) => selectSample(event.target.value as SampleId)}
              aria-label="Load a bundled fixture"
            >
              {samples.map((sample) => (
                <option value={sample.id} key={sample.id}>
                  {sample.label}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            multiple
            onChange={(event) => void handleFiles(event)}
            data-testid="workflow-file-input"
          />
          <button
            className="button button--secondary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            <UploadSimple size={18} aria-hidden />
            Import JSON
          </button>
          <a
            className="icon-button"
            href="https://github.com/KanadeK/pipesonata"
            aria-label="Open PipeSonata on GitHub"
          >
            <ArrowSquareOut size={19} aria-hidden />
          </a>
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
          </button>
        </div>
      </header>

      <main id="workspace" className="workspace">
        <section className="workspace-intro" aria-labelledby="workspace-title">
          <div>
            <p className="section-kicker">CI workflow instrument</p>
            <h1 id="workspace-title">Hear where CI waits.</h1>
            <p>
              Import a run, inspect its timing score, then export evidence your team can act on.
            </p>
          </div>
          <div className="run-identity">
            <span>{analysis.workflow.source.repository}</span>
            <strong>{analysis.workflow.name}</strong>
            <small>run {analysis.workflow.id}</small>
          </div>
        </section>

        <div className="status-region" aria-live="polite">
          <span>{message}</span>
          <span>v{APP_VERSION}</span>
        </div>
        {error ? (
          <div className="error-banner" role="alert">
            <WarningCircle size={20} aria-hidden />
            <div>
              <strong>Could not complete that action</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <SummaryStrip analysis={analysis} />

        <div className="workspace-grid">
          <section className="score-panel" aria-labelledby="score-title">
            <div className="score-toolbar">
              <div>
                <p className="section-kicker">Visual score</p>
                <h2 id="score-title">Timing, outcome, and dependency</h2>
              </div>
              <div className="toolbar-actions" aria-label="Score controls">
                <button
                  className="icon-button icon-button--labeled"
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={soundEnabled}
                  title={soundEnabled ? "Turn sound off" : "Turn sound on"}
                >
                  {soundEnabled ? (
                    <SpeakerHigh size={18} aria-hidden />
                  ) : (
                    <SpeakerX size={18} aria-hidden />
                  )}
                  {soundEnabled ? "Sound on" : "Sound off"}
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={togglePlayback}
                  disabled={!soundEnabled || analysis.score.notes.length === 0}
                >
                  {isPlaying ? <Stop size={18} aria-hidden /> : <Play size={18} aria-hidden />}
                  {isPlaying ? "Stop" : "Play score"}
                </button>
              </div>
            </div>
            <div className="score-scroll">
              <TimelineScore ref={svgRef} analysis={analysis} />
            </div>
            <div className="export-bar" aria-label="Export analysis">
              <span>
                <DownloadSimple size={18} aria-hidden />
                Export
              </span>
              <button type="button" onClick={exportSvg}>
                <Code size={17} aria-hidden />
                SVG
              </button>
              <button type="button" onClick={() => void exportPng()} disabled={isBusy}>
                <Image size={17} aria-hidden />
                PNG
              </button>
              <button type="button" onClick={exportNotes}>
                <Waveform size={17} aria-hidden />
                Notes JSON
              </button>
              <button type="button" onClick={exportReport}>
                <FileText size={17} aria-hidden />
                Report
              </button>
            </div>
          </section>
          <DiagnosticsPanel analysis={analysis} />
        </div>

        <JobLedger analysis={analysis} />
      </main>

      <footer className="app-footer">
        <span>Local-first analysis. Imported workflow data stays in this browser tab.</span>
        <a href="https://github.com/KanadeK/pipesonata/blob/main/SECURITY.md">
          Privacy and security
        </a>
      </footer>
    </div>
  );
}
