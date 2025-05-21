import { web3, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import {
    fetchSolventAuthVars,
    fetchBucketStateVars,
    fetchSolventNFTAssociatedAccount,
} from '../../../utils/web3/dataUtils/solventInternalDataUtils';

import { fetchTokenProgramID } from '../../../utils/web3/dataUtils/predefinedDataUtils';

import {
    fetchMetadataAccountForNFT,
    fetchUserTokenAssociatedAccount,
    fetchUserNFTAssociatedAccount,
} from '../../../utils/web3/dataUtils/userDataUtils';
import { RedeemNFTDataVars } from '../types/DataVars';

export const fetchDataVars = async (
    providerMut: Provider,
    walletAddr: web3.PublicKey,
    nftMintKey: web3.PublicKey,
    dropletMintKey: web3.PublicKey
): Promise<RedeemNFTDataVars> => {
    try {
        const instructionQueue: TransactionInstruction[] = [];

        // Fetch the solvent auth vars

        const solventAuthVars = await fetchSolventAuthVars();

        // Fetch the bucket state auth vars

        const bucketStateVars = await fetchBucketStateVars(dropletMintKey);

        // Fetch the NFT account associated with user's wallet

        const userAssociatedNFTAcResponse = await fetchUserNFTAssociatedAccount(
            providerMut,
            nftMintKey,
            walletAddr
        );

        const userAssociatedNFTAccount = userAssociatedNFTAcResponse.addr;

        const userAssociatedNFTIx = userAssociatedNFTAcResponse.ix;
        if (userAssociatedNFTIx !== undefined) {
            instructionQueue.push(userAssociatedNFTIx);
        }

        // Fetch the NFT account associated with Solvent inventory

        const solventAssociatedNFTAcResponse =
            await fetchSolventNFTAssociatedAccount(
                providerMut,
                nftMintKey,
                walletAddr
            );

        const solventAssociatedNFTAccount = solventAssociatedNFTAcResponse.addr;

        const solventAssociatedNFTIx = solventAssociatedNFTAcResponse.ix;
        if (solventAssociatedNFTIx !== undefined) {
            instructionQueue.push(solventAssociatedNFTIx);
        }

        // Fetch the Token account for the droplet associated with user's wallet

        const userAssociatedDropletAcResponse =
            await fetchUserTokenAssociatedAccount(
                providerMut,
                dropletMintKey,
                walletAddr
            );

        const userAssociatedDropletAccount =
            userAssociatedDropletAcResponse.addr;

        const userAssociatedDropletAcIx = userAssociatedDropletAcResponse.ix;
        if (userAssociatedDropletAcIx !== undefined) {
            instructionQueue.push(userAssociatedDropletAcIx);
        }

        // Fetch the metadata account of the NFT mint.

        const metadataAccount = await fetchMetadataAccountForNFT(nftMintKey);

        const tokenProgramId = fetchTokenProgramID();

        return {
            status: true,
            solventAuthority: solventAuthVars.solventAuthAddr,
            solventAuthorityBump: solventAuthVars.solventAuthBump,
            bucketStateV2: bucketStateVars.bucketStateAddr,
            bucketMint: dropletMintKey,
            userWallet: walletAddr,
            userNFTAc: userAssociatedNFTAccount,
            nftMintKey,
            metadata: metadataAccount,
            solventNFTAc: solventAssociatedNFTAccount,
            userDropletAc: userAssociatedDropletAccount,
            tokenProgram: tokenProgramId,
            ixQueue: {
                ixs: instructionQueue,
            },
        };
    } catch (err) {
        // Passing "status: false" will directly throw the error to frontend.
        // The other account params are being passed just because they're mandatory
        // to be passed for now. Temporary fix: Passing Solvent contract program ID.
        // TODO: Fix the temporary fix.

        const tempKey = new web3.PublicKey(
            '4PjKbESEtkFa7rm9sjDp2nzkx9iQNTZEfxVgyBcnsWYt'
        );

        return {
            status: false,
            solventAuthority: tempKey,
            solventAuthorityBump: -1,
            bucketStateV2: tempKey,
            bucketMint: tempKey,
            userWallet: tempKey,
            userNFTAc: tempKey,
            nftMintKey: tempKey,
            metadata: tempKey,
            solventNFTAc: tempKey,
            userDropletAc: tempKey,
            tokenProgram: tempKey,
            ixQueue: {
                ixs: [],
            },
        };
    }
};
