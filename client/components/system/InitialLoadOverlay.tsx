"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import AppLoadingScreen from "@/components/system/AppLoadingScreen";

type InitialLoadOverlayProps = {
  children: ReactNode;
};

const MIN_DISPLAY_MS = 1450;
const EXIT_MS = 420;

export default function InitialLoadOverlay({ children }: InitialLoadOverlayProps) {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">("visible");

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => {
      setPhase("leaving");
    }, MIN_DISPLAY_MS);

    const hiddenTimer = window.setTimeout(() => {
      setPhase("hidden");
    }, MIN_DISPLAY_MS + EXIT_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hiddenTimer);
    };
  }, []);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    if (phase !== "hidden") {
      body.style.overflow = "hidden";
      documentElement.style.overflow = "hidden";
    } else {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [phase]);

  return (
    <>
      {children}
      {phase === "hidden" ? null : (
        <AppLoadingScreen overlay isExiting={phase === "leaving"} />
      )}
    </>
  );
}
