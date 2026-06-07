/** Creator + monetization config for the Wanderlust AI companion platform. */

export const CREATOR = {
  slug: "wanderlust",
  displayName: "Wanderlust Wonderer",
  aiName: "Wanderlust AI",
  aiTagline: "Trained by me, always online",
  socials: {
    instagram: "https://www.instagram.com/wanderlust_wonderer/",
    tiktok: "https://www.tiktok.com/@dailyyogadiary",
  },
} as const;

export type TierKey = "free" | "fan" | "vip" | "inner";

export interface TierConfig {
  key: TierKey;
  name: string;
  priceLabel: string;
  dailyMessages: number;
  memoryDepth: number; // how many prior messages the AI remembers
  blurb: string;
  features: string[];
  priceEnv?: string;
}

export const TIERS: Record<TierKey, TierConfig> = {
  free: {
    key: "free",
    name: "Free",
    priceLabel: "$0",
    dailyMessages: 0, // free users spend signup credits instead
    memoryDepth: 12,
    blurb: "Taste the frequency. 10 free messages on us.",
    features: ["10 free message credits", "Full chat experience"],
  },
  fan: {
    key: "fan",
    name: "Fan",
    priceLabel: "$9.99/mo",
    dailyMessages: 25,
    memoryDepth: 24,
    blurb: "Daily conversation with the Muse's AI.",
    features: ["25 messages every day", "Conversation memory", "Cancel anytime"],
    priceEnv: "STRIPE_PRICE_FAN",
  },
  vip: {
    key: "vip",
    name: "VIP",
    priceLabel: "$24.99/mo",
    dailyMessages: 100,
    memoryDepth: 60,
    blurb: "Four times the conversation, deeper memory.",
    features: ["100 messages every day", "Longer memory", "VIP badge", "Cancel anytime"],
    priceEnv: "STRIPE_PRICE_VIP",
  },
  inner: {
    key: "inner",
    name: "Inner Circle",
    priceLabel: "$49.99/mo",
    dailyMessages: 250,
    memoryDepth: 120,
    blurb: "The closest you can get. Priority, depth, devotion.",
    features: [
      "250 messages every day",
      "Deepest memory",
      "Priority responses",
      "Voice notes (coming soon)",
    ],
    priceEnv: "STRIPE_PRICE_INNER",
  },
};

export interface CreditPack {
  key: "small" | "large";
  credits: number;
  priceLabel: string;
  priceEnv: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { key: "small", credits: 50, priceLabel: "$4.99", priceEnv: "STRIPE_PRICE_CREDITS_SMALL" },
  { key: "large", credits: 250, priceLabel: "$19.99", priceEnv: "STRIPE_PRICE_CREDITS_LARGE" },
];

export const SIGNUP_BONUS_CREDITS = 10;
