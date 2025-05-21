import { LiquidatorClient, PlaceBidParams, TxnResponse } from "@honey-finance/sdk";
import { PublicKey } from "@solana/web3.js";


export async function placeBid(
    liquidator: LiquidatorClient,
    bidderPk: PublicKey,
    bidMintPk: PublicKey,
    bidLimit: number,
    marketPk: PublicKey):Promise<boolean> {

    // Non-SOL liquidations
    // const depositSource = await Token.getAssociatedTokenAddress(
    //     ASSOCIATED_TOKEN_PROGRAM_ID,
    //     TOKEN_PROGRAM_ID,
    //     bidMintPk,
    //     bidderPk
    // );

    const params: PlaceBidParams = {
        bid_limit: bidLimit,
        market: marketPk,
        bidder: bidderPk,
        bid_mint: bidMintPk,
        // deposit_source: depositSource.publicKey,
    }

    const tx = await liquidator.placeBid(params);
    console.log("TxId: ", tx);
    return tx[0] == TxnResponse.Success;
}