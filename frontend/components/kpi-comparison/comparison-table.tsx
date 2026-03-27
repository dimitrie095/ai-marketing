"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIData {
  key: string;
  label: string;
  current: number;
  previous: number;
  change: number;
  direction: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percentage' | 'number' | 'decimal';
  inverse?: boolean;
}

interface ComparisonTableProps {
  data: KPIData[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
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

export function ComparisonTable({
  data,
  currentPeriodLabel,
  previousPeriodLabel,
}: ComparisonTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">KPI</TableHead>
            <TableHead className="text-right">{currentPeriodLabel}</TableHead>
            <TableHead className="text-right">{previousPeriodLabel}</TableHead>
            <TableHead className="text-right">Veränderung</TableHead>
            <TableHead className="text-right">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((kpi) => {
            const isGood = kpi.inverse 
              ? (kpi.direction === 'down') 
              : (kpi.direction === 'up');
            
            return (
              <TableRow key={kpi.key}>
                <TableCell className="font-medium">{kpi.label}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatValue(kpi.current, kpi.format)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatValue(kpi.previous, kpi.format)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    isGood ? "bg-green-100 text-green-700" : kpi.direction === 'neutral' ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"
                  )}>
                    {kpi.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                    {kpi.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                    {kpi.direction === 'neutral' && <Minus className="h-3 w-3" />}
                    {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    {kpi.direction === 'up' && (
                      <TrendingUp className={cn("h-4 w-4", isGood ? "text-green-600" : "text-red-600")} />
                    )}
                    {kpi.direction === 'down' && (
                      <TrendingDown className={cn("h-4 w-4", isGood ? "text-green-600" : "text-red-600")} />
                    )}
                    {kpi.direction === 'neutral' && (
                      <Minus className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
