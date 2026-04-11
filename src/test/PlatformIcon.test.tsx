import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PlatformIcon } from "../components/platform/PlatformIcon";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PlatformIcon", () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders an SVG element for claude-code", () => {
    const { container } = render(<PlatformIcon agentId="claude-code" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for codex", () => {
    const { container } = render(<PlatformIcon agentId="codex" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for cursor", () => {
    const { container } = render(<PlatformIcon agentId="cursor" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for gemini-cli", () => {
    const { container } = render(<PlatformIcon agentId="gemini-cli" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for trae", () => {
    const { container } = render(<PlatformIcon agentId="trae" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for factory-droid", () => {
    const { container } = render(<PlatformIcon agentId="factory-droid" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for openclaw", () => {
    const { container } = render(<PlatformIcon agentId="openclaw" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for qclaw", () => {
    const { container } = render(<PlatformIcon agentId="qclaw" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for easyclaw", () => {
    const { container } = render(<PlatformIcon agentId="easyclaw" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for workbuddy", () => {
    const { container } = render(<PlatformIcon agentId="workbuddy" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an SVG element for central", () => {
    const { container } = render(<PlatformIcon agentId="central" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  // ── Fallback ──────────────────────────────────────────────────────────────

  it("renders fallback icon for unknown agentId", () => {
    const { container } = render(<PlatformIcon agentId="unknown-platform-xyz" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders fallback icon for empty agentId", () => {
    const { container } = render(<PlatformIcon agentId="" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  // ── Size ──────────────────────────────────────────────────────────────────

  it("renders with default size 16", () => {
    const { container } = render(<PlatformIcon agentId="claude-code" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("renders with custom size", () => {
    const { container } = render(<PlatformIcon agentId="cursor" size={20} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("20");
    expect(svg?.getAttribute("height")).toBe("20");
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it("has aria-hidden attribute", () => {
    const { container } = render(<PlatformIcon agentId="claude-code" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies currentColor fill", () => {
    const { container } = render(<PlatformIcon agentId="gemini-cli" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
  });

  // ── className ─────────────────────────────────────────────────────────────

  it("applies custom className", () => {
    const { container } = render(
      <PlatformIcon agentId="codex" className="text-primary size-4" />
    );
    const svg = container.querySelector("svg");
    // SVG elements in JSDOM use getAttribute('class') rather than .className string
    const classAttr = svg?.getAttribute("class") ?? "";
    expect(classAttr).toContain("text-primary");
    expect(classAttr).toContain("size-4");
  });

  it("always includes shrink-0 class", () => {
    const { container } = render(<PlatformIcon agentId="central" />);
    const svg = container.querySelector("svg");
    const classAttr = svg?.getAttribute("class") ?? "";
    expect(classAttr).toContain("shrink-0");
  });
});
