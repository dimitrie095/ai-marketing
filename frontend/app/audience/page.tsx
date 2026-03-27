"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KPICard } from "@/components/dashboard/kpi-card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Calendar as CalendarIcon, Users, Globe, Smartphone, Heart, Activity, AlertCircle, Filter, TrendingUp, MapPin, Monitor, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { getAudienceDemographics, getAudienceGeographic, getAudienceDevices, getAudienceInterests, getAudienceReach, getAudienceSummary, getAudienceBehavior, getCampaigns } from "@/lib/api";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#9ca3af'];

interface DemographicsData {
  age_ranges: Array<{ range: string; percentage: number; male: number; female: number }>;
  gender: { male: number; female: number; unknown: number };
}

interface GeographicData { country: string; code: string; users: number; percentage: number }
interface DeviceInfo { type: string; percentage: number; users: number }
interface PlatformInfo { name: string; percentage: number; users: number }
interface BrowserInfo { name: string; percentage: number; users: number }
interface DevicesData { devices: DeviceInfo[]; platforms: PlatformInfo[]; browsers: BrowserInfo[] }
interface InterestsData { category: string; percentage: number; affinity_score: number }
interface DailyReach { date: string; reach: number; impressions: number; frequency: number }
interface ReachData { total_reach: number; total_impressions: number; average_frequency: number; frequency_distribution: any[]; daily_data: DailyReach[] }
interface Campaign { id: string; name: string }

const formatPercent = (value: any) => `${value}%`;
const formatNumber = (value: any) => value?.toLocaleString('de-DE') || '0';

