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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agri_imports: {
        Row: {
          accepted: number
          created_at: string
          duplicates: number
          errors: Json
          filename: string
          id: string
          owner_id: string
          raw_text: string
          rejected: number
          source_name: string
          source_url: string
        }
        Insert: {
          accepted?: number
          created_at?: string
          duplicates?: number
          errors?: Json
          filename: string
          id?: string
          owner_id: string
          raw_text: string
          rejected?: number
          source_name: string
          source_url: string
        }
        Update: {
          accepted?: number
          created_at?: string
          duplicates?: number
          errors?: Json
          filename?: string
          id?: string
          owner_id?: string
          raw_text?: string
          rejected?: number
          source_name?: string
          source_url?: string
        }
        Relationships: []
      }
      agri_jobs: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string | null
          owner_id: string
          parameters: Json
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          owner_id: string
          parameters?: Json
          result?: Json | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          owner_id?: string
          parameters?: Json
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      agri_reports: {
        Row: {
          arrival_unit: string | null
          arrivals: number | null
          commodity: string
          date: string
          district: string
          id: string
          import_id: string | null
          market: string
          max_price: number | null
          min_price: number | null
          modal_price: number
          official: boolean
          owner_id: string | null
          price_unit: string
          retrieved_at: string
          source_name: string
          source_url: string
          state: string
          suspicious: boolean
          variety: string
        }
        Insert: {
          arrival_unit?: string | null
          arrivals?: number | null
          commodity: string
          date: string
          district: string
          id?: string
          import_id?: string | null
          market: string
          max_price?: number | null
          min_price?: number | null
          modal_price: number
          official?: boolean
          owner_id?: string | null
          price_unit?: string
          retrieved_at?: string
          source_name: string
          source_url: string
          state: string
          suspicious?: boolean
          variety: string
        }
        Update: {
          arrival_unit?: string | null
          arrivals?: number | null
          commodity?: string
          date?: string
          district?: string
          id?: string
          import_id?: string | null
          market?: string
          max_price?: number | null
          min_price?: number | null
          modal_price?: number
          official?: boolean
          owner_id?: string | null
          price_unit?: string
          retrieved_at?: string
          source_name?: string
          source_url?: string
          state?: string
          suspicious?: boolean
          variety?: string
        }
        Relationships: [
          {
            foreignKeyName: "agri_reports_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "agri_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      agri_source_checks: {
        Row: {
          checked_at: string
          id: string
          message: string
          source: string
          status: string
        }
        Insert: {
          checked_at?: string
          id?: string
          message: string
          source: string
          status: string
        }
        Update: {
          checked_at?: string
          id?: string
          message?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      agri_sync_state: {
        Row: {
          last_success: string | null
          message: string | null
          next_offset: number
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          last_success?: string | null
          message?: string | null
          next_offset?: number
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          last_success?: string | null
          message?: string | null
          next_offset?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ceda_observations: {
        Row: {
          commodity: string
          commodity_id: number
          date: string
          district: string
          district_id: number
          id: string
          market: string
          market_id: number
          max_price: number | null
          min_price: number | null
          modal_price: number
          price_unit: string | null
          raw_response: Json
          retrieved_at: string
          state: string
          state_id: number
          variety: string | null
        }
        Insert: {
          commodity: string
          commodity_id: number
          date: string
          district: string
          district_id: number
          id?: string
          market: string
          market_id: number
          max_price?: number | null
          min_price?: number | null
          modal_price: number
          price_unit?: string | null
          raw_response: Json
          retrieved_at?: string
          state: string
          state_id: number
          variety?: string | null
        }
        Update: {
          commodity?: string
          commodity_id?: number
          date?: string
          district?: string
          district_id?: number
          id?: string
          market?: string
          market_id?: number
          max_price?: number | null
          min_price?: number | null
          modal_price?: number
          price_unit?: string | null
          raw_response?: Json
          retrieved_at?: string
          state?: string
          state_id?: number
          variety?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agri_catalog: { Args: { f?: Json }; Returns: Json }
      agri_coverage: { Args: { f?: Json }; Returns: Json }
      publish_agmarknet_batch: {
        Args: {
          expected_offset: number
          finished: boolean
          next_offset: number
          records: Json
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
