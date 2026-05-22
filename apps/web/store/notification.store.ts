import { create } from 'zustand'

interface NotificationState {
  chatBadge: boolean
  unreadCount: number
  setChatBadge: (v: boolean) => void
  setUnreadCount: (n: number) => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  chatBadge: false,
  unreadCount: 0,
  setChatBadge: (v) => set({ chatBadge: v }),
  setUnreadCount: (n) => set({ unreadCount: n, chatBadge: n > 0 }),
}))
