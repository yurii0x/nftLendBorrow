import {
  HoneyClient,
  HoneyReserve,
  // IReserve,
  ObligationAccount,
  ReserveStateLayout,
} from "@honey-finance/sdk";
import { HoneyMarket, HoneyMarketReserveInfo } from "@honey-finance/sdk";
import { BN } from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../helpers";
import { initWrappers } from "./initWrappers";

async function displayMarket(reserves: HoneyReserve[]) {
  // console.log(data);
  // await Promise.all(marketData.map(async data => {
  //     console.log(`Public key ${data.reserve}`);
  //     const reserveData = await client.program.account.reserve.fetch(data.reserve) as IReserve;
  //     // const reserveState = ReserveStateLayout.decode(Buffer.from(reserveData.state as any as number[])) as ReserveState;
  //     const reserveState = ReserveStateLayout.decode(new Uint8Array(reserveData.state)) as ReserveState;
  //     reserveData.reserveState = reserveState;
  //     console.log(`PublicKey ${data.reserve.toString()} ${reserveData} state: ${reserveState}`);
  // }))
  await Promise.all(
    reserves.map(async (reserve) => {
      await reserve.sendRefreshTx();
      await reserve.refresh();
      console.log(reserve.reserve.toString());
      // console.log(reserve.data);
      // console.log(reserve.state.outstandingDebt.div(new BN(10**18)).toString());
      console.log(
        `accruedUntil ${reserve.state.accruedUntil} \n outstanding debt: ${reserve.state.outstandingDebt} \n totalDepositNotes: ${reserve.state.totalDepositNotes}\n totalDeposits: ${reserve.state.totalDeposits}\n loan notes: ${reserve.state.totalLoanNotes}\n uncollected fees: ${reserve.state.uncollectedFees}\n`
      );
    })
  );
}

export async function getMarketState(
  wallet: Keypair,
  marketPk: PublicKey,
  env: string
) {
  const program = await loadHoneyProgram(wallet, env);

  const { client, reserves, market } = await initWrappers(
    wallet,
    program,
    marketPk,
    env
  );
  const [data, marketReserveInfo] = await HoneyMarket.fetchData(
    client,
    market.address
  );
  // @ts-ignore
  await displayMarket(reserves);
}
