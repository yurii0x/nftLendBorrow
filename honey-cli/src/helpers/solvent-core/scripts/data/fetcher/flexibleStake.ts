/* eslint-disable import/prefer-default-export */
import { web3, Provider, BN } from '@project-serum/anchor';

import { TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchTokenProgramID } from '../../../utils/web3/dataUtils/predefinedDataUtils';

import { fetchUserTokenAssociatedAccount } from '../../../utils/web3/dataUtils/userDataUtils';
import { FlexibleStakeVars } from '../types/DataVars';
import { ADDRESSES } from '../../../constants';

export const fetchDataVars = async (
    providerMut: Provider,
    walletAddr: web3.PublicKey,
    amount: number
): Promise<FlexibleStakeVars> => {
    try {
        const instructionQueue: TransactionInstruction[] = [];

        // Fetch the SVT token mint key

        const tokenMintKey = new web3.PublicKey(ADDRESSES.SVT_MINT_ADDRESS);

        // Fetch the xSVT token mint key

        const xtokenMintKey = new web3.PublicKey(ADDRESSES.XSVT_MINT_ADDRESS);

        // Fetch the SVT token account associated with user's wallet

        const temp = await fetchUserTokenAssociatedAccount(
            providerMut,
            tokenMintKey,
            walletAddr
        );

        const userTokenAc = temp.addr;

        const userTokenAcIx = temp.ix;
        if (userTokenAcIx !== undefined) {
            instructionQueue.push(userTokenAcIx);
        }

        // Fetch the SVT token account associated with user's wallet

        const temp2 = await fetchUserTokenAssociatedAccount(
            providerMut,
            xtokenMintKey,
            walletAddr
        );

        const userxTokenAc = temp2.addr;

        const userxTokenAcIx = temp2.ix;
        if (userxTokenAcIx !== undefined) {
            instructionQueue.push(userxTokenAcIx);
        }

        // Fetch the SVT token vault - flexible staking

        let tokenVaultFlexible;
        let tokenVaultBump;

        [tokenVaultFlexible, tokenVaultBump] =
            await web3.PublicKey.findProgramAddress(
                [tokenMintKey.toBuffer()],
                new web3.PublicKey(ADDRESSES.FLEXIBLE_TOKEN_STAKING_PROGRAM_ID)
            );

        // Convert amount into lamports

        const amountInBN = new BN(amount);

        const tokenProgramId = fetchTokenProgramID();

        return {
            status: true,
            amount: amountInBN,
            tokenMintKey,
            xtokenMintKey,
            userTokenAc,
            userWallet: walletAddr,
            tokenVaultKey: tokenVaultFlexible,
            tokenVaultBump,
            userxTokenAc,
            tokenProgram: tokenProgramId,
            ixQueue: {
                ixs: instructionQueue,
            },
        };
    } catch (err) {
        console.log(
            `${'caught while fetch FlexibleStake data vars: ' + ' - '}${err}`
        );

        // Passing "status: false" will directly throw the error to frontend.
        // The other account params are being passed just because they're mandatory
        // to be passed for now. Temporary fix: Passing Solvent contract program ID.
        // TODO: Fix the temporary fix.

        const tempKey = new web3.PublicKey(
            '4PjKbESEtkFa7rm9sjDp2nzkx9iQNTZEfxVgyBcnsWYt'
        );

        return {
            status: false,
            amount: new BN(-1),
            tokenMintKey: tempKey,
            xtokenMintKey: tempKey,
            userTokenAc: tempKey,
            userWallet: tempKey,
            tokenVaultKey: tempKey,
            tokenVaultBump: -1,
            userxTokenAc: tempKey,
            tokenProgram: tempKey,
            ixQueue: {
                ixs: [],
            },
        };
    }
};
