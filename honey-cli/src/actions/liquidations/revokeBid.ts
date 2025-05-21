import { LiquidatorClient, RevokeBidParams, TxnResponse } from "@honey-finance/sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

export async function revokeBid(
    liquidator: LiquidatorClient,
    bidderPk: PublicKey,
    bidMintPk: PublicKey,
    marketPk: PublicKey,
):Promise<boolean> {

    // TODO needed for non-wSOL bids
    // const withdrawDestination = await Token.getAssociatedTokenAddress(
    //     ASSOCIATED_TOKEN_PROGRAM_ID,
    //     TOKEN_PROGRAM_ID,
    //     bidMint,
    //     bidder
    // );

    const params: RevokeBidParams = {
        market: marketPk,
        bidder: bidderPk,
        bid_mint: bidMintPk
        // withdraw_destination: withdrawDestination,
    }

    const tx = await liquidator.revokeBid(params);
    console.log("TxId: ", tx);
    return tx[0] == TxnResponse.Success;
}