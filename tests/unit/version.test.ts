import { describe, expect, it } from "vitest";

import { APP_VERSION } from "../../src/core/version";

describe("application version", () => {
  it("matches the initial release line", () => {
    expect(APP_VERSION).toBe("0.1.0");
  });
});
