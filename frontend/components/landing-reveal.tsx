"use client";

import { useEffect } from "react";

const selectors = [
  ".intro-shell",
  ".features-section .section-heading",
  ".feature-card",
  ".facilities-section .section-heading",
  ".facility-card",
  ".cta-inner > div:first-child",
  ".cta-link",
  ".footer-main",
];

export function LandingReveal() {
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== "reload") return;

    const previousRestoration = history.scrollRestoration;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = previousBehavior;
    });

    return () => {
      cancelAnimationFrame(frame);
      history.scrollRestoration = previousRestoration;
      document.documentElement.style.scrollBehavior = previousBehavior;
    };
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = document.querySelectorAll<HTMLElement>(selectors.join(", "));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-reveal", "visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

    elements.forEach((element) => {
      element.setAttribute("data-reveal", "pending");
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      elements.forEach((element) => element.removeAttribute("data-reveal"));
    };
  }, []);

  return null;
}
