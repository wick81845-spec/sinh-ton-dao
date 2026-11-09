const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const MAX_STORED_IMAGE_LENGTH = 2_500_000
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isStoredImage(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= MAX_STORED_IMAGE_LENGTH
    && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)
}

export async function prepareImageUpload(file: File, kind: 'avatar' | 'background'): Promise<string> {
  if (!supportedImageTypes.has(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 8 MB.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('Kích thước ảnh vượt quá giới hạn xử lý.')
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không thể xử lý ảnh này.')

    if (kind === 'avatar') {
      const cropSize = Math.min(bitmap.width, bitmap.height)
      const sourceX = (bitmap.width - cropSize) / 2
      const sourceY = (bitmap.height - cropSize) / 2
      canvas.width = 512
      canvas.height = 512
      context.drawImage(bitmap, sourceX, sourceY, cropSize, cropSize, 0, 0, 512, 512)
    } else {
      const scale = Math.min(1, 1920 / bitmap.width, 1080 / bitmap.height)
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    }

    const result = canvas.toDataURL('image/jpeg', .82)
    if (!isStoredImage(result)) throw new Error('Không thể tạo ảnh đã thu nhỏ.')
    return result
  } finally {
    bitmap.close()
  }
}

export function applyGameBackground(background: string, image: string | null): void {
  document.documentElement.dataset.gameBackground = background
  document.documentElement.style.setProperty(
    '--custom-game-background',
    image ? `url("${image}")` : 'none',
  )
}
