import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatMYR = (amount: number) =>
  new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(amount)

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru sahaja'
  if (mins < 60) return `${mins} minit lepas`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lepas`
  return `${Math.floor(hrs / 24)} hari lepas`
}
