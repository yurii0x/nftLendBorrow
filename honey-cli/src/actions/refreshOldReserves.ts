import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

export async function refreshOldReserve(
  wallet: Keypair,
  env: string,
  marketPkString: string
) {
  const program = await loadHoneyProgram(wallet, env);
  const { reserves } = await initWrappers(
    wallet,
    program,
    new PublicKey(marketPkString),
    env
  );
  Promise.all(reserves.map(async (reserve) => reserve.refreshOldReserves()));
}
