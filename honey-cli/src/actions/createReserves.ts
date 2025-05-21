import { CreateReserveParams, HoneyClient, HoneyMarket, HoneyReserve } from "@honey-finance/sdk";
import { Program } from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { HONEY_PROGRAM_ID } from "../helpers/constants";
import { reserveConfig } from "../helpers/utils";
import { initWrappers } from "./initWrappers";

export async function createReserves(
  wallet: Keypair,
  marketPk: PublicKey,
  switchboardOraclePkString: string,
  nftDropletMint: PublicKey,
  env: string = "devnet",
  quoteTokenMint: PublicKey = new PublicKey("So11111111111111111111111111111111111111112")
):Promise<HoneyReserve> {
  const program = await loadHoneyProgram(wallet, env);
  console.log('marketPk', marketPk.toString());
  const { market } = await initWrappers(wallet, program, marketPk, env);

  console.log("market address", market.address.toBase58());
  console.info("Creating reserve...");

  let reserve:HoneyReserve;
  // dummy data devnet
  if (env == "devnet") {
    const switchboardOracle = new PublicKey(switchboardOraclePkString);
    const marketAPubKey = new PublicKey(
      "AgoziPu6X6piCy5Bzx9m6obXWnomSDR6gdWj8nypAQ12"
    );
    const marketBPubKey = new PublicKey(
      "2Qzd6bAPKgezXSYPmCVr5GJpG96cYZDLMYFv1LozAdMG"
    );

    reserve = await market.createReserve({
      dexMarketA: marketAPubKey,
      dexMarketB: marketBPubKey,
      nftDropletMint: nftDropletMint,
      switchboardOracle: switchboardOracle,
      tokenMint: quoteTokenMint,
      config: reserveConfig,
    } as CreateReserveParams);
  } else {
    // dummy data my localhost setup
    const switchboardOracle = new PublicKey(switchboardOraclePkString);
    const marketAPubKey = new PublicKey(
      "4o7VDc1Gx3eyRoG7DJmd35Yp8dUQv7EZxHWYeAqkPczw"
    );
    const marketBPubKey = new PublicKey(
      "HNyS197hbyCeopRcuGTiBxZ4GCv5S5yBadLaoGrw36TZ"
    );
    const quoteTokenMint = new PublicKey(
      "So11111111111111111111111111111111111111112"
    );
    reserve = await market.createReserve({
      dexMarketA: marketAPubKey,
      dexMarketB: marketBPubKey,
      nftDropletMint: nftDropletMint,
      tokenMint: quoteTokenMint,
      switchboardOracle: switchboardOracle,
      config: reserveConfig,
    } as CreateReserveParams);
  }
  await reserve.sendRefreshTx();// update market's reserve cache data
  return reserve;
}
