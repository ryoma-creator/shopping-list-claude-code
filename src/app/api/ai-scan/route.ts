import { NextRequest, NextResponse } from 'next/server'

// OpenAI Vision APIを使って画像からショッピングアイテムを抽出
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY が設定されていません' }, { status: 500 })
  }

  const body = await req.json() as { imageBase64: string; mimeType: string; language?: string }
  const { imageBase64, mimeType, language } = body
  const targetLanguage = language ?? 'ja'
  const languagePrompt = {
    ja: '出力するnameは日本語にしてください。',
    en: 'Output each item name in English.',
    it: 'Output each item name in Italian.',
    es: 'Output each item name in Spanish.',
    fr: 'Output each item name in French.',
    ko: 'Output each item name in Korean.',
  }[targetLanguage] ?? '出力するnameは日本語にしてください。'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `この画像から買い物アイテムを全て抽出してください。${languagePrompt}カテゴリは meat/fish/dairy/fruits/vegetables/frozen/bakery/drinks/snacks/other から選んでください。価格が見える場合はpriceに数値で入れてください（見えない場合はnull）。JSONの配列のみ返してください。例: [{"name":"milk","category":"dairy","price":210},{"name":"egg","category":"dairy","price":null}]`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 502 })
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
  }
  const content = data.choices[0]?.message?.content ?? '[]'

  // JSON配列部分を抽出してパース
  const match = content.match(/\[[\s\S]*\]/)
  const rawItems: unknown[] = match
    ? (JSON.parse(match[0]) as unknown[])
    : []
  const items = rawItems
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const r = raw as { name?: unknown; category?: unknown; price?: unknown }
      if (typeof r.name !== 'string' || typeof r.category !== 'string') return null
      return {
        name: r.name,
        category: r.category,
        price: typeof r.price === 'number' && Number.isFinite(r.price) ? Math.max(0, Math.round(r.price)) : null,
      }
    })
    .filter((x): x is { name: string; category: string; price: number | null } => x !== null)

  return NextResponse.json({ items })
}
