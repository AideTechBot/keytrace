import { loadJson, saveJson } from "./storage";

export interface RecentClaimIdentity {
  subject: string;
  avatarUrl?: string;
  profileUrl?: string;
  displayName?: string;
}

export interface RecentClaim {
  did: string;
  handle: string;
  avatar?: string;
  type: string;
  subject: string;
  displayName: string;
  createdAt: string;
  identity?: RecentClaimIdentity;
}

const FEED_KEY = "recent-claims.json";
const MAX_ITEMS = 50;

/**
 * Add a claim to the recent claims feed.
 * Prepends to the list, trims to 50 items, and saves.
 */
export async function addRecentClaim(claim: RecentClaim): Promise<void> {
  const feed = await getRecentClaims();
  feed.unshift(claim);
  if (feed.length > MAX_ITEMS) feed.length = MAX_ITEMS;
  await saveJson(FEED_KEY, feed);
}

/**
 * Get the recent claims feed from storage.
 */
export async function getRecentClaims(): Promise<RecentClaim[]> {
  return (await loadJson<RecentClaim[]>(FEED_KEY)) ?? [];
}
