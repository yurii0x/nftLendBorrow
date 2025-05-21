import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {
  HoneyClient,
  HoneyMarket,
  HoneyReserve,
  HoneyUser,
} from "@honey-finance/sdk";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { Program } from "@project-serum/anchor";

export async function initWrappers(
  wallet: Keypair,
  program: Program,
  marketPk: PublicKey,
  env: string = "devnet"
) {
  console.log('env when initting Wrapper', env);
  const client: HoneyClient = new HoneyClient(program, env === "devnet");
  console.log('constructed HoneyClient');
  const market:HoneyMarket = await HoneyMarket.load(client, marketPk);
  console.log('loaded HoneyMarket')
  const reserves: HoneyReserve[] = market.reserves
    .map((reserve) => new HoneyReserve(client, market, reserve.reserve))
    .filter((reserve) => !reserve.reserve.equals(PublicKey.default));
  await Promise.all(
    reserves.map(async (reserve) => {
      if (
        reserve.reserve &&
        reserve.reserve.toBase58() !== PublicKey.default.toBase58()
      )
        await reserve.refresh();
    })
  );
  const user = await HoneyUser.load(client, market, wallet.publicKey, reserves);
  return { client, market, user, reserves };
}