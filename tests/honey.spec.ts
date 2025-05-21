import * as bs58 from "bs58";
import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import * as chaiAsPromised from "chai-as-promised";
import { Honey } from "target/types/honey";
import {
    HoneyMarket,
    HoneyUser,
    HoneyReserve,
    Amount,
    HoneyClient,
    CreateMarketParams,
    TxnResponse,
    ReserveAccount,
    ReserveStateStruct,
    CreateReserveParams,
    ReserveStateLayout,
    ReserveConfig,
    ObligationAccount,
    TxResponse
} from "@honey-finance/sdk";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert, expect, use as chaiUse } from "chai";
import { AnchorProvider, BN } from "@project-serum/anchor";
import log from 'loglevel';
import { DEX_PID, setupTwoMarkets } from "./utils/serum-swap";
import { Market } from "@project-serum/serum";
import { createKeypair, mintNft, parseU192, verifyCollection } from "./utils";
import { getSolvent } from "@solventprotocol/solvent-core";
import { BUCKET_SEED } from "./utils/solvent";

import {
  AggregatorAccount,
  OracleQueueAccount,
  loadSwitchboardProgram,
  ProgramStateAccount,
  CrankAccount,
  OracleAccount,
  PermissionAccount,
  SwitchboardPermission,
  LeaseAccount,
  OracleJob,
  JobAccount,
  AccountParams
} from "@switchboard-xyz/switchboard-v2";
import { sleep, SwitchboardTestContext, SwitchboardTestEnvironment } from "@switchboard-xyz/sbv2-utils";

import * as util from 'util';
import * as child from 'child_process';
import { createMarket } from "honey-cli/src/actions/createMarket";
import { createReserves } from "honey-cli/src/actions/createReserves";
import { depositTokens } from "honey-cli/src/actions/depositTokens";
import { withdrawTokens } from "honey-cli/src/actions/withdrawTokens";
import { NftInfo } from "./utils/types";
import { depositNFT } from "honey-cli/src/actions/depositNFT";
import { withdrawNFT } from "honey-cli/src/actions/withdrawNFT";
import { borrowTokens } from "honey-cli/src/actions/borrowTokens";
import { initWrappers } from "honey-cli/src/actions/initWrappers";
import { repayTokens } from "honey-cli/src/actions/repayTokens";
import { placeBid } from "honey-cli/src/actions/liquidations/placeBid";
import { initLiquidator } from "honey-cli/src/actions/initLiquidator";
import { increaseBid } from "honey-cli/src/actions/liquidations/increaseBid";
import { revokeBid } from "honey-cli/src/actions/liquidations/revokeBid";
import { executeBid } from "honey-cli/src/actions/liquidations/executeBid";
import { getObligationState } from "honey-cli/src/actions/getObligationState";
import { createAccount, NATIVE_MINT } from "@solana/spl-token-latest";

chaiUse(chaiAsPromised.default);
// SET GLOBAL VARIABLES
  const tempProvider = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(tempProvider.connection, tempProvider.wallet, {commitment: 'finalized', skipPreflight: true})
  anchor.setProvider(provider);

const honeyProgram: anchor.Program = anchor.workspace.Honey as anchor.Program<Honey>;
const wallet = provider.wallet as anchor.Wallet;
const quoteTokenMint = new PublicKey("So11111111111111111111111111111111111111112");
let honeyMarketPk: PublicKey;
let reservePk: PublicKey;
let honeyReserve: HoneyReserve;
let honeyClient: HoneyClient;
let honeyMarket: HoneyMarket;


const solventProgram = getSolvent(provider);
let collectionMint: anchor.web3.PublicKey;
let collectionCreatorKeypair: Keypair;
const nftSymbol = "DAPE";
let userKeypair: anchor.web3.Keypair,
  dropletMintKeypair: anchor.web3.Keypair,
  bucketStateAddress: anchor.web3.PublicKey;
let collectionCreator: PublicKey, dropletMint: PublicKey, userPk: PublicKey;
const nftInfos: NftInfo[] = [];

let nftAggregatorPk: PublicKey = new PublicKey("4FcQKqmQKXuiyJatHkMy7pXwUSMPuXh5sXLacAnyxh7v");
let tokenAggregatorPk: PublicKey = new PublicKey("DfZxR1TKfDMvjCLM1Si3BDDSS283jba8HTd1cewhNAnN");
let nftAggregator: AggregatorAccount;
let tokenAggregator: AggregatorAccount;
// let switchboard: SwitchboardTestContext;

