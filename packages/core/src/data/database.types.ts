// Hand-written to match supabase/migrations. Regenerate with
// `npx supabase gen types typescript --linked > packages/core/src/data/database.types.ts`
// once a project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DocumentSource = "paste" | "file" | "url" | "selection";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          target_wpm: number;
          ramp_enabled: boolean;
          ramp_start_wpm: number;
          ramp_step_wpm: number;
          ramp_step_words: number;
          font_scale: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["profiles"]["Row"],
            "display_name" | "target_wpm" | "ramp_enabled" | "ramp_start_wpm" | "ramp_step_wpm" | "ramp_step_words" | "font_scale"
          >
        >;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: DocumentSource;
          source_name: string | null;
          word_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { title?: string };
        Relationships: [];
      };
      document_contents: {
        Row: {
          document_id: string;
          user_id: string;
          body: string;
          sections: Json;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      reading_progress: {
        Row: {
          document_id: string;
          user_id: string;
          word_index: number;
          wpm: number | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          document_id: string;
          user_id?: string;
          word_index: number;
          wpm?: number | null;
          completed_at?: string | null;
        };
        Update: {
          word_index?: number;
          wpm?: number | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          client: "web" | "extension";
          started_at: string;
          ended_at: string;
          start_word_index: number;
          end_word_index: number;
          words_read: number;
          active_ms: number;
          start_wpm: number;
          end_wpm: number;
          comprehension: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["reading_sessions"]["Row"], "user_id" | "comprehension"> & {
          comprehension?: number | null;
        };
        Update: { comprehension?: number | null };
        Relationships: [];
      };
    };
    Views: {
      daily_reading_stats: {
        Row: {
          user_id: string;
          day: string;
          words_read: number;
          active_ms: number;
          effective_wpm: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_document: {
        Args: {
          p_title: string;
          p_source_type: DocumentSource;
          p_body: string;
          p_source_name?: string | null;
          p_sections?: Json;
        };
        Returns: Database["public"]["Tables"]["documents"]["Row"];
      };
    };
    Enums: {
      document_source: DocumentSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
