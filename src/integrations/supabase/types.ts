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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          billing_address: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          provider_id: string
          risk_score: number | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          provider_id: string
          risk_score?: number | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          provider_id?: string
          risk_score?: number | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      asset_events: {
        Row: {
          actor_id: string | null
          asset_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          p_id: string
        }
        Insert: {
          actor_id?: string | null
          asset_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          p_id: string
        }
        Update: {
          actor_id?: string | null
          asset_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          p_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_p_id_fkey"
            columns: ["p_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_tag: string
          condition_note: string | null
          condition_score: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          location: string | null
          provider_id: string
          purchase_date: string | null
          purchase_price_cents: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status_type"] | null
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          asset_tag: string
          condition_note?: string | null
          condition_score?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          location?: string | null
          provider_id: string
          purchase_date?: string | null
          purchase_price_cents?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status_type"] | null
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          asset_tag?: string
          condition_note?: string | null
          condition_score?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          location?: string | null
          provider_id?: string
          purchase_date?: string | null
          purchase_price_cents?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status_type"] | null
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          provider_id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          provider_id: string
          resource_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          provider_id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          data: Json | null
          id: string
          provider_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          data?: Json | null
          id?: string
          provider_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          data?: Json | null
          id?: string
          provider_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_id: string | null
          completed_rentals_count: number | null
          consents: Json | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_contact_person: boolean | null
          lifetime_value_cents: number | null
          notes: string | null
          phone: string | null
          preferences: Json | null
          provider_id: string
          risk_notes: string | null
          risk_status:
            | Database["public"]["Enums"]["customer_risk_status"]
            | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          completed_rentals_count?: number | null
          consents?: Json | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_contact_person?: boolean | null
          lifetime_value_cents?: number | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          provider_id: string
          risk_notes?: string | null
          risk_status?:
            | Database["public"]["Enums"]["customer_risk_status"]
            | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          completed_rentals_count?: number | null
          consents?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_contact_person?: boolean | null
          lifetime_value_cents?: number | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          provider_id?: string
          risk_notes?: string | null
          risk_status?:
            | Database["public"]["Enums"]["customer_risk_status"]
            | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_gear: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_new: boolean | null
          name: string | null
          price: number | null
          provider: string | null
          rating: number | null
          reviews: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_new?: boolean | null
          name?: string | null
          price?: number | null
          provider?: string | null
          rating?: number | null
          reviews?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_new?: boolean | null
          name?: string | null
          price?: number | null
          provider?: string | null
          rating?: number | null
          reviews?: number | null
        }
        Relationships: []
      }
      gear_availability_blocks: {
        Row: {
          created_at: string
          end_date: string
          gear_id: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          gear_id: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          gear_id?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_availability_blocks_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_item_performance"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "gear_availability_blocks_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_images: {
        Row: {
          created_at: string
          gear_id: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          gear_id: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          gear_id?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_images_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_item_performance"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "gear_images_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_items: {
        Row: {
          active: boolean
          category: string | null
          condition: string | null
          created_at: string
          description: string | null
          geom: unknown
          id: string
          image_url: string | null
          item_state: string | null
          last_rented_at: string | null
          last_serviced: string | null
          location: string | null
          name: string | null
          notes: string | null
          price_per_day: number | null
          provider_id: string | null
          quantity_available: number | null
          quantity_total: number
          rating: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          geom?: unknown
          id?: string
          image_url?: string | null
          item_state?: string | null
          last_rented_at?: string | null
          last_serviced?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          price_per_day?: number | null
          provider_id?: string | null
          quantity_available?: number | null
          quantity_total?: number
          rating?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          geom?: unknown
          id?: string
          image_url?: string | null
          item_state?: string | null
          last_rented_at?: string | null
          last_serviced?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          price_per_day?: number | null
          provider_id?: string | null
          quantity_available?: number | null
          quantity_total?: number
          rating?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_log: {
        Row: {
          asset_id: string
          completed_at: string | null
          cost_cents: number | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"] | null
          provider_id: string
          started_at: string | null
          status: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
        }
        Insert: {
          asset_id: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          provider_id: string
          started_at?: string | null
          status?: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
        }
        Update: {
          asset_id?: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          provider_id?: string
          started_at?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          content_preview: string | null
          error_message: string | null
          id: string
          meta_data: Json | null
          provider_id: string | null
          recipient_email: string | null
          reservation_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          content_preview?: string | null
          error_message?: string | null
          id?: string
          meta_data?: Json | null
          provider_id?: string | null
          recipient_email?: string | null
          reservation_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          content_preview?: string | null
          error_message?: string | null
          id?: string
          meta_data?: Json | null
          provider_id?: string | null
          recipient_email?: string | null
          reservation_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_activity_feed"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "notification_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_id: string
          provider_payment_id: string | null
          raw: Json | null
          reservation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          provider: string
          provider_id: string
          provider_payment_id?: string | null
          raw?: Json | null
          reservation_id: string
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_id?: string
          provider_payment_id?: string | null
          raw?: Json | null
          reservation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_activity_feed"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          buffer_minutes: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_override_cents: number | null
          product_id: string
          sku: string | null
        }
        Insert: {
          attributes?: Json | null
          buffer_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_override_cents?: number | null
          product_id: string
          sku?: string | null
        }
        Update: {
          attributes?: Json | null
          buffer_minutes?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_override_cents?: number | null
          product_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price_cents: number | null
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          base_price_cents?: number | null
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          base_price_cents?: number | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          is_admin: boolean | null
          is_verified: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          is_admin?: boolean | null
          is_verified?: boolean | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          is_admin?: boolean | null
          is_verified?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      provider_members: {
        Row: {
          created_at: string | null
          id: string
          provider_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_id: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          approved_at: string | null
          availability_notes: string | null
          business_hours: Json | null
          category: string | null
          company_id: string | null
          contact_name: string
          contact_person: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          current_season: string | null
          deleted_at: string | null
          email: string
          id: string
          location: string | null
          logo_url: string | null
          name: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string
          rental_name: string
          seasonal_mode: boolean | null
          status: string | null
          tax_id: string | null
          terms_text: string | null
          time_zone: string
          updated_at: string
          user_id: string | null
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          availability_notes?: string | null
          business_hours?: Json | null
          category?: string | null
          company_id?: string | null
          contact_name: string
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_season?: string | null
          deleted_at?: string | null
          email: string
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone: string
          rental_name: string
          seasonal_mode?: boolean | null
          status?: string | null
          tax_id?: string | null
          terms_text?: string | null
          time_zone?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          availability_notes?: string | null
          business_hours?: Json | null
          category?: string | null
          company_id?: string | null
          contact_name?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_season?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string
          rental_name?: string
          seasonal_mode?: boolean | null
          status?: string | null
          tax_id?: string | null
          terms_text?: string | null
          time_zone?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      reservation_assignments: {
        Row: {
          asset_id: string
          assigned_at: string | null
          checked_in_by: string | null
          checked_out_by: string | null
          condition_in_score: number | null
          condition_note: string | null
          condition_out_score: number | null
          created_at: string | null
          id: string
          reservation_id: string
          returned_at: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          assigned_at?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          condition_in_score?: number | null
          condition_note?: string | null
          condition_out_score?: number | null
          created_at?: string | null
          id?: string
          reservation_id: string
          returned_at?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          assigned_at?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          condition_in_score?: number | null
          condition_note?: string | null
          condition_out_score?: number | null
          created_at?: string | null
          id?: string
          reservation_id?: string
          returned_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_assignments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_activity_feed"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "reservation_assignments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_lines: {
        Row: {
          created_at: string | null
          id: string
          price_per_item_cents: number | null
          product_variant_id: string
          quantity: number
          reservation_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_per_item_cents?: number | null
          product_variant_id: string
          quantity?: number
          reservation_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_per_item_cents?: number | null
          product_variant_id?: string
          quantity?: number
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_lines_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_lines_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_activity_feed"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "reservation_lines_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          actual_pickup_time: string | null
          actual_return_time: string | null
          amount_total_cents: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          crm_customer_id: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          documents_status: Json | null
          end_date: string
          expires_at: string | null
          gear_id: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string
          payment_status: string
          pickup_time: string | null
          pricing_snapshot: Json | null
          product_variant_id: string | null
          provider_id: string
          quantity: number | null
          return_time: string | null
          start_date: string
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_pickup_time?: string | null
          actual_return_time?: string | null
          amount_total_cents?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          crm_customer_id?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          documents_status?: Json | null
          end_date: string
          expires_at?: string | null
          gear_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string
          payment_status?: string
          pickup_time?: string | null
          pricing_snapshot?: Json | null
          product_variant_id?: string | null
          provider_id: string
          quantity?: number | null
          return_time?: string | null
          start_date: string
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_pickup_time?: string | null
          actual_return_time?: string | null
          amount_total_cents?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          crm_customer_id?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          documents_status?: Json | null
          end_date?: string
          expires_at?: string | null
          gear_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string
          payment_status?: string
          pickup_time?: string | null
          pricing_snapshot?: Json | null
          product_variant_id?: string | null
          provider_id?: string
          quantity?: number | null
          return_time?: string | null
          start_date?: string
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_crm_customer_id_fkey"
            columns: ["crm_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reservations_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "analytics_provider_item_performance"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "reservations_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_details: string | null
          id: string
          params: Json | null
          rpc_name: string
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_details?: string | null
          id?: string
          params?: Json | null
          rpc_name: string
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_details?: string | null
          id?: string
          params?: Json | null
          rpc_name?: string
          success?: boolean | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_provider_memberships: {
        Row: {
          created_at: string
          provider_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_provider_memberships_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_provider_activity_feed: {
        Row: {
          created_at: string | null
          customer_name: string | null
          end_date: string | null
          gear_name: string | null
          provider_id: string | null
          reservation_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_provider_category_revenue: {
        Row: {
          category: string | null
          provider_id: string | null
          reservation_count: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      analytics_provider_daily_utilisation: {
        Row: {
          active_units: number | null
          provider_id: string | null
          total_units: number | null
          usage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_provider_item_performance: {
        Row: {
          category: string | null
          gear_id: string | null
          gear_name: string | null
          last_rented_at: string | null
          provider_id: string | null
          quantity_available: number | null
          reservation_count: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      approve_provider: { Args: { target_user_id: string }; Returns: undefined }
      check_is_admin: { Args: never; Returns: boolean }
      check_variant_availability: {
        Args: { p_end_date: string; p_start_date: string; p_variant_id: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_stale_holds: {
        Args: { retention_minutes?: number }
        Returns: Json
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_customer_360: { Args: { p_customer_id: string }; Returns: Json }
      get_my_role: { Args: { limit_provider_id: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_available:
        | {
            Args: { end_time: string; gear_id: string; start_time: string }
            Returns: boolean
          }
        | {
            Args: {
              p_end: string
              p_gear: string
              p_qty: number
              p_start: string
            }
            Returns: boolean
          }
      is_provider_member: { Args: { pid: string }; Returns: boolean }
      issue_reservation: {
        Args: {
          p_override?: boolean
          p_provider_id: string
          p_reservation_id: string
          p_user_id: string
        }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mock_send_notification: {
        Args: {
          p_reservation_id: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: string
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_daily_reminders: { Args: never; Returns: undefined }
      process_return: {
        Args: {
          p_has_damage?: boolean
          p_notes?: string
          p_reservation_id: string
        }
        Returns: Json
      }
      reserve_if_available: {
        Args: {
          p_customer_id: string
          p_end_date: string
          p_gear_id: string
          p_quantity: number
          p_start_date: string
        }
        Returns: {
          actual_pickup_time: string | null
          actual_return_time: string | null
          amount_total_cents: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          crm_customer_id: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          documents_status: Json | null
          end_date: string
          expires_at: string | null
          gear_id: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string
          payment_status: string
          pickup_time: string | null
          pricing_snapshot: Json | null
          product_variant_id: string | null
          provider_id: string
          quantity: number | null
          return_time: string | null
          start_date: string
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_crm_customer: {
        Args: {
          p_account_id?: string
          p_email?: string
          p_full_name: string
          p_notes?: string
          p_phone?: string
          p_tags?: string[]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "provider" | "customer"
      asset_status_type:
        | "available"
        | "reserved"
        | "active"
        | "maintenance"
        | "quarantine"
        | "retired"
        | "lost"
      customer_risk_status:
        | "safe"
        | "warning"
        | "blacklist"
        | "trusted"
        | "verified"
      maintenance_priority: "critical" | "high" | "normal" | "low" | "cosmetic"
      maintenance_type: "cleaning" | "repair" | "inspection" | "quality_hold"
      notification_status: "pending" | "sent" | "failed"
      notification_type:
        | "confirmation"
        | "pickup_reminder"
        | "return_reminder"
        | "review_request"
      payment_status_type:
        | "unpaid"
        | "authorized"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "failed"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: ["admin", "moderator", "provider", "customer"],
      asset_status_type: [
        "available",
        "reserved",
        "active",
        "maintenance",
        "quarantine",
        "retired",
        "lost",
      ],
      customer_risk_status: [
        "safe",
        "warning",
        "blacklist",
        "trusted",
        "verified",
      ],
      maintenance_priority: ["critical", "high", "normal", "low", "cosmetic"],
      maintenance_type: ["cleaning", "repair", "inspection", "quality_hold"],
      notification_status: ["pending", "sent", "failed"],
      notification_type: [
        "confirmation",
        "pickup_reminder",
        "return_reminder",
        "review_request",
      ],
      payment_status_type: [
        "unpaid",
        "authorized",
        "paid",
        "refunded",
        "partially_refunded",
        "failed",
      ],
    },
  },
} as const