describe("Switchboard", () => {
  // it("Create a Data Feed", async() => {
  //   const switchboardProgram = await loadSwitchboardProgram(
  //     "devnet",
  //     new Connection(clusterApiUrl("devnet")),
  //     wallet.payer
  //   );

  //   const queueAccount = new OracleQueueAccount({
  //     program: switchboardProgram,
  //     // devnet permissionless queue
  //     publicKey: new PublicKey("F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy"),
  //   });
    
  //   const aggregatorAccount = await AggregatorAccount.create(switchboardProgram, {
  //     name: Buffer.from("FeedName"),
  //     batchSize: 6,
  //     minRequiredJobResults: 1,
  //     minRequiredOracleResults: 1,
  //     minUpdateDelaySeconds: 30,
  //     queueAccount,
  //   });
  //   await aggregatorAccount.openRound({
  //     oracleQueueAccount: queueAccount,
  //     payoutWallet: wallet.publicKey,
  //   });
  //   const result = await aggregatorAccount.getLatestValue();

  //   console.log('result', result);
  // })
//   it("load from devnet", async() => {
//     let rpcUrl: string = provider.connection.rpcEndpoint;
//     const switchboardProgram = await loadSwitchboardProgram(
//       "devnet",
//       new Connection(rpcUrl),
//       wallet.payer,
//       {
//         commitment: "finalized",
//       }
//     );

//     // Program State Account and token mint for payout rewards
//     const [programStateAccount] = ProgramStateAccount.fromSeed(switchboardProgram);
//     console.log("Program State", programStateAccount.publicKey.toString());
//     const mint = await programStateAccount.getTokenMint();

//     const tokenAccount = await createAccount(
//       switchboardProgram.provider.connection,
//       wallet.payer,
//       mint.address,
//       wallet.publicKey,
//       Keypair.generate()
//     );

//     // Oracle Queue
//     const queueAccount = new OracleQueueAccount({ program: switchboardProgram, publicKey: new PublicKey("F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy") });

//     // Aggregator
//     const aggregatorAccount = await AggregatorAccount.create(switchboardProgram, {
//       name: Buffer.from("SOL_USD"),
//       batchSize: 1,
//       minRequiredOracleResults: 1,
//       minRequiredJobResults: 1,
//       minUpdateDelaySeconds: 10,
//       queueAccount,
//       authority: wallet.publicKey,
//     });
//     console.log(
//       `Aggregator (SOL/USD)`, aggregatorAccount.publicKey.toString()
//     );
//     if (!aggregatorAccount.publicKey) {
//       throw new Error(`failed to read Aggregator publicKey`);
//     }

//     // Aggregator permissions
//     const aggregatorPermission = await PermissionAccount.create(switchboardProgram, {
//       authority: wallet.publicKey,
//       granter: queueAccount.publicKey,
//       grantee: aggregatorAccount.publicKey,
//     });
//     await aggregatorPermission.set({
//       authority: wallet.payer,
//       permission: SwitchboardPermission.PERMIT_ORACLE_QUEUE_USAGE,
//       enable: true,
//     });
//     console.log(`  Permission`, aggregatorPermission.publicKey.toString());

//     // Lease
//     const leaseContract = await LeaseAccount.create(switchboardProgram, {
//       loadAmount: new anchor.BN(0),
//       funder: tokenAccount,
//       funderAuthority: wallet.payer,
//       oracleQueueAccount: queueAccount,
//       aggregatorAccount,
//     });
//     console.log(`  Lease`, leaseContract.publicKey.toString());

//     // Job
//     const tasks: OracleJob.Task[] = [
//       OracleJob.Task.create({
//         valueTask: OracleJob.ValueTask.create({
//           value: 100
//         })
//       })
//     ];

//     const jobData = Buffer.from(
//       OracleJob.encodeDelimited(
//         OracleJob.create({
//           tasks,
//         })
//       ).finish()
//     );
//     const jobKeypair = anchor.web3.Keypair.generate();
//     const jobAccount = await JobAccount.create(switchboardProgram, {
//       data: jobData,
//       keypair: jobKeypair,
//       authority: wallet.publicKey,
//     });
//     console.log(`  Job (FTX)`, jobAccount.publicKey.toString());

//     await aggregatorAccount.addJob(jobAccount, wallet.payer); // Add Job to Aggregator
//     // aggregatorAccount = new AggregatorAccount({} as AccountParams)
//     console.log("\u2714 Switchboard setup complete");

//     aggregatorAccount.openRound({oracleQueueAccount: queueAccount, payoutWallet: wallet.publicKey});

//     // Read Aggregators latest result

//     await sleep(5000);
//     try {
//       const result = await aggregatorAccount.getLatestValue();
//       console.log("Result:", result);
//     } catch (error: any) {
//       if (error.message === "Aggregator currently holds no value.") {
//         console.log(
//           "Aggregator holds no value, was the oracle running?"
//         );
//         return;
//       }
//       console.error(error);
//     }

//     // console.log('loading...', wallet.publicKey.toString())
//     // const switchboard = await SwitchboardTestContext.loadDevnetQueue(provider, "F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy", 100000000);
//     // console.log('loaded switchboard devnet');
//     // const aggregator = await switchboard.createStaticFeed(100);
//     // console.log('created static value');
//     // console.log('aggregator value', await aggregator.getLatestValue());
//   })
});

