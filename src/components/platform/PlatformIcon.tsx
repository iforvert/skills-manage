import { cn } from "@/lib/utils";

// ─── Platform Icon ────────────────────────────────────────────────────────────
//
// Maps agent IDs to unique platform SVG icons.
// All icons use currentColor so they adapt to the surrounding text color.
// Falls back to a generic terminal icon for unknown platform IDs.

interface PlatformIconProps {
  agentId: string;
  className?: string;
  /** Icon size in pixels (default: 16). */
  size?: number;
}

export function PlatformIcon({ agentId, className, size = 16 }: PlatformIconProps) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "currentColor",
    className: cn("shrink-0", className),
    "aria-hidden": true as const,
    role: "img" as const,
  };

  switch (agentId) {
    case "claude-code":
      // Anthropic Claude — stylised bold 'C' using smooth bezier curves
      return (
        <svg {...svgProps}>
          <path d="M13.5 3C9 1 2 4 2 8s7 7 11.5 5l-1-2C10 12 4.5 10 4.5 8S10 4 12.5 5.5z" />
        </svg>
      );

    case "codex":
      // OpenAI Codex — regular hexagon outline (ring)
      return (
        <svg {...svgProps} fillRule="evenodd">
          <path d="M8 1 13.2 4V12L8 15 2.8 12V4Z" />
          <path d="M8 3.8 10.8 5.4V8.6L8 10.2 5.2 8.6V5.4Z" />
        </svg>
      );

    case "cursor":
      // Cursor — pointer/arrow cursor shape
      return (
        <svg {...svgProps}>
          <path d="M3 2v12l3.5-3.5 2 4.5 1.5-.6-2-4.5H12z" />
        </svg>
      );

    case "gemini-cli":
      // Google Gemini — four-pointed sparkle star
      return (
        <svg {...svgProps}>
          <path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6z" />
        </svg>
      );

    case "trae":
      // Trae — lightning bolt
      return (
        <svg {...svgProps}>
          <path d="M9.5 1.5 4 9.5h4L6.5 14.5 13 6.5H9z" />
        </svg>
      );

    case "factory-droid":
      // Factory Droid — hex-nut (hexagon with circular centre hole)
      return (
        <svg {...svgProps} fillRule="evenodd">
          <path d="M8 1 13.2 4V12L8 15 2.8 12V4Z M5.5 8A2.5 2.5 0 1 0 10.5 8 2.5 2.5 0 0 0 5.5 8Z" />
        </svg>
      );

    case "openclaw":
      // OpenClaw — three vertical prongs joined at a palm + handle
      return (
        <svg {...svgProps}>
          <path d="M5 1.5h1.5V8a1.5 1.5 0 0 0 3 0V1.5H11V8a3 3 0 0 1-2.5 2.97V12h-1V10.97A3 3 0 0 1 5 8V1.5zM4.5 13h7l.8 3.5H3.7z" />
        </svg>
      );

    case "qclaw":
      // QClaw — magnifier-like 'Q' (circle + tail) above palm+handle base
      return (
        <svg {...svgProps}>
          <path
            fillRule="evenodd"
            d="M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6.5 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"
          />
          <path d="M9.6 6.2 11.3 7.9l-1 1L8.6 7.2A3 3 0 0 1 7 7.9V9H9v3H7v1.5h2V15H5v-1.5h.5V9H4V7.9a3 3 0 0 1 5.6-1.7z" />
        </svg>
      );

    case "easyclaw":
      // EasyClaw — small four-pointed star above palm+handle base
      return (
        <svg {...svgProps}>
          <path d="M8 1 8.8 3.5h2.5L9.3 5 10 7.4 8 6 6 7.4l.7-2.4L4.7 3.5h2.5z" />
          <path d="M5.5 8.5h5l1 4.5h-7z" />
          <path d="M6 13.5h4v2H6z" />
        </svg>
      );

    case "workbuddy":
      // WorkBuddy — person silhouette (circle head + body arc)
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="4.5" r="2.5" />
          <path d="M3 15c0-2.76 2.24-5 5-5s5 2.24 5 5H3z" />
        </svg>
      );

    // ─── New Platform Icons ────────────────────────────────────────────────

    case "junie":
      // Junie — JetBrains-style diamond/abstract shape
      return (
        <svg {...svgProps}>
          <path d="M8 1 13 5v6l-5 4-5-4V5zm0 2.2L5 6v4l3 2.4L11 10V6z" />
          <path d="M8 5.5 10 7v2L8 10.5 6 9V7z" />
        </svg>
      );

    case "qwen":
      // Qwen — stylised 'Q' with cloud-like curve
      return (
        <svg {...svgProps}>
          <path
            fillRule="evenodd"
            d="M8 2a4.5 4.5 0 0 0-3.2 7.7L3.3 11.2l1 1L5.9 10A4.5 4.5 0 1 0 8 2zm0 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
          />
          <path d="M10.5 8.5l2 2-1 1-2-2z" />
        </svg>
      );

    case "trae-cn":
      // Trae CN — same as trae (lightning bolt) with small CN indicator
      return (
        <svg {...svgProps}>
          <path d="M9.5 1.5 4 9.5h4L6.5 14.5 13 6.5H9z" />
          <path d="M11 11.5h3v.8h-1V14h-.8v-1.7H11z" opacity="0.6" />
        </svg>
      );

    case "windsurf":
      // Windsurf — wave/surf shape
      return (
        <svg {...svgProps}>
          <path d="M2 8c1-2 3-4 6-4s5 2 6 4c-1 2-3 4-6 4S3 10 2 8z" />
          <path d="M5 6c.8 1.2 1.8 2 3 2s2.2-.8 3-2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    case "qoder":
      // Qoder — code bracket with 'Q'
      return (
        <svg {...svgProps}>
          <path d="M3 2 1 8l2 6h1.5L3 8l1.5-6z" />
          <path d="M11 2l2 6-2 6H9.5L11 8 9.5 2z" />
          <path
            fillRule="evenodd"
            d="M7.5 4a2.5 2.5 0 1 0 1.8 4.2L10.5 9.4l-.7.7-1.2-1.2A2.5 2.5 0 0 0 7.5 4zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
          />
        </svg>
      );

    case "augment":
      // Augment — arrow/growth symbol (upward arrow with bar)
      return (
        <svg {...svgProps}>
          <path d="M8 2l4 4H9v5H7V6H4z" />
          <rect x="3" y="12.5" width="10" height="1.5" rx="0.5" />
        </svg>
      );

    case "opencode":
      // OpenCode — open bracket symbol { }
      return (
        <svg {...svgProps}>
          <path d="M5 2C3.5 2 3 3 3 4v2c0 1-.5 1.5-1.5 1.5v1C2.5 9 3 9.5 3 10v2c0 1 .5 2 2 2h1v-1.5H5c-.5 0-.75-.25-.75-1V10c0-.75-.25-1.25-.75-1.5.5-.25.75-.75.75-1.5V4.5c0-.75.25-1 .75-1H6V2z" />
          <path d="M11 2c1.5 0 2 1 2 2v2c0 1 .5 1.5 1.5 1.5v1C13.5 9 13 9.5 13 10v2c0 1-.5 2-2 2h-1v-1.5h.75c.5 0 .75-.25.75-1V10c0-.75.25-1.25.75-1.5-.5-.25-.75-.75-.75-1.5V4.5c0-.75-.25-1-.75-1H10V2z" />
        </svg>
      );

    case "kilocode":
      // KiloCode — 'K' with code angle bracket
      return (
        <svg {...svgProps}>
          <path d="M4 2h1.5v5.5L9 2h2L7.3 7.5 11.5 14H9.5L5.5 8.5V14H4z" />
        </svg>
      );

    case "ob1":
      // OB1 — circle with '1'
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 5.5h1.5v5H7V7l-.8.5-.4-1z" />
        </svg>
      );

    case "amp":
      // Amp — lightning bolt / amplifier symbol
      return (
        <svg {...svgProps}>
          <path d="M9 1 4 8.5h3.5L5.5 15 12 7h-3.5z" />
        </svg>
      );

    case "kiro":
      // Kiro — AWS Kiro symbol (abstract 'K')
      return (
        <svg {...svgProps}>
          <path d="M4 2h1.8v5L10 2h2.2L8.2 7.5 13 14h-2.4L7 9.2 5.8 10.5V14H4z" />
        </svg>
      );

    case "codebuddy":
      // CodeBuddy — buddy/person with code bracket
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="4" r="2" />
          <path d="M5 7.5c0-1 .9-1.5 1.5-1.5h3c.6 0 1.5.5 1.5 1.5v2H5z" />
          <path d="M2.5 9.5 1 11l1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.5 9.5 15 11l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "hermes":
      // Hermes — winged messenger / 'H' with wing accents
      return (
        <svg {...svgProps}>
          <path d="M5 2v12h1.8V9h2.4v5H11V2H9.2v5.2H6.8V2z" />
          <path d="M3 3l2-1v.8L3.5 3.5 3 3zm0 0L1 2.5 3 3.5v-.5z" opacity="0.5" />
          <path d="M13 3l-2-1v.8l1.5.7.5-.5zm0 0l2-.5-2 1v-.5z" opacity="0.5" />
        </svg>
      );

    case "autoclaw":
      // AutoClaw — claw with 'A' or gear
      return (
        <svg {...svgProps}>
          <path d="M8 1.5 8.6 3.5h2.2L9.1 5l.6 2L8 5.8 6.3 7l.6-2L5.2 3.5h2.2z" />
          <path d="M5.5 8h5l.8 4h-6.6z" />
          <path d="M6 12.5h4V15H6z" />
          <path d="M7 9.8h2v1.2H7z" opacity="0.5" />
        </svg>
      );

    case "copilot":
      // GitHub Copilot — stylised copilot icon (circle head + body)
      return (
        <svg {...svgProps}>
          <path d="M8 1.5C5.5 1.5 3.5 3 3.5 5v2c0 .5.2 1 .5 1.4V11c0 1 1.5 2 4 2s4-1 4-2V8.4c.3-.4.5-.9.5-1.4V5c0-2-2-3.5-4.5-3.5z" />
          <path d="M6.5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="currentColor" opacity="0.4" />
          <path d="M3.5 5.5c-.5.3-1 .8-1 1.5v1c0 .8.5 1.3 1 1.5V5.5zm9 0V9.5c.5-.2 1-.7 1-1.5V7c0-.7-.5-1.2-1-1.5z" opacity="0.6" />
        </svg>
      );

    case "aider":
      // Aider — terminal/command line icon
      return (
        <svg {...svgProps}>
          <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="currentColor" opacity="0.15" />
          <path d="M2 2.5h12a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H2a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 2 2.5zm1 2v7h10v-7H3zm1 1.5L6 7.5 4 9V7.5z" fillRule="evenodd" />
          <rect x="7" y="8" width="3.5" height="1" rx="0.3" opacity="0.5" />
        </svg>
      );

    case "easyclaw-v2":
      // EasyClaw v2 — reuses easyclaw icon
      return (
        <svg {...svgProps}>
          <path d="M8 1 8.8 3.5h2.5L9.3 5 10 7.4 8 6 6 7.4l.7-2.4L4.7 3.5h2.5z" />
          <path d="M5.5 8.5h5l1 4.5h-7z" />
          <path d="M6 13.5h4v2H6z" />
        </svg>
      );

    case "central":
      // Central Skills — 3-D cube / package
      return (
        <svg {...svgProps}>
          <path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8zm0 1.9L4.3 5.4 8 7.8l3.7-2.5zM3.5 6.7v3.7L7.2 12V8.2zm5.3 5.3L12.5 10.4V6.7L8.8 8.2z" />
        </svg>
      );

    default:
      // Generic terminal / code icon — used for unknown platforms
      return (
        <svg {...svgProps}>
          <rect x="2" y="3" width="12" height="10" rx="1.5" fill="currentColor" opacity="0.15" />
          <path d="M2 3h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 14 13H2a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 2 3zm1 2v6h10V5H3zm1 1.5 2 1.5L4 10v-1.5l.8-.5L4 8V6.5zm3.5 3.5h3v1h-3z" />
        </svg>
      );
  }
}
