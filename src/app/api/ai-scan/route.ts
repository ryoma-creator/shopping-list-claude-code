import { NextRequest, NextResponse } from 'next/server'

// Vercelのbodyサイズ上限を8MBに拡張
export const maxDuration = 30

// OpenAI Vision APIを使って画像からショッピングアイテムを抽出
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY が設定されていません' }, { status: 500 })
  }

  const body = await req.json() as { imageBase64: string; mimeType: string; language?: string }
  const { imageBase64, mimeType, language } = body
  const targetLanguage = language ?? 'en'
  const languagePrompt = {
    ja: '出力するnameは必ず日本語（カタカナ/ひらがな/漢字）にしてください。英語の単語を混ぜないでください。',
    en: 'Output each item name in English only. Do not mix other languages.',
    it: 'Output each item name in Italian only. Do not mix other languages.',
    es: 'Output each item name in Spanish only. Do not mix other languages.',
    fr: 'Output each item name in French only. Do not mix other languages.',
    ko: 'Output each item name in Korean only. Do not mix other languages.',
  }[targetLanguage] ?? 'Output each item name in English only. Do not mix other languages.'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `この画像から買い物アイテムを全て抽出してください。${languagePrompt}カテゴリは meat/fish/dairy/fruits/vegetables/frozen/bakery/drinks/snacks/other から選んでください。価格が見える場合はpriceに数値で入れてください（見えない場合はnull）。必ずJSON配列のみ返してください。`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'shopping_items',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    category: {
                      type: 'string',
                      enum: ['meat', 'fish', 'dairy', 'fruits', 'vegetables', 'frozen', 'bakery', 'drinks', 'snacks', 'other'],
                    },
                    price: { type: ['number', 'null'] },
                  },
                  required: ['name', 'category', 'price'],
                },
              },
            },
            required: ['items'],
          },
        },
      },
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
  const content = data.choices[0]?.message?.content ?? '{"items":[]}'
  const parsed = JSON.parse(content) as { items?: unknown[] }
  const rawItems: unknown[] = Array.isArray(parsed.items) ? parsed.items : []
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
