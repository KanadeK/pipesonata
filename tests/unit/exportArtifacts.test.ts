import { describe, expect, it } from "vitest";

import { safeFileStem, serializeSvg } from "../../src/features/export/exportArtifacts";

describe("export artifact helpers", () => {
  it("creates a portable file stem", () => {
    expect(safeFileStem("Octo Org / Fast CI #1001")).toBe("octo-org-fast-ci-1001");
    expect(safeFileStem("中文")).toBe("pipesonata-run");
  });

  it("serializes the rendered SVG with an XML declaration and namespace", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 20 10");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = "Real score";
    svg.append(title);

    const serialized = serializeSvg(svg);
    expect(serialized).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(serialized).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(serialized).toContain("Real score");
  });
});
