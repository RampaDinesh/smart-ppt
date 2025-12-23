import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/Footer";
import { 
  Presentation, 
  Sparkles, 
  Upload, 
  Download, 
  Users, 
  Zap,
  ArrowRight,
  Check,
  Linkedin,
  Github
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: "Topic Mode",
      description: "Enter any topic and let AI create exam-friendly presentations with structured content.",
    },
    {
      icon: Upload,
      title: "Sample Mode",
      description: "Upload a sample PPT and we'll match its structure and style for your new topic.",
    },
    {
      icon: Download,
      title: "Instant Download",
      description: "Get your polished .pptx files ready to use within seconds.",
    },
  ];

  const benefits = [
    "AI-powered content generation",
    "Exam-friendly bullet points",
    "Multiple audience types",
    "Structure matching from samples",
    "Secure file handling",
    "History & download tracking",
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-soft">
            <Presentation className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">Smart PPT</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Button onClick={() => navigate("/dashboard")} variant="gradient">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} variant="gradient">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-fade-in">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Presentation Generator</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            Create Stunning
            <span className="gradient-text block">Presentations</span>
            in Seconds
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Generate exam-friendly PowerPoint presentations from any topic, or match the style of your existing slides. Perfect for students and teachers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              size="xl" 
              variant="hero" 
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="min-w-[200px]"
            >
              {user ? "Open Dashboard" : "Start Creating Free"}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              size="xl" 
              variant="outline" 
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              See How It Works
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-8 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {[
            { value: "2", label: "Generation Modes" },
            { value: "4", label: "Audience Types" },
            { value: "∞", label: "Possibilities" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-4xl font-display font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Two Powerful Modes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose between generating from a topic or matching an existing presentation's style.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Everything You Need for
                <span className="gradient-text"> Perfect Slides</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Our AI understands educational content and creates presentations that are exam-focused, well-structured, and easy to understand.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 gradient-bg rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-card rounded-2xl shadow-medium p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">For Students & Teachers</div>
                    <div className="text-sm text-muted-foreground">Tailored content for education</div>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Topic</span>
                    <span className="font-medium">Photosynthesis</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Slides</span>
                    <span className="font-medium">8 slides</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Audience</span>
                    <span className="font-medium">Student</span>
                  </div>
                </div>
                <Button className="w-full" variant="gradient">
                  Generate Presentation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-dark">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Create Amazing Presentations?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-10">
            Join thousands of students and teachers who save hours creating professional presentations.
          </p>
          <Button 
            size="xl" 
            variant="secondary"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
            className="min-w-[200px]"
          >
            {user ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl font-bold mb-4">About</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Smart PPT Generator is designed to help students and educators create professional presentations effortlessly using AI technology.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-muted-foreground">Developed by Dinesh</span>
            <a
              href="https://www.linkedin.com/in/dinesh-rampa-483963284"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="LinkedIn Profile"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/RampaDinesh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="GitHub Profile"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
