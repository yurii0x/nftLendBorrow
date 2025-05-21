import { NodeWallet } from "@metaplex/js";
import { Keypair } from "@solana/web3.js";
import log from "loglevel";
import { HONEY_PROGRAM_ID } from "./constants";
import { getCluster } from "./utils";
import fs from "fs";
import * as anchor from "@project-serum/anchor";

export function loadWalletKey(keypair): Keypair {
    if (!keypair || keypair == "") {
      throw new Error("Keypair is required!");
    }
    const loaded = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString()))
    );
    log.info(`wallet public key: ${loaded.publicKey}`);
    return loaded;
  }

  export async function loadHoneyProgram(
    walletKeyPair: Keypair,
    env: string,
    customRpcUrl?: string
  ) {
    if (customRpcUrl) console.log("USING CUSTOM URL", customRpcUrl);

    log.info(env);
    const solConnection = new anchor.web3.Connection(
      customRpcUrl || getCluster(env)
    );

    const walletWrapper = new NodeWallet(walletKeyPair);
    const provider = new anchor.AnchorProvider(solConnection, walletWrapper, {
      preflightCommitment: "recent",
    });
    console.log("fetchingIDL of", HONEY_PROGRAM_ID.toString());
    const idl = await anchor.Program.fetchIdl(HONEY_PROGRAM_ID, provider);
    const program = new anchor.Program(idl, HONEY_PROGRAM_ID, provider);
    return program;
  }