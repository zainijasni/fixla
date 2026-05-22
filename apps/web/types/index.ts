export interface User {
  id: string
  full_name: string
  phone: string
  email?: string
  role: 'customer' | 'provider' | 'admin'
  avatar_url?: string
  is_verified: boolean
  created_at: string
}

export interface ProviderProfile {
  id: string
  user_id: string
  business_name: string
  bio?: string
  years_experience: number
  base_address?: string
  base_lat?: number
  base_lng?: number
  service_radius_km: number
  is_online: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  rating_avg: number
  total_reviews: number
  total_jobs_completed: number
  is_featured: boolean
}

export interface Category {
  id: string
  name: string
  name_ms: string
  slug: string
  icon_url?: string
  subcategories?: Subcategory[]
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  name_ms: string
}

export interface Job {
  id: string
  customer_id: string
  category_id: string
  subcategory_id?: string
  title: string
  description: string
  location_address: string
  location_lat: number
  location_lng: number
  state: string
  city: string
  postcode: string
  urgency: 'urgent' | 'normal' | 'flexible'
  preferred_date?: string
  preferred_time?: 'morning' | 'afternoon' | 'evening' | 'anytime'
  budget_min?: number
  budget_max?: number
  status: 'open' | 'bidding' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  expires_at?: string
  created_at: string
  bids_count?: number
  distance_km?: number
}

export interface Bid {
  id: string
  job_id: string
  provider_id: string
  proposed_price: number
  estimated_duration?: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  is_lead_unlocked: boolean
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  msg_type: 'text' | 'image'
  is_read: boolean
  created_at: string
}

export interface Conversation {
  id: string
  job_id: string
  job_title: string
  other_name: string
  other_avatar?: string
  last_message?: string
  last_message_at: string
  unread_count: number
}

export interface Notification {
  id: string
  type: string
  title: string
  body?: string
  data?: Record<string, string>
  is_read: boolean
  created_at: string
}
