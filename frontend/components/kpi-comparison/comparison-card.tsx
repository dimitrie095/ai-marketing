"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  change: number;
  direction: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percentage' | 'number' | 'decimal';
  icon: React.ReactNode;
  inverse?: boolean;
  description?: string;
}

const formatValue = (value: number, format: string): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'number':
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
    case 'decimal':
      return value.toFixed(2);
    default:
      return value.toString();
  }
};

export function ComparisonCard({
  title,
  currentValue,
  previousValue,
  change,
  direction,
  format,
  icon,
  inverse = false,
}: ComparisonCardProps) {
  const isGood = inverse 
    ? (direction === 'down') 
    : (direction === 'up');
  
  const trendColor = isGood ? 'text-green-600' : direction === 'neutral' ? 'text-gray-500' : 'text-red-600';
  const trendBg = isGood ? 'bg-green-50' : direction === 'neutral' ? 'bg-gray-50' : 'bg-red-50';
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            
            <div className="mt-3">
              <div className="text-3xl font-bold text-foreground">
                {formatValue(currentValue, format)}
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", trendBg, trendColor)}>
                  {direction === 'up' && <TrendingUp className="h-3 w-3" />}
                  {direction === 'down' && <TrendingDown className="h-3 w-3" />}
                  {direction === 'neutral' && <span className="h-3 w-3 flex items-center justify-center">-</span>}
                  <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  vs. {formatValue(previousValue, format)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
