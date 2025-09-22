"use client";

import { useEffect, useState } from "react";

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true
  );

  useEffect(function subscribeToPageVisibilityChanges() {
    function handleVisibilityChange() {
      setIsVisible(document.visibilityState === "visible");
    }

    function handlePageShow(event: PageTransitionEvent) {
      if ((event as PageTransitionEvent).persisted) {
        setIsVisible(true);
      } else {
        setIsVisible(document.visibilityState === "visible");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow as EventListener);

    return function unsubscribeFromPageVisibilityChanges() {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow as EventListener);
    };
  }, []);

  return isVisible;
}
