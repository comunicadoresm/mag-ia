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
      access_logs: {
        Row: {
          action: string
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_documents: {
        Row: {
          agent_id: string
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_plan_access: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          plan_type_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          plan_type_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          plan_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_plan_access_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_plan_access_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_plan_access_plan_type_id_fkey"
            columns: ["plan_type_id"]
            isOneToOne: false
            referencedRelation: "plan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tags: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tags_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tags_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          api_key: string | null
          billing_type: string | null
          created_at: string | null
          credit_cost: number | null
          description: string | null
          display_order: number | null
          ice_breakers: Json | null
          icon_emoji: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          message_package_size: number | null
          model: string | null
          name: string
          plan_access: string | null
          slug: string
          system_prompt: string
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          api_key?: string | null
          billing_type?: string | null
          created_at?: string | null
          credit_cost?: number | null
          description?: string | null
          display_order?: number | null
          ice_breakers?: Json | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          message_package_size?: number | null
          model?: string | null
          name: string
          plan_access?: string | null
          slug: string
          system_prompt: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          api_key?: string | null
          billing_type?: string | null
          created_at?: string | null
          credit_cost?: number | null
          description?: string | null
          display_order?: number | null
          ice_breakers?: Json | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          message_package_size?: number | null
          model?: string | null
          name?: string
          plan_access?: string | null
          slug?: string
          system_prompt?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cost_config: {
        Row: {
          action_label: string
          action_slug: string
          created_at: string | null
          credit_cost: number
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          action_label: string
          action_slug: string
          created_at?: string | null
          credit_cost?: number
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          action_label?: string
          action_slug?: string
          created_at?: string | null
          credit_cost?: number
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          badge_text: string | null
          created_at: string | null
          credits_amount: number
          credits_expire_days: number | null
          description: string | null
          display_order: number | null
          hotmart_product_id: string | null
          hotmart_url: string | null
          id: string
          is_active: boolean | null
          min_plan_order: number | null
          name: string
          package_type: string
          per_credit_label: string | null
          price_brl: number
          price_label: string | null
        }
        Insert: {
          badge_text?: string | null
          created_at?: string | null
          credits_amount: number
          credits_expire_days?: number | null
          description?: string | null
          display_order?: number | null
          hotmart_product_id?: string | null
          hotmart_url?: string | null
          id?: string
          is_active?: boolean | null
          min_plan_order?: number | null
          name: string
          package_type: string
          per_credit_label?: string | null
          price_brl: number
          price_label?: string | null
        }
        Update: {
          badge_text?: string | null
          created_at?: string | null
          credits_amount?: number
          credits_expire_days?: number | null
          description?: string | null
          display_order?: number | null
          hotmart_product_id?: string | null
          hotmart_url?: string | null
          id?: string
          is_active?: boolean | null
          min_plan_order?: number | null
          name?: string
          package_type?: string
          per_credit_label?: string | null
          price_brl?: number
          price_label?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          package: string
          payment_status: string | null
          price_brl: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits: number
          id?: string
          package: string
          payment_status?: string | null
          price_brl: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          package?: string
          payment_status?: string | null
          price_brl?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          credits_per_month: number
          id: string
          next_renewal_at: string | null
          price_brl: number
          status: string | null
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          credits_per_month: number
          id?: string
          next_renewal_at?: string | null
          price_brl: number
          status?: string | null
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          credits_per_month?: number
          id?: string
          next_renewal_at?: string | null
          price_brl?: number
          status?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          id: string
          metadata: Json | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          agent_id: string
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
        }
        Insert: {
          agent_id: string
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_slug: string
          id: string
          is_enabled: boolean | null
          plan_type_id: string
        }
        Insert: {
          created_at?: string | null
          feature_slug: string
          id?: string
          is_enabled?: boolean | null
          plan_type_id: string
        }
        Update: {
          created_at?: string | null
          feature_slug?: string
          id?: string
          is_enabled?: boolean | null
          plan_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_type_id_fkey"
            columns: ["plan_type_id"]
            isOneToOne: false
            referencedRelation: "plan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_types: {
        Row: {
          ac_tag: string
          can_buy_extra_credits: boolean | null
          color: string | null
          created_at: string | null
          credits_expire_days: number | null
          description: string | null
          display_order: number | null
          has_monthly_renewal: boolean | null
          hotmart_product_id: string | null
          icon: string | null
          id: string
          initial_credits: number | null
          is_active: boolean | null
          monthly_credits: number | null
          name: string
          show_as_upsell: boolean | null
          slug: string
          updated_at: string | null
          upsell_badge_text: string | null
          upsell_button_text: string | null
          upsell_features: Json | null
          upsell_hotmart_url: string | null
          upsell_price_label: string | null
        }
        Insert: {
          ac_tag: string
          can_buy_extra_credits?: boolean | null
          color?: string | null
          created_at?: string | null
          credits_expire_days?: number | null
          description?: string | null
          display_order?: number | null
          has_monthly_renewal?: boolean | null
          hotmart_product_id?: string | null
          icon?: string | null
          id?: string
          initial_credits?: number | null
          is_active?: boolean | null
          monthly_credits?: number | null
          name: string
          show_as_upsell?: boolean | null
          slug: string
          updated_at?: string | null
          upsell_badge_text?: string | null
          upsell_button_text?: string | null
          upsell_features?: Json | null
          upsell_hotmart_url?: string | null
          upsell_price_label?: string | null
        }
        Update: {
          ac_tag?: string
          can_buy_extra_credits?: boolean | null
          color?: string | null
          created_at?: string | null
          credits_expire_days?: number | null
          description?: string | null
          display_order?: number | null
          has_monthly_renewal?: boolean | null
          hotmart_product_id?: string | null
          icon?: string | null
          id?: string
          initial_credits?: number | null
          is_active?: boolean | null
          monthly_credits?: number | null
          name?: string
          show_as_upsell?: boolean | null
          slug?: string
          updated_at?: string | null
          upsell_badge_text?: string | null
          upsell_button_text?: string | null
          upsell_features?: Json | null
          upsell_hotmart_url?: string | null
          upsell_price_label?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ac_tags: string[] | null
          created_at: string | null
          email: string
          has_completed_setup: boolean | null
          id: string
          last_ac_verification: string | null
          name: string | null
          plan_activated_at: string | null
          plan_type: string | null
          plan_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          ac_tags?: string[] | null
          created_at?: string | null
          email: string
          has_completed_setup?: boolean | null
          id: string
          last_ac_verification?: string | null
          name?: string | null
          plan_activated_at?: string | null
          plan_type?: string | null
          plan_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ac_tags?: string[] | null
          created_at?: string | null
          email?: string
          has_completed_setup?: boolean | null
          id?: string
          last_ac_verification?: string | null
          name?: string | null
          plan_activated_at?: string | null
          plan_type?: string | null
          plan_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_type_id_fkey"
            columns: ["plan_type_id"]
            isOneToOne: false
            referencedRelation: "plan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      script_formats: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      script_objectives: {
        Row: {
          color: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      script_styles: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      script_templates: {
        Row: {
          agent_id: string | null
          created_at: string
          display_order: number | null
          format: string | null
          id: string
          is_active: boolean
          objective: string | null
          script_structure: Json
          style: string
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          display_order?: number | null
          format?: string | null
          id?: string
          is_active?: boolean
          objective?: string | null
          script_structure?: Json
          style: string
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          display_order?: number | null
          format?: string | null
          id?: string
          is_active?: boolean
          objective?: string | null
          script_structure?: Json
          style?: string
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      upsell_plans: {
        Row: {
          badge_text: string | null
          button_text: string
          created_at: string | null
          credits: number
          credits_label: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          hotmart_url: string
          id: string
          is_active: boolean | null
          name: string
          per_credit_label: string | null
          price_brl: number
          price_label: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          button_text?: string
          created_at?: string | null
          credits?: number
          credits_label?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          hotmart_url?: string
          id?: string
          is_active?: boolean | null
          name: string
          per_credit_label?: string | null
          price_brl: number
          price_label?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          button_text?: string
          created_at?: string | null
          credits?: number
          credits_label?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          hotmart_url?: string
          id?: string
          is_active?: boolean | null
          name?: string
          per_credit_label?: string | null
          price_brl?: number
          price_label?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          bonus_credits: number | null
          created_at: string | null
          cycle_end_date: string | null
          cycle_start_date: string | null
          id: string
          plan_credits: number | null
          plan_credits_expire_at: string | null
          subscription_credits: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bonus_credits?: number | null
          created_at?: string | null
          cycle_end_date?: string | null
          cycle_start_date?: string | null
          id?: string
          plan_credits?: number | null
          plan_credits_expire_at?: string | null
          subscription_credits?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bonus_credits?: number | null
          created_at?: string | null
          cycle_end_date?: string | null
          cycle_start_date?: string | null
          id?: string
          plan_credits?: number | null
          plan_credits_expire_at?: string | null
          subscription_credits?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          created_at: string | null
          current_clients: number | null
          current_followers: number | null
          current_revenue: number | null
          display_name: string | null
          handle: string | null
          id: string
          initial_clients: number | null
          initial_followers: number | null
          initial_revenue: number | null
          initial_setup_done: boolean | null
          initial_views: number | null
          profile_photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_clients?: number | null
          current_followers?: number | null
          current_revenue?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string
          initial_clients?: number | null
          initial_followers?: number | null
          initial_revenue?: number | null
          initial_setup_done?: boolean | null
          initial_views?: number | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_clients?: number | null
          current_followers?: number | null
          current_revenue?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string
          initial_clients?: number | null
          initial_followers?: number | null
          initial_revenue?: number | null
          initial_setup_done?: boolean | null
          initial_views?: number | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scripts: {
        Row: {
          comments: number | null
          conversation_id: string | null
          created_at: string
          followers: number | null
          format: string | null
          id: string
          likes: number | null
          objective: string | null
          post_url: string | null
          posted_at: string | null
          saves: number | null
          script_content: Json
          shares: number | null
          status: Database["public"]["Enums"]["script_status"]
          style: string
          template_id: string | null
          theme: string | null
          title: string
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          conversation_id?: string | null
          created_at?: string
          followers?: number | null
          format?: string | null
          id?: string
          likes?: number | null
          objective?: string | null
          post_url?: string | null
          posted_at?: string | null
          saves?: number | null
          script_content?: Json
          shares?: number | null
          status?: Database["public"]["Enums"]["script_status"]
          style: string
          template_id?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          conversation_id?: string | null
          created_at?: string
          followers?: number | null
          format?: string | null
          id?: string
          likes?: number | null
          objective?: string | null
          post_url?: string | null
          posted_at?: string | null
          saves?: number | null
          script_content?: Json
          shares?: number | null
          status?: Database["public"]["Enums"]["script_status"]
          style?: string
          template_id?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_scripts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scripts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "script_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          source: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      agents_public: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          ice_breakers: Json | null
          icon_emoji: string | null
          icon_url: string | null
          id: string | null
          is_active: boolean | null
          model: string | null
          name: string | null
          plan_access: string | null
          slug: string | null
          system_prompt: string | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          ice_breakers?: Json | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          model?: string | null
          name?: string | null
          plan_access?: string | null
          slug?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          ice_breakers?: Json | null
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          model?: string | null
          name?: string | null
          plan_access?: string | null
          slug?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_agent_api_key: { Args: { agent_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_agent_knowledge: {
        Args: {
          p_agent_id: string
          p_match_count?: number
          p_match_threshold?: number
          p_query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      script_status: "idea" | "scripting" | "recording" | "editing" | "posted"
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
      app_role: ["admin", "user"],
      script_status: ["idea", "scripting", "recording", "editing", "posted"],
    },
  },
} as const
