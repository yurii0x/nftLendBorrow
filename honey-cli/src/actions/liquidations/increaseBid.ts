import { LiquidatorClient, PlaceBidParams, TxnResponse } from "@honey-finance/sdk";
import { IncreaseBidParams } from "@honey-finance/sdk/dist/wrappers/liquidator";
import { PublicKey } from "@solana/web3.js";


export async function increaseBid(
    liquidator: LiquidatorClient,
    bidderPk: PublicKey,
    bidMintPk: PublicKey,
    bidIncrease: number,
    marketPk: PublicKey):Promise<boolean> {

    // Non-SOL liquidations
    // const depositSource = await Token.getAssociatedTokenAddress(
    //     ASSOCIATED_TOKEN_PROGRAM_ID,
    //     TOKEN_PROGRAM_ID,
    //     bidMintPk,
    //     bidderPk
    // );

    const params: IncreaseBidParams = {
        bid_increase: bidIncrease,
        market: marketPk,
        bidder: bidderPk,
        bid_mint: bidMintPk,
        // deposit_source: depositSource.publicKey,
    }

    const tx = await liquidator.increaseBid(params);
    console.log(tx);
    return tx[0] == TxnResponse.Success;
}