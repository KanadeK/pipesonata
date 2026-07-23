interface FixtureStep {
  number: number;
  name: string;
  status: string;
  conclusion: string;
  started_at: string;
  completed_at: string;
  retry_count?: number;
}

interface FixtureJob {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  needs: string[];
  run_attempt?: number;
  steps: FixtureStep[];
}

export interface WorkflowFixtureInput {
  schemaVersion: string;
  source: {
    provider: string;
    repository: string;
  };
  run: {
    id: number;
    name: string;
    event: string;
    status: string;
    conclusion: string;
    run_attempt: number;
    created_at: string;
    run_started_at: string;
    updated_at: string;
    head_sha: string;
  };
  jobs: FixtureJob[];
}

export const workflowFixture: WorkflowFixtureInput = {
  schemaVersion: "1.0",
  source: {
    provider: "github-actions",
    repository: "octo-org/synthetic-pipeline",
  },
  run: {
    id: 42001,
    name: "CI",
    event: "push",
    status: "completed",
    conclusion: "failure",
    run_attempt: 1,
    created_at: "2026-07-23T00:00:00.000Z",
    run_started_at: "2026-07-23T00:00:05.000Z",
    updated_at: "2026-07-23T00:00:45.000Z",
    head_sha: "0123456789abcdef0123456789abcdef01234567",
  },
  jobs: [
    {
      id: 1,
      name: "build",
      status: "completed",
      conclusion: "success",
      created_at: "2026-07-23T00:00:00.000Z",
      started_at: "2026-07-23T00:00:05.000Z",
      completed_at: "2026-07-23T00:00:15.000Z",
      needs: [],
      steps: [
        {
          number: 1,
          name: "Checkout",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:05.000Z",
          completed_at: "2026-07-23T00:00:06.000Z",
        },
        {
          number: 2,
          name: "npm ci",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:06.000Z",
          completed_at: "2026-07-23T00:00:10.000Z",
        },
        {
          number: 3,
          name: "Compile",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:10.000Z",
          completed_at: "2026-07-23T00:00:15.000Z",
        },
      ],
    },
    {
      id: 2,
      name: "lint",
      status: "completed",
      conclusion: "success",
      created_at: "2026-07-23T00:00:00.000Z",
      started_at: "2026-07-23T00:00:15.000Z",
      completed_at: "2026-07-23T00:00:25.000Z",
      needs: ["build"],
      steps: [
        {
          number: 1,
          name: "npm ci",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:15.000Z",
          completed_at: "2026-07-23T00:00:17.000Z",
        },
        {
          number: 2,
          name: "ESLint",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:17.000Z",
          completed_at: "2026-07-23T00:00:25.000Z",
        },
      ],
    },
    {
      id: 3,
      name: "test",
      status: "completed",
      conclusion: "success",
      created_at: "2026-07-23T00:00:00.000Z",
      started_at: "2026-07-23T00:00:15.000Z",
      completed_at: "2026-07-23T00:00:35.000Z",
      needs: ["build"],
      run_attempt: 2,
      steps: [
        {
          number: 1,
          name: "npm ci",
          status: "completed",
          conclusion: "success",
          started_at: "2026-07-23T00:00:15.000Z",
          completed_at: "2026-07-23T00:00:18.000Z",
        },
        {
          number: 2,
          name: "Unit tests",
          status: "completed",
          conclusion: "success",
          retry_count: 1,
          started_at: "2026-07-23T00:00:18.000Z",
          completed_at: "2026-07-23T00:00:35.000Z",
        },
      ],
    },
    {
      id: 4,
      name: "deploy",
      status: "completed",
      conclusion: "failure",
      created_at: "2026-07-23T00:00:00.000Z",
      started_at: "2026-07-23T00:00:35.000Z",
      completed_at: "2026-07-23T00:00:45.000Z",
      needs: ["lint", "test"],
      steps: [
        {
          number: 1,
          name: "Publish",
          status: "completed",
          conclusion: "failure",
          started_at: "2026-07-23T00:00:35.000Z",
          completed_at: "2026-07-23T00:00:45.000Z",
        },
      ],
    },
  ],
};
