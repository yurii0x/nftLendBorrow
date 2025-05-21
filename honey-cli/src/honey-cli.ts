import { program } from "commander";
import { PublicKey } from "@solana/web3.js";
import log from "loglevel";
import { depositNFT } from "./actions/depositNFT";
import { createMarket } from "./actions/createMarket";
import { borrowTokens } from "./actions/borrowTokens";
import { repayTokens } from "./actions/repayTokens";
import { withdrawNFT } from "./actions/withdrawNFT";
import { getObligationState } from "./actions/getObligationState";
import { withdrawTokens } from "./actions/withdrawTokens";
import { depositTokens } from "./actions/depositTokens";
import { getMarketState } from "./actions/getMarketState";
import { createReserves } from "./actions/createReserves";

import params from "./cli-params.json";
import { refreshReserve } from "./actions/refreshReserves";
import { refreshOldReserve } from "./actions/refreshOldReserves";

program.version("0.0.1");

import { solventLiquidate } from "./actions/solventLiquidate";

import { placeBid } from "./actions/liquidations/placeBid";
import { initLiquidator } from "./actions/initLiquidator";
import { revokeBid } from "./actions/liquidations/revokeBid";
import { executeBid } from "./actions/liquidations/executeBid";
import { increaseBid } from "./actions/liquidations/increaseBid";
import { loadWalletKey, loadHoneyProgram } from "./helpers";
import { AnchorProvider } from "@project-serum/anchor";
import { HONEY_PROGRAM_ID, SVT_MINT_ADDRESS } from "./helpers/constants";
import { updateReserveConfig } from "./actions/updateReserveConfig";

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      "-e, --env <string>",
      "Solana cluster env name",
      params.env //mainnet-beta, testnet, devnet
    )
    .option(
      "-k, --keypair <path>",
      `Solana wallet location`,
      params.keypairPath
    )
    .option(
      "--market-id <string>",
      "id of the market that you want to deposit into -- note this should be the market initalized with the correct verified creator",
      params.HONEY_MARKET_ID
    )
    .option("-l, --log-level <string>", "log level", setLogLevel);
}

programCommand("get-obligation-state").action(async (directory, cmd) => {
  const { keypair, marketId, env } = cmd.opts();
  const wallet = loadWalletKey(keypair);
  getObligationState(wallet, new PublicKey(marketId), env);
});

programCommand("get-market-state").action(async (directory, cmd) => {
  const { keypair, marketId, env } = cmd.opts();
  const wallet = loadWalletKey(keypair);
  getMarketState(wallet, new PublicKey(marketId), env);
});

programCommand("borrow-tokens")
  .requiredOption("--amount <string>", "amount you are wanting to borrow")
  .requiredOption(
    "--token-mint <string>",
    "mint of the token you want to borrow"
  )
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, amount, tokenMint } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    await borrowTokens(
      wallet,
      new PublicKey(marketId),
      parseInt(amount),
      new PublicKey(tokenMint),
      env
    );
  });

programCommand("repay-tokens")
  .requiredOption("--amount <string>", "amount you are wanting to borrow")
  .requiredOption(
    "--token-mint <string>",
    "mint of the token you want to borrow"
  )
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, amount, tokenMint } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    await repayTokens(
      wallet,
      new PublicKey(marketId),
      parseInt(amount),
      new PublicKey(tokenMint),
      env
    );
  });

programCommand("deposit-tokens")
  .requiredOption("--amount <string>", "amount you are wanting to borrow")
  .requiredOption(
    "--token-mint <string>",
    "mint of the token you want to borrow"
  )
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, amount, tokenMint } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    await depositTokens(
      wallet,
      new PublicKey(marketId),
      parseInt(amount),
      tokenMint,
      env
    );
  });

programCommand("withdraw-tokens")
  .requiredOption("--amount <string>", "amount you are wanting to borrow")
  .requiredOption(
    "--token-mint <string>",
    "mint of the token you want to borrow"
  )
  .option("--honey-pid <string>", "id of the honey program")
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, amount, tokenMint } = cmd.opts();

    const wallet = loadWalletKey(keypair);
    await withdrawTokens(
      wallet,
      new PublicKey(marketId),
      parseInt(amount),
      tokenMint,
      env
    );
  });

programCommand("create-reserve")
  .requiredOption("--oracle <string>", "switchboard orcle address")
  .action(async (directory, cmd) => {
    const { keypair, env, oracle, marketId } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    await createReserves(wallet, new PublicKey(marketId), oracle, SVT_MINT_ADDRESS, env);
  });

programCommand("update-reserve-config")
  .action(async(directory, cmd) => {
    const { keypair, env, marketId } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    await updateReserveConfig(wallet, marketId, env);
  })

programCommand("refresh-reserves").action(async (directory, cmd) => {
  const { keypair, env, marketId } = cmd.opts();
  const wallet = loadWalletKey(keypair);
  await refreshReserve(wallet, env, marketId);
});

programCommand("refresh-old-reserves").action(async(directory, cmd) => {
  const { keypair, env, marketId } = cmd.opts();
  const wallet = loadWalletKey(keypair);
  await refreshOldReserve(wallet, env, marketId);
})

