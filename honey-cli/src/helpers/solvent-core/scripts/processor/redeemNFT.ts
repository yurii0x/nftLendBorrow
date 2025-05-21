import { Provider, web3 } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import { fetchDataVars } from '../data/fetcher/redeemNFT';
import { RedeemNFTDataVars } from '../data/types/DataVars';
import { RPCResponse } from '../types/RPCResponse';
import { executeInstructionV2, ExecutorResponse } from '../rpc/executor';
import { redeemNFTInstruction } from '../rpc/ixbuilder/redeemNFT';
import { fetchWalletBalanceWithMint } from '../../utils/web3/dataUtils/userDataUtils';
import { fetchSolventAuthVars } from '../../utils/web3/dataUtils/solventInternalDataUtils';
import { createATAWrapper } from '../../utils/web3/general';
import { Wallet } from '../types/Wallet';

export type RedeemNFTValidationResponse = {
    status: boolean;
    reason: String;
};

export const redeemNFTWrapper = async (
    provider: Provider,
    nftMintKey: web3.PublicKey,
    dropletMintKey: web3.PublicKey
): Promise<RPCResponse> => {
    const validationResponse = await performPreRPCValidations(
        provider,
        dropletMintKey,
        nftMintKey,
        provider.wallet
    );

    if (!validationResponse.status) {
        return {
            status: false,
            msg: validationResponse.reason,
            signature: undefined,
            error: undefined,
        };
    }

    const dataVars: RedeemNFTDataVars = await fetchDataVars(
        provider,
        provider.wallet.publicKey,
        nftMintKey,
        dropletMintKey
    );

    if (!dataVars.status) {
        return {
            status: false,
            msg: 'NFT redemption failure',
            signature: undefined,
            error: undefined,
        };
    }

    const ix: TransactionInstruction = await redeemNFTInstruction(
        provider,
        dataVars
    );

    const allIxes = [...dataVars.ixQueue.ixs, ix];

    const executorResponse: ExecutorResponse = await executeInstructionV2(
        allIxes,
        provider,
        provider.wallet,
        'RedeemNFTInstruction'
    );

    if (
        executorResponse.signature !== undefined &&
        executorResponse.isSuccess
    ) {
        return {
            status: true,
            msg: 'Transaction sent.',
            signature: executorResponse.signature,
            error: undefined,
        };

        // if(pollResponse) {
        //     return {
        //         status: true,
        //         msg: "NFT redeemed successfully",
        //         signature: executorResponse.signature,
        //         error: undefined
        //     }
        // }
        // else {
        //     return {
        //         status: false,
        //         msg: "NFT redemption failure",
        //         signature: undefined,
        //         error: "Failed to confirm."
        //     }
        // }
    }
    return {
        status: false,
        msg: 'NFT redemption failure',
        signature: undefined,
        error: executorResponse.error,
    };
};

export const performPreRPCValidations = async (
    provider: Provider,
    dropletMintKey: web3.PublicKey,
    nftMintKey: web3.PublicKey,
    userWallet: Wallet
): Promise<RedeemNFTValidationResponse> => {
    const containsSufficientBalance: boolean = await validateRedemptionBalance(
        provider,
        userWallet,
        dropletMintKey
    );

    if (!containsSufficientBalance) {
        return {
            status: false,
            reason: 'Insufficient balance',
        };
    }

    const solventOwnsNFT: boolean = await validateSolventOwnsNFT(
        provider,
        userWallet,
        nftMintKey
    );

    if (!solventOwnsNFT) {
        return {
            status: false,
            reason: 'NFT not in Solvent authority',
        };
    }

    return {
        status: true,
        reason: '',
    };
};

const validateRedemptionBalance = async (
    provider: Provider,
    userWallet: Wallet,
    dropletMintKey: web3.PublicKey
): Promise<boolean> => {
    const currentBalance = await fetchWalletBalanceWithMint(
        provider,
        userWallet.publicKey,
        dropletMintKey.toString()
    );

    if (currentBalance < 100) {
        return false;
    }

    return true;
};

const validateSolventOwnsNFT = async (
    provider: Provider,
    userWallet: Wallet,
    nftMintKey: web3.PublicKey
) => {
    const solventAuthVars = await fetchSolventAuthVars();

    const solventAssociatedNFTAccount = await createATAWrapper(
        provider,
        new web3.PublicKey(nftMintKey),
        solventAuthVars.solventAuthAddr,
        userWallet.publicKey
    );

    let balance;
    try {
        const info = await provider.connection.getTokenAccountBalance(
            solventAssociatedNFTAccount.addr,
            'processed'
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
