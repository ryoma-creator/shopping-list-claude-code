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

## Frontend Design Guidelines

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

### Design Process

Before implementing any UI, define:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What is the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

### Frontend Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the aesthetics. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Apply gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, and grain overlays.

### What to AVOID

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations. Minimalist designs need restraint, precision, and careful attention to spacing and typography.

Remember: Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