describe("Solvent(For Metaplex v1.1 collections)", () => {

  before(async () => {
    // An NFT enthusiast wants to create a bucket for an NFT collection
    userKeypair = await createKeypair(provider);
    await sleep(10000);
    // Create the bucket address
    dropletMintKeypair = new anchor.web3.Keypair();

    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMintKeypair.publicKey.toBuffer(), BUCKET_SEED],
      solventProgram.programId
    );

    // Create the collection NFT
    collectionCreatorKeypair = await createKeypair(provider);

    await sleep(10000);

    const { mint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );
    collectionMint = mint;

    collectionCreator = collectionCreatorKeypair.publicKey;
    dropletMint = dropletMintKeypair.publicKey;

    console.log('collectionCreator', collectionCreator.toString());
    console.log('bucketStateAddress', bucketStateAddress.toString());
    console.log('dropletMintKeypair', dropletMint.toString());
    console.log('collectionMint', collectionMint.toString());

  });

  it("can create a bucket", async () => {
    console.log(solventProgram.programId.toString());

    // Create bucket on Solvent
    // await provider.connection.confirmTransaction(
    const tx = await solventProgram.methods
        // @ts-ignore
        .createBucket({ v2: { collectionMint: collectionMint } })
        .accounts({
          signer: userKeypair.publicKey,
          dropletMint: dropletMintKeypair.publicKey,
        })
        .signers([dropletMintKeypair, userKeypair])
        .rpc();
    console.log('created a bucket', tx);
    // );
    // Fetch BucketState account and assert it has correct data
    const bucketState = await solventProgram.account.bucketStateV3.fetch(
      bucketStateAddress
    );
    assert(
      // @ts-ignore
      bucketState.collectionInfo.v2.collectionMint.equals(collectionMint)
    );
    assert(bucketState.dropletMint.equals(dropletMintKeypair.publicKey));
    expect(bucketState.isLockingEnabled).to.be.false;
  });

  afterEach(() => {
    // collectionMint = undefined;
  });
});

