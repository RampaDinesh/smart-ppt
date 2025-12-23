import { Linkedin } from "lucide-react";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`py-6 border-t border-border bg-card/50 ${className}`}>
      <div className="container mx-auto px-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>Developed by Dinesh</span>
        <a
          href="https://www.linkedin.com/in/your-profile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          aria-label="LinkedIn Profile"
        >
          <Linkedin className="h-4 w-4" />
        </a>
      </div>
    </footer>
  );
}
