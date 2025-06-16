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
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          team_id: string
          role: 'admin' | 'editor' | 'viewer'
          permissions: Json
          invited_by: string
          joined_at: string
          last_active: string | null
          status: 'active' | 'pending' | 'inactive'
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
          role: 'admin' | 'editor' | 'viewer'
          permissions: Json
          invited_by: string
          joined_at?: string
          last_active?: string | null
          status?: 'active' | 'pending' | 'inactive'
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
          role?: 'admin' | 'editor' | 'viewer'
          permissions?: Json
          invited_by?: string
          joined_at?: string
          last_active?: string | null
          status?: 'active' | 'pending' | 'inactive'
        }
      }
      custom_gpts: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          name: string
          description: string
          instructions: string
          model: string
          image_url: string | null
          conversation_starter: string | null
          web_browsing: boolean
          folder: string | null
          is_public: boolean
          is_featured: boolean
          view_count: number
          like_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          name: string
          description: string
          instructions: string
          model?: string
          image_url?: string | null
          conversation_starter?: string | null
          web_browsing?: boolean
          folder?: string | null
          is_public?: boolean
          is_featured?: boolean
          view_count?: number
          like_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          name?: string
          description?: string
          instructions?: string
          model?: string
          image_url?: string | null
          conversation_starter?: string | null
          web_browsing?: boolean
          folder?: string | null
          is_public?: boolean
          is_featured?: boolean
          view_count?: number
          like_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_files: {
        Row: {
          id: string
          gpt_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at: string
        }
        Insert: {
          id?: string
          gpt_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at?: string
        }
        Update: {
          id?: string
          gpt_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          file_type?: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          gpt_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gpt_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gpt_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          created_at?: string
        }
      }
      gpt_analytics: {
        Row: {
          id: string
          gpt_id: string
          user_id: string | null
          action_type: 'view' | 'chat' | 'like' | 'share'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          gpt_id: string
          user_id?: string | null
          action_type: 'view' | 'chat' | 'like' | 'share'
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          gpt_id?: string
          user_id?: string | null
          action_type?: 'view' | 'chat' | 'like' | 'share'
          metadata?: Json
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          email: string
          team_id: string
          invited_by: string
          role: 'admin' | 'editor' | 'viewer'
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          team_id: string
          invited_by: string
          role: 'admin' | 'editor' | 'viewer'
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          team_id?: string
          invited_by?: string
          role?: 'admin' | 'editor' | 'viewer'
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 