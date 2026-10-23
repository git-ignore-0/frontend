export type AccountQueryPolicy = "none" | "page" | "localized-page";

export type AccountUpstreamTarget = {
  path: string;
  session: "none" | "required";
  query: AccountQueryPolicy;
};

export function accountUpstreamTarget(
  path: string[],
  method: "GET" | "POST",
): AccountUpstreamTarget | null {
  if (path.length !== 1) return null;
  if (path[0] === "rewards" && method === "GET") {
    return {
      path: "/api/v1/public/rewards",
      session: "none",
      query: "localized-page",
    };
  }
  if (path[0] === "account" && method === "GET") {
    return {
      path: "/api/v1/referrals/account",
      session: "required",
      query: "none",
    };
  }
  if (path[0] === "points" && method === "GET") {
    return {
      path: "/api/v1/referrals/points",
      session: "required",
      query: "page",
    };
  }
  if (path[0] === "redemptions" && method === "GET") {
    return {
      path: "/api/v1/referrals/redemptions",
      session: "required",
      query: "localized-page",
    };
  }
  if (path[0] === "redemptions" && method === "POST") {
    return {
      path: "/api/v1/referrals/redemptions",
      session: "required",
      query: "none",
    };
  }
  if (path[0] === "invited-users" && method === "GET") {
    return {
      path: "/api/v1/referrals/invited-users",
      session: "required",
      query: "page",
    };
  }
  if (path[0] === "submit-code" && method === "POST") {
    return {
      path: "/api/v1/referrals/submit-code",
      session: "required",
      query: "none",
    };
  }
  return null;
}

export function accountQueryAllowed(url: URL, policy: AccountQueryPolicy): boolean {
  const keys = [...url.searchParams.keys()];
  const allowed = policy === "localized-page" ? ["locale", "page"] : policy === "page" ? ["page"] : [];
  if (keys.some((key) => !allowed.includes(key))) return false;
  if (url.searchParams.getAll("page").length > 1 || url.searchParams.getAll("locale").length > 1) return false;
  const page = url.searchParams.get("page");
  if (page !== null && !/^[1-9]\d*$/.test(page)) return false;
  const locale = url.searchParams.get("locale");
  return locale === null || (policy === "localized-page" && (locale === "vi" || locale === "en"));
}
