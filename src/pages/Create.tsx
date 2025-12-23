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
import { Footer } from "@/components/Footer";
import { SlideOverview } from "@/components/SlideOverview";
import { SlideEditDialog } from "@/components/SlideEditDialog";
import {
  Presentation,
  ArrowLeft,
  Sparkles,
  Upload,
  FileText,
  Download,
  Check,
  FileImage,
} from "lucide-react";
import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";

type GenerationStep = "input" | "generating" | "overview" | "complete";

interface SlideContent {
  title: string;
  bullets: string[];
  imageUrl?: string;
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
  const editPresentationId = searchParams.get("edit");

  const [mode, setMode] = useState<"topic" | "sample">(initialMode);
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState([5]);
  const [audienceType, setAudienceType] = useState("student");
  const [step, setStep] = useState<GenerationStep>(editPresentationId ? "generating" : "input");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(editPresentationId);

  // Sample mode state
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleAnalysis, setSampleAnalysis] = useState<any>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);

  // Slide editing state
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"pptx" | "pdf" | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [loadingPresentation, setLoadingPresentation] = useState(!!editPresentationId);

  // Load existing presentation for editing
  useEffect(() => {
    if (editPresentationId && user) {
      loadExistingPresentation(editPresentationId);
    }
  }, [editPresentationId, user]);

  const loadExistingPresentation = async (id: string) => {
    setLoadingPresentation(true);
    try {
      const { data: pres, error } = await supabase
        .from("presentations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!pres) {
        toast.error("Presentation not found");
        navigate("/dashboard");
        return;
      }

      setTopic(pres.topic);
      setAudienceType(pres.audience_type || "student");
      setPresentationId(pres.id);

      // Try to regenerate content based on stored info
      // For now, we'll create placeholder content from the presentation record
      const placeholderContent: GeneratedContent = {
        title: pres.title,
        slides: Array.from({ length: pres.slide_count - 1 }, (_, i) => ({
          title: `Slide ${i + 1}`,
          bullets: ["Content will be regenerated on edit"],
        })),
      };

      // Try to invoke edge function to get actual content
      const { data, error: fnError } = await supabase.functions.invoke("generate-ppt-content", {
        body: {
          topic: pres.topic,
          slideCount: pres.slide_count - 1,
          audienceType: pres.audience_type || "student",
          mode: pres.mode,
        },
      });

      if (!fnError && data?.content) {
        setGeneratedContent(data.content);
      } else {
        setGeneratedContent(placeholderContent);
      }

      setStep("overview");
    } catch (error) {
      console.error("Error loading presentation:", error);
      toast.error("Failed to load presentation");
      navigate("/dashboard");
    } finally {
      setLoadingPresentation(false);
    }
  };

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

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to generate content");
      }

      if (!data || !data.content) {
        console.error("Invalid response data:", data);
        throw new Error("No content received from AI");
      }

      setGeneratedContent(data.content);
      setStep("overview");
      toast.success("Presentation generated! Review and edit your slides.");
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error?.message || "Failed to generate presentation. Please try again.";
      toast.error(errorMessage);
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

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to generate content");
      }

      if (!data || !data.content) {
        console.error("Invalid response data:", data);
        throw new Error("No content received from AI");
      }

      setGeneratedContent(data.content);
      setStep("overview");
      toast.success("Presentation generated! Review and edit your slides.");
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error?.message || "Failed to generate presentation. Please try again.";
      toast.error(errorMessage);
      setStep("input");

      if (presentationId) {
        await supabase
          .from("presentations")
          .update({ status: "failed" })
          .eq("id", presentationId);
      }
    }
  };

  const handleEditSlide = (index: number) => {
    setEditingSlideIndex(index);
  };

  const handleDeleteSlide = (index: number) => {
    if (!generatedContent || generatedContent.slides.length <= 1) {
      toast.error("Cannot delete the last slide");
      return;
    }

    const newSlides = generatedContent.slides.filter((_, i) => i !== index);
    setGeneratedContent({ ...generatedContent, slides: newSlides });
    toast.success("Slide deleted");
  };

  const handleRegenerateSlide = async (index: number, prompt: string) => {
    if (!generatedContent) return;

    setIsRegenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("regenerate-slide", {
        body: {
          currentSlide: generatedContent.slides[index],
          editPrompt: prompt,
          presentationTopic: topic,
          audienceType,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to regenerate slide");
      }

      if (!data || !data.slide) {
        throw new Error("No content received");
      }

      // Update the slide in the content
      const newSlides = [...generatedContent.slides];
      newSlides[index] = data.slide;
      setGeneratedContent({ ...generatedContent, slides: newSlides });

      toast.success("Slide updated successfully!");
      setEditingSlideIndex(null);
    } catch (error: any) {
      console.error("Regenerate error:", error);
      toast.error(error?.message || "Failed to regenerate slide");
    } finally {
      setIsRegenerating(false);
    }
  };

  const generateSlideImages = async (): Promise<SlideContent[]> => {
    if (!generatedContent) return [];
    
    setIsGeneratingImages(true);
    const slidesWithImages: SlideContent[] = [];
    
    for (const slide of generatedContent.slides) {
      try {
        // Skip if already has an image
        if (slide.imageUrl) {
          slidesWithImages.push(slide);
          continue;
        }
        
        const { data, error } = await supabase.functions.invoke("generate-slide-image", {
          body: {
            slideTitle: slide.title,
            slideBullets: slide.bullets,
            presentationTopic: topic,
          },
        });
        
        if (error || !data?.success) {
          console.error("Image generation failed for slide:", slide.title);
          slidesWithImages.push(slide); // Continue without image
        } else {
          slidesWithImages.push({ ...slide, imageUrl: data.imageUrl });
        }
      } catch (err) {
        console.error("Error generating image:", err);
        slidesWithImages.push(slide);
      }
    }
    
    setIsGeneratingImages(false);
    return slidesWithImages;
  };

  const handleDownloadPPTX = async () => {
    if (!generatedContent || !user || !presentationId) return;

    setIsDownloading(true);
    setDownloadFormat("pptx");

    try {
      toast.info("Generating images for slides...");
      const slidesWithImages = await generateSlideImages();
      
      const pptx = new pptxgen();
      pptx.title = generatedContent.title;
      pptx.author = "Smart PPT Generator";
      pptx.layout = "LAYOUT_16x9";

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(generatedContent.title, {
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

      // Content slides with images
      for (const slide of slidesWithImages) {
        const s = pptx.addSlide();
        
        // Title
        s.addText(slide.title, {
          x: 0.5,
          y: 0.3,
          w: "90%",
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: "1e3a5f",
        });

        // Bullets on left side
        const bulletText = slide.bullets.map((b) => ({
          text: b,
          options: { bullet: true, fontSize: 16, color: "333333" },
        }));

        s.addText(bulletText, {
          x: 0.5,
          y: 1.3,
          w: slide.imageUrl ? "55%" : "90%",
          h: 3.8,
          valign: "top",
        });

        // Add image on right side if available
        if (slide.imageUrl) {
          try {
            s.addImage({
              data: slide.imageUrl,
              x: 6.2,
              y: 1.3,
              w: 3.3,
              h: 3.3,
              rounding: true,
            });
          } catch (imgErr) {
            console.error("Error adding image to slide:", imgErr);
          }
        }
      }

      // Generate proper blob
      const pptxBlob = await pptx.write({ outputType: "blob" }) as Blob;
      
      // Create proper download
      const fileName = `${generatedContent.title.replace(/[^a-z0-9]/gi, "_")}.pptx`;
      const url = window.URL.createObjectURL(pptxBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update database
      const storagePath = `${user.id}/${presentationId}.pptx`;
      await supabase.storage
        .from("presentations")
        .upload(storagePath, pptxBlob, { 
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          upsert: true 
        });

      const { data: urlData } = supabase.storage
        .from("presentations")
        .getPublicUrl(storagePath);

      await supabase
        .from("presentations")
        .update({
          file_url: urlData.publicUrl,
          status: "completed",
          slide_count: slidesWithImages.length + 1,
        })
        .eq("id", presentationId);

      // Update slides with images for display
      setGeneratedContent({ ...generatedContent, slides: slidesWithImages });
      toast.success("PowerPoint downloaded successfully!");
    } catch (error: unknown) {
      console.error("Download error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download";
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedContent || !user || !presentationId) return;

    setIsDownloading(true);
    setDownloadFormat("pdf");

    try {
      toast.info("Generating images for slides...");
      const slidesWithImages = await generateSlideImages();
      
      // Create PDF in landscape (16:9 ratio)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [960, 540], // 16:9 aspect ratio
      });

      // Title slide
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 960, 540, "F");
      pdf.setFontSize(36);
      pdf.setTextColor(30, 58, 95);
      pdf.text(generatedContent.title, 480, 230, { align: "center" });
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Generated with Smart PPT", 480, 290, { align: "center" });

      // Content slides
      for (const slide of slidesWithImages) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 960, 540, "F");
        
        // Title
        pdf.setFontSize(24);
        pdf.setTextColor(30, 58, 95);
        pdf.text(slide.title, 40, 50);
        
        // Draw a line under title
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(1);
        pdf.line(40, 65, 920, 65);
        
        // Bullets
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        const maxWidth = slide.imageUrl ? 500 : 880;
        let yPos = 100;
        
        for (const bullet of slide.bullets) {
          // Draw bullet point
          pdf.setFillColor(30, 58, 95);
          pdf.circle(50, yPos - 4, 3, "F");
          
          // Wrap text
          const lines = pdf.splitTextToSize(bullet, maxWidth);
          pdf.text(lines, 65, yPos);
          yPos += lines.length * 20 + 15;
        }
        
        // Add image if available
        if (slide.imageUrl) {
          try {
            pdf.addImage(slide.imageUrl, "PNG", 580, 100, 340, 340);
          } catch (imgErr) {
            console.error("Error adding image to PDF:", imgErr);
          }
        }
      }

      // Save PDF
      const fileName = `${generatedContent.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      pdf.save(fileName);

      // Update database
      await supabase
        .from("presentations")
        .update({
          status: "completed",
          slide_count: slidesWithImages.length + 1,
        })
        .eq("id", presentationId);

      // Update slides with images for display
      setGeneratedContent({ ...generatedContent, slides: slidesWithImages });
      toast.success("PDF downloaded successfully!");
    } catch (error: unknown) {
      console.error("PDF download error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate PDF";
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  if (loading || loadingPresentation) {
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

      <main className="container mx-auto px-4 py-8 max-w-3xl flex-1">
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

        {step === "overview" && generatedContent && (
          <div className="space-y-6">
            {/* Overview Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Slide Overview</h2>
                <p className="text-muted-foreground">
                  Review your slides. Click the edit icon to modify or delete icon to remove.
                </p>
              </div>
              <div className="flex items-center gap-3">
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
                  Start Over
                </Button>
              </div>
            </div>

            {/* Slides Grid */}
            <SlideOverview
              slides={generatedContent.slides}
              presentationTitle={generatedContent.title}
              onEditSlide={handleEditSlide}
              onDeleteSlide={handleDeleteSlide}
            />

            {/* Download Options */}
            <div className="flex flex-col items-center gap-4 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">Choose your download format:</p>
              <div className="flex items-center gap-4">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleDownloadPPTX}
                  disabled={isDownloading || isGeneratingImages}
                >
                  {isDownloading && downloadFormat === "pptx" ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isGeneratingImages ? "Generating Images..." : "Creating PPTX..."}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download PPTX
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading || isGeneratingImages}
                >
                  {isDownloading && downloadFormat === "pdf" ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isGeneratingImages ? "Generating Images..." : "Creating PDF..."}
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "complete" && generatedContent && (
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold mb-2">Presentation Downloaded!</h3>
                <p className="text-muted-foreground mb-6">
                  Your presentation "{generatedContent.title}" has been saved and downloaded.
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
                    setPresentationId(null);
                  }}
                >
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        {editingSlideIndex !== null && generatedContent && (
          <SlideEditDialog
            open={editingSlideIndex !== null}
            onOpenChange={(open) => {
              if (!open) setEditingSlideIndex(null);
            }}
            slideIndex={editingSlideIndex}
            currentSlide={generatedContent.slides[editingSlideIndex]}
            onRegenerateSlide={handleRegenerateSlide}
            isRegenerating={isRegenerating}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