describe("honey", async () => {

  before(async () => {
    console.log("rpcEndpoint", provider.connection.rpcEndpoint);

    // assuming you have run Solvent script
    // collectionCreator = new PublicKey("BuCZ4ireD7qa1rQWH38xLoQEYL6QcoLEbFtvpagdmq7P");
    // bucketStateAddress = new PublicKey("86yxsPZ6Yq3JZ1fPS9RSwzHRByVcVQ7CnUUG2VfoUJwh");
    // dropletMint = new PublicKey("29tT75XUVg1GW7oYuPSjGmhQxrckAfAvwcERghujwt5j");
    // collectionMint = new PublicKey("43EXhRjTVk7AmBANZbJ3q9mjjUq7aoQdtWonjmexMgUP");

    // console.log('collectionCreator', collectionCreator.toString());
    // console.log('bucketStateAddress', bucketStateAddress.toString());
    // console.log('dropletMintKeypair', dropletMint.toString());
    // console.log('collectionMint', collectionMint.toString());

    //assuming you have run `ts-node generate-switchboard.ts` inside `honey-cli` and oracle is running

    /*
    // load the Switchboard env to dictate which queue to create feed for
    switchboard = await SwitchboardTestContext.loadFromEnv(
      // @ts-ignore
      provider,
      "./honey-cli/.switchboard/switchboard.env",
      100_000_000
    );
    const switchboard = await SwitchboardTestContext.loadDevnetQueue(provider, "F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy");
    */

    // TODO: create a static feed that will always resolve to 100
    // then call openRound and wait for the oracle to process the update
    const switchboardProgram = await loadSwitchboardProgram("devnet")

    nftAggregator = new AggregatorAccount({program: switchboardProgram, publicKey: nftAggregatorPk});
    tokenAggregator = new AggregatorAccount({program: switchboardProgram, publicKey: tokenAggregatorPk});

  });
  it("create a market", async() => {
    honeyMarketPk = await createMarket(honeyProgram, collectionCreator.toString(), nftAggregatorPk.toString(), wallet.payer);

    let marketAccount = await honeyProgram.account.market.fetch(honeyMarketPk);
    // console.log('marketAccount', marketAccount);
    // @ts-ignore
    assert(marketAccount.quoteTokenMint.equals(quoteTokenMint));
    // @ts-ignore
    assert(marketAccount.nftSwitchboardPriceAggregator.equals(nftAggregatorPk));
    // @ts-ignore
    assert(marketAccount.nftCollectionCreator.equals(collectionCreator));

  });
  it("create a reserve", async() => {
    honeyReserve = await createReserves(
      wallet.payer,
      honeyMarketPk,
      tokenAggregatorPk.toString(),
      dropletMint
    );

    assert(honeyReserve.data.switchboardPriceAggregator.equals(tokenAggregatorPk));
    reservePk = honeyReserve.reserve;

    const {market, client} = await initWrappers(wallet.payer, honeyProgram, honeyMarketPk);
    honeyMarket = market;
    honeyClient = client;
    // Minting 6 NFTs and sending them to 3 different users, should come after creating market & reserve
    for (const i of Array(2)) {
      // Generate NFT creator and holder keypairs
      const holderKeypair = await createKeypair(provider);
      await sleep(10000);
      // const creatorKeypair = await createKeypair(provider);
      // await sleep(10000);

      // Creator mints an NFT and sends it to holder
      const { mint, metadata, tokenAccount } = await mintNft(
        provider,
        nftSymbol,
        collectionCreatorKeypair, //creatorKeypair,
        holderKeypair.publicKey,
        collectionMint
      );

      // Collection authority verifies that the NFT belongs to the collection
      await verifyCollection(
        provider,
        mint,
        collectionMint,
        collectionCreatorKeypair
      );

      const {user} = await initWrappers(holderKeypair, honeyProgram, honeyMarketPk)
      // Set public vars' values
      nftInfos.push({
        nftMintAddress: mint,
        nftMetadataAddress: metadata,
        holderKeypair,
        holderTokenAccount: tokenAccount,
        honeyUser: user
      });
    }
  });

  let depositAmount = 1500000000;
  it("deposit token to reserve", async() => {
    const txRes = await depositTokens(
      nftInfos[1].holderKeypair,
      honeyMarketPk,
      depositAmount,
      quoteTokenMint.toString()
    );
    assert(txRes, "Deposit token failed!");

    // let reserveData = (await HoneyReserve.decodeReserve(honeyClient, honeyReserve.reserve)).data;
    // assert(reserveData.reserveState.totalDeposits.eq(new BN(depositAmount)));

    assert(await depositTokens(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      depositAmount,
      quoteTokenMint.toString()
    ));
  });

  
  it("withdraw token", async() => {
    assert((await withdrawTokens(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      depositAmount + 1,
      quoteTokenMint.toString()
    )) == false, "Should not be able to withdraw more than deposit!");

    console.log('withdrawer', nftInfos[0].holderKeypair.publicKey.toString())
    assert(await withdrawTokens(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      depositAmount,
      quoteTokenMint.toString()
    ), "Withdraw failed!");
  });
  
  it("deposit nft", async() => {
    assert(await depositNFT(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      nftInfos[0].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator
    ), "Nft deposit transaction was not successful!");

    //TODO: checks if it prevents deposits of 2 nfts
    // // Creator mints an NFT and sends it to holder
    // const { mint, metadata, tokenAccount } = await mintNft(
    //   provider,
    //   nftSymbol,
    //   collectionCreatorKeypair, //creatorKeypair,
    //   holderKeypair.publicKey,
    //   collectionMint
    // );

    // // Collection authority verifies that the NFT belongs to the collection
    // await verifyCollection(
    //   provider,
    //   mint,
    //   collectionMint,
    //   collectionCreatorKeypair
    // );
  });

  it("withdraw and deposit back", async() => {
    assert(await withdrawNFT(nftInfos[0].holderKeypair,
      honeyMarketPk,
      nftInfos[0].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator), "Transaction error on nft withdrawal");
    assert(await depositNFT(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      nftInfos[0].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator
    ), "Nft deposit transaction was not successful!");
  })

  // it("deposit multiple nfts should fail, withdraw nft and deposit another nft", async() => {
  //   // Creator mints an NFT and sends it to holder
  //   const { mint, metadata, tokenAccount } = await mintNft(
  //     provider,
  //     nftSymbol,
  //     collectionCreatorKeypair, //creatorKeypair,
  //     nftInfos[0].holderKeypair.publicKey,
  //     collectionMint
  //   );
  //   // Collection authority verifies that the NFT belongs to the collection
  //   await verifyCollection(
  //     provider,
  //     mint,
  //     collectionMint,
  //     collectionCreatorKeypair
  //   );

  //   assert(await depositNFT(
  //     nftInfos[0].holderKeypair,
  //     honeyMarketPk,
  //     tokenAccount,
  //     mint,
  //     collectionCreator
  //   ) == false, "Shouldn't allow multiple nft deposit!");
    
  //   assert(await withdrawNFT(nftInfos[0].holderKeypair,
  //     honeyMarketPk,
  //     nftInfos[0].holderTokenAccount,
  //     nftInfos[0].nftMintAddress,
  //     collectionCreator), "Transaction error on nft withdrawal");

  //   assert(await depositNFT(
  //     nftInfos[0].holderKeypair,
  //     honeyMarketPk,
  //     tokenAccount,
  //     mint,
  //     collectionCreator
  //   ), "Nft deposit transaction was not successful!");
  // });
  // return;
  
  it("Can not withdraw the other user's nft", async() => {
    assert((await withdrawNFT(nftInfos[1].holderKeypair,
      honeyMarketPk,
      nftInfos[1].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator)) == false, "Other user shouldn't be able to withdraw nft");
  });
  

  let borrowAllowance = 0, loanAmount = 0;
  it("borrow token", async() => {
    // get the price
    const nftPriceUsd = await nftAggregator.getLatestValue();
    const tokenPriceUsd = await tokenAggregator.getLatestValue();

    console.log('nftPrice', nftPriceUsd.toString());
    console.log('tokenPrice', tokenPriceUsd.toString());

    const honeyUser = nftInfos[0].honeyUser;
    await honeyUser.refresh();

    // const tokenDeposit = honeyUser.deposits().length > 0? honeyUser.deposits()[0].amount.toNumber(): 0;
    // are we actually using deposits()?
    // const tokenCollateral = honeyUser.collateral().length > 0? honeyUser.collateral()[0].amount.toNumber(): 0;
    const nftCollateral = (nftPriceUsd.toNumber() / tokenPriceUsd.toNumber()) * LAMPORTS_PER_SOL;//price in quote token
    loanAmount = honeyUser.loans().length > 0? honeyUser.loans()[0].amount
      .mul(honeyUser.market.reserves[0].loanNoteExchangeRate)
      .div(new BN(Math.pow(10, 15))).toNumber():0;
    const minColRatio = new BN(honeyReserve.data.config.minCollateralRatio).toNumber() / 10000;

    console.log('nftCollateral', nftCollateral);
    console.log("nftInfos[0].honeyUser.loans()", loanAmount.toString());
    console.log('minColRatio', minColRatio);

    borrowAllowance = nftCollateral / minColRatio - loanAmount;

    // considering 10% protocol fees and 0.1% borrow fee and 0.4% reduction due to token price fluctuation
    borrowAllowance /= 1.105;

    console.log('borrowAllowance', borrowAllowance);
    console.log('borrower keypair', nftInfos[0].holderKeypair.publicKey.toString());

    assert(await borrowTokens(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      borrowAllowance,
      quoteTokenMint), "Borrow failed!");

    await honeyReserve.sendRefreshTx();// to reload onchain cache data

    await honeyUser.refresh();
    await honeyUser.market.refresh();

    console.log('honeyUser.loans()[0].amount', honeyUser.loans()[0].amount.toString());
    // await honeyMarket.refresh();
    loanAmount = honeyUser.loans().length > 0? (honeyUser.loans()[0].amount
      .mul(honeyUser.market.reserves[0].loanNoteExchangeRate)
      .div(new BN(Math.pow(10, 15))).toNumber()):0;

    // considering reduction due to precision in number calc
    loanAmount *= 1.02;

    console.log('new loan after borrow', loanAmount);

    // actual loan should be slightly higher than borrow due to fees involved(totalDebt = borrow + borrow_fee + protocol_fee)


  });

  // let continueTesting = false;
  it("liquidation", async() => {
    // get the result
    const nftPrice = await nftAggregator.getLatestValue();
    const tokenPrice = await tokenAggregator.getLatestValue();
    console.log('nftPrice', nftPrice.toString());
    console.log('tokenPrice', tokenPrice.toString());

    // await sleep(300000);
    // console.log('updated nftPrice', nftPrice.toString());
    // console.log('updated tokenPrice', tokenPrice.toString());

    const liquidatorKeypair = await createKeypair(provider);
    await sleep(10000);
    const bidLimit = 1;
    const bidIncrease = 0.5;

    const {liquidatorClient} = await initLiquidator(liquidatorKeypair, "devnet", honeyProgram.programId.toString());
    assert(
      await placeBid(liquidatorClient, liquidatorKeypair.publicKey, quoteTokenMint, bidLimit, honeyMarketPk),
      "Transaction error while placing bid!"
    );
    assert(
      await increaseBid(liquidatorClient, liquidatorKeypair.publicKey, quoteTokenMint, bidIncrease, honeyMarketPk),
      "Transaction error while increasing bid!"
    );

    // liquidator is trying to execute nftInfos[0]'s obligation
    const obligation:ObligationAccount = await getObligationState(nftInfos[0].holderKeypair, honeyMarketPk);
    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), honeyMarketPk.toBuffer(), nftInfos[0].holderKeypair.publicKey.toBuffer()],
      honeyProgram.programId,
    );
    const bidAccount = await liquidatorClient.findBidAccount(honeyMarketPk, liquidatorKeypair.publicKey);

    console.log('nft mint that is being liquidated', obligation.collateralNftMint[0].toString());
    console.log('liquidator', liquidatorKeypair.publicKey.toString());

    // assert(await executeBid(
    //   liquidatorClient,
    //   honeyMarketPk,
    //   obligationAddress,
    //   reservePk,
    //   obligation.collateralNftMint[0],
    //   bidAccount.address,
    //   wallet.publicKey,
    //   wallet.payer
    // ));

    assert(
      await revokeBid(liquidatorClient, liquidatorKeypair.publicKey, quoteTokenMint, honeyMarketPk),
      "Transaction error while revoking bid!"
    );

  });
  return;

  // it("nft withdrawal should fail because he has loan", async() => {
  //   assert((await withdrawNFT(nftInfos[0].holderKeypair,
  //     honeyMarketPk,
  //     nftInfos[0].holderTokenAccount,
  //     nftInfos[0].nftMintAddress,
  //     collectionCreator)) == false);
  // });

  it("Withdraw without repay should fail!", async() => {
    assert((await withdrawNFT(nftInfos[0].holderKeypair,
      honeyMarketPk,
      nftInfos[0].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator)) == false);
  });
  
  it("repay tokens", async() => {
    assert((await repayTokens(
      nftInfos[0].holderKeypair,
      honeyMarketPk,
      loanAmount,
      quoteTokenMint
    )));
  });

  it("withdraw nft", async() => {
    const honeyUser = nftInfos[0].honeyUser;
    await honeyUser.market.refresh();
    await honeyUser.refresh();

    console.log('honeyUser.market.reserves[0].loanNoteExchangeRate after repay',
      honeyUser.market.reserves[0].loanNoteExchangeRate.toString());
    loanAmount = honeyUser.loans().length > 0? (honeyUser.loans()[0].amount
      .mul(honeyUser.market.reserves[0].loanNoteExchangeRate)
      .div(new BN(Math.pow(10, 15))).toNumber()):0;
    console.log('loanAmount after repay', loanAmount);

    assert(await withdrawNFT(nftInfos[0].holderKeypair,
      honeyMarketPk,
      nftInfos[0].holderTokenAccount,
      nftInfos[0].nftMintAddress,
      collectionCreator), "Transaction error on nft withdrawal");
  });



  afterEach(() => {

  });
});

