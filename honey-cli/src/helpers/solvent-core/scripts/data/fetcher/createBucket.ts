import { web3, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import {
    fetchSolventAuthVars,
    fetchBucketStateVars,
} from '../../../utils/web3/dataUtils/solventInternalDataUtils';
import { fetchRentVal, fetchSystemProgramID, fetchTokenProgramID } from '../../../utils/web3/dataUtils/predefinedDataUtils';
import { CreateBucketDataVars } from '../types/DataVars';

export const fetchDataVars = async (
    walletAddr: web3.PublicKey,
    bucketSymbol: string,
    verifiedCreators: web3.PublicKey[]
): Promise<CreateBucketDataVars> => {
    try {
        const instructionQueue: TransactionInstruction[] = [];

        // Fetch the solvent auth vars

        const solventAuthVars = await fetchSolventAuthVars();

        // Generate a new keypair for the new droplet mint

        const dropletKeypair = new web3.Keypair();

        // Fetch the bucket state auth vars

        const bucketStateVars = await fetchBucketStateVars(dropletKeypair.publicKey);

        const tokenProgramId = fetchTokenProgramID();

        const systemProgramId = fetchSystemProgramID();
        
        const rentPubkey = fetchRentVal();

        let verifiedCreatorsMod = [];

        verifiedCreatorsMod = verifiedCreators.map((creator) => {
            return {
                pubkey: creator,
                isSigner: false,
                isWritable: true
            } as web3.AccountMeta
        });


        return {
            status: true,
            userWallet: walletAddr,
            solventAuthority: solventAuthVars.solventAuthAddr,
            solventAuthorityBump: solventAuthVars.solventAuthBump,
            bucketStateV2: bucketStateVars.bucketStateAddr,
            bucketStateBump: bucketStateVars.bucketStateBump,
            bucketSymbol: bucketSymbol,
            bucketMint: dropletKeypair.publicKey,
            tokenProgram: tokenProgramId,
            systemProgram: systemProgramId,
            rent: rentPubkey,
            dropletKeypair: dropletKeypair,
            verifiedCreators: verifiedCreatorsMod,
            ixQueue: {
                ixs: instructionQueue
            }
        };
    } catch (err) {
        // Passing "status: false" will directly throw the error to frontend.
        // The other account params are being passed just because they're mandatory
        // to be passed for now. Temporary fix: Passing Solvent contract program ID.
        // TODO: Fix the temporary fix.

        const tempKey = new web3.Keypair();

        return {
            status: false,
            userWallet: tempKey.publicKey,
            solventAuthority: tempKey.publicKey,
            solventAuthorityBump: -1,
            bucketStateV2: tempKey.publicKey,
            bucketStateBump: -1,
            bucketSymbol: "",
            bucketMint: tempKey.publicKey,
            tokenProgram: tempKey.publicKey,
            systemProgram: tempKey.publicKey,
            rent: tempKey.publicKey,
            dropletKeypair: tempKey,
            verifiedCreators: [],
            ixQueue: {
                ixs: []
            }
        };
    }
};
