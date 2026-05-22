'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface Conversation {
  id: string
  job_id: string
  job_title: string
  other_name: string
  other_avatar?: string
  last_message?: string
  last_message_at: string
  unread_count: number
}

export default function ChatListPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/api/conversations')
      setConversations(data.conversations || [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetchConversations()
  }, [user, router, fetchConversations])

  // Re-fetch when a new message arrives (to update last_message + unread_count)
  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)
    socket.on('new_message', () => fetchConversations())
    return () => { socket.off('new_message') }
  }, [token, fetchConversations])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return date.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Semalam'
    if (diffDays < 7) return date.toLocaleDateString('ms-MY', { weekday: 'short' })
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })
  }

  const backHref = user?.role === 'provider' ? '/provider/dashboard' : '/'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }} className="px-5 pt-10 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push(backHref)}
            className="text-white/60 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase leading-none mb-0.5">Komunikasi</p>
            <h1 className="text-white font-black text-xl">Chat Saya</h1>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-8 pb-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">

          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3 border-b border-gray-50 animate-pulse last:border-0">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-sm font-black text-gray-700 mb-1">Tiada perbualan lagi</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Chat akan muncul selepas tawaran anda diterima oleh pelanggan
              </p>
            </div>
          ) : (
            conversations.map((conv, i) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition
                  ${i < conversations.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-[#1565C0] text-lg">
                  {conv.other_name?.charAt(0).toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-black text-gray-800 truncate">{conv.other_name}</p>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-semibold truncate mb-0.5">{conv.job_title}</p>
                  {conv.last_message ? (
                    <p className="text-xs text-gray-400 truncate">{conv.last_message}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Mula perbualan...</p>
                  )}
                </div>

                {/* Unread badge */}
                {Number(conv.unread_count) > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-black">{conv.unread_count}</span>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
