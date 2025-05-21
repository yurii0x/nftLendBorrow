import { ObligationAccount } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

function displayObligation(obligation: ObligationAccount) {
  obligation.collateralNftMint.map((collateralMint) =>
    console.log(`Nft mint: ${collateralMint.toString()}`)
  );
  console.log("Loans: ");
  obligation.loans.map((collat) =>
    console.log(
      `${collat.account}: amount: ${collat.amount.toString()} side: ${
        collat.side
      }`
    )
  );
}
export async function getObligationState(
  wallet: Keypair,
  marketPk: PublicKey,
  env: string = "devnet"
):Promise<ObligationAccount | null> {
  const program = await loadHoneyProgram(wallet, env);

  const { user } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  const obligation = await user.getObligationData();
  if (obligation instanceof Error) {
    console.log(obligation);
    return null;
  } else {
    displayObligation(obligation);
    return obligation;
  }
}
