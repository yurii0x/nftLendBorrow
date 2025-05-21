import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { LiquidatorClient } from "@honey-finance/sdk";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { getCluster } from "../helpers/utils";

export async function initLiquidator(wallet: Keypair, env: string, honeyProgramId: string) {
    const devnet = env === 'devnet';
    const connection = new Connection(getCluster(env));
    const provider = new anchor.AnchorProvider(connection, new NodeWallet(wallet), { preflightCommitment: "recent" });
    console.log('programId initting liquidator', honeyProgramId);
    const liquidatorClient: LiquidatorClient = await LiquidatorClient.connect(provider, honeyProgramId, devnet);

    return { liquidatorClient }
}