export interface PreparedScanImage {
  previewDataUrl: string
  imageBase64: string
  mimeType: string
}

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
])

const SUPPORTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff', '.tif', '.avif',
]

async function readAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}

function hasSupportedType(file: File): boolean {
  const name = file.name.toLowerCase()
  const hasSupportedExt = SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext))
  return SUPPORTED_MIME_TYPES.has(file.type.toLowerCase()) || hasSupportedExt
}

async function toJpegDataUrl(src: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('画像変換に失敗しました'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => reject(new Error('この画像形式は未対応です。PNG/JPEGでお試しください'))
    img.src = src
  })
}

export async function prepareImageForAiScan(file: File): Promise<PreparedScanImage> {
  if (!hasSupportedType(file)) {
    throw new Error('未対応の画像形式です。JPG / PNG / WEBP / HEIC / HEIF / GIF / BMP / TIFF / AVIF をお試しください')
  }
  const originalDataUrl = await readAsDataUrl(file)
  const normalizedDataUrl = await toJpegDataUrl(originalDataUrl)
  const imageBase64 = normalizedDataUrl.split(',')[1]
  if (!imageBase64) {
    throw new Error('画像データの解析に失敗しました')
  }
  return { previewDataUrl: normalizedDataUrl, imageBase64, mimeType: 'image/jpeg' }
}
