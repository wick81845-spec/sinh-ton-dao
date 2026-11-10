export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      player_profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          island_name: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          island_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          display_name?: string
          island_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_game_states: {
        Row: {
          player_id: string
          schema_version: number
          revision: number
          state: import('../src/shared/types/game.js').GameSnapshot
          created_at: string
          updated_at: string
        }
        Insert: {
          player_id: string
          schema_version?: number
          revision?: number
          state: import('../src/shared/types/game.js').GameSnapshot
          created_at?: string
          updated_at?: string
        }
        Update: {
          schema_version?: number
          revision?: number
          state?: import('../src/shared/types/game.js').GameSnapshot
          updated_at?: string
        }
        Relationships: []
      }
      world_online_players: {
        Row: {
          player_id: string
          joined_at: string
          last_seen_at: string
        }
        Insert: {
          player_id: string
          joined_at?: string
          last_seen_at?: string
        }
        Update: {
          last_seen_at?: string
        }
        Relationships: []
      }
      global_world_chat_messages: {
        Row: {
          id: number
          player_id: string
          display_name: string
          message: string
          created_at: string
        }
        Insert: {
          id?: number
          player_id: string
          display_name: string
          message: string
          created_at?: string
        }
        Update: {
          id?: number
          player_id?: string
          display_name?: string
          message?: string
          created_at?: string
        }
        Relationships: []
      }
      global_game_settings: {
        Row: {
          id: boolean
          global_weather_id: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          global_weather_id?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          global_weather_id?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_admin_commands: {
        Row: {
          id: string
          player_id: string
          created_by: string | null
          command: Json
          created_at: string
          applied_at: string | null
        }
        Insert: {
          id?: string
          player_id: string
          created_by?: string | null
          command: Json
          created_at?: string
          applied_at?: string | null
        }
        Update: {
          applied_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      enter_global_world: {
        Args: {
          p_player_id: string
        }
        Returns: undefined
      }
      leave_global_world: {
        Args: {
          p_player_id: string
        }
        Returns: undefined
      }
      save_player_game_state: {
        Args: {
          p_player_id: string
          p_expected_revision: number
          p_state: import('../src/shared/types/game.js').GameSnapshot
        }
        Returns: {
          player_id: string
          schema_version: number
          revision: number
          state: import('../src/shared/types/game.js').GameSnapshot
        }[]
      }
      send_global_world_chat_message: {
        Args: {
          p_message: string
        }
        Returns: {
          id: number
          player_id: string
          display_name: string
          message: string
          created_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
