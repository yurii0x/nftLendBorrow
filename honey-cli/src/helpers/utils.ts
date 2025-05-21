import { Connection, Keypair, PublicKey, Signer } from "@solana/web3.js";
import { CLUSTERS, DEFAULT_CLUSTER, HONEY_PROGRAM_ID } from "./constants";
import * as anchor from "@project-serum/anchor";
import { ReserveConfig } from "@honey-finance/sdk";

export function getCluster(name: string): string {
  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      return cluster.url;
    }
  }
  return DEFAULT_CLUSTER.url;
}
export async function findMarketAuthorityAddress(market: PublicKey) {
  return PublicKey.findProgramAddress([market.toBuffer()], HONEY_PROGRAM_ID);
}

interface HasPublicKey {
  publicKey: PublicKey;
}
/**
 * Convert some object of fields with address-like values,
 * such that the values are converted to their `PublicKey` form.
 * @param obj The object to convert
 */
export function toPublicKeys(
  obj: Record<string, string | PublicKey | HasPublicKey>
): any {
  const newObj: Record<string, string | PublicKey | HasPublicKey> = {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value == "string") {
      newObj[key] = new PublicKey(value);
    } else if ("publicKey" in value) {
      newObj[key] = value.publicKey;
    } else {
      newObj[key] = value;
    }
  }

  return newObj;
}

export const reserveConfig = {
  // utilizationRate1: 4000,
  // utilizationRate2: 8000,
  // borrowRate0: 10000,
  // borrowRate1: 25000,
  // borrowRate2: 40000,
  // borrowRate3: 140000,
  utilizationRate1: 8500,
  utilizationRate2: 9500,
  borrowRate0: 20000,
  borrowRate1: 20000,
  borrowRate2: 20000,
  borrowRate3: 20000,
  minCollateralRatio: 12500,
  liquidationPremium: 100,
  manageFeeRate: 50,
  manageFeeCollectionThreshold: new anchor.BN(10),
  loanOriginationFee: 250,
} as ReserveConfig;
