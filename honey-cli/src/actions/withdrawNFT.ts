import { TxnResponse } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function withdrawNFT(
  wallet: Keypair,
  marketPk: PublicKey,
  tokenAccount: PublicKey,
  tokenMint: PublicKey,
  verifiedCreator?: PublicKey,
  env: string = "devnet"
):Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);
  const { user } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  const txid = await user.withdrawNFT(tokenAccount, tokenMint, verifiedCreator);
  console.log(txid);
  return txid[0] == TxnResponse.Success;
}
