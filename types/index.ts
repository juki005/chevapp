export type { Database, UserRole, CevapStyle, Json } from "./database";

export interface Restaurant {
  id: string;
  name: string;
  style: import("./database").CevapStyle;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  lepinja_rating: number;
  tags: string[];
  is_verified: boolean;
  phone?: string | null;
  website?: string | null;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: import("./database").UserRole;
  xp_points: number;
  total_visits: number;
  favorite_style: import("./database").CevapStyle | null;
}

export interface JukeboxPlaylist {
  id: string;
  title: string;
  description: string;
  genre: string;
  spotifyUrl: string;
  coverEmoji: string;
  vibe: string;
}

export interface BurnoffResult {
  calories: number;
  workouts: {
    name: string;
    emoji: string;
    minutes: number;
    key: string;
  }[];
}
