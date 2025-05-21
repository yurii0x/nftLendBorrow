import { Provider } from "@project-serum/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { fetchDataVars } from "../data/fetcher/lockedStake";
import { LockedStakeVars } from "../data/types/DataVars";
import { RPCResponse } from "../types/RPCResponse";
import { executeInstructionV2, ExecutorResponse } from "../rpc/executor";
import { lockedStakeInstruction } from "../rpc/ixbuilder/lockedStake";
import { Wallet } from "../types/Wallet";

export type LockedStakeValidationResponse = {
  status: boolean;
  reason: String;
};

export const lockedStakeWrapper = async (
  provider: Provider,
  amount: number
): Promise<RPCResponse> => {
  try {
    const validationResponse = await performPreRPCValidations(
      provider,
      provider.wallet
    );

    if (!validationResponse.status) {
      return {
        status: false,
        msg: "SVT Staking failure",
        signature: undefined,
        error: undefined,
      };
    }

    const dataVars: LockedStakeVars = await fetchDataVars(
      provider,
      provider.wallet.publicKey,
      amount
    );

    if (!dataVars.status) {
      return {
        status: false,
        msg: "SVT Staking failure",
        signature: undefined,
        error: undefined,
      };
    }

    const ix: TransactionInstruction = await lockedStakeInstruction(
      provider,
      dataVars
    );

    const allIxes = [...dataVars.ixQueue.ixs, ix];

    const executorResponse: ExecutorResponse = await executeInstructionV2(
      allIxes,
      provider,
      provider.wallet,
      "LockedStakeInstruction"
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
    }

    return {
      status: false,
      msg: "SVT Staking failure",
      signature: undefined,
      error: executorResponse.error,
    };
  } catch (error) {
    console.log("catch error: ", error);
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
  userWallet: Wallet
): Promise<LockedStakeValidationResponse> =>
  // Add pre RPC call validation checks here.

  ({
    status: true,
    reason: "",
  });
