"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WebSpeechToTextAdapter } from "@/lib/voice/speech-to-text";
import {
  type SpeechToTextAdapter,
  type SpeechRecognitionErrorDetails,
} from "@/lib/voice/types";

interface UseSpeechRecognitionOptions {
  initialLanguage?: string;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: SpeechRecognitionErrorDetails) => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
) {
  const { initialLanguage = "en-US", onFinalResult, onError } = options;

  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new WebSpeechToTextAdapter().isSupported();
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<SpeechRecognitionErrorDetails | null>(
    null,
  );
  const [language, setLanguageState] = useState<string>(initialLanguage);

  const adapterRef = useRef<SpeechToTextAdapter | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
    onErrorRef.current = onError;
  }, [onFinalResult, onError]);

  useEffect(() => {
    const adapter = new WebSpeechToTextAdapter();
    adapter.setLanguage(initialLanguage);
    adapterRef.current = adapter;

    return () => {
      adapter.abort();
    };
  }, [initialLanguage]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    adapterRef.current?.setLanguage(lang);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const startListening = useCallback(
    (customOnFinal?: (final: string) => void) => {
      setError(null);
      setTranscript("");
      setInterimTranscript("");

      if (!adapterRef.current) return;

      adapterRef.current.start({
        onStart: () => {
          setIsListening(true);
        },
        onResult: (text, isFinal) => {
          if (isFinal) {
            setTranscript(text);
            setInterimTranscript("");
            if (customOnFinal) {
              customOnFinal(text);
            } else if (onFinalResultRef.current) {
              onFinalResultRef.current(text);
            }
          } else {
            setInterimTranscript(text);
          }
        },
        onError: (errDetails) => {
          setError(errDetails);
          onErrorRef.current?.(errDetails);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    },
    [],
  );

  const stopListening = useCallback(() => {
    adapterRef.current?.stop();
    setIsListening(false);
  }, []);

  const abortListening = useCallback(() => {
    adapterRef.current?.abort();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    language,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    setLanguage,
  };
}
