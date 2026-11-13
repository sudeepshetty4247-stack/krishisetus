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
          grade: string
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
          source_dataset: string | null
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
          grade?: string
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
          source_dataset?: string | null
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
          grade?: string
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
          source_dataset?: string | null
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
      agri_source_runs: {
        Row: {
          corrected: number
          duplicates: number
          errors: Json
          finished_at: string | null
          id: string
          message: string | null
          received: number
          rejected: number
          report_date: string | null
          requested: number
          source: string
          started_at: string
          status: string
          stored: number
        }
        Insert: {
          corrected?: number
          duplicates?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          received?: number
          rejected?: number
          report_date?: string | null
          requested?: number
          source: string
          started_at?: string
          status: string
          stored?: number
        }
        Update: {
          corrected?: number
          duplicates?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          received?: number
          rejected?: number
          report_date?: string | null
          requested?: number
          source?: string
          started_at?: string
          status?: string
          stored?: number
        }
        Relationships: []
      }
      agri_summary: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
      farmer_records: {
        Row: {
          id: string
          kind: string
          owner_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          id: string
          kind: string
          owner_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: string
          owner_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ingestion_leases: {
        Row: {
          expires_at: string
          lease_id: string
          source: string
        }
        Insert: {
          expires_at: string
          lease_id: string
          source: string
        }
        Update: {
          expires_at?: string
          lease_id?: string
          source?: string
        }
        Relationships: []
      }
      market_locations: {
        Row: {
          district: string
          formatted_address: string | null
          geocoded_at: string
          id: string
          latitude: number
          location_type: string | null
          longitude: number
          market: string
          match_quality: string
          place_id: string | null
          provider: string
          query: string
          state: string
        }
        Insert: {
          district: string
          formatted_address?: string | null
          geocoded_at?: string
          id?: string
          latitude: number
          location_type?: string | null
          longitude: number
          market: string
          match_quality: string
          place_id?: string | null
          provider: string
          query: string
          state: string
        }
        Update: {
          district?: string
          formatted_address?: string | null
          geocoded_at?: string
          id?: string
          latitude?: number
          location_type?: string | null
          longitude?: number
          market?: string
          match_quality?: string
          place_id?: string | null
          provider?: string
          query?: string
          state?: string
        }
        Relationships: []
      }
      ml_runs: {
        Row: {
          artifact_path: string | null
          commodity: string
          created_at: string
          dataset_version: string
          district: string
          frequency: string
          grade: string
          id: string
          market: string
          observations: number
          period_end: string
          period_start: string
          report: Json
          run_version: string
          source_name: string
          state: string
          status: string
          variety: string
        }
        Insert: {
          artifact_path?: string | null
          commodity: string
          created_at?: string
          dataset_version: string
          district: string
          frequency: string
          grade?: string
          id?: string
          market: string
          observations: number
          period_end: string
          period_start: string
          report: Json
          run_version: string
          source_name: string
          state: string
          status: string
          variety: string
        }
        Update: {
          artifact_path?: string | null
          commodity?: string
          created_at?: string
          dataset_version?: string
          district?: string
          frequency?: string
          grade?: string
          id?: string
          market?: string
          observations?: number
          period_end?: string
          period_start?: string
          report?: Json
          run_version?: string
          source_name?: string
          state?: string
          status?: string
          variety?: string
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
      acquire_ingestion_lease: {
        Args: { p_lease_id: string; p_source: string }
        Returns: boolean
      }
      agmarknet2_targets: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          commodity: string
          district: string
          market: string
          state: string
          total: number
        }[]
      }
      agri_catalog: { Args: { f?: Json }; Returns: Json }
      agri_coverage: { Args: { f?: Json }; Returns: Json }
      agri_ticker: { Args: { p_limit?: number }; Returns: Json }
      evaluate_farmer_alerts: { Args: never; Returns: number }
      prune_official_reports: {
        Args: { p_keep_days: number; p_source: string }
        Returns: number
      }
      publish_agmarknet_batch: {
        Args: {
          expected_offset: number
          finished: boolean
          next_offset: number
          records: Json
        }
        Returns: number
      }
      publish_official_reports: {
        Args: {
          p_dataset: string
          p_source: string
          p_url: string
          records: Json
        }
        Returns: number
      }
      refresh_agri_summary: { Args: never; Returns: undefined }
      release_ingestion_lease: {
        Args: { p_lease_id: string; p_source: string }
        Returns: undefined
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
