import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import {
  Presentation,
  ArrowLeft,
  Users,
  FileText,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { format, subDays } from "date-fns";

interface Stats {
  totalUsers: number;
  totalPresentations: number;
  presentationsToday: number;
  presentationsThisWeek: number;
}

interface RecentPresentation {
  id: string;
  title: string;
  mode: string;
  status: string;
  created_at: string;
}

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPresentations, setRecentPresentations] = useState<RecentPresentation[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && user && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  const fetchStats = async () => {
    try {
      // Fetch total users count (via profiles)
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch all presentations for stats
      const { data: allPresentations, count: totalCount } = await supabase
        .from("presentations")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(10);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = subDays(today, 7);

      // Count presentations today and this week
      const { count: todayCount } = await supabase
        .from("presentations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const { count: weekCount } = await supabase
        .from("presentations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      setStats({
        totalUsers: userCount || 0,
        totalPresentations: totalCount || 0,
        presentationsToday: todayCount || 0,
        presentationsThisWeek: weekCount || 0,
      });

      setRecentPresentations(allPresentations || []);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Failed to load admin statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-bg rounded-lg flex items-center justify-center">
              <Presentation className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Admin Dashboard</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Admin Overview</h1>
          <p className="text-muted-foreground">Monitor platform usage and statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalUsers || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <CardDescription>Total Presentations</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalPresentations || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardDescription>Created Today</CardDescription>
              <CardTitle className="text-3xl">{stats?.presentationsToday || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardDescription>This Week</CardDescription>
              <CardTitle className="text-3xl">{stats?.presentationsThisWeek || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Presentations</CardTitle>
            <CardDescription>Latest presentations created on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPresentations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No presentations yet</p>
            ) : (
              <div className="space-y-4">
                {recentPresentations.map((pres) => (
                  <div
                    key={pres.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{pres.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {pres.mode} mode • {pres.status}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(pres.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
