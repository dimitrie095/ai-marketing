"use client";

// Dashboard Components Export
export { Sidebar, MobileSidebar } from "./sidebar";
export { DashboardLayout } from "./layout";
export { 
  KPICard, 
  CTRCard, 
  ROASCard, 
  CPCCard, 
  CPRCard, 
  SpendCard, 
  RevenueCard 
} from "./kpi-card";

// Types
export interface DashboardProps {
  className?: string;
}

export interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}