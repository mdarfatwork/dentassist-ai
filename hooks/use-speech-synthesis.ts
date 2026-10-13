"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WebTextToSpeechAdapter } from "@/lib/voice/text-to-speech";
import { type TextToSpeechAdapter, type SpeakOptions } from "@/lib/voice/types";

export function useSpeechSynthesis() {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new WebTextToSpeechAdapter().isSupported();
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);

  const adapterRef = useRef<TextToSpeechAdapter | null>(null);

  useEffect(() => {
    const adapter = new WebTextToSpeechAdapter();
    adapterRef.current = adapter;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const availableVoices = adapter.getVoices();
        setVoices(availableVoices);
        setSelectedVoice((prev) => {
          if (prev || availableVoices.length === 0) return prev;
          return (
            availableVoices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Jenny")),
            ) ||
            availableVoices.find((v) => v.lang.startsWith("en")) ||
            availableVoices[0]
          );
        });
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        adapter.stop();
      };
    }

    return () => {
      adapter.stop();
    };
  }, []);

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}): Promise<void> => {
      if (!adapterRef.current || !isSupported) return;

      setIsSpeaking(true);

      try {
        await adapterRef.current.speak(text, {
          voice: options.voice ?? selectedVoice ?? undefined,
          rate: options.rate ?? rate,
          pitch: options.pitch ?? pitch,
          language: options.language ?? selectedVoice?.lang ?? "en-US",
          onStart: () => {
            setIsSpeaking(true);
            options.onStart?.();
          },
          onEnd: () => {
            setIsSpeaking(false);
            options.onEnd?.();
          },
          onError: (err) => {
            setIsSpeaking(false);
            options.onError?.(err);
          },
        });
      } finally {
        setIsSpeaking(false);
      }
    },
    [isSupported, selectedVoice, rate, pitch],
  );

  const stop = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.stop();
    }
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    adapterRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    adapterRef.current?.resume();
  }, []);

  return {
    isSupported,
    isSpeaking,
    voices,
    selectedVoice,
    rate,
    pitch,
    speak,
    stop,
    pause,
    resume,
    setSelectedVoice,
    setRate,
    setPitch,
  };
}
