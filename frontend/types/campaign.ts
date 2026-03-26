// Type definitions for Marketing Analytics AI

export interface Campaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective?: string
  created_at: string
  updated_at: string
  synced_at?: string
}

export interface AdSet {
  id: string
  campaign_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  daily_budget?: number
  lifetime_budget?: number
  optimization_goal?: string
  billing_event?: string
  created_at: string
  updated_at: string
  synced_at?: string
}

export interface Ad {
  id: string
  ad_set_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_PROCESS'
  creative_type?: string
  image_hash?: string
  image_url?: string
  creative_spec?: Record<string, any>
  created_at: string
  updated_at: string
  synced_at?: string
}

export interface Metric {
  date: string
  entity_type: 'campaign' | 'adset' | 'ad'
  entity_id: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  reach: number
  frequency: number
  engagement: number
  video_views: number
  video_p50_watched_actions: number
  video_p75_watched_actions: number
  video_p95_watched_actions: number
  video_p100_watched_actions: number
  created_at: string
}