import { Provider } from '@project-serum/anchor';
import {
    Transaction,
    TransactionInstruction,
    sendAndConfirmRawTransaction,
    Signer,
} from '@solana/web3.js';
import { Wallet } from '../types/Wallet';

export type ExecutorResponse = {
    signature: String | undefined;
    error: any;
    isSuccess: boolean;
};

export const processInstructions = async (
    tx: Transaction,
    provider: Provider,
    userWallet: Wallet,
    signers?: Signer[]
): Promise<Transaction> => {
    tx.feePayer = userWallet.publicKey;

    tx.recentBlockhash = (
        await provider.connection.getRecentBlockhash(
            provider.opts.preflightCommitment
        )
    ).blockhash;

    try {
        if (signers?.length > 0) {
            tx.partialSign(...signers);
        }
        await userWallet.signTransaction(tx);
        
    } catch (err) {}

    return tx;
};

export const executeInstruction = async (
    ix: TransactionInstruction,
    provider: Provider,
    userWallet: Wallet,
    name: String
): Promise<ExecutorResponse> => {
    try {
        let tx = new Transaction().add(ix);

        tx = await processInstructions(tx, provider, userWallet);

        const response = await sendAndConfirmRawTransaction(
            provider.connection,
            tx.serialize()
        );

        return {
            signature: response,
            error: undefined,
            isSuccess: true,
        };
    } catch (err) {
        return {
            signature: undefined,
            error: err,
            isSuccess: false,
        };
    }
};

export const executeInstructionV2 = async (
    ixs: TransactionInstruction[],
    provider: Provider,
    userWallet: Wallet,
    name: String,
    signers?: Signer[]
): Promise<ExecutorResponse> => {
    try {
        let tx = new Transaction();

        ixs.forEach((ix) => tx.add(ix));

        tx = await processInstructions(tx, provider, userWallet, signers);

        const response = await sendAndConfirmRawTransaction(
            provider.connection,
            tx.serialize(),
            {
                maxRetries: 3
            }
        );

        return {
            signature: response,
            error: undefined,
            isSuccess: true,
        };
    } catch (err) {
        return {
            signature: undefined,
            error: err,
            isSuccess: false,
        };
    }
};

export type SwapTransactionExecutorResponse = {
    signature: String | undefined;
    error: any;
    isSuccess: boolean;
};

export const executeSwapTranscation = async (
    tx: Transaction,
    provider: Provider,
    userWallet: Wallet
): Promise<SwapTransactionExecutorResponse> => {
    try {
        tx = await processInstructions(tx, provider, userWallet);

        const response = await sendAndConfirmRawTransaction(
            provider.connection,
            tx.serialize(),
            {
                maxRetries: 3
            }
        );

        return {
            signature: response,
            error: undefined,
            isSuccess: true,
        };
    } catch (err) {
        return {
            signature: undefined,
            error: err,
            isSuccess: false,
        };
    }
};