programCommand("deposit-nft")
  .option("--token-account <string>", "account the NFT is located")
  .option("--token-mint <string>", "mint of the NFT")
  .option(
    "--verified-creator <string>",
    "verified creator address to be used if generating an NFT"
  )
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      marketId,
      tokenAccount,
      tokenMint,
      verifiedCreator,
    } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    depositNFT(
      wallet,
      new PublicKey(marketId),
      new PublicKey(tokenAccount),
      new PublicKey(tokenMint),
      new PublicKey(verifiedCreator),
      env
    );
  });

programCommand("withdraw-nft")
  .requiredOption("--token-account <string>", "account the NFT is located")
  .requiredOption("--token-mint <string>", "mint of the NFT")
  .option(
    "--verified-creator <string>",
    "verified creator address to be used if generating an NFT"
  )
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      marketId,
      tokenAccount,
      tokenMint,
      verifiedCreator,
    } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    withdrawNFT(
      wallet,
      new PublicKey(marketId),
      new PublicKey(tokenAccount),
      new PublicKey(tokenMint),
      new PublicKey(verifiedCreator),
      env
    );
  });

programCommand("create-market")
  .requiredOption(
    "-u, --update-authority <string>",
    "public key for the market to create the reserve in"
  )
  .requiredOption(
    "--oracle <string>",
    "price oracle to be used to price the nft"
  )
  .option(
    "-r, --rpc-url <string>",
    "custom rpc url since this is a heavy command"
  )
  .action(async (directory, cmd) => {
    const { keypair, env, rpcUrl, updateAuthority, oracle } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    const program = await loadHoneyProgram(wallet, env, rpcUrl);

    await createMarket(program, updateAuthority, oracle, wallet);
  });

programCommand("solvent-liquidate")
  .requiredOption("--nft-mint <string>", "mint of the NFT")
  .requiredOption("--depositor <string>", "depositor address")
  .option(
    "--verified-creator <string>",
    "verified creator address to be used if generating an NFT"
  )
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      rpcUrl,
      marketId,
      nftMint,
      depositor,
      verifiedCreator,
    } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    const program = await loadHoneyProgram(wallet, env, rpcUrl);

    solventLiquidate(
      program.provider as AnchorProvider,
      wallet,
      marketId,
      env,
      nftMint,
      depositor,
      verifiedCreator
    );
  });

// LIQUIDATIONS
programCommand("place-liquidation-bid")
  .requiredOption("--bidder <string>")
  .requiredOption("--bid-mint <string>")
  .requiredOption("--bid-limit <number>")
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, bidder, bidMint, bidLimit } =
      cmd.opts();
    const wallet = loadWalletKey(keypair);
    const { liquidatorClient } = await initLiquidator(wallet, env, HONEY_PROGRAM_ID.toString());
    await placeBid(liquidatorClient, new PublicKey(bidder), new PublicKey(bidMint), bidLimit, new PublicKey(marketId));
  });

programCommand("increase-liquidation-bid")
  .requiredOption("--bidder <string>")
  .requiredOption("--bid-mint <string>")
  .requiredOption("--bid-increase <number>")
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, bidder, bidMint, bidIncrease } =
      cmd.opts();
    const wallet = loadWalletKey(keypair);
    const { liquidatorClient } = await initLiquidator(wallet, env, HONEY_PROGRAM_ID.toString());
    await increaseBid(liquidatorClient, new PublicKey(bidder), new PublicKey(bidMint), bidIncrease, new PublicKey(marketId));
  });

programCommand("revoke-liquidation-bid")
  .requiredOption("--bidder <string>")
  .requiredOption("--bid-mint <string>")
  .action(async (directory, cmd) => {
    const { keypair, env, marketId, bidder, bidMint} =
      cmd.opts();
    const wallet = loadWalletKey(keypair);
    const { liquidatorClient } = await initLiquidator(wallet, env, HONEY_PROGRAM_ID.toString());
    await revokeBid(liquidatorClient, new PublicKey(bidder), new PublicKey(bidMint), new PublicKey(marketId));
  });

programCommand("execute-liquidation-bid")
  .requiredOption("--amount <string>")
  .requiredOption("--obligation <string>")
  .requiredOption("--reserve <string>")
  .requiredOption("--bid <string>")
  .requiredOption("--nft-mint <string>")
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      marketId,
      amount,
      obligation,
      reserve,
      bid,
      nftMint,
    } = cmd.opts();
    const wallet = loadWalletKey(keypair);
    const { liquidatorClient } = await initLiquidator(wallet, env, HONEY_PROGRAM_ID.toString());
    await executeBid(
      liquidatorClient,
      new PublicKey(marketId),
      new PublicKey(obligation),
      new PublicKey(reserve),
      new PublicKey(nftMint),
      new PublicKey(bid),
      wallet.publicKey,
      wallet,
      env
    );
  });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value == null) {
    return;
  }
  log.info("setting the log value to: " + value);
  log.setLevel(value);
}

program
  .configureOutput({
    // Visibly override write routines as example!
    writeOut: (str) => process.stdout.write(`[OUT] ${str}`),
    writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str, write) => write(errorColor(str)),
  })
  .parse(process.argv);

function errorColor(str) {
  // Add ANSI escape codes to display text in red.
  return `\x1b[31m${str}\x1b[0m`;
}
