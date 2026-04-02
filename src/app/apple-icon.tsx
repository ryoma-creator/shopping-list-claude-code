import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: 36,
          fontSize: 100,
        }}
      >
        🛒
      </div>
    ),
    { ...size }
  )
}
