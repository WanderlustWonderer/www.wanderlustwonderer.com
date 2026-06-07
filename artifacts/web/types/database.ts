// Auto-generated from Supabase schema — run `supabase gen types typescript` to update

export type MembershipTier = 'the_gallery' | 'private_world' | 'all_access' | 'none'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type ContentType = 'yoga_video' | 'gallery' | 'blog' | 'all_access_post'
export type ProductType = 'digital_gift' | 'experience' | 'time_booking' | 'message_credit'
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed'
export type MessageDirection = 'inbound' | 'outbound'
export type DraftStatus = 'pending_review' | 'approved' | 'edited' | 'sent'
export type OrderStatus = 'pending' | 'paid' | 'refunded'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          membership_tier: MembershipTier
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: SubscriptionStatus | null
          is_founding_member: boolean
          member_since: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      content_items: {
        Row: {
          id: string
          title: string
          content_type: ContentType
          body: string | null
          media_url: string | null
          required_tier: MembershipTier
          published_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['content_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['content_items']['Row']>
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price_gbp: number
          stripe_price_id: string
          product_type: ProductType
          requires_booking: boolean
          booking_duration_mins: number | null
          active: boolean
          image_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }
      orders: {
        Row: {
          id: string
          buyer_id: string | null
          product_id: string
          stripe_payment_intent_id: string
          status: OrderStatus
          booking_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['orders']['Row']>
      }
      bookings: {
        Row: {
          id: string
          order_id: string
          buyer_id: string
          product_id: string
          slot_start: string
          slot_end: string
          calendar_event_id: string | null
          meeting_url: string | null
          status: BookingStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Row']>
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          direction: MessageDirection
          body: string
          ai_draft: string | null
          draft_status: DraftStatus | null
          sent_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Row']>
      }
    }
  }
}
