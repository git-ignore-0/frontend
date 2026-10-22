"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/types";
import { parseTrackerFarms, type TrackerFarm } from "./tracker-model";

type TrackerState = {
  state: "loading" | "ready" | "error";
  farms: TrackerFarm[];
};

/** One cancellable request per locale/retry; failures are not represented as empty data. */
export function useTrackerFarms(locale: Locale) {
  const [result, setResult] = useState<TrackerState>({ state: "loading", farms: [] });
  const [retryNumber, setRetryNumber] = useState(0);
  const retry = useCallback(() => setRetryNumber((number) => number + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setResult({ state: "loading", farms: [] });

    fetch(`/api/tracker-farms?locale=${locale}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Tracker HTTP ${response.status}`);
        return parseTrackerFarms(await response.json());
      })
      .then((farms) => {
        if (!controller.signal.aborted) setResult({ state: "ready", farms });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ state: "error", farms: [] });
      });

    return () => controller.abort();
  }, [locale, retryNumber]);

  return { ...result, retry };
}
