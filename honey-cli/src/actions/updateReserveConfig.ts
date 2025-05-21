import { UpdateReserveConfigParams } from "@honey-finance/sdk/dist/wrappers/reserve";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { reserveConfig } from "../helpers/utils";
import { initWrappers } from "./initWrappers";

export async function updateReserveConfig(
    wallet: Keypair,
    marketPkString: string,
    env: string = "devnet"
) {
    const program = await loadHoneyProgram(wallet, env);
    const { reserves } = await initWrappers(
      wallet,
      program,
      new PublicKey(marketPkString),
      env
    );

    const config = {
        config: reserveConfig,
        reserve: reserves[0].reserve,
        market: new PublicKey(marketPkString),
        owner: wallet
    } as UpdateReserveConfigParams;
    await reserves[0].updateReserveConfig(config);
}