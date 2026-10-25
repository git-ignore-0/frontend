export type AccountQueryPolicy = "none" | "page" | "localized" | "localized-page";

export type AccountUpstreamTarget = {
  path: string;
  session: "none" | "required";
  query: AccountQueryPolicy;
};

export function accountUpstreamTarget(
  path: string[],
  method: "GET" | "POST",
): AccountUpstreamTarget | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (path.length === 3 && path[0] === "memberships" && uuid.test(path[1]) && path[2] === "contract" && method === "GET") {
    return {path:`/api/v1/memberships/${path[1]}/contract`,session:"required",query:"none"};
  }
  if (path.length === 4 && path[0] === "memberships" && uuid.test(path[1]) && path[2] === "contract" && path[3] === "pdf" && method === "GET") {
    return {path:`/api/v1/memberships/${path[1]}/contract/pdf`,session:"required",query:"localized"};
  }
  if (path.length !== 1) return null;
  if (path[0] === "csa-current" && method === "GET") {
    return {path:"/api/v1/memberships/current",session:"required",query:"localized"};
  }
  if (path[0] === "csa-quota" && method === "GET") {
    return {path:"/api/v1/memberships/quota",session:"required",query:"localized"};
  }
  if (path[0] === "csa-usage" && method === "GET") {
    return {path:"/api/v1/memberships/usage",session:"required",query:"localized-page"};
  }
  if (path[0] === "csa-payment-quotes" && method === "POST") {
    return {path:"/api/v1/public/csa-payment-quotes",session:"required",query:"none"};
  }
  if (path[0] === "csa-confirm-transfer" && method === "POST") {
    return {path:"/api/v1/public/csa-purchase-requests/confirm-transfer",session:"required",query:"none"};
  }
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
  const allowed = policy === "localized-page" ? ["locale", "page"] : policy === "localized" ? ["locale"] : policy === "page" ? ["page"] : [];
  if (keys.some((key) => !allowed.includes(key))) return false;
  if (url.searchParams.getAll("page").length > 1 || url.searchParams.getAll("locale").length > 1) return false;
  const page = url.searchParams.get("page");
  if (page !== null && !/^[1-9]\d*$/.test(page)) return false;
  const locale = url.searchParams.get("locale");
  return locale === null || ((policy === "localized" || policy === "localized-page") && (locale === "vi" || locale === "en"));
}
