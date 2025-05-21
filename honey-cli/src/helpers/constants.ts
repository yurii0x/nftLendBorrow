import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import idl from '../../../target/idl/honey.json';

export const HONEY_PROGRAM_ID = new PublicKey(
  "hNEYyRsRBVq2La65V1KjvdbTE39w36gwrdjkmcpvysk"
);
export const TEST_WRITER = new PublicKey(
  "8GJ1b6Aa5DKHh8arFDDngKRAYMLjpUWekiQfcrypN3AR"
);

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const SOL_ADDRESS = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const SVT_MINT_ADDRESS = new PublicKey("EPjFWdd5Au111111111111111111111111111111112");//dummy: droplet mint address for certain nft collection
type Cluster = {
  name: string;
  url: string;
};
export const CLUSTERS: Cluster[] = [
  {
    name: "mainnet-beta",
    url: "https://api.metaplex.solana.com/",
  },
  {
    name: "testnet",
    url: clusterApiUrl("testnet"),
  },
  {
    name: "devnet",
    url: clusterApiUrl("devnet"),
  },
  {
    name: "localhost",
    url: "http://localhost:8899",
  },
];
export const DEFAULT_CLUSTER = CLUSTERS[2];
