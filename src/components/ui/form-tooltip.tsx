"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

const TOOLTIP_DURATION_MS = 3000;
const FADE_IN_MS = 300;
const FADE_OUT_MS = 300;

type TooltipPhase = "hidden" | "entering" | "visible" | "exiting";

type FormTooltipProps = {
  message?: string;
  id?: string;
  className?: string;
  resetKey?: number | string;
  onDismiss?: () => void;
};

export function FormTooltip({
  message,
  id,
  className,
  resetKey,
  onDismiss,
}: FormTooltipProps) {
  const [phase, setPhase] = useState<TooltipPhase>("hidden");
  const [displayMessage, setDisplayMessage] = useState<string | undefined>();
  const onDismissRef = useRef(onDismiss);

  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) {
      setPhase("hidden");
      setDisplayMessage(undefined);
      return;
    }

    setDisplayMessage(message);
    setPhase("entering");

    const visibleTimer = window.setTimeout(() => {
      setPhase("visible");
    }, FADE_IN_MS);

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, FADE_IN_MS + TOOLTIP_DURATION_MS);

    const dismissTimer = window.setTimeout(() => {
      setPhase("hidden");
      setDisplayMessage(undefined);
      onDismissRef.current?.();
    }, FADE_IN_MS + TOOLTIP_DURATION_MS + FADE_OUT_MS);

    return () => {
      window.clearTimeout(visibleTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [message, resetKey]);

  if (!displayMessage || phase === "hidden") {
    return null;
  }

  return (
    <div
      id={id}
      role="alert"
      className={clsx(
        "form-tooltip",
        phase === "entering" && "form-tooltip--entering",
        phase === "visible" && "form-tooltip--visible",
        phase === "exiting" && "form-tooltip--exiting",
        className,
      )}
    >
      {displayMessage}
    </div>
  );
}
