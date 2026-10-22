"use client";

import { useEffect, useState } from "react";
import { useNFV } from "@/state/NFVContext";
import { trackerCopy } from "./tracker-copy";
import { farmView, trackerStats, type TrackerFarmView } from "./tracker-model";
import { useTrackerFarms } from "./useTrackerFarms";
import {
  MilestoneLegend,
  TrackerFarmCard,
  TrackerField,
  TrackerHeader,
  TrackerState,
  TrackerStats,
} from "./TrackerParts";
import { TrackerDialogs } from "./TrackerDialogs";

/** One page for /tracker/vi and /tracker/en, inside the existing site shell. */
export function TrackerPage() {
  const { ui } = useNFV();
  const copy = trackerCopy(ui.locale);
  const { state, farms, retry } = useTrackerFarms(ui.locale);
  const [selected, setSelected] = useState<TrackerFarmView | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const models = farms.map(farmView);

  // A detail dialog opened under one locale must not leak the previous locale's data.
  useEffect(() => {
    setSelected(null);
    setOpener(null);
  }, [ui.locale]);

  const openFarm = (farm: TrackerFarmView, button: HTMLElement) => {
    setOpener(button);
    setSelected(farm);
  };

  return (
    <main className="nfv-tracker tracker-standalone tracker-page">
      <div className="tracker-shell">
        <TrackerHeader copy={copy} />
        <MilestoneLegend copy={copy} />
        <aside className="tracker-demo-note">
          <strong>{copy.liveNoteTitle}</strong> {copy.liveNoteBody}
        </aside>
        <TrackerStats copy={copy} stats={state === "ready" ? trackerStats(farms) : null} />

        {state === "loading" ? (
          <TrackerState copy={copy} state="loading" />
        ) : state === "error" ? (
          <TrackerState copy={copy} state="error" onRetry={retry} />
        ) : models.length === 0 ? (
          <TrackerState copy={copy} state="empty" />
        ) : (
          <>
            <TrackerField copy={copy} farms={models} />
            <section aria-labelledby="tracker-grid-title">
              <h2 className="tracker-sr-only" id="tracker-grid-title">
                {copy.farmGridTitle}
              </h2>
              <ul className="tracker-farm-grid">
                {models.map((farm) => (
                  <li key={farm.id}>
                    <TrackerFarmCard copy={copy} farm={farm} onActivate={openFarm} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <TrackerDialogs
        copy={copy}
        farm={selected}
        opener={opener}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}
