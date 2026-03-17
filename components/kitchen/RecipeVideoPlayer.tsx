"use client";

import { useState, useRef, useCallback } from "react";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";

interface RecipeVideoPlayerProps {
  url: string;
}

// ── URL parsers ──────────────────────────────────────────────────────────────

function parseYouTubeId(url: string): string | null {
  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
  //          youtube.com/embed/ID, youtube.com/live/ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function parseVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

type VideoKind = "youtube" | "vimeo" | "direct";

function detectKind(url: string): VideoKind {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url))             return "vimeo";
  return "direct";
}

function buildEmbedUrl(url: string, kind: VideoKind): string | null {
  if (kind === "youtube") {
    const id = parseYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
  }
  if (kind === "vimeo") {
    const id = parseVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?color=e65100` : null;
  }
  return null; // direct — rendered as <video>
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecipeVideoPlayer({ url }: RecipeVideoPlayerProps) {
  const [expanded, setExpanded]   = useState(false);
  const containerRef              = useRef<HTMLDivElement>(null);
  const kind                      = detectKind(url);
  const embedUrl                  = buildEmbedUrl(url, kind);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setExpanded(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setExpanded(false);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-[rgb(var(--border))] bg-black relative group"
    >
      {/* 16:9 aspect ratio wrapper */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>

        {/* iframe embed — YouTube or Vimeo */}
        {embedUrl && (
          <iframe
            src={embedUrl}
            title="Video tutorial"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        )}

        {/* Direct video file */}
        {kind === "direct" && (
          <video
            src={url}
            controls
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
          />
        )}
      </div>

      {/* Controls overlay — top-right corner, visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Fullscreen toggle (works for direct <video> and surrounding div) */}
        <button
          onClick={toggleFullscreen}
          className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          title={expanded ? "Smanji" : "Cijeli zaslon"}
        >
          {expanded
            ? <Minimize2 className="w-3.5 h-3.5" />
            : <Maximize2 className="w-3.5 h-3.5" />
          }
        </button>

        {/* Open in new tab */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          title="Otvori u novom tabu"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
