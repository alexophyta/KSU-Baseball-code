export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      batted_balls: {
        Row: {
          angle: number | null
          created_at: string
          direction: number | null
          distance: number | null
          exit_speed: number | null
          hang_time: number | null
          hit_spin_rate: number | null
          pitch_uid: string
          play_result: string | null
          tagged_hit_type: string | null
        }
        Insert: {
          angle?: number | null
          created_at?: string
          direction?: number | null
          distance?: number | null
          exit_speed?: number | null
          hang_time?: number | null
          hit_spin_rate?: number | null
          pitch_uid: string
          play_result?: string | null
          tagged_hit_type?: string | null
        }
        Update: {
          angle?: number | null
          created_at?: string
          direction?: number | null
          distance?: number | null
          exit_speed?: number | null
          hang_time?: number | null
          hit_spin_rate?: number | null
          pitch_uid?: string
          play_result?: string | null
          tagged_hit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batted_balls_pitch_uid_fkey"
            columns: ["pitch_uid"]
            isOneToOne: true
            referencedRelation: "pitches"
            referencedColumns: ["pitch_uid"]
          },
        ]
      }
      csv_uploads: {
        Row: {
          file_name: string
          game_ids: string[] | null
          id: string
          row_count: number | null
          upload_date: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          game_ids?: string[] | null
          id?: string
          row_count?: number | null
          upload_date?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          game_ids?: string[] | null
          id?: string
          row_count?: number | null
          upload_date?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          game_date: string
          game_id: string
        }
        Insert: {
          created_at?: string
          game_date: string
          game_id: string
        }
        Update: {
          created_at?: string
          game_date?: string
          game_id?: string
        }
        Relationships: []
      }
      pitches: {
        Row: {
          auto_pitch_type: string | null
          created_at: string
          extension: number | null
          horz_appr_angle: number | null
          horz_break: number | null
          horz_rel_angle: number | null
          induced_vert_break: number | null
          pa_id: string
          pitch_call: string | null
          pitch_no: number | null
          pitch_of_pa: number | null
          pitch_uid: string
          plate_loc_height: number | null
          plate_loc_side: number | null
          rel_height: number | null
          rel_side: number | null
          rel_speed: number | null
          spin_axis: number | null
          spin_rate: number | null
          tagged_pitch_type: string | null
          tilt: string | null
          vert_appr_angle: number | null
          vert_break: number | null
          vert_rel_angle: number | null
          zone_speed: number | null
          zone_time: number | null
        }
        Insert: {
          auto_pitch_type?: string | null
          created_at?: string
          extension?: number | null
          horz_appr_angle?: number | null
          horz_break?: number | null
          horz_rel_angle?: number | null
          induced_vert_break?: number | null
          pa_id: string
          pitch_call?: string | null
          pitch_no?: number | null
          pitch_of_pa?: number | null
          pitch_uid: string
          plate_loc_height?: number | null
          plate_loc_side?: number | null
          rel_height?: number | null
          rel_side?: number | null
          rel_speed?: number | null
          spin_axis?: number | null
          spin_rate?: number | null
          tagged_pitch_type?: string | null
          tilt?: string | null
          vert_appr_angle?: number | null
          vert_break?: number | null
          vert_rel_angle?: number | null
          zone_speed?: number | null
          zone_time?: number | null
        }
        Update: {
          auto_pitch_type?: string | null
          created_at?: string
          extension?: number | null
          horz_appr_angle?: number | null
          horz_break?: number | null
          horz_rel_angle?: number | null
          induced_vert_break?: number | null
          pa_id?: string
          pitch_call?: string | null
          pitch_no?: number | null
          pitch_of_pa?: number | null
          pitch_uid?: string
          plate_loc_height?: number | null
          plate_loc_side?: number | null
          rel_height?: number | null
          rel_side?: number | null
          rel_speed?: number | null
          spin_axis?: number | null
          spin_rate?: number | null
          tagged_pitch_type?: string | null
          tilt?: string | null
          vert_appr_angle?: number | null
          vert_break?: number | null
          vert_rel_angle?: number | null
          zone_speed?: number | null
          zone_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pitches_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "plate_appearances"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      plate_appearances: {
        Row: {
          batter_id: number
          created_at: string
          game_id: string
          inning: number
          k_or_bb: string | null
          outs: number
          outs_on_play: number | null
          pa_id: string
          pa_of_inning: number | null
          pitcher_id: number
          play_result: string | null
          runs_scored: number | null
          top_bottom: string
        }
        Insert: {
          batter_id: number
          created_at?: string
          game_id: string
          inning: number
          k_or_bb?: string | null
          outs: number
          outs_on_play?: number | null
          pa_id: string
          pa_of_inning?: number | null
          pitcher_id: number
          play_result?: string | null
          runs_scored?: number | null
          top_bottom: string
        }
        Update: {
          batter_id?: number
          created_at?: string
          game_id?: string
          inning?: number
          k_or_bb?: string | null
          outs?: number
          outs_on_play?: number | null
          pa_id?: string
          pa_of_inning?: number | null
          pitcher_id?: number
          play_result?: string | null
          runs_scored?: number | null
          top_bottom?: string
        }
        Relationships: [
          {
            foreignKeyName: "plate_appearances_batter_id_fkey"
            columns: ["batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "plate_appearances_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "plate_appearances_pitcher_id_fkey"
            columns: ["pitcher_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          batter_side: string | null
          created_at: string
          pitcher_side: string | null
          player_id: number
          player_name: string
        }
        Insert: {
          batter_side?: string | null
          created_at?: string
          pitcher_side?: string | null
          player_id: number
          player_name: string
        }
        Update: {
          batter_side?: string | null
          created_at?: string
          pitcher_side?: string | null
          player_id?: number
          player_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          player_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          player_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          player_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_set_profile_player_id: {
        Args: { _new_player_id: number; _target_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "creator" | "user" | "coach"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["creator", "user", "coach"],
    },
  },
} as const
