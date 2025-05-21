import { ExecuteBidParams, LiquidatorClient, TxnResponse } from "@honey-finance/sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { loadHoneyProgram } from "../../helpers";
import { initWrappers } from "../initWrappers";

export async function executeBid(
    liquidator: LiquidatorClient,
    marketPk: PublicKey,
    obligationPk: PublicKey,
    reservePk: PublicKey,
    nftMintPk: PublicKey,
    bidPK: PublicKey,
    payer: PublicKey,
    wallet: Keypair,
    env: string = "devnet"
):Promise<boolean> {
    const program = await loadHoneyProgram(wallet, env);

    const { reserves } = await initWrappers(
        wallet,
        program,
        marketPk,
        env
    );

    console.log('reserve in reserves', reserves[0].reserve.toString())

    const bidData = await liquidator.program.account.bid.fetch(bidPK);

    // const withdrawSource = await Token.getAssociatedTokenAddress(
    //     ASSOCIATED_TOKEN_PROGRAM_ID,
    //     TOKEN_PROGRAM_ID,
    //     bidMint,
    //     bidder
    // );

    const params: ExecuteBidParams = {
        market: marketPk,
        obligation: obligationPk,
        reserve: reservePk,
        nftMint: nftMintPk,
        payer,
        bidder: new PublicKey(bidData.bidder),
    }

    const tx = await liquidator.executeBid(reserves, params);
    console.log("TxId: ", tx);
    return tx[0] == TxnResponse.Success;
}