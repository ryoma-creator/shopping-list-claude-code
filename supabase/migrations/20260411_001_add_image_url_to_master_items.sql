-- sl_master_items に image_url カラムを追加する
ALTER TABLE sl_master_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;
