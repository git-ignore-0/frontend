"use client";

import { useEffect, useState } from "react";
import { Button, Icon } from "@/components/UI";
import type { TrackerCopy } from "./tracker-copy";
import {
  MILESTONES,
  SIGNUP_GOAL,
  interpolate,
  trackerImageUrl,
  type MilestoneIcon as MilestoneIconName,
  type TrackerFarmView,
} from "./tracker-model";

type CopyProps = { copy: TrackerCopy };

/** Visual milestones are shared by the legend, field, cards and detail dialog. */
export function MilestoneIcon({
  type,
  size = 22,
}: {
  type: MilestoneIconName;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`tracker-plant-icon${type === "people" ? " tracker-mother-tree" : ""}`}
      style={{ fontSize: size }}
    >
      {type === "people" ? (
        <>
          <span className="tracker-mother-tree-child">🌱</span>
          <span className="tracker-mother-tree-main">🌳</span>
        </>
      ) : (
        { seed: "🌰", sprout: "🌱", harvest: "🌳" } as const
      )[type]}
    </span>
  );
}

/** Gracefully use a milestone illustration when a farm photo fails. */
export function FarmMedia({ farm }: { farm: TrackerFarmView }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [farm.image?.id, farm.image?.url]);

  return (
    <span className="tracker-farm-avatar">
      <span className="tracker-avatar-fallback">
        <MilestoneIcon type={farm.milestone.icon} size={farm.isLeader ? 28 : 30} />
      </span>
      {farm.image && !failed && (
        <img
          className="tracker-avatar-photo"
          src={trackerImageUrl(farm.image, "thumbnail")}
          alt={farm.image.alt}
          width={farm.image.width}
          height={farm.image.height}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function TrackerHeader({ copy }: CopyProps) {
  return (
    <header className="tracker-header">
      <h1><span aria-hidden="true">🌱 </span>{copy.title}</h1>
      <p className="tracker-intro">{copy.intro}</p>
    </header>
  );
}

export function MilestoneLegend({ copy }: CopyProps) {
  return (
    <section className="tracker-legend" aria-label={copy.legendLabel}>
      <ul>
        {MILESTONES.slice(1).map((milestone) => (
          <li key={milestone.key}>
            <span className="tracker-legend-threshold">{milestone.minimum}</span>
            <MilestoneIcon type={milestone.icon} size={18} />
            <span className="tracker-legend-copy">
              {copy.milestones[milestone.key].label}
              <span className="tracker-sr-only">
                {" — "}{copy.milestones[milestone.key].description}
              </span>
            </span>
            <span className="tracker-sr-only">
              {interpolate(copy.thresholdLabel, { count: milestone.minimum })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Stats = { farms: number; oneMonth: number; sixMonth: number; leaders: number };

export function TrackerStats({ copy, stats }: CopyProps & { stats: Stats | null }) {
  const items = [
    ["farms", stats?.farms, copy.stats.farms],
    ["oneMonth", stats?.oneMonth, copy.stats.oneMonth],
    ["sixMonth", stats?.sixMonth, copy.stats.sixMonth],
    ["leaders", stats?.leaders, copy.stats.leaders],
  ] as const;

  return (
    <dl className="tracker-stats" aria-busy={stats === null}>
      {items.map(([id, value, label]) => (
        <div className="tracker-stat" key={id}>
          <dd className={value === undefined ? "is-loading" : ""}>
            {value ?? <span className="tracker-sr-only">{copy.loading}</span>}
          </dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function TrackerField({
  copy,
  farms,
}: CopyProps & { farms: TrackerFarmView[] }) {
  return (
    <section className="tracker-field-section" aria-labelledby="tracker-field-title">
      <h2 id="tracker-field-title">{copy.fieldTitle}</h2>
      <p>{copy.fieldSubtitle}</p>
      <div
        className="tracker-field-scroll"
        role="region"
        aria-label={copy.fieldLabel}
        tabIndex={0}
      >
        <ul>
          {farms.map((farm) => (
            <li
              key={farm.id}
              aria-label={interpolate(copy.progressLabel, {
                name: farm.name,
                count: farm.count,
                percent: Math.round(farm.progress),
              })}
            >
              <span className="tracker-field-icon-stage">
                <MilestoneIcon type={farm.milestone.icon} size={farm.iconSize} />
              </span>
              <span className="tracker-field-name" title={farm.name}>{farm.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TrackerState({
  copy,
  state,
  onRetry,
}: CopyProps & { state: "loading" | "empty" | "error"; onRetry?: () => void }) {
  if (state === "loading") {
    return (
      <section className="tracker-state tracker-state-loading" role="status" aria-live="polite">
        <p>{copy.loading}</p>
        <div className="tracker-state-skeleton" aria-hidden="true"><span /><span /></div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="tracker-state" role="alert">
        <h2>{copy.error}</h2>
        <Button small onClick={onRetry}>{copy.retry}</Button>
      </section>
    );
  }

  return (
    <section className="tracker-state" role="status">
      <h2>{copy.emptyTitle}</h2>
      <p>{copy.emptyBody}</p>
    </section>
  );
}

function MilestoneImpact({
  copy,
  farm,
}: CopyProps & { farm: TrackerFarmView }) {
  if (!farm.nextMilestone) {
    return <>{interpolate(copy.leaderMessage, {
      name: farm.name,
      milestone: copy.milestones.communityLeader.label,
    })}</>;
  }

  return <>{interpolate(
    farm.remaining === 1 ? copy.nextMilestoneOne : copy.nextMilestoneMany,
    {
      remaining: farm.remaining,
      name: farm.name,
      milestone: copy.milestones[farm.nextMilestone.key].label,
      description: copy.milestones[farm.nextMilestone.key].description,
    },
  )}</>;
}

export function TrackerFarmCard({
  copy,
  farm,
  onActivate,
}: CopyProps & {
  farm: TrackerFarmView;
  onActivate: (farm: TrackerFarmView, opener: HTMLElement) => void;
}) {
  const progressLabel = interpolate(copy.progressLabel, {
    name: farm.name,
    count: farm.count,
    percent: Math.round(farm.progress),
  });

  return (
    <article className="fcard tracker-farm-card">
      {farm.isLeader && (
        <span className="tracker-leader-badge" aria-label={copy.leaderBadge}>⭐</span>
      )}
      <header className="tracker-farm-heading">
        <FarmMedia farm={farm} />
        <span className="tracker-farm-info">
          <h3 title={farm.name}>{farm.name}</h3>
          <span className="tracker-farm-location">{farm.location}</span>
        </span>
      </header>
      <div className="tracker-stage-badge">
        <MilestoneIcon type={farm.milestone.icon} size={16} />
        <span>{copy.milestones[farm.milestone.key].label}</span>
      </div>
      <div className="tracker-count">
        <div className="tracker-count-primary">
          <p className="tracker-count-value">
            <strong>{farm.count}</strong>
            <span>{interpolate(copy.signupGoal, { count: SIGNUP_GOAL })}</span>
          </p>
          <span className="tracker-count-label">{copy.sixMonthSignupLabel}</span>
        </div>
        <div className="tracker-count-secondary">
          <p className="tracker-count-value"><strong>{farm.oneMonthCount}</strong></p>
          <span className="tracker-count-label">{copy.oneMonthSignupLabel}</span>
        </div>
      </div>
      <div className="tracker-progress-wrap">
        <div
          className="tracker-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(farm.progress)}
          aria-label={progressLabel}
        >
          <span style={{ width: `${farm.progress}%` }} />
        </div>
        <ol className="tracker-progress-ticks" aria-hidden="true">
          {farm.ticks.map((tick) => (
            <li
              key={tick.value}
              className={tick.reached ? "is-reached" : ""}
              style={{ left: `${(tick.value / SIGNUP_GOAL) * 100}%` }}
            >
              {tick.value}
            </li>
          ))}
        </ol>
      </div>
      <p className="tracker-impact-note"><MilestoneImpact copy={copy} farm={farm} /></p>
      <div className="card-action">
        <Button
          small
          className="tracker-detail-button"
          aria-label={interpolate(copy.farmLabel, { name: farm.name })}
          onClick={(event) => onActivate(farm, event.currentTarget)}
        >
          {copy.viewFarmer}
          <Icon name="arrow" size={14} />
        </Button>
      </div>
    </article>
  );
}
