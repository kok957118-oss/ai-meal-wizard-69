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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      dish_searches: {
        Row: {
          count: number
          name: string
          updated_at: string
        }
        Insert: {
          count?: number
          name: string
          updated_at?: string
        }
        Update: {
          count?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_items: {
        Row: {
          category: string | null
          checked: boolean
          created_at: string
          id: string
          name: string
          quantity: string | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          checked?: boolean
          created_at?: string
          id?: string
          name: string
          quantity?: string | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          checked?: boolean
          created_at?: string
          id?: string
          name?: string
          quantity?: string | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          tag: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          tag: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          tag?: string
          usage_count?: number
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          meal_type: string
          plan_date: string
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          meal_type: string
          plan_date: string
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          meal_type?: string
          plan_date?: string
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          logged_at: string
          meal_type: string | null
          name: string
          protein_g: number | null
          recipe_id: string | null
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          name: string
          protein_g?: number | null
          recipe_id?: string | null
          servings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          name?: string
          protein_g?: number | null
          recipe_id?: string | null
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          name: string
          quantity: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          name: string
          quantity?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string
          quantity?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number | null
          created_at: string
          currency: string | null
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          occurred_at: string
          raw: Json | null
          rc_event_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_usd?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          occurred_at?: string
          raw?: Json | null
          rc_event_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          occurred_at?: string
          raw?: Json | null
          rc_event_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          like_count: number
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          category: string | null
          comment_count: number
          created_at: string
          cuisine: string | null
          id: string
          ingredients: Json
          instructions: Json
          is_hidden: boolean
          like_count: number
          media_type: Database["public"]["Enums"]["media_type"] | null
          media_url: string | null
          post_type: Database["public"]["Enums"]["post_type"]
          recipe_id: string | null
          save_count: number
          share_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          comment_count?: number
          created_at?: string
          cuisine?: string | null
          id?: string
          ingredients?: Json
          instructions?: Json
          is_hidden?: boolean
          like_count?: number
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          recipe_id?: string | null
          save_count?: number
          share_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          comment_count?: number
          created_at?: string
          cuisine?: string | null
          id?: string
          ingredients?: Json
          instructions?: Json
          is_hidden?: boolean
          like_count?: number
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          recipe_id?: string | null
          save_count?: number
          share_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_features: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
          min_tier: Database["public"]["Enums"]["subscription_tier"]
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          dietary_preferences: string[] | null
          display_name: string | null
          follower_count: number
          following_count: number
          id: string
          locale: string
          post_count: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          dietary_preferences?: string[] | null
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id: string
          locale?: string
          post_count?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          dietary_preferences?: string[] | null
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id?: string
          locale?: string
          post_count?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          id: string
          max_redemptions: number | null
          notes: string | null
          redemption_count: number
          reward_kind: Database["public"]["Enums"]["promo_reward_kind"]
          reward_value: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          notes?: string | null
          redemption_count?: number
          reward_kind: Database["public"]["Enums"]["promo_reward_kind"]
          reward_value?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          notes?: string | null
          redemption_count?: number
          reward_kind?: Database["public"]["Enums"]["promo_reward_kind"]
          reward_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code_id: string
          granted_days: number
          granted_lifetime: boolean
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          granted_days?: number
          granted_lifetime?: boolean
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          granted_days?: number
          granted_lifetime?: boolean
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string | null
          cooking_time_minutes: number | null
          country: string | null
          created_at: string
          created_by: string | null
          cuisine: string | null
          description: string | null
          diet_tags: string[] | null
          difficulty: string | null
          fat_g: number | null
          fun_fact: string | null
          id: string
          image_url: string | null
          ingredients: Json
          is_featured: boolean | null
          meal_type: string | null
          name: string
          protein_g: number | null
          servings: number | null
          slug: string
          steps: Json
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cooking_time_minutes?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          cuisine?: string | null
          description?: string | null
          diet_tags?: string[] | null
          difficulty?: string | null
          fat_g?: number | null
          fun_fact?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_featured?: boolean | null
          meal_type?: string | null
          name: string
          protein_g?: number | null
          servings?: number | null
          slug: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cooking_time_minutes?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          cuisine?: string | null
          description?: string | null
          diet_tags?: string[] | null
          difficulty?: string | null
          fat_g?: number | null
          fun_fact?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_featured?: boolean | null
          meal_type?: string | null
          name?: string
          protein_g?: number | null
          servings?: number | null
          slug?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_days: number
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_days?: number
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_days?: number
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          rc_event_id: string | null
          source: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          rc_event_id?: string | null
          source: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          rc_event_id?: string | null
          source?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          environment: string | null
          id: string
          is_manual: boolean
          period_end: string | null
          period_start: string | null
          product_id: string | null
          rc_app_user_id: string | null
          rc_original_transaction_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          store: Database["public"]["Enums"]["subscription_store"] | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          is_manual?: boolean
          period_end?: string | null
          period_start?: string | null
          product_id?: string | null
          rc_app_user_id?: string | null
          rc_original_transaction_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          store?: Database["public"]["Enums"]["subscription_store"] | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          is_manual?: boolean
          period_end?: string | null
          period_start?: string | null
          product_id?: string | null
          rc_app_user_id?: string | null
          rc_original_transaction_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          store?: Database["public"]["Enums"]["subscription_store"] | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          created_at: string
          error: string | null
          id: number
          kind: string
          latency_ms: number | null
          metadata: Json
          name: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: number
          kind: string
          latency_ms?: number | null
          metadata?: Json
          name: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: number
          kind?: string
          latency_ms?: number | null
          metadata?: Json
          name?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          count: number
          feature_key: string
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          feature_key: string
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          feature_key?: string
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      check_rate_limit: {
        Args: { _bucket: string; _identifier: string; _max_per_minute: number }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Returns: boolean
      }
      increment_dish_search: { Args: { _name: string }; Returns: number }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      media_type: "image" | "video"
      payment_kind: "initial" | "renewal" | "trial_conversion" | "refund"
      post_type: "recipe_share" | "photo" | "video" | "tip"
      promo_reward_kind:
        | "percent_discount"
        | "free_days"
        | "free_month"
        | "free_year"
        | "lifetime"
      referral_status: "pending" | "rewarded" | "void"
      subscription_status:
        | "trialing"
        | "active"
        | "in_grace"
        | "paused"
        | "expired"
        | "cancelled"
      subscription_store:
        | "app_store"
        | "play_store"
        | "stripe"
        | "promo"
        | "admin"
      subscription_tier: "free" | "monthly" | "annual" | "lifetime" | "promo"
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
      media_type: ["image", "video"],
      payment_kind: ["initial", "renewal", "trial_conversion", "refund"],
      post_type: ["recipe_share", "photo", "video", "tip"],
      promo_reward_kind: [
        "percent_discount",
        "free_days",
        "free_month",
        "free_year",
        "lifetime",
      ],
      referral_status: ["pending", "rewarded", "void"],
      subscription_status: [
        "trialing",
        "active",
        "in_grace",
        "paused",
        "expired",
        "cancelled",
      ],
      subscription_store: [
        "app_store",
        "play_store",
        "stripe",
        "promo",
        "admin",
      ],
      subscription_tier: ["free", "monthly", "annual", "lifetime", "promo"],
    },
  },
} as const
