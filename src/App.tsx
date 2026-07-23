import { APP_VERSION } from "./core/version";

export function App() {
  return (
    <main className="bootstrap-shell">
      <p className="bootstrap-kicker">CI workflow score</p>
      <h1>PipeSonata</h1>
      <p>
        The repository foundation is active. Domain analysis, score rendering, and deterministic
        exports are delivered in the following milestones.
      </p>
      <span>v{APP_VERSION}</span>
    </main>
  );
}
