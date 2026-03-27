'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  Users,
  Eye,
  FileText,
  Lock,
  Globe,
  Monitor,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { analyticsApi, type ProfileOverviewMetrics, type ProfileTimePoint } from '@/api/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { TerminalLoaderPage } from '@/components/loader';

type TabId = 'overview' | 'content' | 'audience';

export default function ProfileAnalyticsPage() {
  const { user, shouldBlock } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [overviewMetrics, setOverviewMetrics] = useState<ProfileOverviewMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<ProfileTimePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.username) return;
    setLoading(true);
    Promise.all([
      analyticsApi.getProfileOverview(user.username),
      analyticsApi.getProfileTimeSeries(user.username),
    ])
      .then(([overview, series]) => {
        if (overview) setOverviewMetrics(overview);
        if (series?.length) setTimeSeries(series);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.username]);

  const chartData = useMemo(() => {
    return timeSeries.map((p) => ({
      name: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: p.views,
      rawDate: p.date
    }));
  }, [timeSeries]);

  if (shouldBlock) return <TerminalLoaderPage />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="w-full space-y-6">
        
        {/* TOP STATUS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-primary flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <Zap className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Analytics</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System_Active: {user?.username}</span>
              </div>
            </div>
          </div>

          <nav className="flex border-2 border-border bg-muted/10 p-1 gap-1 self-start md:self-center">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart2 },
              { id: 'content', label: 'Content_Engagement', icon: FileText },
              { id: 'audience', label: 'Audience_Intel', icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e', 'sk-f'].map((id) => (
              <div key={id} className="h-32 border-4 border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: GLOBAL STATS (4 COLS) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Primary Views Card */}
              <div className="border-4 border-border bg-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Eye className="size-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total_Impressions</p>
                <h2 className="text-5xl font-black italic tabular-nums leading-none tracking-tighter">
                  {overviewMetrics?.totalViews ?? 0}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                    +{overviewMetrics?.views7Days} L7D
                  </span>
                </div>
              </div>

              {/* Unique vs Returning Card */}
              <div className="border-4 border-border bg-card p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Traffic_Composition
                </h3>
                <div className="space-y-3">
                  <CompositionBar label="New Visitors" value={overviewMetrics?.uniqueVisitors7Days ?? 0} total={overviewMetrics?.views7Days ?? 1} color="var(--primary)" />
                  <CompositionBar label="Returning" value={overviewMetrics?.repeatVisitors7Days ?? 0} total={overviewMetrics?.views7Days ?? 1} color="#666" />
                </div>
              </div>

              {/* Live Activity Feed (Mocked Frontend Feature) */}
              <div className="border-4 border-border bg-card p-0 overflow-hidden">
                <div className="bg-border text-card-foreground px-4 py-2 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest">Live_Events</span>
                  <Activity className="size-3 animate-pulse text-red-500" />
                </div>
                <div className="p-4 space-y-3 max-h-[220px] overflow-y-auto font-mono">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="text-[10px] border-l-2 border-primary pl-2 py-1 flex justify-between gap-2">
                      <span className="text-muted-foreground">User_Entry_{i}024</span>
                      <span className="text-primary font-bold">PROFILE_VIEW</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MAIN CHART & SUB-STATS (8 COLS) */}
            <div className="lg:col-span-8 space-y-6">
              {activeTab === 'overview' ? (
                <>
                  {/* Performance Chart Card */}
                  <div className="border-4 border-border bg-card p-6 shadow-[6px_6px_0px_0px_var(--border)] relative">
                    <div className="absolute top-0 left-0 bg-primary px-3 py-1 text-[9px] font-black text-white uppercase tracking-widest">
                      Growth_Engine_v1
                    </div>
                    <div className="h-[320px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border), 0.1)" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }}
                          />
                          <YAxis 
                            axisLine={false} tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="step" 
                            dataKey="views" 
                            stroke="var(--primary)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorViews)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Secondary Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MiniCard icon={Monitor} label="Desktop" value="68%" />
                    <MiniCard icon={Globe} label="Referrers" value="GitHub, X" />
                    <MiniCard icon={ShieldCheck} label="Verification" value="Verified" />
                  </div>
                </>
              ) : (
                /* COMING SOON MODULE */
                <div className="h-full border-4 border-dashed border-border flex flex-col items-center justify-center p-12 text-center bg-muted/5">
                  <div className="size-16 bg-muted border-4 border-border flex items-center justify-center mb-4">
                    <Lock className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-black uppercase italic italic">Module_Locked</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                    Content analytics and Audience psychographics are currently being compiled for your account.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* CONSOLE FOOTER */}
        <div className="flex flex-col md:flex-row items-center justify-between border-t-2 border-border pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
           <div className="flex gap-6">
              <span>LOC: UTC_ZONE</span>
              <span>NODE: SYNTAX_V2</span>
           </div>
           <span>© 2024_ANALYTICS_SUBSYSTEM</span>
        </div>
      </div>
    </div>
  );
}

/** HELPER COMPONENTS **/

function MiniCard({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }>) {
  return (
    <div className="border-4 border-border bg-card p-4 flex items-center gap-4 hover:border-primary transition-colors">
      <div className="size-10 bg-muted border-2 border-border flex items-center justify-center shrink-0">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-black uppercase tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function CompositionBar({
  label,
  value,
  total,
  color,
}: Readonly<{ label: string; value: number; total: number; color: string }>) {
  const percentage = Math.min(100, (value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted border border-border">
        <div 
          className="h-full transition-all duration-1000" 
          style={{ width: `${percentage}%`, backgroundColor: color }} 
        />
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number; payload?: { rawDate?: string } }>;
}>) {
  const row = payload?.[0];
  if (active && row) {
    return (
      <div className="border-2 border-black bg-card p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">
          {row.payload?.rawDate}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black italic">{row.value}</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Hits</span>
        </div>
      </div>
    );
  }
  return null;
}