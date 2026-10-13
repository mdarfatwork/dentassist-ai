import { type TextToSpeechAdapter, type SpeakOptions } from "./types";

/**
 * Strips markdown and special characters from receptionist replies
 * so the browser speech synthesis speaks natural conversational English.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove headers (# Header)
      .replace(/^#+\s+/gm, "")
      // Remove bold and italic formatting (**bold**, *italic*, __bold__, _italic_)
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Remove inline code `code`
      .replace(/`([^`]+)`/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove blockquotes (> quote)
      .replace(/^>\s+/gm, "")
      // Remove list markers (- item, * item, 1. item)
      .replace(/^[\s*+-]+\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      // Clean up multiple spaces and line breaks into natural pauses
      .replace(/\n+/g, ". ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

export class WebTextToSpeechAdapter implements TextToSpeechAdapter {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
    );
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  public speak(text: string, options: SpeakOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const err = new Error(
          "Speech synthesis is not supported in this browser environment.",
        );
        options.onError?.(err);
        return reject(err);
      }

      // Immediately cancel any previous or pending utterance
      this.stop();

      const cleanedText = cleanTextForSpeech(text);
      if (!cleanedText) {
        options.onEnd?.();
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      this.currentUtterance = utterance;

      if (options.voice) {
        utterance.voice = options.voice;
      }
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.lang = options.language ?? "en-US";

      let hasEnded = false;

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        if (!hasEnded) {
          hasEnded = true;
          this.currentUtterance = null;
          options.onEnd?.();
          resolve();
        }
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (!hasEnded) {
          hasEnded = true;
          this.currentUtterance = null;
          if (event.error === "canceled" || event.error === "interrupted") {
            // User intentionally interrupted or stopped speech
            options.onEnd?.();
            resolve();
          } else {
            const err = new Error(`Speech synthesis error: ${event.error}`);
            options.onError?.(err);
            reject(err);
          }
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        options.onError?.(error);
        reject(error);
      }
    });
  }

  public stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null;
  }

  public pause(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    }
  }

  public resume(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }
  }
}
