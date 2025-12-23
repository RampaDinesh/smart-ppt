import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, GripVertical, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SlideContent {
  title: string;
  bullets: string[];
  imageUrl?: string;
}

interface SlideOverviewProps {
  slides: SlideContent[];
  presentationTitle: string;
  onEditSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onRegenerateImage?: (index: number) => Promise<void>;
  regeneratingImageIndex?: number | null;
}

export function SlideOverview({
  slides,
  presentationTitle,
  onEditSlide,
  onDeleteSlide,
  onRegenerateImage,
  regeneratingImageIndex,
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
            <div className="flex gap-4">
              {/* Text Content */}
              <div className="flex-1">
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
              </div>
              
              {/* Image Section */}
              <div className="w-40 h-32 flex-shrink-0 relative group/image">
                {regeneratingImageIndex === index ? (
                  <div className="w-full h-full rounded-lg border border-border bg-muted flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : slide.imageUrl ? (
                  <>
                    <img 
                      src={slide.imageUrl} 
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-border"
                    />
                    {onRegenerateImage && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover/image:opacity-100 transition-opacity shadow-md"
                        onClick={() => onRegenerateImage(index)}
                        title="Replace image"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div 
                    className="w-full h-full rounded-lg border border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors group/placeholder"
                    onClick={() => onRegenerateImage?.(index)}
                    title="Click to generate image"
                  >
                    {onRegenerateImage && (
                      <RefreshCw className="h-5 w-5 text-muted-foreground/50 group-hover/placeholder:text-muted-foreground transition-colors" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}