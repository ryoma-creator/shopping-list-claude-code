export interface PreparedScanImage {
  previewDataUrl: string
  imageBase64: string
  mimeType: string
}

// OpenAI Visionに送る最大サイズ（長辺）
const MAX_PX = 1120
// JPEG品質
const JPEG_QUALITY = 0.85
// base64の最大バイト数（Vercelの4.5MB制限に余裕を持たせる）
const MAX_BASE64_BYTES = 3_000_000

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/gif', 'image/bmp',
  'image/tiff', 'image/avif',
])

const SUPPORTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
  '.gif', '.bmp', '.tiff', '.tif', '.avif',
]

function hasSupportedType(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    SUPPORTED_MIME_TYPES.has(file.type.toLowerCase()) ||
    SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext)) ||
    file.type === '' // カメラ直撮りはtypeが空のことがある
  )
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}

// canvasでリサイズ＋JPEG変換（サイズ削減が主目的）
async function resizeToJpeg(src: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas初期化に失敗しました')); return }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。別の写真をお試しください'))
    img.src = src
  })
}

export async function prepareImageForAiScan(file: File): Promise<PreparedScanImage> {
  if (!hasSupportedType(file)) {
    throw new Error('未対応の画像形式です。JPG / PNG / WEBP をお試しください')
  }

  const originalDataUrl = await readAsDataUrl(file)

  // リサイズ → JPEG変換
  let dataUrl = await resizeToJpeg(originalDataUrl, JPEG_QUALITY)

  // まだ大きい場合は品質を落として再圧縮
  const base64 = dataUrl.split(',')[1] ?? ''
  if (base64.length > MAX_BASE64_BYTES) {
    dataUrl = await resizeToJpeg(originalDataUrl, 0.65)
  }

  const imageBase64 = dataUrl.split(',')[1]
  if (!imageBase64) throw new Error('画像データの変換に失敗しました')

  return { previewDataUrl: dataUrl, imageBase64, mimeType: 'image/jpeg' }
}
