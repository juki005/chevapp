import type { JukeboxPlaylist } from "@/types";

export const JUKEBOX_PLAYLISTS: JukeboxPlaylist[] = [
  {
    id: "bascarsija-blues",
    title: "Baščaršija Blues",
    description: "Sevdah & Dino Merlin — za nostalgičan griz uz kahvu i dim.",
    genre: "Sevdah / Bosnian Folk",
    // Placeholder — replace with real Spotify embed URL
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe",
    coverEmoji: "🕌",
    vibe: "nostalgic",
  },
  {
    id: "vrbas-vibe",
    title: "Vrbas Vibe",
    description: "Ex-Yu Rock — za roštilj uz rijeku i hladno pivo.",
    genre: "Ex-Yugoslav Rock",
    // Placeholder — replace with real Spotify embed URL
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWZzRFH7MPHH",
    coverEmoji: "🏞️",
    vibe: "energetic",
  },
  {
    id: "gastro-chill",
    title: "Gastro Chill",
    description: "Instrumental Lo-fi — za kuhanje u miru bez distrakcija.",
    genre: "Lo-fi / Instrumental",
    // Placeholder — replace with real Spotify embed URL
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWQbWVMhXssB",
    coverEmoji: "🎵",
    vibe: "chill",
  },
];

export type PlaylistVibe = "nostalgic" | "energetic" | "chill";
