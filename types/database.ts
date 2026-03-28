export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "moderator" | "user";

export type CevapStyle =
  | "Sarajevski"
  | "Banjalučki"
  | "Travnički"
  | "Leskovački"
  | "Ostalo";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: UserRole;
          xp_points: number;
          rank: string | null;
          favorite_style:       CevapStyle | null;
          total_visits:         number;
          onboarding_completed: boolean;
          condiment_pref:       "kajmak" | "ajvar" | null;
          home_city:            string | null;
          weight_kg:            number | null;
          height_cm:            number | null;
          gender:               string | null;
          is_admin:             boolean;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          xp_points?: number;
          rank?: string | null;
          favorite_style?: CevapStyle | null;
          total_visits?: number;
          onboarding_completed?: boolean;
          condiment_pref?: "kajmak" | "ajvar" | null;
          home_city?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          gender?: string | null;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          xp_points?: number;
          rank?: string | null;
          favorite_style?: CevapStyle | null;
          total_visits?: number;
          onboarding_completed?: boolean;
          condiment_pref?: "kajmak" | "ajvar" | null;
          home_city?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          gender?: string | null;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          style: CevapStyle;
          city: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          lepinja_rating: number;
          phone: string | null;
          website: string | null;
          opening_hours: Json | null;
          tags: string[];
          gallery_urls: string[];
          is_verified: boolean;
          status_reports: Json[];
          foursquare_id:    string | null;
          google_place_id:  string | null;
          slug:             string | null;
          rating:           number | null;
          review_count:     number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          style: CevapStyle;
          city: string;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          lepinja_rating?: number;
          phone?: string | null;
          website?: string | null;
          opening_hours?: Json | null;
          tags?: string[];
          gallery_urls?: string[];
          is_verified?: boolean;
          status_reports?: Json[];
          foursquare_id?: string | null;
          google_place_id?: string | null;
          slug?: string | null;
          rating?: number | null;
          review_count?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          style?: CevapStyle | null;   // nullable — allows clearing a crowdsourced tag
          city?: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          lepinja_rating?: number;
          phone?: string | null;
          website?: string | null;
          opening_hours?: Json | null;
          tags?: string[];
          gallery_urls?: string[];
          is_verified?: boolean;
          status_reports?: Json[];
          foursquare_id?: string | null;
          google_place_id?: string | null;
          slug?: string | null;
          rating?: number | null;
          review_count?: number | null;
        };
        Relationships: [];
      };
      user_favorites: {
        Row:    { id: string; user_id: string; restaurant_id: string; created_at: string };
        Insert: { id?: string; user_id: string; restaurant_id: string; created_at?: string };
        Update: { id?: string; user_id?: string; restaurant_id?: string; created_at?: string };
        Relationships: [];
      };
      user_wishlist: {
        Row:    { id: string; user_id: string; restaurant_id: string; created_at: string };
        Insert: { id?: string; user_id: string; restaurant_id: string; created_at?: string };
        Update: { id?: string; user_id?: string; restaurant_id?: string; created_at?: string };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          rating: number;
          with_onion: boolean;
          with_kajmak: boolean;
          with_ajvar: boolean;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          restaurant_id: string;
          rating: number;
          with_onion?: boolean;
          with_kajmak?: boolean;
          with_ajvar?: boolean;
          comment?: string | null;
        };
        Update: {
          rating?: number;
          with_onion?: boolean;
          with_kajmak?: boolean;
          with_ajvar?: boolean;
          comment?: string | null;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          restaurant_id: string;
          onion_score: number;
          temp_score: number;
          lepinja_score: number;
          comment: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          restaurant_id: string;
          onion_score: number;
          temp_score: number;
          lepinja_score: number;
          comment?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          restaurant_id?: string;
          onion_score?: number;
          temp_score?: number;
          lepinja_score?: number;
          comment?: string | null;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          restaurant_id: string | null;
          content: string;
          image_url: string | null;
          is_insider_tip: boolean;
          likes_count: number;
          is_hidden: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          restaurant_id?: string | null;
          content: string;
          image_url?: string | null;
          is_insider_tip?: boolean;
          likes_count?: number;
          is_hidden?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          restaurant_id?: string | null;
          content?: string;
          image_url?: string | null;
          is_insider_tip?: boolean;
          likes_count?: number;
          is_hidden?: boolean;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          xp_total: number;
          current_streak: number;
          last_activity_date: string | null;
          rank_title: string;
          daily_challenge_claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          xp_total?: number;
          current_streak?: number;
          last_activity_date?: string | null;
          rank_title?: string;
          daily_challenge_claimed_at?: string | null;
        };
        Update: {
          xp_total?: number;
          current_streak?: number;
          last_activity_date?: string | null;
          rank_title?: string;
          daily_challenge_claimed_at?: string | null;
        };
        Relationships: [];
      };
      word_of_the_day: {
        Row: {
          id: string;
          word: string;
          definition: string;
          tags: string[];
          display_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          word: string;
          definition: string;
          tags?: string[];
          display_date?: string | null;
        };
        Update: {
          word?: string;
          definition?: string;
          tags?: string[];
          display_date?: string | null;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          slug: string;
          emoji: string;
          title_hr: string;
          title_en: string | null;
          description_hr: string;
          description_en: string | null;
          difficulty: "easy" | "medium" | "hard";
          category: "Glavno jelo" | "Prilog" | "Dodatak";
          prep_time: string;
          cook_time: string;
          cooking_time: number;
          servings: number;
          style: string | null;
          ingredients: Json;
          steps: Json;
          tips: Json;
          youtube_query: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          emoji?: string;
          title_hr: string;
          title_en?: string | null;
          description_hr: string;
          description_en?: string | null;
          difficulty?: "easy" | "medium" | "hard";
          category?: "Glavno jelo" | "Prilog" | "Dodatak";
          prep_time?: string;
          cook_time?: string;
          cooking_time?: number;
          servings?: number;
          style?: string | null;
          ingredients?: Json;
          steps?: Json;
          tips?: Json;
          youtube_query?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          emoji?: string;
          title_hr?: string;
          title_en?: string | null;
          description_hr?: string;
          description_en?: string | null;
          difficulty?: "easy" | "medium" | "hard";
          category?: "Glavno jelo" | "Prilog" | "Dodatak";
          prep_time?: string;
          cook_time?: string;
          cooking_time?: number;
          servings?: number;
          style?: string | null;
          ingredients?: Json;
          steps?: Json;
          tips?: Json;
          youtube_query?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          restaurant_id: string;
          visit_date: string;
          photo_url: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          restaurant_id: string;
          visit_date: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          restaurant_id?: string;
          visit_date?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      award_xp: {
        Args: { p_user_id: string; p_points: number };
        Returns: unknown;
      };
      claim_daily_challenge: {
        Args: { p_user_id: string; p_points: number };
        Returns: unknown;
      };
    };
    Enums: {
      user_role: UserRole;
      cevap_style: CevapStyle;
    };
  };
}
