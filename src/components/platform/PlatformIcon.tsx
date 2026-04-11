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
