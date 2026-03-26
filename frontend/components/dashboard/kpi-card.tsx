"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export function KPICard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon,
  variant = "default",
}: KPICardProps) {
  const trendConfig = {
    up: {
      icon: ArrowUp,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    down: {
      icon: ArrowDown,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    neutral: {
      icon: Minus,
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
    },
  };

  const TrendIcon = trend ? trendConfig[trend].icon : null;
  const trendColor = trend ? trendConfig[trend].color : "";
  const bgColor = trend ? trendConfig[trend].bgColor : "";

  const variantStyles = {
    default: "border-border bg-card text-card-foreground",
    success: "border-green-300 bg-green-50 dark:bg-green-900/10",
    warning: "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10",
    danger: "border-red-300 bg-red-50 dark:bg-red-900/10",
  };

  return (
    <Card className={cn("transition-all hover:shadow-lg", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("rounded-full p-2", bgColor)}>
            <div className={cn("h-4 w-4", trendColor)}>
              {icon}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2">
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Preset KPI Cards for common metrics

export function CTRCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Click-Through Rate"
      value={value}
      description="Prozent der Klicks pro Impression"
      trend={trend}
      trendValue={trend ? (trend === "up" ? "+12%" : trend === "down" ? "-8%" : "0%") : undefined}
      icon={<div className="font-bold">CTR</div>}
      variant={trend === "up" ? "success" : trend === "down" ? "danger" : "default"}
    />
  );
}

export function ROASCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Return on Ad Spend"
      value={value}
      description="Umsatz pro Werbeausgabe"
      trend={trend}
      trendValue={trend ? (trend === "up" ? "+15%" : trend === "down" ? "-5%" : "0%") : undefined}
      icon={<div className="font-bold">ROAS</div>}
      variant={trend === "up" ? "success" : trend === "down" ? "warning" : "default"}
    />
  );
}

export function CPCCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Cost Per Click"
      value={value}
      description="Durchschnittlicher Klickpreis"
      trend={trend}
      trendValue={trend ? (trend === "down" ? "-10%" : trend === "up" ? "+7%" : "0%") : undefined}
      icon={<div className="font-bold">CPC</div>}
      variant={trend === "down" ? "success" : trend === "up" ? "danger" : "default"}
    />
  );
}

export function CPRCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Conversion Rate"
      value={value}
      description="Prozentsatz der Conversions"
      trend={trend}
      trendValue={trend ? (trend === "up" ? "+18%" : trend === "down" ? "-12%" : "0%") : undefined}
      icon={<div className="font-bold">CVR</div>}
      variant={trend === "up" ? "success" : trend === "down" ? "warning" : "default"}
    />
  );
}

export function SpendCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Total Spend"
      value={value}
      description="Gesamte Werbeausgaben"
      trend={trend}
      trendValue={trend ? (trend === "up" ? "+22%" : trend === "down" ? "-15%" : "0%") : undefined}
      icon={<div className="font-bold">$</div>}
      variant={trend === "up" ? "warning" : "default"}
    />
  );
}

export function RevenueCard({ value, trend }: { value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <KPICard
      title="Total Revenue"
      value={value}
      description="Erzielter Umsatz"
      trend={trend}
      trendValue={trend ? (trend === "up" ? "+28%" : trend === "down" ? "-10%" : "0%") : undefined}
      icon={<div className="font-bold">€</div>}
      variant={trend === "up" ? "success" : trend === "down" ? "danger" : "default"}
    />
  );
}