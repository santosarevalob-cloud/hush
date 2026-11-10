export type SongStatus = 'idea' | 'in-progress' | 'finished'

// Hand-written to match supabase/schema.sql, in the same shape
// `supabase gen types typescript` would produce. Can be swapped for that
// generated output later without changing any call sites.
export interface Database {
  public: {
    Tables: {
      songs: {
        Row: {
          id: string
          user_id: string
          title: string
          lyrics: string
          status: SongStatus
          mood: string | null
          genre: string | null
          musical_key: string | null
          bpm: number | null
          cover_image_url: string | null
          beat_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title?: string
          lyrics?: string
          status?: SongStatus
          mood?: string | null
          genre?: string | null
          musical_key?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          beat_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          lyrics?: string
          status?: SongStatus
          mood?: string | null
          genre?: string | null
          musical_key?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          beat_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
        }
        Relationships: []
      }
      song_tags: {
        Row: {
          song_id: string
          tag_id: string
        }
        Insert: {
          song_id: string
          tag_id: string
        }
        Update: {
          song_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      song_audio: {
        Row: {
          id: string
          user_id: string
          song_id: string
          storage_path: string
          bpm: number
          downbeat_offset_seconds: number
          bars: number
          beats_per_bar: number
          version_number: number
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          song_id: string
          storage_path: string
          bpm: number
          downbeat_offset_seconds?: number
          bars?: number
          beats_per_bar?: number
          version_number: number
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          storage_path?: string
          bpm?: number
          downbeat_offset_seconds?: number
          bars?: number
          beats_per_bar?: number
          version_number?: number
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      song_memos: {
        Row: {
          id: string
          user_id: string
          song_id: string
          storage_path: string
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          song_id: string
          storage_path: string
          duration_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          storage_path?: string
          duration_seconds?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Song = Database['public']['Tables']['songs']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type SongTag = Database['public']['Tables']['song_tags']['Row']
export type SongAudio = Database['public']['Tables']['song_audio']['Row']
export type SongMemo = Database['public']['Tables']['song_memos']['Row']
