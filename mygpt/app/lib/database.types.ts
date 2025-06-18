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
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
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
          knowledge_base: string | null
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
          knowledge_base?: string | null
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
          knowledge_base?: string | null
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
      user_documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status: 'pending' | 'processing' | 'completed' | 'failed'
          is_public: boolean
          tags: string[] | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          is_public?: boolean
          tags?: string[] | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          file_type?: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          is_public?: boolean
          tags?: string[] | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_attachments: {
        Row: {
          id: string
          message_id: string | null
          session_id: string | null
          conversation_id: string | null
          user_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          session_id?: string | null
          conversation_id?: string | null
          user_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          session_id?: string | null
          conversation_id?: string | null
          user_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          file_type?: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
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
          attachments: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          attachments?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          attachments?: string[] | null
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
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          gpt_id: string
          model: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          gpt_id: string
          model?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          gpt_id?: string
          model?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json | null
          user_docs: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json | null
          user_docs?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json | null
          user_docs?: string | null
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
      ? R
      : never)
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Row: infer R
    }
      ? R
      : never)
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
      ? I
      : never)
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
      ? I
      : never)
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
      ? U
      : never)
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
      ? U
      : never)
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"])
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Helper types for the new file structures
export interface FileAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt?: string;
}