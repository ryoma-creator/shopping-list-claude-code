import type { Category } from '@/types/database'

const CDN = 'https://res.cloudinary.com/dnm2fyhwt/image/upload'

// ユーザー提供の画像。キーワードが部分一致したら使用する
const STATIC_IMAGE_MAP: { keywords: string[]; url: string }[] = [
  {
    keywords: ['salmon', 'サーモン', '鮭', 'さけ', 'さーもん'],
    url: `${CDN}/v1775896646/raw-fresh-salmon-meat-fillet-wooden-cutting-board_twzy3v.jpg`,
  },
  {
    keywords: ['yogurt', 'yoghurt', 'ヨーグルト', 'よーぐると'],
    url: `${CDN}/v1775896646/organic-yogurt-bowl-with-oats-table_nzagzo.jpg`,
  },
  {
    keywords: ['banana', 'バナナ', 'ばなな'],
    url: `${CDN}/v1775896645/high-angle-shot-banana-isolated-white-surface_jviohg.jpg`,
  },
  {
    keywords: ['ひき肉', 'ひきにく', '挽肉', '合い挽き', '合いびき', 'ground meat', 'minced meat', 'mince'],
    url: `${CDN}/v1775896644/%E3%81%B2%E3%81%8D%E8%82%89_o4kdxq.jpg`,
  },
  {
    keywords: ['豚肉', 'ぶたにく', 'ぶた', 'pork', 'ポーク'],
    url: `${CDN}/v1775896644/%E8%B1%9A%E8%82%89_ru4edj.jpg`,
  },
  {
    keywords: ['牛肉', 'ぎゅうにく', 'ぎゅう', 'beef', 'ビーフ'],
    url: `${CDN}/v1775896644/%E7%89%9B%E8%82%89_n3sbtv.jpg`,
  },
  {
    keywords: ['大根', 'だいこん', 'daikon', 'radish'],
    url: `${CDN}/v1775896644/%E5%A4%A7%E6%A0%B9_tuu5p6.jpg`,
  },
  {
    keywords: ['にんじん', '人参', 'ニンジン', 'carrot'],
    url: `${CDN}/v1775896644/%E3%81%AB%E3%82%93%E3%81%98%E3%82%93_uhj0ix.jpg`,
  },
  {
    keywords: ['鶏肉', 'とりにく', 'とり', 'chicken', 'チキン'],
    url: `${CDN}/v1775896643/%E9%B6%8F%E8%82%89_r7nt5i.png`,
  },
  {
    keywords: ['じゃがいも', 'ジャガイモ', '馬鈴薯', 'potato', 'ポテト'],
    url: `${CDN}/v1775896643/%E3%82%B7%E3%82%99%E3%83%A3%E3%82%AB%E3%82%99%E3%82%A4%E3%83%A2_w9bblm.jpg`,
  },
  {
    keywords: ['モンスター', 'monster energy', 'monster'],
    url: `${CDN}/v1775896642/%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC_umn76k.jpg`,
  },
  {
    keywords: ['もやし', 'モヤシ', 'bean sprout'],
    url: `${CDN}/v1775896643/%E3%82%82%E3%82%84%E3%81%97_cb1ej1.jpg`,
  },
  {
    keywords: ['スイカ', 'すいか', '西瓜', 'watermelon'],
    url: `${CDN}/v1775896643/%E3%82%B9%E3%82%A4%E3%82%AB_fflx4u.jpg`,
  },
  {
    keywords: ['ポカリ', 'pocari', 'ポカリスウェット'],
    url: `${CDN}/v1775896642/%E3%83%9B%E3%82%9A%E3%82%AB%E3%83%AA%E3%82%B9%E3%82%A6%E3%82%A7%E3%83%83%E3%83%88_rswquw.jpg`,
  },
]

// カテゴリ別フォールバック検索ワード（Spoonacular使用時）
const CATEGORY_QUERY: Record<Category, string> = {
  fruits: 'fruit',
  vegetables: 'vegetable',
  dairy: 'dairy milk',
  fish: 'fish seafood',
  meat: 'meat',
  bakery: 'bread',
  drinks: 'beverage drink',
  frozen: 'frozen food',
  snacks: 'snack',
  other: 'food',
}

function findStaticImage(name: string): string | null {
  const n = name.toLowerCase().trim()
  for (const entry of STATIC_IMAGE_MAP) {
    if (entry.keywords.some(kw => n.includes(kw.toLowerCase()))) {
      return entry.url
    }
  }
  return null
}

export async function resolveDefaultFoodImage(name: string, category: Category): Promise<string | null> {
  // 静的マップで先に探す（即時・API不要）
  const staticUrl = findStaticImage(name)
  if (staticUrl) return staticUrl

  // Spoonacular APIにフォールバック
  const queries = [name.trim(), CATEGORY_QUERY[category]]
  for (const query of queries) {
    try {
      const res = await fetch(`/api/food-image?query=${encodeURIComponent(query)}`)
      if (!res.ok) continue
      const data = await res.json() as { url?: string | null }
      if (data.url) return data.url
    } catch {
      continue
    }
  }
  return null
}
