import Image from "next/image";
import { CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroMediaProps {
  /**
   * Optional custom image source path.
   * Defaults to "/images/dentassist-hero.webp".
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
  alt = "DentAssist AI dental receptionist managing clinic schedules and patient appointment requests",
  className,
}: Readonly<HeroMediaProps>) {
  return (
    <div
      className={cn(
        "relative w-full max-w-2xl mx-auto lg:max-w-none group",
        className,
      )}
    >
      {/* Subtle warm ambient glow behind the container */}
      <div
        className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-xl opacity-70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container Frame */}
      <div className="relative rounded-xl sm:rounded-2xl border border-border/90 bg-card p-2 sm:p-3 shadow-xl shadow-stone-900/5 transition-all duration-300">
        {/* Aspect Ratio Container (16:10 for modern SaaS editorial presentation) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg sm:rounded-xl border border-border/60 bg-muted/30">
          <Image
            src={imageSrc}
            alt={alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </div>

        {/* Minimal Illustrative Accent Badges around Frame */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-muted-foreground font-medium">
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
