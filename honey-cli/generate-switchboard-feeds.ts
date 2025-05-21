import * as anchor from "@project-serum/anchor";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { SwitchboardTestContext } from "@switchboard-xyz/sbv2-utils";
import { AggregatorAccount } from "@switchboard-xyz/switchboard-v2";
import { getKeypair } from "./utils";
import os from "os";
import path from "path";

const generateFeeds = async () => {
    // get payer keypair
    let authority: Keypair;
    if (process.env.PAYER_KEYPAIR) {
      authority = getKeypair(process.env.PAYER_KEYPAIR);
    } else {
      // attempt to load default keypair
      const homeDir = os.homedir();
      authority = getKeypair(path.join(homeDir, ".config/solana/id.json"));
    }
  
    // get cluster
    let cluster: "mainnet-beta" | "devnet" | "localnet";
    if (
      process.env.CLUSTER &&
      (process.env.CLUSTER === "mainnet-beta" ||
        process.env.CLUSTER === "devnet" ||
        process.env.CLUSTER === "localnet")
    ) {
      cluster = process.env.CLUSTER;
    } else {
      cluster = "devnet";
    }
  
    // get RPC_URL
    let rpcUrl: string;
    if (process.env.RPC_URL) {
      rpcUrl = process.env.RPC_URL;
    } else {
      rpcUrl =
        cluster === "localnet" ? "http://localhost:8899" : clusterApiUrl(cluster);
    }

    const wallet = new anchor.Wallet(authority);
    
  const provider = new anchor.AnchorProvider(new Connection(rpcUrl), wallet, anchor.AnchorProvider.defaultOptions());

  // load the Switchboard env to dictate which queue to create feed for
  const switchboard = await SwitchboardTestContext.loadFromEnv(
    // @ts-ignore
    provider,
    "./.switchboard/switchboard.env",
    100_000_000
  );

  // create a static feed that will always resolve to 100
  // then call openRound and wait for the oracle to process the update
  const aggregatorAccount =
    await switchboard.createStaticFeed(100);

  console.log(aggregatorAccount.publicKey.toBase58());
};

generateFeeds();