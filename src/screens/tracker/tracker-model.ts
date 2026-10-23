/** Public Farm Tracker data and growth milestones. No placeholder signup figures. */
export type MilestoneKey =
  | "seedPlanted"
  | "gettingStarted"
  | "providingForFamily"
  | "communityLeader";

export type FarmImage = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  variants: Array<{ url: string; width: number; height: number }>;
};

export type TrackerFarm = {
  id: string;
  name: string;
  location: string;
  description: string;
  signup_count: number;
  one_month_signup_count: number;
  sort_order: number;
  image: FarmImage | null;
  images: FarmImage[];
};

export const SIGNUP_GOAL = 30;

export const MILESTONES = [
  { key: "seedPlanted", minimum: 0, icon: "seed" },
  { key: "gettingStarted", minimum: 10, icon: "sprout" },
  { key: "providingForFamily", minimum: 20, icon: "harvest" },
  { key: "communityLeader", minimum: 30, icon: "people" },
] as const;

export type MilestoneIcon = (typeof MILESTONES)[number]["icon"];

export function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function milestoneFor(value: number) {
  const count = normalizeCount(value);
  return [...MILESTONES].reverse().find((item) => count >= item.minimum)!;
}

export function nextMilestone(value: number) {
  const count = normalizeCount(value);
  return MILESTONES.find((item) => item.minimum > count) ?? null;
}

export function farmView(farm: TrackerFarm) {
  const count = normalizeCount(farm.signup_count);
  const next = nextMilestone(count);
  const milestone = milestoneFor(count);

  return {
    ...farm,
    count,
    oneMonthCount: normalizeCount(farm.one_month_signup_count),
    nextMilestone: next,
    milestone,
    remaining: next ? next.minimum - count : 0,
    progress: Math.min(100, (count / SIGNUP_GOAL) * 100),
    iconSize: count >= 30 ? 26 + Math.min(count, 40) * 0.95 : 20 + Math.min(count, 30) * 1.2,
    ticks: MILESTONES.map((item) => ({ value: item.minimum, reached: count >= item.minimum })),
    isLeader: milestone.key === "communityLeader",
  };
}

export type TrackerFarmView = ReturnType<typeof farmView>;

export function trackerStats(farms: TrackerFarm[]) {
  return {
    farms: farms.length,
    oneMonth: farms.reduce((total, farm) => total + normalizeCount(farm.one_month_signup_count), 0),
    sixMonth: farms.reduce((total, farm) => total + normalizeCount(farm.signup_count), 0),
    leaders: farms.filter((farm) => milestoneFor(farm.signup_count).key === "communityLeader").length,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function imageFrom(value: unknown): FarmImage | null {
  if (
    !isRecord(value) ||
    !safeUrl(value.url) ||
    typeof value.id !== "string" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number" ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    value.width <= 0 ||
    value.height <= 0
  ) {
    return null;
  }

  const variants = Array.isArray(value.variants)
    ? value.variants.map((variant) =>
        isRecord(variant) &&
        safeUrl(variant.url) &&
        typeof variant.width === "number" &&
        Number.isInteger(variant.width) &&
        variant.width > 0 &&
        typeof variant.height === "number" &&
        Number.isInteger(variant.height) &&
        variant.height > 0
          ? { url: variant.url, width: variant.width, height: variant.height }
          : null,
      )
    : [];

  if (variants.some((variant) => variant === null)) return null;

  return {
    id: value.id,
    url: value.url,
    width: value.width,
    height: value.height,
    alt: typeof value.alt === "string" ? value.alt : "",
    variants: variants as Array<{ url: string; width: number; height: number }>,
  };
}

/** Reject malformed upstream payloads rather than displaying a false empty state. */
export function parseTrackerFarms(payload: unknown): TrackerFarm[] {
  const source = isRecord(payload) ? payload.data : payload;
  if (!Array.isArray(source)) throw new Error("Invalid tracker response envelope");

  return source.map((raw, index) => {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      !raw.id ||
      typeof raw.name !== "string" ||
      typeof raw.location !== "string" ||
      typeof raw.sort_order !== "number" ||
      !Number.isInteger(raw.sort_order) ||
      typeof raw.signup_count !== "number" ||
      !Number.isInteger(raw.signup_count) ||
      raw.signup_count < 0 ||
      !(
        raw.one_month_signup_count === null ||
        raw.one_month_signup_count === undefined ||
        (typeof raw.one_month_signup_count === "number" &&
          Number.isInteger(raw.one_month_signup_count) &&
          raw.one_month_signup_count >= 0)
      )
    ) {
      throw new Error(`Invalid tracker farm at index ${index}`);
    }

    const image = raw.image == null ? null : imageFrom(raw.image);
    if (raw.image != null && !image) {
      throw new Error(`Invalid tracker farm image at index ${index}`);
    }

    const images =
      raw.images === undefined
        ? image
          ? [image]
          : []
        : Array.isArray(raw.images)
          ? raw.images.map(imageFrom)
          : null;

    if (!images || images.some((item) => !item)) {
      throw new Error(`Invalid tracker farm images at index ${index}`);
    }

    return {
      id: raw.id,
      name: raw.name,
      location: raw.location,
      description: typeof raw.description === "string" ? raw.description : "",
      signup_count: raw.signup_count,
      one_month_signup_count:
        typeof raw.one_month_signup_count === "number" ? raw.one_month_signup_count : 0,
      sort_order: raw.sort_order,
      image,
      images: images as FarmImage[],
    };
  });
}

export function trackerImageUrl(image: FarmImage, kind: "thumbnail" | "primary" | "lightbox" = "primary") {
  const minWidth = kind === "thumbnail" ? 120 : kind === "primary" ? 720 : 1400;
  const variants = [...image.variants].sort((a, b) => a.width - b.width);
  return variants.find((item) => item.width >= minWidth)?.url ?? variants.at(-1)?.url ?? image.url;
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
