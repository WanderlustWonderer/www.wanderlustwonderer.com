// Achievement tracker — earned from membership level, tenure, and add-on purchases.
export interface Achievement { key: string; emoji: string; label: string; earned: boolean; hint: string }

export interface AchievementInput {
  tier: string | null;
  isMember: boolean;
  memberSinceMs: number | null;
  orderCount: number;
  totalSpendPence: number;
  sessionCount: number;
}

export function tierRankOf(tier: string | null): number {
  return tier === "all_access" ? 3 : tier === "private_world" ? 2 : tier === "the_gallery" ? 1 : 0;
}

export function monthsSince(ms: number | null): number {
  if (!ms) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24 * 30.44)));
}

export function tenureLabel(ms: number | null): string {
  if (!ms) return "—";
  const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Joined today";
  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
  const months = monthsSince(ms);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}y ${rem}m` : `${years} year${years === 1 ? "" : "s"}`;
}

export function computeAchievements(i: AchievementInput): Achievement[] {
  const rank = tierRankOf(i.tier);
  const months = monthsSince(i.memberSinceMs);
  const spend = i.totalSpendPence / 100;
  return [
    { key: "portal", emoji: "🌙", label: "Through the Portal", earned: i.isMember || rank > 0, hint: "Become a member" },
    { key: "gallery", emoji: "🖼️", label: "The Gallery", earned: rank >= 1, hint: "Join The Gallery" },
    { key: "private", emoji: "🪞", label: "Private World", earned: rank >= 2, hint: "Reach Private World" },
    { key: "allaccess", emoji: "☀️", label: "All Access", earned: rank >= 3, hint: "Reach All Access" },
    { key: "m1", emoji: "🌱", label: "One Month In", earned: months >= 1, hint: "Stay a member for 1 month" },
    { key: "m3", emoji: "🔥", label: "Three Months Strong", earned: months >= 3, hint: "3 months as a member" },
    { key: "m6", emoji: "💎", label: "Half a Year", earned: months >= 6, hint: "6 months as a member" },
    { key: "m12", emoji: "👑", label: "A Year of Devotion", earned: months >= 12, hint: "1 year as a member" },
    { key: "gift1", emoji: "🎁", label: "First Tribute", earned: i.orderCount >= 1, hint: "Send a gift from The Collection" },
    { key: "gift5", emoji: "💐", label: "Generous Soul", earned: i.orderCount >= 5 || spend >= 100, hint: "Send 5 gifts or spend £100" },
    { key: "patron", emoji: "🏆", label: "Patron", earned: spend >= 500, hint: "£500 in tributes" },
    { key: "session", emoji: "✨", label: "Live Connection", earned: i.sessionCount >= 1, hint: "Book a live session" },
  ];
}
