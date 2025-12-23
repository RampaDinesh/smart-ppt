import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, GripVertical } from "lucide-react";

interface SlideContent {
  title: string;
  bullets: string[];
}

interface SlideOverviewProps {
  slides: SlideContent[];
  presentationTitle: string;
  onEditSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
}

export function SlideOverview({
  slides,
  presentationTitle,
  onEditSlide,
  onDeleteSlide,
}: SlideOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Title Slide Preview */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              Title Slide
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-xl font-bold text-primary">{presentationTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generated with Smart PPT
          </p>
        </CardContent>
      </Card>

      {/* Content Slides */}
      {slides.map((slide, index) => (
        <Card
          key={index}
          className="group hover:shadow-md transition-all duration-200 border hover:border-primary/30"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <Badge variant="outline" className="text-xs">
                    Slide {index + 1}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onEditSlide(index)}
                  title="Edit slide"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteSlide(index)}
                  title="Delete slide"
                  disabled={slides.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg mb-3">{slide.title}</CardTitle>
            <ul className="space-y-2">
              {slide.bullets.map((bullet, bulletIndex) => (
                <li
                  key={bulletIndex}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
