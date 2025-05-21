import { repay, TxnResponse } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function repayTokens(
  wallet: Keypair,
  marketPk: PublicKey,
  amount: number,
  borrowTokenMint: PublicKey,
  env: string = "devnet"
): Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);
  const { user, reserves } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  const txid = await repay(
    user,
    amount,
    borrowTokenMint,
    reserves
  );
  console.log(`Repay complete: ${txid}`);

  return txid[0] == TxnResponse.Success;
}
