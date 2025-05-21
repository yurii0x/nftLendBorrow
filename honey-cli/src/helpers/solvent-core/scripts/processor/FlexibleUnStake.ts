import { Provider } from "@project-serum/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { fetchDataVars } from "../data/fetcher/flexibleStake";
import { FlexibleUnStakeVars } from "../data/types/DataVars";
import { RPCResponse } from "../types/RPCResponse";
import { executeInstructionV2, ExecutorResponse } from "../rpc/executor";
import { flexibleUnStakeInstruction } from "../rpc/ixbuilder/flexibleUnStake";
import { Wallet } from "../types/Wallet";

export type FlexibleUnStakeValidationResponse = {
  status: boolean;
  reason: String;
};

export const flexibleUnStakeWrapper = async (
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
        msg: "SVT Unstaking failure",
        signature: undefined,
        error: undefined,
      };
    }

    const dataVars: FlexibleUnStakeVars = await fetchDataVars(
      provider,
      provider.wallet.publicKey,
      amount
    );

    if (!dataVars.status) {
      return {
        status: false,
        msg: "SVT Unstaking failure",
        signature: undefined,
        error: undefined,
      };
    }

    const ix: TransactionInstruction = await flexibleUnStakeInstruction(
      provider,
      dataVars
    );

    const allIxes = [...dataVars.ixQueue.ixs, ix];

    const executorResponse: ExecutorResponse = await executeInstructionV2(
      allIxes,
      provider,
      provider.wallet,
      "FlexibleUnStakeInstruction"
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
      msg: "SVT Unstaking failure",
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
): Promise<FlexibleUnStakeValidationResponse> =>
  // Add pre RPC call validation checks here.

  ({
    status: true,
    reason: "",
  });
