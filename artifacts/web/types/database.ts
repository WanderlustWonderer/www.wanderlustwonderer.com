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
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          path: string | null
          profile_id: string | null
          props: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          path?: string | null
          profile_id?: string | null
          props?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          path?: string | null
          profile_id?: string | null
          props?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          booking_id: string | null
          created_at: string
          creator_id: string
          duration_min: number
          id: string
          product_id: string
          starts_at: string
          status: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          creator_id: string
          duration_min?: number
          id?: string
          product_id: string
          starts_at: string
          status?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          creator_id?: string
          duration_min?: number
          id?: string
          product_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          meeting_url: string | null
          order_id: string | null
          product_id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_url?: string | null
          order_id?: string | null
          product_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_url?: string | null
          order_id?: string | null
          product_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          caption: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          locked: boolean
          media_kind: string | null
          media_path: string | null
          price_pence: number | null
          profile_id: string
          queue_item_id: string | null
          read_at: string | null
          role: string
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          caption?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          locked?: boolean
          media_kind?: string | null
          media_path?: string | null
          price_pence?: number | null
          profile_id: string
          queue_item_id?: string | null
          read_at?: string | null
          role: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          caption?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          locked?: boolean
          media_kind?: string | null
          media_path?: string | null
          price_pence?: number | null
          profile_id?: string
          queue_item_id?: string | null
          read_at?: string | null
          role?: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: []
      }
      companion_knowledge_base: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      companion_profiles: {
        Row: {
          age_confirmed_at: string | null
          created_at: string
          creator_id: string
          display_name: string | null
          id: string
          memory_summary: string
          stripe_customer_id: string | null
          tier: string
        }
        Insert: {
          age_confirmed_at?: string | null
          created_at?: string
          creator_id: string
          display_name?: string | null
          id: string
          memory_summary?: string
          stripe_customer_id?: string | null
          tier?: string
        }
        Update: {
          age_confirmed_at?: string | null
          created_at?: string
          creator_id?: string
          display_name?: string | null
          id?: string
          memory_summary?: string
          stripe_customer_id?: string | null
          tier?: string
        }
        Relationships: []
      }
      companion_stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      companion_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: string
          stripe_subscription_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          profile_id: string
          status: string
          stripe_subscription_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          profile_id?: string
          status?: string
          stripe_subscription_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_entitlements: {
        Row: {
          created_at: string
          id: string
          period_key: number | null
          profile_id: string
          scope: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          period_key?: number | null
          profile_id: string
          scope: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          period_key?: number | null
          profile_id?: string
          scope?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          body: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          id: string
          min_tier: Database["public"]["Enums"]["membership_tier"]
          published_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          min_tier?: Database["public"]["Enums"]["membership_tier"]
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          min_tier?: Database["public"]["Enums"]["membership_tier"]
          published_at?: string | null
          title?: string
        }
        Relationships: []
      }
      content_media: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          media_kind: string
          position: number
          storage_path: string
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          media_kind: string
          position?: number
          storage_path: string
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          media_kind?: string
          position?: number
          storage_path?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          created_at: string
          display_name: string
          id: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          slug: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          pot: string
          profile_id: string
          reason: string
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          pot?: string
          profile_id: string
          reason: string
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          pot?: string
          profile_id?: string
          reason?: string
          stripe_event_id?: string | null
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          confirmed_at: string | null
          created_at: string
          expires_at: string
          gbp_pence: number
          id: string
          profile_id: string | null
          recipient: string
          reference: string
          sol_amount: number
          status: string
          tier: string
          tx_signature: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          expires_at: string
          gbp_pence: number
          id?: string
          profile_id?: string | null
          recipient: string
          reference: string
          sol_amount: number
          status?: string
          tier: string
          tx_signature?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          gbp_pence?: number
          id?: string
          profile_id?: string | null
          recipient?: string
          reference?: string
          sol_amount?: number
          status?: string
          tier?: string
          tx_signature?: string | null
        }
        Relationships: []
      }
      email_leads: {
        Row: {
          created_at: string
          creator_id: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      game_plays: {
        Row: {
          credits_won: number
          played_on: string
          plays: number
          profile_id: string
        }
        Insert: {
          credits_won?: number
          played_on?: string
          plays?: number
          profile_id: string
        }
        Update: {
          credits_won?: number
          played_on?: string
          plays?: number
          profile_id?: string
        }
        Relationships: []
      }
      media_queue: {
        Row: {
          active: boolean
          caption: string | null
          created_at: string
          id: string
          kind: string
          media_path: string
          position: number
          price_pence: number
        }
        Insert: {
          active?: boolean
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          media_path: string
          position?: number
          price_pence: number
        }
        Update: {
          active?: boolean
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_path?: string
          position?: number
          price_pence?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          ai_draft: string | null
          content: string
          created_at: string
          draft_status: Database["public"]["Enums"]["draft_status"]
          id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          ai_draft?: string | null
          content: string
          created_at?: string
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          ai_draft?: string | null
          content?: string
          created_at?: string
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          founder: boolean
          id: string
          membership_tier: Database["public"]["Enums"]["membership_tier"] | null
          referral_code: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          founder?: boolean
          id: string
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          founder?: boolean
          id?: string
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_dms: {
        Row: {
          content: string
          created_at: string
          id: string
          profile_id: string
          send_at: string
          skip_if_member: boolean
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          profile_id: string
          send_at: string
          skip_if_member?: boolean
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
          send_at?: string
          skip_if_member?: boolean
          status?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount_pence: number
          created_at: string
          id: string
          profile_id: string
          stripe_payment_intent: string | null
        }
        Insert: {
          amount_pence: number
          created_at?: string
          id?: string
          profile_id: string
          stripe_payment_intent?: string | null
        }
        Update: {
          amount_pence?: number
          created_at?: string
          id?: string
          profile_id?: string
          stripe_payment_intent?: string | null
        }
        Relationships: []
      }
      vault_weeks: {
        Row: {
          title: string | null
          updated_at: string
          week_key: number
        }
        Insert: {
          title?: string | null
          updated_at?: string
          week_key: number
        }
        Update: {
          title?: string | null
          updated_at?: string
          week_key?: number
        }
        Relationships: []
      }
      winback_targets: {
        Row: {
          bounced: boolean
          clicked_at: string | null
          delivered_at: string | null
          email: string
          last_contacted_at: string | null
          last_touch_sent_at: string | null
          name: string | null
          notes: string | null
          opened_at: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          bounced?: boolean
          clicked_at?: string | null
          delivered_at?: string | null
          email: string
          last_contacted_at?: string | null
          last_touch_sent_at?: string | null
          name?: string | null
          notes?: string | null
          opened_at?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          bounced?: boolean
          clicked_at?: string | null
          delivered_at?: string | null
          email?: string
          last_contacted_at?: string | null
          last_touch_sent_at?: string | null
          name?: string | null
          notes?: string | null
          opened_at?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_account_overview: {
        Row: {
          created_at: string | null
          credit_balance: number | null
          email: string | null
          id: string | null
          membership_tier: Database["public"]["Enums"]["membership_tier"] | null
          messages_sent: number | null
          subscription_end_date: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          topup_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      companion_credit_balance: { Args: { p: string }; Returns: number }
      current_user_tier: {
        Args: never
        Returns: Database["public"]["Enums"]["membership_tier"]
      }
      expire_crypto_members: { Args: never; Returns: number }
      send_due_dms: { Args: never; Returns: number }
      spend_credit: { Args: { p_profile_id: string }; Returns: string }
    }
    Enums: {
      booking_status: "unscheduled" | "scheduled" | "completed" | "cancelled"
      content_type: "video" | "gallery" | "post"
      draft_status: "pending" | "approved" | "sent"
      membership_tier: "the_gallery" | "private_world" | "all_access"
      order_status: "pending" | "paid" | "failed" | "refunded"
      product_type: "digital" | "booking"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused"
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
      booking_status: ["unscheduled", "scheduled", "completed", "cancelled"],
      content_type: ["video", "gallery", "post"],
      draft_status: ["pending", "approved", "sent"],
      membership_tier: ["the_gallery", "private_world", "all_access"],
      order_status: ["pending", "paid", "failed", "refunded"],
      product_type: ["digital", "booking"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ],
    },
  },
} as const
