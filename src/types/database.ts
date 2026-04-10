// データベースの型定義（Supabase生成型と同形式）

export type Category =
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'fruits'
  | 'vegetables'
  | 'frozen'
  | 'bakery'
  | 'drinks'
  | 'snacks'
  | 'other'

// アプリで使うエンティティ型（Rowの型エイリアス）
export type MasterItem = Database['public']['Tables']['sl_master_items']['Row']
export type ShoppingList = Database['public']['Tables']['sl_shopping_lists']['Row']
export type ListItem = Database['public']['Tables']['sl_list_items']['Row']

// Supabase v2 対応のデータベース型（インライン形式）
export type Database = {
  public: {
    Tables: {
      sl_master_items: {
        Row: {
          id: string
          user_id: string
          name: string
          category: Category
          default_price: number
          default_qty: number
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: Category
          default_price?: number
          default_qty?: number
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: Category
          default_price?: number
          default_qty?: number
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sl_shopping_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          is_template: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sl_list_items: {
        Row: {
          id: string
          list_id: string
          master_item_id: string | null
          name: string
          price: number
          qty: number
          is_checked: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          master_item_id?: string | null
          name: string
          price?: number
          qty?: number
          is_checked?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          master_item_id?: string | null
          name?: string
          price?: number
          qty?: number
          is_checked?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
