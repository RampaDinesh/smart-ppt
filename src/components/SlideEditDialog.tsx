import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Sparkles } from "lucide-react";

interface SlideContent {
  title: string;
  bullets: string[];
}

interface SlideEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideIndex: number;
  currentSlide: SlideContent;
  onRegenerateSlide: (index: number, prompt: string) => Promise<void>;
  isRegenerating: boolean;
}

export function SlideEditDialog({
  open,
  onOpenChange,
  slideIndex,
  currentSlide,
  onRegenerateSlide,
  isRegenerating,
}: SlideEditDialogProps) {
  const [editPrompt, setEditPrompt] = useState("");

  const handleSubmit = async () => {
    if (!editPrompt.trim()) return;
    await onRegenerateSlide(slideIndex, editPrompt);
    setEditPrompt("");
  };

  const handleClose = () => {
    if (!isRegenerating) {
      setEditPrompt("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Slide {slideIndex + 1}</DialogTitle>
          <DialogDescription>
            Describe the changes you want to make to this slide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Slide Preview */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Current Content:</p>
            <p className="font-semibold text-primary">{currentSlide.title}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {currentSlide.bullets.slice(0, 3).map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2" />
                  <span className="line-clamp-1">{bullet}</span>
                </li>
              ))}
              {currentSlide.bullets.length > 3 && (
                <li className="text-xs text-muted-foreground/60">
                  +{currentSlide.bullets.length - 3} more points
                </li>
              )}
            </ul>
          </div>

          {/* Edit Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt">What changes do you want?</Label>
            <Textarea
              id="edit-prompt"
              placeholder="e.g., Make it more concise, add more examples, focus on practical applications..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              disabled={isRegenerating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!editPrompt.trim() || isRegenerating}
            variant="gradient"
          >
            {isRegenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate Slide
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
