import {
  TxnResponse,
} from "@honey-finance/sdk";

import { Keypair, PublicKey } from "@solana/web3.js";

import { mintNFT } from "./mintNFT";
import { initWrappers } from "./initWrappers";
import { loadHoneyProgram } from "../helpers";

export async function depositNFT(
  wallet: Keypair,
  marketPk: PublicKey,
  tokenAccount: PublicKey,
  tokenMint: PublicKey,
  verifiedCreator: PublicKey,
  env: string = "devnet"
):Promise<boolean> {
  const program = await loadHoneyProgram(wallet, env);
  const { user } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  if (tokenAccount && tokenMint) {
    const txid = await user.depositNFT(tokenAccount, tokenMint, verifiedCreator);

    if(txid[0] == TxnResponse.Success)
      console.log(
        `Token mint ${tokenMint.toString()} was deposited in account ${tokenAccount.toString()}`
      );
    console.log(`Txn ${txid}`);
    return txid[0] == TxnResponse.Success;
  } else {
    // if tokenAccount and tokenMint aren't supplied, it will use the base user wallet
    const { userAssosciatedAccount, nftMint } = await mintNFT(wallet, program.provider);
    const txid = await user.depositNFT(
      userAssosciatedAccount.address,
      nftMint.publicKey,
      wallet.publicKey
    );
    console.log(
      `Token mint ${nftMint.publicKey.toString()} was deposited from account ${userAssosciatedAccount.address.toString()}`
    );
    console.log(`Txn ${txid}`);
    return txid[0] == TxnResponse.Success;
  }
}

