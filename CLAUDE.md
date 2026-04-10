# Project Rules

## Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- Supabase (認証・データベース)

## Code Rules

- any 禁止
- コンポーネントは小さく分割する
- 1ファイル100行以内を目指す
- 日本語でコメントを書く

## Design Rules

- モバイルファースト
- レスポンシブ必須（sm, md, lg対応）
- shadcn/ui のコンポーネントを優先して使う
- 色はTailwindのデフォルトカラーを使用

## Git Rules

- 1つの機能が完成したらコミットする
- コミットメッセージは日本語で書く
- 例：「ログイン機能を追加」「TODOの削除機能を実装」

## Workflow

- 実装前に必ず計画を作成する
- 計画が承認されてから実装を開始する
- 実装後はビルドが通ることを確認する

## Database Rules

- DBのスキーマ変更（カラム追加・RLS設定など）は必ずマイグレーションファイルで管理する
- ファイルの場所: `supabase/migrations/YYYYMMDD_NNN_説明.sql`
- SQLをSupabase SQL Editorに貼り付けるのは禁止。必ずマイグレーションファイルを作成する
- マイグレーションファイルを作成したらユーザーに以下を実行してもらう：

```
npm run migrate
```

- マイグレーションは冪等に書く（何度実行しても安全なように `IF NOT EXISTS` / `DROP IF EXISTS` を使う）

## File Structure

src/
├── app/           # ページ
├── components/    # UIコンポーネント
├── hooks/         # カスタムフック
├── lib/           # ユーティリティ
└── types/         # 型定義