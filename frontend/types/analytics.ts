// Type definitions for Analytics and KPI Comparison

export interface PeriodSummary {
  total_spend: number
  total_revenue: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  avg_ctr: number
  avg_cpc: number
  avg_roas: number
  avg_cvr: number
  profit: number
}

export interface PeriodChange {
  absolute: number
  percentage: number
  direction: 'up' | 'down' | 'neutral'
}

export interface PeriodChanges {
  total_spend: PeriodChange
  total_revenue: PeriodChange
  total_impressions: PeriodChange
  total_clicks: PeriodChange
  total_conversions: PeriodChange
  avg_ctr: PeriodChange
  avg_cpc: PeriodChange
  avg_roas: PeriodChange
  avg_cvr: PeriodChange
  profit: PeriodChange
}

export interface PeriodData {
  start_date: string
  end_date: string
  days: number
  summary: PeriodSummary
}

export interface CampaignInfo {
  id: string
  name: string
  status: string
}

export interface PeriodComparisonResponse {
  status: string
  message: string
  current_period: PeriodData
  comparison_period: PeriodData
  changes: PeriodChanges
  campaigns: CampaignInfo[]
  group_by: string
}

export interface DateRange {
  from: Date
  to: Date
}

export interface TrendDataPoint {
  date: string
  value: number
}

export interface TrendData {
  [metric: string]: TrendDataPoint[]
}

export interface AnalyticsSummary {
  total_spend: number
  total_revenue: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  avg_ctr: number
  avg_cpc: number
  avg_roas: number
  avg_cvr: number
  profit: number
}

export interface CampaignPerformance {
  id: string
  name: string
  status: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  cvr: number
}

export interface BreakdownItem {
  id: string
  name: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  cvr: number
  share_of_spend: number
  share_of_revenue: number
}

export type CompareMode = 'previous_period' | 'previous_year' | 'custom'
export type GroupBy = 'campaign' | 'adset' | 'ad' | 'day' | 'week' | 'month'
export type TimeRange = '7d' | '14d' | '30d' | '90d' | 'custom'
