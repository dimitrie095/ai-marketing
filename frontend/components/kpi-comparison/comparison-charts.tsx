"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface TrendDataPoint {
  date: string;
  current: number;
  previous: number;
}

interface RatioDataPoint {
  name: string;
  current: number;
  previous: number;
}

interface ComparisonChartsProps {
  trendData: TrendDataPoint[];
  ratioData: RatioDataPoint[];
  selectedKPI: string;
}

const formatChartValue = (value: number, kpi: string): string => {
  if (kpi.includes('spend') || kpi.includes('revenue') || kpi.includes('cpc')) {
    return `€${value.toFixed(0)}`;
  }
  if (kpi.includes('ctr') || kpi.includes('cvr')) {
    return `${value.toFixed(2)}%`;
  }
  if (kpi.includes('roas')) {
    return `${value.toFixed(2)}x`;
  }
  return value.toFixed(0);
};

const getKPILabel = (kpi: string): string => {
  const labels: Record<string, string> = {
    'spend': 'Ausgaben',
    'revenue': 'Umsatz',
    'ctr': 'CTR',
    'cpc': 'CPC',
    'roas': 'ROAS',
    'cvr': 'CVR',
    'impressions': 'Impressionen',
    'clicks': 'Klicks',
    'conversions': 'Conversions',
  };
  return labels[kpi] || kpi;
};

export function ComparisonCharts({
  trendData,
  ratioData,
  selectedKPI,
}: ComparisonChartsProps) {
  const kpiLabel = getKPILabel(selectedKPI);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trendvergleich - {kpiLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), 'dd.MM.', { locale: de })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatChartValue(value, selectedKPI)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelFormatter={(date) => format(parseISO(date as string), 'dd.MM.yyyy', { locale: de })}
                  formatter={(value) => [formatChartValue(Number(value), selectedKPI), '']}
                />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Aktueller Zeitraum"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Vergleichszeitraum"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ratio Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">KPI-Verhältnis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratioData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatChartValue(value, selectedKPI)}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => [formatChartValue(Number(value), selectedKPI), '']}
                />
                <Legend />
                <Bar
                  dataKey="current"
                  name="Aktuell"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="previous"
                  name="Vorher"
                  fill="hsl(var(--muted-foreground))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
