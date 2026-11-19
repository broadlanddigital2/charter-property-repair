import Router from "next/router";
import { useEffect, useRef } from "react";

/**
 * Back navigation for the admin header's Back button.
 *
 * Screens that open a detail view inside the same page (a claim's setup, a product,
 * a user…) register a handler with useBackStep while it's open, so Back closes that
 * view and returns to the list. Otherwise Back goes to the previous admin screen,
 * or the dashboard when there's no earlier screen in this tab.
 */
let handler: (() => void) | null = null;
let inAppNavigations = 0;

if (typeof window !== "undefined") {
  Router.events.on("routeChangeComplete", () => {
    inAppNavigations += 1;
  });
}

export function useBackStep(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active) return;
    const h = () => ref.current();
    handler = h;
    return () => {
      if (handler === h) handler = null;
    };
  }, [active]);
}

export function goBack() {
  if (handler) {
    handler();
    window.scrollTo({ top: 0 });
  } else if (inAppNavigations > 0) {
    Router.back();
  } else {
    Router.push("/dashboard");
  }
}
