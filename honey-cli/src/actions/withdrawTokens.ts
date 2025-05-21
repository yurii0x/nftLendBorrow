import { borrow, TxnResponse, withdraw } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function withdrawTokens(
  wallet: Keypair,
  marketPk: PublicKey,
  amount: number,
  tokenMint: string,
  env: string = "devnet",
):Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);
  const { user, reserves } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  const txid = await withdraw(user, amount, new PublicKey(tokenMint), reserves);
  console.log(`Withdraw complete: ${txid}`);

  return txid[0] == TxnResponse.Success;
}
