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
              text: `この画像から買い物アイテムを全て抽出してください。${languagePrompt}カテゴリは meat/fish/dairy/fruits/vegetables/frozen/bakery/drinks/snacks/other から選んでください。JSONの配列のみ返してください。例: [{"name":"牛乳","category":"dairy"},{"name":"卵","category":"dairy"}]`,
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
  const items: { name: string; category: string }[] = match
    ? (JSON.parse(match[0]) as { name: string; category: string }[])
    : []

  return NextResponse.json({ items })
}
