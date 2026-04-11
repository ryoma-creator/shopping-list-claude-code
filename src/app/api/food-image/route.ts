import { NextRequest, NextResponse } from 'next/server'

// 日本語名 → 英語名の簡易マッピング
const JA_TO_EN: Record<string, string> = {
  りんご: 'apple', リンゴ: 'apple', 林檎: 'apple',
  バナナ: 'banana', 苺: 'strawberry', イチゴ: 'strawberry',
  レモン: 'lemon', オレンジ: 'orange', ぶどう: 'grape', ブドウ: 'grape',
  スイカ: 'watermelon', メロン: 'melon', 桃: 'peach', モモ: 'peach',
  梨: 'pear', ナシ: 'pear', キウイ: 'kiwi', マンゴー: 'mango',
  にんじん: 'carrot', ニンジン: 'carrot', 人参: 'carrot',
  じゃがいも: 'potato', ジャガイモ: 'potato', 玉ねぎ: 'onion',
  タマネギ: 'onion', キャベツ: 'cabbage', ブロッコリー: 'broccoli',
  ほうれん草: 'spinach', トマト: 'tomato', きゅうり: 'cucumber',
  キュウリ: 'cucumber', なす: 'eggplant', ナス: 'eggplant',
  ピーマン: 'bell pepper', ごぼう: 'burdock', 大根: 'daikon radish',
  牛乳: 'milk', ミルク: 'milk', チーズ: 'cheese', ヨーグルト: 'yogurt',
  バター: 'butter', 卵: 'egg', たまご: 'egg',
  鶏肉: 'chicken', とりにく: 'chicken', 豚肉: 'pork', ぶたにく: 'pork',
  牛肉: 'beef', ぎゅうにく: 'beef', サーモン: 'salmon', 鮭: 'salmon',
  マグロ: 'tuna', まぐろ: 'tuna', 魚: 'fish', フィッシュ: 'fish',
  えび: 'shrimp', エビ: 'shrimp', 海老: 'shrimp',
  パン: 'bread', 食パン: 'bread', コーヒー: 'coffee',
  お茶: 'green tea', 緑茶: 'green tea', ジュース: 'juice',
  水: 'water', ビール: 'beer', ワイン: 'wine',
  米: 'rice', ご飯: 'rice', ごはん: 'rice', パスタ: 'pasta',
  醤油: 'soy sauce', 味噌: 'miso', 砂糖: 'sugar', 塩: 'salt',
}

function toEnglishQuery(name: string): string {
  const normalized = name.trim()
  // 日本語マッピングを試みる
  for (const [ja, en] of Object.entries(JA_TO_EN)) {
    if (normalized.includes(ja)) return en
  }
  return normalized
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')
  if (!query) return NextResponse.json({ url: null })

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return NextResponse.json({ url: null })

  const englishQuery = toEnglishQuery(query)

  try {
    const res = await fetch(
      `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(englishQuery)}&number=1&apiKey=${apiKey}`,
      { next: { revalidate: 86400 } } // 24時間キャッシュ
    )
    if (!res.ok) return NextResponse.json({ url: null })

    const data = await res.json() as { results?: { image?: string }[] }
    const image = data.results?.[0]?.image
    if (!image) return NextResponse.json({ url: null })

    return NextResponse.json({
      url: `https://spoonacular.com/cdn/ingredients_250x250/${image}`,
    })
  } catch {
    return NextResponse.json({ url: null })
  }
}
