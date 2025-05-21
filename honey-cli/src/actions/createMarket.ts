import { Program } from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { findMarketAuthorityAddress } from "../helpers/utils";

export async function createMarket(
  program: Program,
  updateAuthority: string,
  priceOracle: string,
  wallet: Keypair,
  quoteTokenMint: PublicKey = new PublicKey("So11111111111111111111111111111111111111112")
): Promise<PublicKey> {
  console.log("Creating market...");

  const market: Keypair = Keypair.generate();
  let [marketAuthority] = await findMarketAuthorityAddress(market.publicKey);

  const marketPk = market.publicKey;
  // should be taken as input
  const ua = new PublicKey(updateAuthority);

  const nftOraclePrice = new PublicKey(priceOracle);

  await program.rpc.initMarket(wallet.publicKey, "SOL", quoteTokenMint, ua, {
    accounts: {
      market: marketPk,
      oraclePrice: nftOraclePrice,
    },
    signers: [market],
    instructions: [await program.account.market.createInstruction(market)],
  });

  console.info("market:", marketPk.toBase58());
  return marketPk;
}
