"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Bot,
  CheckCircle2,
  Image as ImageIcon,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroMediaProps {
  /**
   * Optional custom image source path.
   * Defaults to "/images/dentassist-hero.webp" located in `public/images/dentassist-hero.webp`.
   */
  imageSrc?: string;
  /**
   * Accessible description for the hero image.
   */
  alt?: string;
  className?: string;
}

export function HeroMedia({
  imageSrc = "/images/dentassist-hero.webp",
  alt = "DentAssist AI dental practice receptionist and Google Calendar scheduling platform",
  className,
}: Readonly<HeroMediaProps>) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={cn(
        "relative w-full max-w-2xl mx-auto lg:max-w-none group",
        className,
      )}
    >
      {/* Subtle warm ambient glow behind the container */}
      <div
        className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-xl opacity-70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container Frame */}
      <div className="relative rounded-xl sm:rounded-2xl border border-border/90 bg-card p-2 sm:p-3 shadow-xl shadow-stone-900/5 transition-all duration-300">
        {/* Aspect Ratio Container (16:10 for modern SaaS editorial presentation) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg sm:rounded-xl border border-border/60 bg-muted/30">
          {/* Conditional Real Image Layer */}
          {!imageError && (
            <Image
              src={imageSrc}
              alt={alt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
              className={cn(
                "object-cover object-center transition-opacity duration-500",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          {/* Designed Editorial Visual Placeholder (renders when image is pending) */}
          {(!imageLoaded || imageError) && (
            <div
              className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#FAF7F2] via-background to-[#F4EFEB] text-foreground select-none"
              role="region"
              aria-label="DentAssist AI visual preview placeholder"
            >
              {/* Subtle grid pattern background */}
              <div
                className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:16px_16px]"
                aria-hidden="true"
              />

              {/* Top Bar: Practice Context */}
              <div className="relative z-10 flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    DA
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">
                      Cedar Grove Dental Practice
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      AI Receptionist & Calendar Integration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Google Calendar Connected</span>
                </div>
              </div>

              {/* Center Stage: Hero Asset Replacement Callout & Dental Architecture Schema */}
              <div className="relative z-10 flex-1 my-3 flex flex-col items-center justify-center text-center p-3 sm:p-5">
                <div className="w-full max-w-md rounded-lg border border-dashed border-primary/30 bg-card/80 p-4 sm:p-5 backdrop-blur-xs shadow-xs">
                  <div className="mx-auto size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                    <ImageIcon className="size-4.5" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold text-foreground">
                    Hero Media Replacement Target
                  </h2>
                  <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-normal">
                    Replace this designed placeholder by placing your image at:
                  </p>
                  <code className="mt-2 inline-block rounded bg-primary/5 px-2 py-1 text-[10px] sm:text-[11px] font-mono font-semibold text-primary border border-primary/20">
                    /public/images/dentassist-hero.webp
                  </code>
                </div>
              </div>

              {/* Bottom Strip: Clinic Capability Safeguards */}
              <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 pt-2.5 border-t border-border/70 text-left">
                <div className="flex items-center gap-2 rounded-md bg-card/60 px-2.5 py-1.5 border border-border/50">
                  <Bot className="size-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      Patient Chat Grounded in Clinic Docs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-card/60 px-2.5 py-1.5 border border-border/50">
                  <Calendar className="size-3.5 text-brand-brown shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      Checks Hours, Doctors & Buffer Times
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Minimal Illustrative Accent Badges around Frame (subtle, non-fake) */}
        <div className="hidden sm:flex items-center justify-between mt-2.5 px-2 text-[11px] text-muted-foreground font-medium">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-primary" />
            Configured clinic knowledge & rules
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3 text-brand-brown" />
            Dedicated multi-tenant isolation
          </span>
        </div>
      </div>
    </div>
  );
}
