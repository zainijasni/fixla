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
  conversation_id?: string
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const { setChatBadge, setUnreadCount } = useNotificationStore()
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

  // ── Polling: check unread count every 30s ─────────────────────
  // This is the reliable fallback — works even when socket drops.
  const checkUnread = useCallback(async () => {
    if (!token) return
    try {
      const { data } = await api.get('/api/conversations')
      const convs: { unread_count: number; id: string }[] = data.conversations || []
      const total = convs.reduce((sum, c) => sum + Number(c.unread_count || 0), 0)
      setUnreadCount(total)
    } catch { /* non-critical */ }
  }, [token, setUnreadCount])

  useEffect(() => {
    if (!token || !user) return
    // Check immediately on mount
    checkUnread()
    // Then every 30 seconds
    const interval = setInterval(checkUnread, 30_000)
    return () => clearInterval(interval)
  }, [token, user, checkUnread])

  // ── Socket: real-time toast when socket is connected ──────────
  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)

    const handleChatNotification = (data: { conversation_id: string; content: string }) => {
      if (pathnameRef.current === `/chat/${data.conversation_id}`) return
      setChatBadge(true)
      pushToast({
        title: '💬 Mesej Baru',
        body: data.content || 'Technician menghantar mesej',
        conversation_id: data.conversation_id
      })
    }

    // Also check unread on every reconnect (catches messages missed while offline)
    const handleConnect = () => { checkUnread() }

    socket.on('new_chat_notification', handleChatNotification)
    socket.on('connect', handleConnect)

    return () => {
      socket.off('new_chat_notification', handleChatNotification)
      socket.off('connect', handleConnect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Clear badge when user navigates into chat list
  useEffect(() => {
    if (pathname === '/chat') setUnreadCount(0)
  }, [pathname, setUnreadCount])

  return (
    <>
      {/* Global toast overlay */}
      <div className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="bg-blue-50 border border-blue-300 rounded-2xl px-4 py-3 shadow-xl pointer-events-auto flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-black text-gray-800">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.body}</p>
            </div>
            <button
              onClick={() => {
                setToasts(p => p.filter(x => x.id !== t.id))
                setChatBadge(false)
                router.push(t.conversation_id ? `/chat/${t.conversation_id}` : '/chat')
              }}
              className="text-xs font-black text-blue-700 underline shrink-0">
              Buka
            </button>
          </div>
        ))}
      </div>
      {children}
    </>
  )
}
