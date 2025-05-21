import { Amount, HoneyReserve, parseObligationAccount } from "@honey-finance/sdk";
import { Jupiter } from "@jup-ag/core";
import * as anchor from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Cluster, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { depositNft } from "@solventprotocol/solvent-core";
import JSBI from "jsbi";
import { HONEY_PROGRAM_ID, SOL_ADDRESS, SVT_MINT_ADDRESS, USDC_MINT } from "../helpers/constants";
import { initWrappers } from "./initWrappers";
import {
  getAssociatedTokenAddress
} from "@solana/spl-token-latest";
import { findMarketAuthorityAddress } from "../helpers/utils";
import { loadHoneyProgram } from "../helpers";

export async function solventLiquidate(
  provider: anchor.AnchorProvider,
  wallet: Keypair,
  marketPkString: string,
  env: string,
  nftMint: string,
  depositor: string,
  verifiedCreator?: string): Promise<void>{
    const program = await loadHoneyProgram(wallet, env);
    const { client, user, reserves } = await initWrappers(        
      wallet,
      program,
      new PublicKey(marketPkString),
      env
    );

    // 1. Withdraw nft from HoneyProgram to DAO
    const nftATA: PublicKey | undefined = await getAssociatedTokenAddress(
      new PublicKey(nftMint),
      wallet.publicKey,
    );

    if (!nftATA) {
      console.error(`Could not find the associated token account: ${nftATA}`);
      return;
    } else {
      console.log('associatedTokenAccount', nftATA.toString());
    }

    const nftMintPk = new PublicKey(nftMint);

    // Create the wallet token account if it doesn't exist
    const createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      nftMintPk,
      nftATA,
      wallet.publicKey,
      wallet.publicKey,
    );
    try {
      const txNewAccount = await program.provider.send(new Transaction().add(createTokenAccountIx), [], { skipPreflight: false });
      console.log('txNewAccount', txNewAccount);
    } catch(e) {
      console.log('Account already exists!');
    }

    const vfCreator = verifiedCreator ? new PublicKey(verifiedCreator) : wallet.publicKey;
    const txid = await user.withdrawNFTSolvent(nftATA, nftMintPk, new PublicKey(depositor), vfCreator);
    console.log('withdraw transaction', txid);

    // 2. sell NFT in Solvent
    let dropletMint = new PublicKey(SVT_MINT_ADDRESS);
    let txdeposit = await depositNft(provider, dropletMint, nftMintPk);
    console.log('deposited nft into solvent', txdeposit);

    let dropletATA = await getAssociatedTokenAddress(
      dropletMint,
      wallet.publicKey
    );

    // Get droplet balance in the server wallet
    const dropletAmount = (await provider.connection.getTokenAccountBalance(
      dropletATA,
      "processed"
    )).value.amount;

    // 3. Swap droplet through Jupiter
    const jupiter = await Jupiter.load({
      connection: provider.connection,
      cluster: env as Cluster,
      user: wallet, // or public key
      // platformFeeAndAccounts:  NO_PLATFORM_FEE,
      routeCacheDuration: 10_000, // Will not refetch data on computeRoutes for up to 10 seconds
    });

    const routes = await jupiter.computeRoutes({
      inputMint: dropletMint, // Mint address of the input token
      outputMint: SOL_ADDRESS, // Mint address of the output token
      amount: JSBI.BigInt(dropletAmount), // raw input amount of tokens
      slippage: 4, // The slippage in % terms
      forceFetch: false // false is the default value => will use cache if not older than routeCacheDuration
    });

    // Prepare execute exchange
    const { execute } = await jupiter.exchange({
      routeInfo: routes.routesInfos[0],
    });

    // Execute swap
    const swapResult: any = await execute();

    const solAmount = Amount.tokens(swapResult.outputAmount);

    //4. Update onchain data of HoneyProgram
    const reserve: HoneyReserve = reserves.filter((reserve: HoneyReserve) =>
      reserve?.data?.tokenMint.equals(SOL_ADDRESS),
    )[0];
    console.log('reserve', reserve.reserve.toString());

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), new PublicKey(marketPkString).toBuffer(), new PublicKey(depositor).toBuffer()],
      HONEY_PROGRAM_ID,
    );
    const obligationData = await provider.connection.getAccountInfo(obligationAddress);
    if (!obligationData) {
      console.log('Wrong depositor address!');
      return;
    }
    const obligation = parseObligationAccount(obligationData.data, client.program.coder);

    console.log('obligation.owner', obligation.owner.toString());

    const derivedAccounts = await HoneyReserve.deriveAccounts(client, reserve.reserve, SOL_ADDRESS);
    const loanNoteMint = derivedAccounts.loanNoteMint;
    const vault = derivedAccounts.vault;
    const [loanAccountPK, loanAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('loan'), reserve.reserve.toBuffer(), obligationAddress.toBuffer(), obligation.owner.toBuffer()],
      HONEY_PROGRAM_ID,
    );
    console.log('loanAccount', loanAccountPK.toString());
    let [marketAuthority] = await findMarketAuthorityAddress(new PublicKey(marketPkString));
    const collateralAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      nftMintPk,
      marketAuthority,
      true,
    );

    const refreshIx = await reserves[0].makeRefreshIx();
    const liquidateTx = new Transaction().add(refreshIx);

    const ix = await client.program.instruction.liquidateSolvent(
      solAmount,
      {
        accounts: {
          market: marketPkString,
          reserve: reserve.reserve,
          vault: vault.address,
          obligation: obligationAddress,
          loanNoteMint: loanNoteMint.address,
          loanAccount: loanAccountPK,
          marketAuthority: marketAuthority,
          nftMint: nftMintPk,
          collateralAccount: collateralAddress,
          executor: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        },
      }
    );
    liquidateTx.add(ix);

    try{
      const liquidateTxid = await provider.sendAndConfirm(liquidateTx, [], { skipPreflight: true });
      console.log('liquidated!', liquidateTxid);
    } catch(err) {
      console.log('Error executing liquidateSolvent', err);
    }
}
