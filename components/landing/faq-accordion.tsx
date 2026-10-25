"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: Readonly<FAQAccordionProps>) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="divide-y divide-border/80 border-y border-border/80">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="py-4 sm:py-5">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              id={`faq-question-${item.id}`}
              className="w-full flex items-center justify-between text-left gap-4 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -m-1"
            >
              <span className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {item.question}
              </span>
              <div
                className={cn(
                  "size-7 rounded-lg bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:bg-primary/10 group-hover:text-primary",
                  isOpen && "rotate-180 bg-primary/10 text-primary",
                )}
              >
                <ChevronDown className="size-4" />
              </div>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                className="mt-3 pr-8 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in-50 duration-200"
              >
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
