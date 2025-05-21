import { Provider, web3 } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import { fetchDataVars } from '../data/fetcher/mintDroplet';
import { MintDropletDataVars } from '../data/types/DataVars';
import { RPCResponse } from '../types/RPCResponse';
import { mintDropletInstruction } from '../rpc/ixbuilder/mintDroplet';
import { executeInstructionV2, ExecutorResponse } from '../rpc/executor';

export type MintDropletValidationResponse = {
    status: boolean;
    reason: String;
};

export const mintDropletWrapper = async (
    provider: Provider,
    nftMintKey: web3.PublicKey,
    dropletMintKey: web3.PublicKey
): Promise<RPCResponse> => {
    try {
        const validationResponse = await performPreRPCValidations();

        if (!validationResponse.status) {
            return {
                status: false,
                msg: 'Droplet mint failure',
                signature: undefined,
                error: undefined,
            };
        }

        const dataVars: MintDropletDataVars = await fetchDataVars(
            provider,
            provider.wallet.publicKey,
            nftMintKey,
            dropletMintKey
        );

        if (!dataVars.status) {
            return {
                status: false,
                msg: 'Droplet mint failure',
                signature: undefined,
                error: undefined,
            };
        }

        const ix: TransactionInstruction = await mintDropletInstruction(
            provider,
            dataVars
        );

        const allIxes = [...dataVars.ixQueue.ixs, ix];

        const executorResponse: ExecutorResponse = await executeInstructionV2(
            allIxes,
            provider,
            provider.wallet,
            'MintDropletInstruction'
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
        if (executorResponse.error !== undefined) {
            if (
                executorResponse.error.message &&
                executorResponse.error.message.includes(
                    'custom program error: 0x1'
                )
            ) {
                return {
                    status: false,
                    msg: 'Please migrate tokens here first: https://raydium.io/migrate/',
                    signature: undefined,
                    error: executorResponse.error,
                };
            }
            return {
                status: false,
                msg: 'Droplet minting failure',
                signature: undefined,
                error: executorResponse.error,
            };
        }
        return {
            status: false,
            msg: 'Droplet minting failure',
            signature: undefined,
            error: executorResponse.error,
        };
    } catch (error) {
        return {
            status: false,
            msg: 'Unknown Error',
            signature: undefined,
            error,
        };
    }
};

export const performPreRPCValidations =
    async (): Promise<MintDropletValidationResponse> =>
        // Add pre RPC call validation checks here.

        ({
            status: true,
            reason: '',
        });
