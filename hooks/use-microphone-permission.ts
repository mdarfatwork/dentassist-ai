"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { type MicrophonePermissionState } from "@/lib/voice/types";

export function isSecureOrigin(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

const emptySubscribe = () => () => {};

export function useMicrophonePermission() {
  const [permissionState, setPermissionState] =
    useState<MicrophonePermissionState>("checking");
  const isInsecureOrigin = useSyncExternalStore(
    emptySubscribe,
    () => !isSecureOrigin(),
    () => false,
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Check initial permission status and secure context
  useEffect(() => {
    let isMounted = true;

    const checkPermission = async () => {
      if (!isSecureOrigin()) {
        if (!isMounted) return;
        setPermissionState("denied");
        setPermissionError(
          `Microphone is blocked by the browser on non-secure origins (http://${window.location.host}). Please access using http://localhost:3000, HTTPS, or enable Chrome's insecure origin flag for this IP.`,
        );
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!isMounted) return;
        setPermissionState("unsupported");
        setPermissionError(
          "Microphone device access (getUserMedia) is not supported in this browser.",
        );
        return;
      }

      if (navigator?.permissions?.query) {
        try {
          const status = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          if (!isMounted) return;
          setPermissionState(status.state as MicrophonePermissionState);
          status.onchange = () => {
            if (!isMounted) return;
            setPermissionState(status.state as MicrophonePermissionState);
            if (status.state === "granted") {
              setPermissionError(null);
            }
          };
        } catch {
          if (!isMounted) return;
          setPermissionState("prompt");
        }
      } else {
        if (!isMounted) return;
        setPermissionState("prompt");
      }
    };

    void checkPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setPermissionError(null);

    if (typeof window === "undefined") return false;

    if (!isSecureOrigin()) {
      const msg = `Microphone access is blocked by your browser on non-secure HTTP (${window.location.origin}). Please use http://localhost:3000 or HTTPS.`;
      setPermissionState("denied");
      setPermissionError(msg);
      return false;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg =
        "Microphone access (getUserMedia) is unavailable in this browser environment.";
      setPermissionState("unsupported");
      setPermissionError(msg);
      return false;
    }

    try {
      setPermissionState("checking");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release audio tracks immediately
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      setPermissionError(null);
      return true;
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : "";
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        errorMsg.toLowerCase().includes("permission")
      ) {
        setPermissionState("denied");
        setPermissionError(
          "Microphone permission was denied. Please allow microphone access in your browser's site settings (icon in the URL bar) and try again.",
        );
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError"
      ) {
        setPermissionState("unsupported");
        setPermissionError(
          "No microphone hardware found on this device. Please connect a microphone.",
        );
      } else {
        setPermissionState("denied");
        setPermissionError(
          `Unable to access microphone: ${errorMsg || "Permission request failed"}`,
        );
      }
      return false;
    }
  }, []);

  return {
    permissionState,
    isInsecureOrigin,
    permissionError,
    requestPermission,
  };
}
