import { Provider, web3 } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import { fetchDataVars } from '../data/fetcher/createBucket';
import { CreateBucketDataVars } from '../data/types/DataVars';
import { RPCResponse } from '../types/RPCResponse';
import { createBucketInstruction } from '../rpc/ixbuilder/createBucket';
import { executeInstructionV2, ExecutorResponse } from '../rpc/executor';

export type CreateBucketValidationResponse = {
    status: boolean;
    reason: String;
};

export const createBucketWrapper = async (
    provider: Provider,
    bucketSymbol: string,
    verifiedCreators: web3.PublicKey[]
): Promise<RPCResponse> => {
    try {
        const validationResponse = await performPreRPCValidations();

        if (!validationResponse.status) {
            return {
                status: false,
                msg: 'Bucket creation failure',
                signature: undefined,
                error: undefined,
            };
        }

        const dataVars: CreateBucketDataVars = await fetchDataVars(
            provider.wallet.publicKey,
            bucketSymbol,
            verifiedCreators
        );

        if (!dataVars.status) {
            return {
                status: false,
                msg: 'Bucket creation failure',
                signature: undefined,
                error: undefined,
            };
        }

        const ix: TransactionInstruction = await createBucketInstruction(
            provider,
            dataVars
        );

        const allIxes = [...dataVars.ixQueue.ixs, ix];

        const executorResponse: ExecutorResponse = await executeInstructionV2(
            allIxes,
            provider,
            provider.wallet,
            'CreateBucketInstruction',
            [dataVars.dropletKeypair]
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
                data: {
                    name: "dropletMintPublicKey",
                    val: dataVars.dropletKeypair.publicKey
                }
            };

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
                msg: 'Bucket creation failure',
                signature: undefined,
                error: executorResponse.error,
            };
        }
        return {
            status: false,
            msg: 'Bucket creation failure',
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
    async (): Promise<CreateBucketValidationResponse> =>
        // Add pre RPC call validation checks here.

        ({
            status: true,
            reason: '',
        });
