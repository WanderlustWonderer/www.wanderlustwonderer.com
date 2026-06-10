import "server-only";
import crypto from "node:crypto";

/** The registered Solana wallet that receives membership tributes. */
export const SOL_RECIPIENT = "AWejVaRKnJKwkKafCMBoPwkukDQxSXeGvS5zL8M5UShg";
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(bytes: Buffer): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}

/** A unique Solana-Pay reference (a random address used to match the payment on-chain). */
export function newReference(): string {
  return base58(crypto.randomBytes(32));
}

/** Live GBP price of 1 SOL via CoinGecko (no key, public). */
export async function solGbpPrice(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=gbp", { cache: "no-store" });
  if (!res.ok) throw new Error("price_unavailable");
  const data = (await res.json()) as { solana?: { gbp?: number } };
  const p = data.solana?.gbp;
  if (!p || p <= 0) throw new Error("price_unavailable");
  return p;
}

/** Build the Solana Pay deep link / QR payload. */
export function solanaPayUrl(solAmount: number, reference: string, label: string, message: string): string {
  const p = new URLSearchParams({ amount: String(solAmount), reference, label, message });
  return `solana:${SOL_RECIPIENT}?${p.toString()}`;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = (await res.json()) as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result as T;
}

/**
 * Find a CONFIRMED on-chain transaction that references `reference`, pays
 * SOL_RECIPIENT at least `minSol` (minus a small tolerance) — the basis for
 * confirming a membership crypto payment. Returns the tx signature or null.
 */
export async function findConfirmedPayment(reference: string, minSol: number): Promise<string | null> {
  const sigs = await rpc<Array<{ signature: string; err: unknown }>>(
    "getSignaturesForAddress", [reference, { limit: 10 }]
  );
  const minLamports = Math.floor(minSol * LAMPORTS_PER_SOL * 0.997); // tiny rounding tolerance only
  for (const s of sigs) {
    if (s.err) continue;
    const tx = await rpc<{
      meta?: { err: unknown; preBalances: number[]; postBalances: number[] };
      transaction?: { message?: { accountKeys?: Array<{ pubkey: string } | string> } };
    }>("getTransaction", [s.signature, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed", commitment: "confirmed" }]);
    if (!tx?.meta || tx.meta.err) continue;
    const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === "string" ? k : k.pubkey));
    // The Solana-Pay `reference` MUST appear as an account in the tx — this is
    // what ties an on-chain payment to THIS specific quote. Without it, a poll
    // could match an unrelated transfer to the recipient wallet.
    if (!keys.includes(reference)) continue;
    const idx = keys.indexOf(SOL_RECIPIENT);
    if (idx < 0) continue;
    const delta = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
    if (delta >= minLamports) return s.signature;
  }
  return null;
}