export default function AudiencePage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ from: subDays(new Date(), 30), to: new Date() });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demographics, setDemographics] = useState<DemographicsData | null>(null);
  const [geographic, setGeographic] = useState<GeographicData[]>([]);
  const [devices, setDevices] = useState<DevicesData | null>(null);
  const [interests, setInterests] = useState<InterestsData[]>([]);
  const [reach, setReach] = useState<ReachData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [behavior, setBehavior] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  useEffect(() => { loadAudienceData(); loadCampaignsList(); }, [dateRange]);

  const loadCampaignsList = async () => {
    try {
      const response = await getCampaigns();
      if (response.status === 'success' && response.campaigns) setCampaigns(response.campaigns);
    } catch (err) { console.error("Failed to load campaigns:", err); }
  };

  const loadAudienceData = async () => {
    try {
      setLoading(true); setError(null);
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      const campaignIds = selectedCampaign ? [selectedCampaign] : undefined;
      
      if (activeTab === "overview") {
        const [demoRes, geoRes, devRes, intRes, reachRes, sumRes] = await Promise.all([
          getAudienceDemographics(startDate, endDate, campaignIds), getAudienceGeographic(startDate, endDate, campaignIds),
          getAudienceDevices(startDate, endDate, campaignIds), getAudienceInterests(startDate, endDate, campaignIds, 10),
          getAudienceReach(startDate, endDate, campaignIds), getAudienceSummary(startDate, endDate, campaignIds),
        ]);
        if (demoRes.status === 'success') setDemographics(demoRes.demographics);
        if (geoRes.status === 'success') setGeographic(geoRes.geographic);
        if (devRes.status === 'success') setDevices(devRes.devices);
        if (intRes.status === 'success') setInterests(intRes.interests);
        if (reachRes.status === 'success') setReach(reachRes.reach);
        if (sumRes.status === 'success') setSummary(sumRes.summary);
      } else if (activeTab === "demographics") {
        const res = await getAudienceDemographics(startDate, endDate, campaignIds);
        if (res.status === 'success') setDemographics(res.demographics);
      } else if (activeTab === "geographic") {
        const res = await getAudienceGeographic(startDate, endDate, campaignIds);
        if (res.status === 'success') setGeographic(res.geographic);
      } else if (activeTab === "devices") {
        const res = await getAudienceDevices(startDate, endDate, campaignIds);
        if (res.status === 'success') setDevices(res.devices);
      } else if (activeTab === "interests") {
        const res = await getAudienceInterests(startDate, endDate, campaignIds, 10);
        if (res.status === 'success') setInterests(res.interests);
      } else if (activeTab === "reach") {
        const res = await getAudienceReach(startDate, endDate, campaignIds);
        if (res.status === 'success') setReach(res.reach);
      } else if (activeTab === "behavior") {
        const res = await getAudienceBehavior(startDate, endDate, campaignIds);
        if (res.status === 'success') setBehavior(res.behavior);
      }
    } catch (err) {
      console.error("Audience data load error:", err);
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Audience-Daten");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAudienceData(); }, [activeTab]);

  const ageChartData = useMemo(() => demographics?.age_ranges?.map(age => ({ range: age.range, male: age.male, female: age.female, total: age.percentage })) || [], [demographics]);
  const genderChartData = useMemo(() => demographics?.gender ? [{ name: 'Männlich', value: demographics.gender.male }, { name: 'Weiblich', value: demographics.gender.female }, { name: 'Unbekannt', value: demographics.gender.unknown }] : [], [demographics]);
  const geographicChartData = useMemo(() => geographic.slice(0, 6).map(g => ({ country: g.country, users: g.users, percentage: g.percentage })), [geographic]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audience Insights</h1>
            <p className="text-muted-foreground">Detaillierte Analyse Ihrer Zielgruppe</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedCampaign || "all"} onValueChange={(value) => setSelectedCampaign(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[200px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Alle Kampagnen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kampagnen</SelectItem>
                {campaigns.map((campaign: Campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "dd.MM.yyyy", { locale: de })} - {format(dateRange.to, "dd.MM.yyyy", { locale: de })}</> : format(dateRange.from, "dd.MM.yyyy", { locale: de })) : <span>Zeitraum wählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => { if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to }); }} numberOfMonths={2} locale={de} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="demographics">Demografie</TabsTrigger>
            <TabsTrigger value="geographic">Geografie</TabsTrigger>
            <TabsTrigger value="devices">Geräte</TabsTrigger>
            <TabsTrigger value="interests">Interessen</TabsTrigger>
            <TabsTrigger value="behavior">Verhalten</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {summary && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard title="Gesamtreichweite" value={summary.total_reach?.toLocaleString('de-DE') || '0'} description="Einzigartige Nutzer" trend="up" trendValue="+12%" icon={<Users className="h-4 w-4" />} />
                <KPICard title="Ø Frequenz" value={summary.average_frequency?.toFixed(2) || '0'} description="Durchschn. Impressionen pro Nutzer" trend="neutral" trendValue="0%" icon={<Activity className="h-4 w-4" />} />
                <KPICard title="Top Land" value={summary.top_country?.country || '-'} description={`${summary.top_country?.percentage?.toFixed(1) || 0}% der Audience`} trend="up" trendValue="+5%" icon={<Globe className="h-4 w-4" />} />
                <KPICard title="Top Gerät" value={summary.top_device?.type || '-'} description={`${summary.top_device?.percentage?.toFixed(1) || 0}% der Aufrufe`} trend="up" trendValue="+8%" icon={<Smartphone className="h-4 w-4" />} />
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Altersverteilung</CardTitle><CardDescription>Verteilung nach Altersgruppen</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ageChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" unit="%" /><YAxis dataKey="range" type="category" width={60} /><Tooltip formatter={formatPercent} /><Legend /><Bar dataKey="male" name="Männlich" fill="#3b82f6" stackId="a" /><Bar dataKey="female" name="Weiblich" fill="#ec4899" stackId="a" /></BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Top Länder</CardTitle><CardDescription>Geografische Verteilung</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={geographicChartData} dataKey="users" nameKey="country" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.country}: ${props.percentage}%`}>{geographicChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={formatNumber} /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" />Geräteverteilung</CardTitle><CardDescription>Nutzung nach Gerätetyp</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={devices?.devices || []} dataKey="percentage" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.type}: ${props.percentage}%`}>{(devices?.devices || []).map((entry, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={formatPercent} /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Top Interessen</CardTitle><CardDescription>Beliebteste Interessenskategorien</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={interests.slice(0, 5)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" angle={-45} textAnchor="end" height={80} /><YAxis /><Tooltip formatter={formatPercent} /><Bar dataKey="percentage" fill="#8b5cf6" /></BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            {reach && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Reichweiten-Entwicklung</CardTitle><CardDescription>Entwicklung von Reichweite und Impressionen</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={reach.daily_data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), "dd.MM.", { locale: de })} /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip labelFormatter={(date) => format(new Date(date as string), "dd.MM.yyyy", { locale: de })} formatter={(value: any) => [formatNumber(value), '']} /><Legend /><Area yAxisId="left" type="monotone" dataKey="reach" name="Reichweite" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} /><Area yAxisId="right" type="monotone" dataKey="impressions" name="Impressionen" stroke="#10b981" fill="#10b981" fillOpacity={0.3} /></AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="demographics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Altersverteilung</CardTitle><CardDescription>Verteilung nach Altersgruppen und Geschlecht</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={ageChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis unit="%" /><Tooltip formatter={formatPercent} /><Legend /><Bar dataKey="male" name="Männlich" fill="#3b82f6" /><Bar dataKey="female" name="Weiblich" fill="#ec4899" /></BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Geschlechterverteilung</CardTitle><CardDescription>Prozentuale Verteilung nach Geschlecht</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart><Pie data={genderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={(props: any) => `${props.name}: ${props.value}%`}>{genderChartData.map((entry, index: number) => <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />)}</Pie><Tooltip formatter={formatPercent} /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Detaillierte Altersstatistik</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b"><th className="text-left py-2 px-4">Altersgruppe</th><th className="text-right py-2 px-4">Gesamt %</th><th className="text-right py-2 px-4">Männlich %</th><th className="text-right py-2 px-4">Weiblich %</th></tr></thead>
                    <tbody>{demographics?.age_ranges?.map((age, index: number) => <tr key={index} className="border-b"><td className="py-2 px-4 font-medium">{age.range}</td><td className="text-right py-2 px-4">{age.percentage}%</td><td className="text-right py-2 px-4 text-blue-600">{age.male}%</td><td className="text-right py-2 px-4 text-pink-600">{age.female}%</td></tr>)}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geographic" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Länderverteilung</CardTitle><CardDescription>Geografische Verteilung Ihrer Audience</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={geographic} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="country" type="category" width={120} /><Tooltip /><Legend /><Bar dataKey="users" name="Nutzer" fill="#3b82f6" /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Detaillierte Geografie-Statistik</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b"><th className="text-left py-2 px-4">Land</th><th className="text-right py-2 px-4">Nutzer</th><th className="text-right py-2 px-4">Anteil</th><th className="text-left py-2 px-4">Trend</th></tr></thead>
                    <tbody>{geographic.map((country, index: number) => <tr key={index} className="border-b"><td className="py-2 px-4 font-medium">{country.country}</td><td className="text-right py-2 px-4">{country.users.toLocaleString('de-DE')}</td><td className="text-right py-2 px-4">{country.percentage}%</td><td className="py-2 px-4"><Badge variant={index < 3 ? "default" : "secondary"}>{index < 3 ? "↑ Wachsend" : "→ Stabil"}</Badge></td></tr>)}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader><CardTitle>Gerätetypen</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={devices?.devices || []} dataKey="percentage" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>{(devices?.devices || []).map((entry, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={formatPercent} /><Legend /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Plattformen</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={devices?.platforms || []} dataKey="percentage" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{(devices?.platforms || []).map((entry, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={formatPercent} /><Legend /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Browser</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={devices?.browsers || []} dataKey="percentage" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{(devices?.browsers || []).map((entry, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={formatPercent} /><Legend /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interests" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Interessenkategorien</CardTitle><CardDescription>Beliebteste Interessen Ihrer Audience</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={interests} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" unit="%" /><YAxis dataKey="category" type="category" width={180} /><Tooltip /><Legend /><Bar dataKey="percentage" name="Anteil %" fill="#8b5cf6" /><Bar dataKey="affinity_score" name="Affinity Score" fill="#10b981" /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Detaillierte Interessen-Statistik</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b"><th className="text-left py-2 px-4">Kategorie</th><th className="text-right py-2 px-4">Anteil</th><th className="text-right py-2 px-4">Affinity Score</th><th className="text-left py-2 px-4">Relevanz</th></tr></thead>
                    <tbody>{interests.map((interest, index: number) => <tr key={index} className="border-b"><td className="py-2 px-4 font-medium">{interest.category}</td><td className="text-right py-2 px-4">{interest.percentage}%</td><td className="text-right py-2 px-4">{interest.affinity_score}/10</td><td className="py-2 px-4"><Badge variant={interest.affinity_score >= 7 ? "default" : interest.affinity_score >= 5 ? "secondary" : "outline"}>{interest.affinity_score >= 7 ? "Hoch" : interest.affinity_score >= 5 ? "Mittel" : "Niedrig"}</Badge></td></tr>)}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            {behavior && (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Aktivität nach Uhrzeit</CardTitle><CardDescription>Engagement-Rate über den Tag</CardDescription></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={behavior.hourly_engagement}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Area type="monotone" dataKey="engagement_rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} /></AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />Aktivität nach Wochentag</CardTitle><CardDescription>Engagement-Rate nach Tag</CardDescription></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={behavior.daily_engagement}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="engagement_rate" name="Engagement Rate" fill="#8b5cf6" /></BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Nutzersegmente</CardTitle><CardDescription>Verteilung nach Nutzertyp</CardDescription></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b"><th className="text-left py-2 px-4">Segment</th><th className="text-left py-2 px-4">Beschreibung</th><th className="text-right py-2 px-4">Anteil</th><th className="text-right py-2 px-4">Conversion Rate</th></tr></thead>
                        <tbody>{behavior.user_segments?.map((segment: any, index: number) => <tr key={index} className="border-b"><td className="py-2 px-4 font-medium">{segment.name}</td><td className="py-2 px-4 text-muted-foreground">{segment.description}</td><td className="text-right py-2 px-4">{segment.percentage}%</td><td className="text-right py-2 px-4"><Badge variant={segment.conversion_rate >= 5 ? "default" : "secondary"}>{segment.conversion_rate}%</Badge></td></tr>)}</tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
