import { deposit, HoneyReserve, TxnResponse } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function depositTokens(
  wallet: Keypair,
  marketPk: PublicKey,
  amount: number,
  tokenMint: string,
  env: string = "devnet",
):Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);
  const { user, reserves, client } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  console.log('reserves[0]', reserves[0].reserve.toString(), reserves[0].data.tokenMint.toString());
  const { data, state } = await HoneyReserve.decodeReserve(client, reserves[0].reserve);
  console.log('depositNoteMint', data.depositNoteMint.toString())
  const txid = await deposit(user, amount, new PublicKey(tokenMint), reserves);
  console.log(`Deposit complete: ${txid}`);

  return txid[0] == TxnResponse.Success;
}
