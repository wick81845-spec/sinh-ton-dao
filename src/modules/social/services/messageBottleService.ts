import type { Database } from '../../../../server/database.types'
import { createSupabaseBrowserClient } from '../../../services/auth/supabaseBrowserClient'

export type MessageBottle = Database['public']['Functions']['read_message_bottle']['Returns'][number]
export type MessageBottleReportReason = 'spam' | 'inappropriate' | 'personal_info' | 'scam' | 'other'

const blockedWords = [
  'fuck',
  'shit',
  'bitch',
  'nigger',
  'cặc',
  'địt',
  'đụ',
  'lồn',
  'đĩ',
]

export function getMessageBottleRpcErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === '42702') {
    return 'Máy chủ chai thông điệp đang dùng bản lỗi cũ. Hãy áp dụng migration 20261112195500_fix_message_bottle_rpc.sql.'
  }
  if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01') {
    return 'Máy chủ chưa bật chức năng chai thông điệp. Hãy áp dụng các migration message_bottle_social và fix_message_bottle_rpc.'
  }
  return error.message
}

export function validateMessageBottleText(value: string): string | null {
  const message = value.trim()
  if (message.length < 1 || message.length > 280) {
    return 'Thông điệp cần có từ 1 đến 280 ký tự.'
  }
  if (/(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[\w-]+\.(com|net|org|io|vn|edu|gov)\b)/i.test(message)) {
    return 'Không được gửi liên kết hoặc địa chỉ email trong chai thông điệp.'
  }
  if (message.replace(/\D/g, '').length >= 9) {
    return 'Không được gửi số điện thoại hoặc dãy số có thể nhận dạng cá nhân.'
  }
  const normalizedMessage = message.toLocaleLowerCase()
  if (blockedWords.some((word) => new RegExp(`(^|[^\\p{L}\\p{N}])${word}([^\\p{L}\\p{N}]|$)`, 'u').test(normalizedMessage))) {
    return 'Thông điệp có nội dung không phù hợp.'
  }
  return null
}

async function getClient() {
  const client = await createSupabaseBrowserClient()
  if (!client) throw new Error('Tính năng chai thông điệp cần cấu hình tài khoản online.')
  return client
}

export async function sendMessageBottle(message: string): Promise<void> {
  const validationError = validateMessageBottleText(message)
  if (validationError) throw new Error(validationError)
  const client = await getClient()
  const { error } = await client.rpc('send_message_bottle', { p_message: message.trim() })
  if (error) throw new Error(getMessageBottleRpcErrorMessage(error))
}

export async function readMessageBottle(): Promise<MessageBottle> {
  const client = await getClient()
  const { data, error } = await client.rpc('read_message_bottle')
  if (error) throw new Error(getMessageBottleRpcErrorMessage(error))
  const message = data[0]
  if (!message) throw new Error('Chưa có thông điệp mới trôi đến đảo này.')
  return message
}

export async function reportMessageBottle(
  messageId: number,
  reason: MessageBottleReportReason,
): Promise<void> {
  const client = await getClient()
  const { error } = await client.rpc('report_message_bottle', {
    p_message_id: messageId,
    p_reason: reason,
  })
  if (error) throw new Error(getMessageBottleRpcErrorMessage(error))
}

