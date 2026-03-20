const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "ref", "source", "mc_cid", "mc_eid",
  "dclid", "msclkid", "twclid",
]);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const param of TRACKING_PARAMS) {
      u.searchParams.delete(param);
    }
    u.hash = "";
    // Sort remaining params for consistency
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getBaseDomain(url: string): string {
  const hostname = getDomain(url);
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}
