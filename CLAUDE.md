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

## File Structure

src/
├── app/           # ページ
├── components/    # UIコンポーネント
├── hooks/         # カスタムフック
├── lib/           # ユーティリティ
└── types/         # 型定義