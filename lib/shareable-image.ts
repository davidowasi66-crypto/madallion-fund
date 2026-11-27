export const xml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

export const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

export function toDate(value: unknown): Date | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric < 1e12 ? numeric * 1000 : numeric)
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function dateLabel(value: unknown, fallback: string): string {
  return toDate(value)?.toLocaleDateString('en-NG', { dateStyle: 'medium' }) ?? fallback
}

export function stableShareId(prefix: string, parts: unknown[]): string {
  const serial = String(parts[0] ?? '').replace(/\D/g, '').slice(-6).padStart(6, '0')
  const year = (toDate(parts[1]) ?? new Date()).getFullYear()
  const seed = parts.map((part) => String(part ?? '')).join('|')
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619)
  }
  return `${prefix}-${year}-${serial}-${(hash >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5)}`
}

export function safeHttpsUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
  } catch {
    return ''
  }
}

export async function makeQrDataUrl(value: string, width = 180): Promise<string> {
  const { default: QRCode } = await import('qrcode')
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
    color: { dark: '#062b24', light: '#ffffff' },
  })
}

export async function renderPng(svg: string, width: number, height: number): Promise<Blob> {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image export is not available in this browser.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to create the image.'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}

export function saveFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareImage(file: File, title: string, text: string): Promise<'shared' | 'downloaded'> {
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title, text })
    return 'shared'
  }
  saveFile(file)
  return 'downloaded'
}
