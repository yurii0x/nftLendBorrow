import { Provider, web3 } from "@project-serum/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { fetchDataVars } from "../data/fetcher/tradeNFT";
import { TradeNFTDataVars } from "../data/types/DataVars";
import { RPCResponse } from "../types/RPCResponse";
import { executeInstructionV2, ExecutorResponse } from "../rpc/executor";
import { fetchWalletBalanceWithMint } from "../../utils/web3/dataUtils/userDataUtils";
import { mintDropletInstruction } from "../rpc/ixbuilder/mintDroplet";
import { redeemNFTInstruction } from "../rpc/ixbuilder/redeemNFT";
import { fetchSolventAuthVars } from "../../utils/web3/dataUtils/solventInternalDataUtils";
import { createATAWrapper } from "../../utils/web3/general";
import { Wallet } from "../types/Wallet";

export type TradeNFTValidationResponse = {
  status: boolean;
  reason: String;
};

export const tradeNFTWrapper = async (
  provider: Provider,
  sellingNftMintKey: web3.PublicKey,
  buyingNftMintKey: web3.PublicKey,
  dropletMintKey: web3.PublicKey
): Promise<RPCResponse> => {
  try {
    const validationResponse = await performPreRPCValidations(
      provider,
      sellingNftMintKey,
      buyingNftMintKey,
      dropletMintKey
    );

    if (!validationResponse.status) {
      return {
        status: false,
        msg: validationResponse.reason,
        signature: undefined,
        error: undefined,
      };
    }

    const dataVars: TradeNFTDataVars = await fetchDataVars(
      provider,
      sellingNftMintKey,
      buyingNftMintKey,
      dropletMintKey
    );

    if (!dataVars.mintDropletVars.status || !dataVars.redeemNFTVars.status) {
      return {
        status: false,
        msg: "Trade NFT failure",
        signature: undefined,
        error: undefined,
      };
    }

    const mintDropletIx: TransactionInstruction = await mintDropletInstruction(
      provider,
      dataVars.mintDropletVars
    );

    const redeemNFTIx: TransactionInstruction = await redeemNFTInstruction(
      provider,
      dataVars.redeemNFTVars
    );

    const allIxes = [
      ...dataVars.mintDropletVars.ixQueue.ixs,
      mintDropletIx,
      redeemNFTIx,
    ];

    const executorResponse: ExecutorResponse = await executeInstructionV2(
      allIxes,
      provider,
      provider.wallet,
      "TradeNFTInstruction"
    );

    if (
      executorResponse.signature !== undefined &&
      executorResponse.isSuccess
    ) {
      return {
        status: true,
        msg: "Transaction sent.",
        signature: executorResponse.signature,
        error: undefined,
      };

      // if(pollResponse) {
      //     return {
      //         status: true,
      //         msg: "Transaction sent.",
      //         signature: executorResponse.signature,
      //         error: undefined
      //     }
      // }
      // else {
      //     return {
      //         status: false,
      //         msg: "Droplet minting failure",
      //         signature: undefined,
      //         error: "Failed to confirm."
      //     }
      // }
    }

    return {
      status: false,
      msg: "NFT trading failure",
      signature: undefined,
      error: executorResponse.error,
    };
  } catch (error) {
    return {
      status: false,
      msg: "Unknown Error",
      signature: undefined,
      error,
    };
  }
};

export const performPreRPCValidations = async (
  provider: Provider,
  sellingNftMintKey: web3.PublicKey,
  buyingNftMintKey: web3.PublicKey,
  dropletMintKey: web3.PublicKey
): Promise<TradeNFTValidationResponse> => {
  const containsSufficientSwappingBalance: boolean =
    await validateSwappingBalance(provider, dropletMintKey);

  if (!containsSufficientSwappingBalance) {
    return {
      status: false,
      reason: `Swapping NFTs requires 2 droplets to trade.`,
    };
  }

  // const userOwnsNFT : boolean = await validateUserOwnsNFT(
  //     provider,
  //     userWallet,
  //     sellingNftMintKey
  // );

  // if(!userOwnsNFT) {
  //     return {
  //         status: false,
  //         reason: `You don't own any NFT from this collection to swap with this NFT.`
  //     }
  // }

  const solventOwnsNFT: boolean = await validateSolventOwnsNFT(
    provider,
    buyingNftMintKey
  );

  if (!solventOwnsNFT) {
    return {
      status: false,
      reason: "NFT not in Solvent authority",
    };
  }

  return {
    status: true,
    reason: "",
  };
};

const validateSwappingBalance = async (
  provider: Provider,
  dropletMintKey: web3.PublicKey
): Promise<boolean> => {
  const currentBalance = await fetchWalletBalanceWithMint(
    provider,
    provider.wallet.publicKey,
    dropletMintKey.toString()
  );

  // if (currentBalance < 2) {
  //   return false;
  // }

  return true;
};

const validateUserOwnsNFT = async (
  provider: Provider,
  userWallet: Wallet,
  sellingNftMintKey: web3.PublicKey
) => {
  const solventAuthVars = await fetchSolventAuthVars();

  const userAssociatedNFTAccount = await createATAWrapper(
    provider,
    new web3.PublicKey(sellingNftMintKey),
    userWallet.publicKey,
    userWallet.publicKey
  );

  let balance;
  try {
    const info = await provider.connection.getTokenAccountBalance(
      userAssociatedNFTAccount.addr,
      "processed"
    );
    balance = info.value.uiAmount;
  } catch (err) {
    balance = 0;
  }

  console.log("sellingNftMintkey: ", sellingNftMintKey);
  console.log("balance: ", balance);

  if (balance === 1) {
    return true;
  }

  return false;
};

const validateSolventOwnsNFT = async (
  provider: Provider,
  nftMintKey: web3.PublicKey
) => {
  const solventAuthVars = await fetchSolventAuthVars();

  const solventAssociatedNFTAccount = await createATAWrapper(
    provider,
    new web3.PublicKey(nftMintKey),
    solventAuthVars.solventAuthAddr,
    provider.wallet.publicKey
  );

  let balance;
  try {
    const info = await provider.connection.getTokenAccountBalance(
      solventAssociatedNFTAccount.addr,
      "processed"
    );
    balance = info.value.uiAmount;
  } catch (err) {
    balance = 0;
  }

  if (balance === 1) {
    return true;
  }

  return false;
};
