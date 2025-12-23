import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Presentation,
  Plus,
  Download,
  Clock,
  FileText,
  LogOut,
  Sparkles,
  Upload,
  LayoutDashboard,
  ShieldCheck,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface PresentationRecord {
  id: string;
  title: string;
  topic: string;
  mode: string;
  slide_count: number;
  audience_type: string | null;
  file_url: string | null;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading, signOut, isAdmin, displayName } = useAuth();
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState<PresentationRecord[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPresentations();
    }
  }, [user]);

  const fetchPresentations = async () => {
    try {
      const { data, error } = await supabase
        .from("presentations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPresentations(data || []);
    } catch (error) {
      toast.error("Failed to load presentations");
    } finally {
      setLoadingPresentations(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const handleDeletePresentation = async () => {
    if (!presentationToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("presentations")
        .delete()
        .eq("id", presentationToDelete);
      
      if (error) throw error;
      
      setPresentations(presentations.filter(p => p.id !== presentationToDelete));
      toast.success("Presentation deleted");
    } catch (error) {
      toast.error("Failed to delete presentation");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPresentationToDelete(null);
    }
  };

  const handleOpenPresentation = (pres: PresentationRecord) => {
    navigate(`/create?edit=${pres.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "generating":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-bg rounded-lg flex items-center justify-center">
              <Presentation className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Smart PPT</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Button>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-muted-foreground">Create and manage your presentations</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card 
            className="group cursor-pointer hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20"
            onClick={() => navigate("/create?mode=topic")}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Topic Mode
                <Badge variant="secondary">Quick</Badge>
              </CardTitle>
              <CardDescription>
                Enter a topic and let AI generate a complete presentation with structured slides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="gradient" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create from Topic
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-accent/20"
            onClick={() => navigate("/create?mode=sample")}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Sample Mode
                <Badge variant="secondary">Pro</Badge>
              </CardTitle>
              <CardDescription>
                Upload a sample PPT and create new content matching its style and structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Sample
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Presentations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-xl font-semibold">Your Presentations</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {presentations.length} total
            </span>
          </div>

          {loadingPresentations ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : presentations.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">No presentations yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Create your first presentation to get started
                  </p>
                </div>
                <Button variant="gradient" onClick={() => navigate("/create?mode=topic")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Presentation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {presentations.map((pres) => (
                <Card 
                  key={pres.id} 
                  className="hover:shadow-soft transition-shadow cursor-pointer group"
                  onClick={() => handleOpenPresentation(pres)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{pres.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(pres.created_at), "MMM d, yyyy")}
                            </span>
                            <span>{pres.slide_count} slides</span>
                            <Badge variant="outline" className="capitalize">
                              {pres.mode}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(pres.status)}>
                          {pres.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPresentation(pres);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {pres.status === "completed" && pres.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(pres.file_url!, "_blank");
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPresentationToDelete(pres.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Presentation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your presentation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePresentation}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
