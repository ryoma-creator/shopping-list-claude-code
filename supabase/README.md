# Supabase Migrations

## マイグレーションの実行方法

`supabase/migrations/` 内のSQLファイルを **Supabase Dashboard → SQL Editor** で実行する。

ファイル名の順番通りに実行すること（番号順）。

## 実行済みマイグレーション

| ファイル | 内容 | 状態 |
|---|---|---|
| 20260410_001_add_user_id_and_rls.sql | user_idカラム追加 + RLS設定 | ⬜ 未実行 |

## 新しいマイグレーションを追加する場合

ファイル名の形式: `YYYYMMDD_NNN_説明.sql`

例: `20260415_002_add_notes_column.sql`
