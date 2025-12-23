import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Presentation,
  ArrowLeft,
  Sparkles,
  Upload,
  FileText,
  Download,
  Check,
} from "lucide-react";
import pptxgen from "pptxgenjs";

type GenerationStep = "input" | "generating" | "complete";

interface SlideContent {
  title: string;
  bullets: string[];
}

interface GeneratedContent {
  title: string;
  slides: SlideContent[];
}

export default function Create() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "sample" ? "sample" : "topic";

  const [mode, setMode] = useState<"topic" | "sample">(initialMode);
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState([5]);
  const [audienceType, setAudienceType] = useState("student");
  const [step, setStep] = useState<GenerationStep>("input");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);

  // Sample mode state
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleAnalysis, setSampleAnalysis] = useState<any>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleTopicGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!user) return;

    setStep("generating");

    try {
      // Create presentation record
      const { data: presData, error: presError } = await supabase
        .from("presentations")
        .insert({
          user_id: user.id,
          title: topic,
          topic: topic,
          mode: "topic",
          slide_count: slideCount[0],
          audience_type: audienceType,
          status: "generating",
        })
        .select()
        .single();

      if (presError) throw presError;
      setPresentationId(presData.id);

      // Call edge function to generate content
      const { data, error } = await supabase.functions.invoke("generate-ppt-content", {
        body: {
          topic,
          slideCount: slideCount[0],
          audienceType,
          mode: "topic",
        },
      });

      if (error) throw error;

      setGeneratedContent(data.content);

      // Generate and download PPT
      await generatePPTFile(data.content, presData.id);

      setStep("complete");
      toast.success("Presentation generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate presentation");
      setStep("input");

      // Update status to failed
      if (presentationId) {
        await supabase
          .from("presentations")
          .update({ status: "failed" })
          .eq("id", presentationId);
      }
    }
  };

  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pptx")) {
      toast.error("Please upload a .pptx file");
      return;
    }

    setSampleFile(file);
    setAnalyzingFile(true);

    try {
      // For now, we'll simulate analysis with default structure
      // In production, you'd send this to a backend for parsing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockAnalysis = {
        slideCount: 5,
        averageBulletsPerSlide: 4,
        averageBulletLength: 12,
        hasImages: false,
        structure: "title-content-conclusion",
      };

      setSampleAnalysis(mockAnalysis);
      toast.success("Sample analyzed successfully!");
    } catch (error) {
      toast.error("Failed to analyze sample file");
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleSampleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!sampleAnalysis) {
      toast.error("Please upload and analyze a sample first");
      return;
    }

    if (!user) return;

    setStep("generating");

    try {
      const { data: presData, error: presError } = await supabase
        .from("presentations")
        .insert({
          user_id: user.id,
          title: topic,
          topic: topic,
          mode: "sample",
          slide_count: sampleAnalysis.slideCount,
          sample_analysis: sampleAnalysis,
          status: "generating",
        })
        .select()
        .single();

      if (presError) throw presError;
      setPresentationId(presData.id);

      const { data, error } = await supabase.functions.invoke("generate-ppt-content", {
        body: {
          topic,
          slideCount: sampleAnalysis.slideCount,
          audienceType: "professional",
          mode: "sample",
          sampleAnalysis,
        },
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      await generatePPTFile(data.content, presData.id);

      setStep("complete");
      toast.success("Presentation generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate presentation");
      setStep("input");
    }
  };

  const generatePPTFile = async (content: GeneratedContent, presId: string) => {
    const pptx = new pptxgen();
    pptx.title = content.title;
    pptx.author = "Smart PPT Generator";

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(content.title, {
      x: 0.5,
      y: "40%",
      w: "90%",
      h: 1.5,
      fontSize: 44,
      bold: true,
      align: "center",
      color: "1e3a5f",
    });
    titleSlide.addText(`Generated with Smart PPT`, {
      x: 0.5,
      y: "60%",
      w: "90%",
      h: 0.5,
      fontSize: 18,
      align: "center",
      color: "666666",
    });

    // Content slides
    content.slides.forEach((slide) => {
      const s = pptx.addSlide();
      s.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: "90%",
        h: 1,
        fontSize: 32,
        bold: true,
        color: "1e3a5f",
      });

      const bulletText = slide.bullets.map((b) => ({
        text: b,
        options: { bullet: true, fontSize: 18, color: "333333" },
      }));

      s.addText(bulletText, {
        x: 0.75,
        y: 1.75,
        w: "85%",
        h: 4,
        valign: "top",
      });
    });

    // Generate blob and upload
    const blob = await pptx.write({ outputType: "blob" });
    const fileName = `${user!.id}/${presId}.pptx`;

    const { error: uploadError } = await supabase.storage
      .from("presentations")
      .upload(fileName, blob, { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("presentations")
      .getPublicUrl(fileName);

    await supabase
      .from("presentations")
      .update({
        file_url: urlData.publicUrl,
        status: "completed",
      })
      .eq("id", presId);

    // Trigger download
    const downloadUrl = URL.createObjectURL(blob as Blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, "_")}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
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
            <span className="font-display font-bold text-lg">Create Presentation</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {step === "input" && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "topic" | "sample")}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="topic" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Topic Mode
              </TabsTrigger>
              <TabsTrigger value="sample" className="gap-2">
                <Upload className="h-4 w-4" />
                Sample Mode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="topic">
              <Card>
                <CardHeader>
                  <CardTitle>Generate from Topic</CardTitle>
                  <CardDescription>
                    Enter your topic and we'll create an exam-friendly presentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., Photosynthesis, World War II, Machine Learning..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Number of Slides</Label>
                      <span className="text-sm font-medium text-primary">{slideCount[0]} slides</span>
                    </div>
                    <Slider
                      value={slideCount}
                      onValueChange={setSlideCount}
                      min={3}
                      max={15}
                      step={1}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Audience Type</Label>
                    <Select value={audienceType} onValueChange={setAudienceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    variant="gradient"
                    size="lg"
                    onClick={handleTopicGenerate}
                    disabled={!topic.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Presentation
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sample">
              <Card>
                <CardHeader>
                  <CardTitle>Generate from Sample</CardTitle>
                  <CardDescription>
                    Upload a sample presentation and we'll match its style
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Upload Sample PPT</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                      {analyzingFile ? (
                        <div className="space-y-3">
                          <LoadingSpinner size="lg" className="mx-auto text-primary" />
                          <p className="text-sm text-muted-foreground">Analyzing structure...</p>
                        </div>
                      ) : sampleFile ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{sampleFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sampleAnalysis?.slideCount} slides detected
                            </p>
                          </div>
                          <label className="inline-block cursor-pointer text-sm text-primary hover:underline">
                            Change file
                            <input
                              type="file"
                              accept=".pptx"
                              className="hidden"
                              onChange={handleSampleUpload}
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <label className="cursor-pointer">
                            <span className="text-primary font-medium hover:underline">
                              Click to upload
                            </span>
                            <span className="text-muted-foreground"> or drag and drop</span>
                            <input
                              type="file"
                              accept=".pptx"
                              className="hidden"
                              onChange={handleSampleUpload}
                            />
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">.pptx files only</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sample-topic">New Topic</Label>
                    <Input
                      id="sample-topic"
                      placeholder="Enter the topic for your new presentation..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    variant="gradient"
                    size="lg"
                    onClick={handleSampleGenerate}
                    disabled={!topic.trim() || !sampleAnalysis}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Matching Presentation
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {step === "generating" && (
          <Card className="text-center py-16">
            <CardContent className="space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 gradient-bg rounded-2xl animate-pulse" />
                <div className="absolute inset-2 bg-card rounded-xl flex items-center justify-center">
                  <LoadingSpinner size="lg" className="text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold mb-2">Generating Your Presentation</h3>
                <p className="text-muted-foreground">
                  AI is crafting your slides... This may take a moment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "complete" && generatedContent && (
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold mb-2">Presentation Ready!</h3>
                <p className="text-muted-foreground mb-6">
                  Your presentation "{generatedContent.title}" has been generated and downloaded.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gradient" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("input");
                    setTopic("");
                    setGeneratedContent(null);
                    setSampleFile(null);
                    setSampleAnalysis(null);
                  }}
                >
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
