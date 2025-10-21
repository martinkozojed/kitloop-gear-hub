export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      gear_items: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          location: string | null;
          name: string | null;
          price_per_day: number | null;
          provider_id: string | null;
          rating: number | null;
          // NEW INVENTORY FIELDS
          quantity_total: number | null;
          quantity_available: number | null;
          item_state: string | null;
          active: boolean | null;
          sku: string | null;
          condition: string | null;
          notes: string | null;
          last_serviced: string | null;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          name?: string | null;
          price_per_day?: number | null;
          provider_id?: string | null;
          rating?: number | null;
          // NEW INVENTORY FIELDS
          quantity_total?: number | null;
          quantity_available?: number | null;
          item_state?: string | null;
          active?: boolean | null;
          sku?: string | null;
          condition?: string | null;
          notes?: string | null;
          last_serviced?: string | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          name?: string | null;
          price_per_day?: number | null;
          provider_id?: string | null;
          rating?: number | null;
          // NEW INVENTORY FIELDS
          quantity_total?: number | null;
          quantity_available?: number | null;
          item_state?: string | null;
          active?: boolean | null;
          sku?: string | null;
          condition?: string | null;
          notes?: string | null;
          last_serviced?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      gear_images: {
        Row: {
          id: string;
          gear_id: string;
          url: string;
          sort_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gear_id: string;
          url: string;
          sort_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gear_id?: string;
          url?: string;
          sort_order?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gear_images_gear_id_fkey";
            columns: ["gear_id"];
            isOneToOne: false;
            referencedRelation: "gear_items";
            referencedColumns: ["id"];
          }
        ];
      };

      providers: {
        Row: {
          availability_notes: string | null;
          category: string | null;
          company_id: string | null;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          latitude: number | null;
          location: string | null;
          logo_url: string | null;
          longitude: number | null;
          name: string | null;
          phone: string | null;
          rental_name: string | null;
          status: string | null;
          website: string | null;
        };
        Insert: {
          availability_notes?: string | null;
          category?: string | null;
          company_id?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          location?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          rental_name?: string | null;
          status?: string | null;
          website?: string | null;
        };
        Update: {
          availability_notes?: string | null;
          category?: string | null;
          company_id?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          location?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          rental_name?: string | null;
          status?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };

      user_provider_memberships: {
        Row: {
          user_id: string;
          provider_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          provider_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          provider_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_provider_memberships_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_provider_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      reservation: {
        Row: {
          id: string;
          created_at: string | null;
          updated_at: string | null;
          provider_id: string;
          gear_id: string;
          user_id: string | null;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          start_date: string | null;
          end_date: string | null;
          pickup_time: string | null;
          return_time: string | null;
          actual_pickup_time: string | null;
          actual_return_time: string | null;
          status: 'hold' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | null;
          notes: string | null;
          total_price: number | null;
          deposit_paid: boolean | null;
          deposit_amount: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          provider_id: string;
          gear_id: string;
          user_id?: string | null;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          pickup_time?: string | null;
          return_time?: string | null;
          actual_pickup_time?: string | null;
          actual_return_time?: string | null;
          status?: 'hold' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | null;
          notes?: string | null;
          total_price?: number | null;
          deposit_paid?: boolean | null;
          deposit_amount?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          provider_id?: string;
          gear_id?: string;
          user_id?: string | null;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          pickup_time?: string | null;
          return_time?: string | null;
          actual_pickup_time?: string | null;
          actual_return_time?: string | null;
          status?: 'hold' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | null;
          notes?: string | null;
          total_price?: number | null;
          deposit_paid?: boolean | null;
          deposit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_gear_id_fkey";
            columns: ["gear_id"];
            isOneToOne: false;
            referencedRelation: "gear_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          }
        ];
      };

      featured_gear: {
        Row: {
          id: string;
          name: string;
          provider: string;
          price: number;
          rating: number;
          reviews: number;
          image_url: string;
          is_new: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          provider: string;
          price: number;
          rating: number;
          reviews: number;
          image_url: string;
          is_new?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          provider?: string;
          price?: number;
          rating?: number;
          reviews?: number;
          image_url?: string;
          is_new?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
