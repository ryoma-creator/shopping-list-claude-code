import type { Category } from '@/types/database'
import { FOOD_IMAGE_OPTIONS } from '@/lib/foodImageOptions'

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
  for (const entry of FOOD_IMAGE_OPTIONS) {
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
