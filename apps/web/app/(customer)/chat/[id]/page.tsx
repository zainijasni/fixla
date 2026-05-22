'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  msg_type: 'text' | 'image'
  is_read: boolean
  created_at: string
}

interface ConvInfo {
  job_title: string
  other_name: string
  job_id: string
  job_status: string
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user, token } = useAuthStore()
  const convId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)

  // Bid from chat — for provider
  const [showBidModal, setShowBidModal] = useState(false)
  const [bidPrice, setBidPrice] = useState('')
  const [bidDuration, setBidDuration] = useState('')
  const [bidMsg, setBidMsg] = useState('')
  const [bidLoading, setBidLoading] = useState(false)
  const [bidError, setBidError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    if (!user || !token) { router.push('/login'); return }

    // Load messages + find this conversation's info
    Promise.all([
      api.get(`/api/conversations/${convId}/messages`),
      api.get('/api/conversations')
    ]).then(([msgRes, convRes]) => {
      setMessages(msgRes.data.messages || [])
      const conv = (convRes.data.conversations || []).find(
        (c: { id: string }) => c.id === convId
      )
      if (conv) setConvInfo({ job_title: conv.job_title, other_name: conv.other_name, job_id: conv.job_id, job_status: conv.job_status })
      setTimeout(() => scrollToBottom(false), 80)
    }).catch(() => router.push('/chat'))
    .finally(() => setLoading(false))

    // Socket setup
    const socket = getSocket(token)
    socket.emit('join_conversation', { conversation_id: convId })

    // Only add messages from the OTHER party via socket.
    // Our own messages are already added from REST response.
    socket.on('new_message', (msg: Message) => {
      if (msg.conversation_id !== convId) return
      if (msg.sender_id === user.id) return  // skip own echoes
      setMessages(prev => [...prev, msg])
      scrollToBottom()
    })

    socket.on('user_typing', ({ conversation_id }: { conversation_id: string }) => {
      if (conversation_id === convId) setOtherTyping(true)
    })
    socket.on('user_stop_typing', ({ conversation_id }: { conversation_id: string }) => {
      if (conversation_id === convId) setOtherTyping(false)
    })

    return () => {
      socket.off('new_message')
      socket.off('user_typing')
      socket.off('user_stop_typing')
    }
  }, [user, token, convId, router, scrollToBottom])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages.length, scrollToBottom])

  const handleInputChange = (val: string) => {
    setInput(val)
    if (!token) return
    const socket = getSocket(token)
    socket.emit('typing', { conversation_id: convId })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { conversation_id: convId })
    }, 2000)
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)

    // Stop typing indicator
    if (token) {
      const socket = getSocket(token)
      socket.emit('stop_typing', { conversation_id: convId })
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)

    try {
      const { data } = await api.post(`/api/conversations/${convId}/messages`, {
        content,
        msg_type: 'text'
      })
      // Add our own message from REST response (server also emits to room but we skip own echoes)
      setMessages(prev => [...prev, data.message])
      scrollToBottom()
    } catch {
      // Restore input on failure
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleBidFromChat = async () => {
    if (!convInfo?.job_id) return
    if (!bidPrice || Number(bidPrice) < 1) { setBidError('Sila masukkan harga yang sah'); return }
    setBidLoading(true); setBidError('')
    try {
      await api.post(`/api/bids/jobs/${convInfo.job_id}`, {
        proposed_price: Number(bidPrice),
        estimated_duration: bidDuration || undefined,
        message: bidMsg || undefined
      })
      // Send a chat message announcing the bid
      const announcement = `💰 Tawaran Harga: RM ${bidPrice}${bidDuration ? ` (${bidDuration})` : ''}${bidMsg ? `\n${bidMsg}` : ''}`
      await api.post(`/api/conversations/${convId}/messages`, { content: announcement, msg_type: 'text' })
      const { data } = await api.get(`/api/conversations/${convId}/messages`)
      setMessages(data.messages || [])
      setShowBidModal(false); setBidPrice(''); setBidDuration(''); setBidMsg('')
      if (convInfo) setConvInfo({ ...convInfo, job_status: 'bidding' })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } }
      setBidError(e?.response?.data?.error?.message || 'Gagal hantar tawaran.')
    } finally { setBidLoading(false) }
  }

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (d: string) => {
    const date = new Date(d)
    const today = new Date()
    const yest = new Date(today); yest.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    if (date.toDateString() === yest.toDateString()) return 'Semalam'
    return date.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Group messages by date
  type MsgGroup = { date: string; msgs: Message[] }
  const groups: MsgGroup[] = []
  messages.forEach(msg => {
    const dateStr = new Date(msg.created_at).toDateString()
    const last = groups[groups.length - 1]
    if (!last || last.date !== dateStr) groups.push({ date: dateStr, msgs: [msg] })
    else last.msgs.push(msg)
  })

  if (loading) return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#060d1f 0%,#0a1e3d 100%)' }}
        className="px-5 pt-10 pb-4 shrink-0 safe-top">
        <div className="flex items-center gap-3">
          {user?.role === 'customer' ? (
            <button onClick={() => router.push('/')} className="shrink-0 -ml-1">
              <img src="/logo.png" alt="Fixla" className="h-7 w-auto"
                style={{ filter: 'drop-shadow(0 1px 6px rgba(249,115,22,0.5))' }} />
            </button>
          ) : (
            <button onClick={() => router.push('/chat')}
              className="text-white/60 hover:text-white transition p-1 -ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-white text-sm shrink-0">
            {convInfo?.other_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight">{convInfo?.other_name || '...'}</p>
            {otherTyping ? (
              <p className="text-[#F97316] text-xs font-semibold">menaip...</p>
            ) : (
              <p className="text-blue-200/60 text-xs truncate">{convInfo?.job_title || ''}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-10">
              <div className="text-5xl mb-3">👋</div>
              <p className="text-sm font-black text-gray-700 mb-1">Mula perbualan</p>
              <p className="text-xs text-gray-400">Hantarkan mesej pertama anda</p>
            </div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-black/8 backdrop-blur text-gray-500 text-xs font-semibold px-4 py-1.5 rounded-full">
                  {formatDate(group.msgs[0].created_at)}
                </div>
              </div>

              {group.msgs.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id
                const prevMsg = group.msgs[idx - 1]
                const nextMsg = group.msgs[idx + 1]
                const sameAsPrev = prevMsg?.sender_id === msg.sender_id
                const sameAsNext = nextMsg?.sender_id === msg.sender_id
                const showAvatar = !isMe && !sameAsNext

                return (
                  <div key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}
                      ${sameAsPrev ? 'mt-0.5' : 'mt-3'}`}>

                    {/* Other party avatar placeholder */}
                    {!isMe && (
                      <div className={`w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-[#1565C0] text-xs
                        ${showAvatar ? '' : 'opacity-0'}`}>
                        {convInfo?.other_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2.5 text-sm leading-relaxed break-words
                        ${isMe
                          ? `bg-[#F97316] text-white ${sameAsPrev ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl'} ${sameAsNext ? 'rounded-br-md' : ''}`
                          : `bg-white text-gray-800 shadow-sm border border-gray-100 ${sameAsPrev ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl'} ${sameAsNext ? 'rounded-bl-md' : ''}`
                        }`}>
                        {msg.content}
                      </div>
                      {!sameAsNext && (
                        <span className="text-xs text-gray-400 mt-1 px-1">{formatTime(msg.created_at)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* Typing dots from other party */}
        {otherTyping && (
          <div className="flex items-end gap-2 mt-3">
            <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-[#1565C0] text-xs">
              {convInfo?.other_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3.5">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span key={delay}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Bid button bar for provider — show when job is open/bidding */}
      {user?.role === 'provider' && ['open', 'bidding'].includes(convInfo?.job_status || '') && (
        <div className="bg-orange-50 border-t border-orange-100 px-4 py-2 shrink-0">
          <button onClick={() => { setShowBidModal(true); setBidError('') }}
            className="w-full py-2.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>
            💰 Hantar Tawaran Harga
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3 shrink-0">
        <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-2.5
          focus-within:border-[#1565C0] transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Taip mesej..."
            rows={1}
            className="w-full text-sm text-gray-800 outline-none bg-transparent resize-none leading-relaxed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-35 active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#F97316,#EA6C0A)',
            boxShadow: input.trim() ? '0 4px 14px rgba(249,115,22,0.4)' : 'none'
          }}>
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Provider bottom nav — always visible in chat */}
      {user?.role === 'provider' && (
        <div className="bg-white border-t border-gray-100 px-5 py-3 flex justify-around shrink-0">
          {[
            { icon: '🏠', label: 'Dashboard', href: '/provider/dashboard' },
            { icon: '📋', label: 'Job', href: '/provider/jobs' },
          ].map(nav => (
            <button key={nav.href} onClick={() => router.push(nav.href)}
              className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl text-gray-400">
              <span className="text-xl">{nav.icon}</span>
              <span className="text-xs font-bold">{nav.label}</span>
            </button>
          ))}
          <button
            className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl text-[#F97316]">
            <span className="text-xl">💬</span>
            <span className="text-xs font-bold">Chat</span>
          </button>
        </div>
      )}

      {/* Bid from chat modal */}
      {showBidModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowBidModal(false) }}>
          <div className="w-full bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <p className="text-xs text-gray-400 font-semibold mb-0.5">{convInfo?.job_title}</p>
            <h3 className="text-gray-800 font-black text-base mb-4">Hantar Tawaran Harga</h3>

            {bidError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl mb-4">
                {bidError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Harga Tawaran (RM) <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#1565C0] transition-all">
                  <span className="text-gray-400 font-bold mr-2 text-sm">RM</span>
                  <input type="number" min="1" placeholder="cth: 150"
                    value={bidPrice} onChange={e => setBidPrice(e.target.value)}
                    className="flex-1 text-lg text-gray-800 outline-none bg-transparent font-black" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Anggaran Masa <span className="normal-case font-normal text-gray-400">(pilihan)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['30 minit', '1 jam', '2-3 jam', 'Setengah hari', '1 hari'].map(d => (
                    <button key={d} type="button"
                      onClick={() => setBidDuration(prev => prev === d ? '' : d)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all
                        ${bidDuration === d ? 'border-[#1565C0] bg-blue-50 text-[#1565C0]' : 'border-slate-200 text-gray-500'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Nota <span className="normal-case font-normal text-gray-400">(pilihan)</span>
                </label>
                <textarea value={bidMsg} onChange={e => setBidMsg(e.target.value)}
                  placeholder="cth: Harga termasuk spare part, servis 30 hari..."
                  rows={2}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1565C0] transition-all resize-none" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBidModal(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-black hover:bg-gray-50 transition">
                  Batal
                </button>
                <button type="button" onClick={handleBidFromChat} disabled={bidLoading}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-black transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#F97316,#EA6C0A)' }}>
                  {bidLoading ? 'Menghantar...' : 'Hantar Tawaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
