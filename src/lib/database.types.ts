export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      leaderboard_config: {
        Row: {
          id: string
          base_points: number
          bonus_multiplier: number
          last_reset: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          name: string | null
          description: string | null
          cover_image: string | null
          start_date: string | null
          end_date: string | null
          num_winners: number
          prize_per_winner: number
          prize_tier: string | null
          total_prize: number
          music_category: string | null
          resources: Json | null
          prize_titles: Json | null
          status: string | null
        }
        Insert: {
          id?: string
          base_points?: number
          bonus_multiplier?: number
          last_reset?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          name?: string | null
          description?: string | null
          cover_image?: string | null
          start_date?: string | null
          end_date?: string | null
          num_winners?: number
          prize_per_winner?: number
          prize_tier?: string | null
          total_prize?: number
          music_category?: string | null
          resources?: Json | null
          prize_titles?: Json | null
          status?: string | null
        }
        Update: {
          id?: string
          base_points?: number
          bonus_multiplier?: number
          last_reset?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          name?: string | null
          description?: string | null
          cover_image?: string | null
          start_date?: string | null
          end_date?: string | null
          num_winners?: number
          prize_per_winner?: number
          prize_tier?: string | null
          total_prize?: number
          music_category?: string | null
          resources?: Json | null
          prize_titles?: Json | null
          status?: string | null
        }
      }
    }
    Enums: {
      user_role: "user" | "admin" | "organizer"
    }
  }
}