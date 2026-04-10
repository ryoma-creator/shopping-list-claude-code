-- Migration: Add user_id columns and Row Level Security
-- Date: 2026-04-10

ALTER TABLE sl_master_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sl_shopping_lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sl_master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_master_items" ON sl_master_items;
CREATE POLICY "own_master_items" ON sl_master_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_lists" ON sl_shopping_lists;
CREATE POLICY "own_lists" ON sl_shopping_lists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_list_items" ON sl_list_items;
CREATE POLICY "own_list_items" ON sl_list_items
  FOR ALL USING (list_id IN (SELECT id FROM sl_shopping_lists WHERE user_id = auth.uid()));
