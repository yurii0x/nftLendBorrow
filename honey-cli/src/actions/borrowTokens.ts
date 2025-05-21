import {
  Amount,
  borrow,
  deriveAssociatedTokenAccount,
  TxnResponse,
} from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function borrowTokens(
  wallet: Keypair,
  marketPk: PublicKey,
  amount: number,
  borrowTokenMint: PublicKey,
  env: string = "devnet"
):Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);

  const { user, reserves } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  await user.refresh();

  // const txid = await user.borrow(reserves[0], associatedTokenAccount, Amount.tokens(amount))
  const txid = await borrow(
    user,
    amount,
    new PublicKey(borrowTokenMint),
    reserves
  );
  console.log(`Borrow complete: ${txid}`);

  return txid[0] == TxnResponse.Success;
}
