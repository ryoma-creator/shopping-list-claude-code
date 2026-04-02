import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fb7185, #ec4899)',
          borderRadius: 100,
          fontSize: 300,
        }}
      >
        🛒
      </div>
    ),
    { width: 512, height: 512 }
  )
}
