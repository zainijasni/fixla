'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { getSocket } from '@/lib/socket'
import api from '@/lib/api'

interface Toast {
  id: string
  title: string
  body: string
  type?: 'chat' | 'bid_rejected'
  conversation_id?: string
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const { setUnreadCount, setChatBadge } = useNotificationStore()
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const [toasts, setToasts] = useState<Toast[]>([])

  pathnameRef.current = pathname

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000)
  }, [])

  // ── Polling: check unread every 30s ──────────────────────────
  const checkUnread = useCallback(async () => {
    if (!token) return
    try {
      const { data } = await api.get('/api/conversations')
      const convs: { unread_count: number }[] = data.conversations || []
      const total = convs.reduce((sum, c) => sum + Number(c.unread_count || 0), 0)
      setUnreadCount(total)
    } catch { /* non-critical */ }
  }, [token, setUnreadCount])

  useEffect(() => {
    if (!token || !user) return
    checkUnread()
    const interval = setInterval(checkUnread, 30_000)
    return () => clearInterval(interval)
  }, [token, user, checkUnread])

  // ── Socket: real-time toast ───────────────────────────────────
  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)

    const handleChatNotification = (data: { conversation_id: string; content: string }) => {
      if (pathnameRef.current === `/chat/${data.conversation_id}`) return
      setChatBadge(true)
      pushToast({
        title: '💬 Mesej Baru',
        body: data.content || 'Pelanggan menghantar mesej',
        conversation_id: data.conversation_id
      })
    }

    const handleBidRejected = (data: { job_id: string; job_title: string }) => {
      if (pathnameRef.current === '/provider/dashboard') return // dashboard handles it itself
      pushToast({
        type: 'bid_rejected',
        title: '❌ Tawaran Ditolak',
        body: `"${data.job_title}" — customer telah memilih technician lain`,
      })
    }

    const handleConnect = () => { checkUnread() }

    socket.on('new_chat_notification', handleChatNotification)
    socket.on('bid_rejected', handleBidRejected)
    socket.on('connect', handleConnect)

    return () => {
      socket.off('new_chat_notification', handleChatNotification)
      socket.off('bid_rejected', handleBidRejected)
      socket.off('connect', handleConnect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (pathname === '/chat') setUnreadCount(0)
  }, [pathname, setUnreadCount])

  return (
    <>
      <div className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`rounded-2xl px-4 py-3 shadow-xl pointer-events-auto flex items-start gap-3 border ${t.type === 'bid_rejected' ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-800">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.body}</p>
            </div>
            {t.type !== 'bid_rejected' && (
              <button
                onClick={() => {
                  setToasts(p => p.filter(x => x.id !== t.id))
                  setChatBadge(false)
                  router.push(t.conversation_id ? `/chat/${t.conversation_id}` : '/chat')
                }}
                className="text-xs font-black text-blue-700 underline shrink-0">
                Buka
              </button>
            )}
            {t.type === 'bid_rejected' && (
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
                className="text-xs font-black text-red-400 shrink-0">✕</button>
            )}
          </div>
        ))}
      </div>
      {children}
    </>
  )
}
