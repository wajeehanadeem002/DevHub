/**
 * Schema-derived Supabase types for the initial DevHub migration.
 * Regenerate this file from the hosted development project after applying the
 * migration; see supabase/README.md for the approved workflow.
 */
export type Json =
  | boolean
  | number
  | string
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string | null;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          github_url: string | null;
          headline: string | null;
          is_public: boolean;
          linkedin_url: string | null;
          location: string | null;
          search_document: unknown;
          updated_at: string;
          user_id: string;
          username: string;
          website_url: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string | null;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          github_url?: string | null;
          headline?: string | null;
          is_public?: boolean;
          linkedin_url?: string | null;
          location?: string | null;
          updated_at?: string;
          user_id?: string;
          username: string;
          website_url?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          country_code?: string | null;
          display_name?: string;
          github_url?: string | null;
          headline?: string | null;
          is_public?: boolean;
          linkedin_url?: string | null;
          location?: string | null;
          username?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: { created_at: string; id: number; name: string; slug: string; sort_order: number };
        Insert: { created_at?: string; id?: number; name: string; slug: string; sort_order?: number };
        Update: { name?: string; slug?: string; sort_order?: number };
        Relationships: [];
      };
      technologies: {
        Row: { created_at: string; id: number; name: string; slug: string; sort_order: number };
        Insert: { created_at?: string; id?: number; name: string; slug: string; sort_order?: number };
        Update: { name?: string; slug?: string; sort_order?: number };
        Relationships: [];
      };
      projects: {
        Row: {
          category_id: number;
          created_at: string;
          demo_url: string | null;
          description: string;
          id: string;
          like_count: number;
          owner_id: string;
          published_at: string | null;
          repository_url: string | null;
          search_document: unknown;
          status: "draft" | "published";
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category_id: number;
          created_at?: string;
          demo_url?: string | null;
          description: string;
          id?: string;
          owner_id?: string;
          published_at?: string | null;
          repository_url?: string | null;
          status?: "draft" | "published";
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: number;
          demo_url?: string | null;
          description?: string;
          repository_url?: string | null;
          status?: "draft" | "published";
          summary?: string;
          title?: string;
        };
        Relationships: [];
      };
      project_images: {
        Row: { alt_text: string; byte_size: number; created_at: string; height: number; id: string; mime_type: string; project_id: string; sort_order: number; storage_path: string; width: number };
        Insert: { alt_text: string; byte_size: number; created_at?: string; height: number; id?: string; mime_type: string; project_id: string; sort_order: number; storage_path: string; width: number };
        Update: { alt_text?: string; sort_order?: number };
        Relationships: [];
      };
      project_technologies: {
        Row: { created_at: string; project_id: string; technology_id: number };
        Insert: { created_at?: string; project_id: string; technology_id: number };
        Update: never;
        Relationships: [];
      };
      profile_technologies: {
        Row: { created_at: string; technology_id: number; user_id: string };
        Insert: { created_at?: string; technology_id: number; user_id: string };
        Update: never;
        Relationships: [];
      };
      project_likes: {
        Row: { created_at: string; project_id: string; user_id: string };
        Insert: { created_at?: string; project_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      project_saves: {
        Row: { created_at: string; project_id: string; user_id: string };
        Insert: { created_at?: string; project_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      clerk_webhook_events: {
        Row: { attempts: number; created_at: string; event_id: string; event_type: string; last_error: string | null; processed_at: string | null; status: "pending" | "processing" | "completed" | "failed"; updated_at: string };
        Insert: { attempts?: number; created_at?: string; event_id: string; event_type: string; last_error?: string | null; processed_at?: string | null; status?: "pending" | "processing" | "completed" | "failed"; updated_at?: string };
        Update: { attempts?: number; last_error?: string | null; processed_at?: string | null; status?: "pending" | "processing" | "completed" | "failed"; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_current_project_image: {
        Args: {
          p_alt_text: string;
          p_byte_size: number;
          p_height: number;
          p_mime_type: string;
          p_project_id: string;
          p_storage_path: string;
          p_width: number;
        };
        Returns: string;
      };
      create_current_project: {
        Args: {
          p_category_id: number;
          p_demo_url: string | null;
          p_description: string;
          p_repository_url: string | null;
          p_summary: string;
          p_technology_ids: number[];
          p_title: string;
        };
        Returns: string;
      };
      delete_current_project: {
        Args: { p_project_id: string };
        Returns: string[];
      };
      delete_current_project_image: {
        Args: { p_image_id: string; p_project_id: string };
        Returns: string;
      };
      reorder_current_project_images: {
        Args: { p_image_ids: string[]; p_project_id: string };
        Returns: undefined;
      };
      update_current_project: {
        Args: {
          p_category_id: number;
          p_demo_url: string | null;
          p_description: string;
          p_project_id: string;
          p_repository_url: string | null;
          p_status: string;
          p_summary: string;
          p_technology_ids: number[];
          p_title: string;
        };
        Returns: undefined;
      };
      update_current_profile: {
        Args: {
          p_bio: string | null;
          p_display_name: string;
          p_github_url: string | null;
          p_headline: string | null;
          p_is_public: boolean;
          p_linkedin_url: string | null;
          p_location: string | null;
          p_technology_ids: number[];
          p_username: string;
          p_website_url: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
