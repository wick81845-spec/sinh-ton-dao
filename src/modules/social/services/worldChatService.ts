import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../server/database.types'

export type WorldChatMessage = Database['public']['Tables']['global_world_chat_messages']['Row']

type ChatClient = SupabaseClient<Database>

export async function loadWorldChatMessages(client: ChatClient): Promise<WorldChatMessage[]> {
  const { data, error } = await client
    .from('global_world_chat_messages')
    .select('id, player_id, display_name, message, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return [...data].reverse()
}

export async function sendWorldChatMessage(
  client: ChatClient,
  message: string,
): Promise<WorldChatMessage> {
  const { data, error } = await client.rpc('send_global_world_chat_message', { p_message: message })
  if (error) throw error
  const sentMessage = data[0]
  if (!sentMessage) throw new Error('Máy chủ không trả lại tin nhắn vừa gửi.')
  return sentMessage
}

export function subscribeToWorldChat(
  client: ChatClient,
  onMessage: (message: WorldChatMessage) => void,
  onStatus: (status: string) => void,
): RealtimeChannel {
  return client
    .channel('global-world-chat')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'global_world_chat_messages',
    }, (payload) => {
      const message = parseWorldChatMessage(payload.new)
      if (message) onMessage(message)
    })
    .subscribe(onStatus)
}

function parseWorldChatMessage(value: unknown): WorldChatMessage | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const message = value as Record<string, unknown>
  if (typeof message.id !== 'number'
    || typeof message.player_id !== 'string'
    || typeof message.display_name !== 'string'
    || typeof message.message !== 'string'
    || typeof message.created_at !== 'string') return null

  return {
    id: message.id,
    player_id: message.player_id,
    display_name: message.display_name,
    message: message.message,
    created_at: message.created_at,
  }
}
