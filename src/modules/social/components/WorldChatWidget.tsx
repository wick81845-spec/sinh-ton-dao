import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import type { Database } from '../../../../server/database.types'
import { createSupabaseBrowserClient } from '../../../services/auth/supabaseBrowserClient'
import { useAuth } from '../../../app/providers/useAuth'
import {
  loadWorldChatMessages,
  sendWorldChatMessage,
  subscribeToWorldChat,
  type WorldChatMessage,
} from '../services/worldChatService'

type ChatStatus = 'connecting' | 'online' | 'offline'

export function WorldChatWidget() {
  const { session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<WorldChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<ChatStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [chatClient, setChatClient] = useState<SupabaseClient<Database> | null>(null)
  const isOpenRef = useRef(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const visibleStatus = session ? status : 'offline'

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!session) return

    let active = true
    let unsubscribe = () => {}

    void createSupabaseBrowserClient().then(async (client) => {
      if (!active) return
      if (!client) {
        setStatus('offline')
        setError('Chat chưa được cấu hình. Hãy thử lại sau.')
        return
      }

      setChatClient(client)
      let historyLoaded = false
      let realtimeConnected = false
      const channel = subscribeToWorldChat(client, (incoming) => {
        if (!active) return
        setMessages((current) => mergeMessages(current, incoming))
        if (!isOpenRef.current && incoming.player_id !== session.user.id) {
          setUnreadCount((count) => count + 1)
        }
      }, (channelStatus) => {
        if (!active) return
        if (channelStatus === 'SUBSCRIBED') {
          realtimeConnected = true
          setStatus(historyLoaded ? 'online' : 'connecting')
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          realtimeConnected = false
          setStatus('offline')
          setError('Không thể kết nối chat thế giới. Kiểm tra cấu hình Realtime của Supabase.')
        } else if (channelStatus === 'CLOSED') {
          realtimeConnected = false
          setStatus('offline')
        }
      })
      unsubscribe = () => { void client.removeChannel(channel) }

      try {
        const history = await loadWorldChatMessages(client)
        if (active) {
          setMessages((current) => mergeMessageLists(current, history))
          historyLoaded = true
          setStatus(realtimeConnected ? 'online' : 'connecting')
          setError(null)
        }
      } catch (loadError: unknown) {
        if (!active) return
        setStatus('offline')
        console.error('Không thể tải lịch sử chat thế giới.', loadError)
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử chat.')
      }
    }).catch((clientError: unknown) => {
      if (!active) return
      console.error('Không thể kết nối chat thế giới.', clientError)
      setStatus('offline')
      setError(clientError instanceof Error ? clientError.message : 'Không thể kết nối chat thế giới.')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [session])

  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || !chatClient || isSending) return

    setIsSending(true)
    setError(null)
    try {
      const sentMessage = await sendWorldChatMessage(chatClient, message)
      setMessages((current) => mergeMessages(current, sentMessage))
      setDraft('')
    } catch (sendError: unknown) {
      console.error('Không thể gửi tin nhắn chat thế giới.', sendError)
      setError(sendError instanceof Error ? sendError.message : 'Không thể gửi tin nhắn.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="world-chat-widget">
      {isOpen && (
        <section className="world-chat-panel" role="dialog" aria-labelledby="world-chat-title">
          <header className="world-chat-header">
            <div>
              <h2 id="world-chat-title">Chat thế giới</h2>
              <span className={`world-chat-status ${visibleStatus}`}>
                <i aria-hidden="true" />
                {visibleStatus === 'online' ? 'Trực tuyến' : visibleStatus === 'connecting' ? 'Đang kết nối…' : 'Mất kết nối'}
              </span>
            </div>
            <button type="button" className="world-chat-close" aria-label="Đóng chat" onClick={() => setIsOpen(false)}>×</button>
          </header>

          {!session ? (
            <div className="world-chat-sign-in">
              <p>Đăng nhập để trò chuyện với người chơi trong thế giới chung.</p>
              <Link to="/account">Đăng nhập</Link>
            </div>
          ) : (
            <>
              <div className="world-chat-messages" ref={messageListRef} role="log" aria-live="polite" aria-relevant="additions">
                {messages.length === 0 && status !== 'connecting' && (
                  <p className="world-chat-empty">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
                )}
                {messages.map((message) => (
                  <article className={`world-chat-message${message.player_id === session.user.id ? ' own' : ''}`} key={message.id}>
                    <div className="world-chat-message-meta">
                      <strong>{message.display_name}</strong>
                      <time dateTime={message.created_at}>
                        {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}
                      </time>
                    </div>
                    <p>{message.message}</p>
                  </article>
                ))}
              </div>
              {error && <p className="world-chat-error" role="alert">{error}</p>}
              <form className="world-chat-form" onSubmit={(event) => void handleSubmit(event)}>
                <label className="visually-hidden" htmlFor="world-chat-input">Tin nhắn</label>
                <input
                  id="world-chat-input"
                  type="text"
                  maxLength={300}
                  value={draft}
                  placeholder="Nhắn tin cho mọi người…"
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  disabled={status !== 'online' || isSending}
                />
                <button type="submit" disabled={!draft.trim() || status !== 'online' || isSending} aria-label="Gửi tin nhắn">
                  {isSending ? '…' : 'Gửi'}
                </button>
              </form>
            </>
          )}
        </section>
      )}
      <button
        className={`world-chat-launcher${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-label={isOpen ? 'Đóng chat thế giới' : `Mở chat thế giới${unreadCount > 0 ? `, ${unreadCount} tin nhắn mới` : ''}`}
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen) setUnreadCount(0)
          setIsOpen(!isOpen)
        }}
      >
        <span aria-hidden="true">{isOpen ? '×' : '☷'}</span>
        {!isOpen && unreadCount > 0 && <span className="world-chat-unread">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        <small>Chat</small>
      </button>
    </div>
  )
}

function mergeMessages(
  current: WorldChatMessage[],
  incoming: WorldChatMessage | WorldChatMessage[],
): WorldChatMessage[] {
  const messages = new Map(current.map((message) => [message.id, message]))
  const additions = Array.isArray(incoming) ? incoming : [incoming]
  additions.forEach((message) => messages.set(message.id, message))
  return [...messages.values()]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .slice(-50)
}

function mergeMessageLists(current: WorldChatMessage[], incoming: WorldChatMessage[]): WorldChatMessage[] {
  return mergeMessages(current, incoming)
}
