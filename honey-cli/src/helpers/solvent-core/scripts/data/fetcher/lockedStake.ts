/* eslint-disable import/prefer-default-export */
import { web3, Provider, BN, utils } from '@project-serum/anchor';

import { TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchTokenProgramID } from '../../../utils/web3/dataUtils/predefinedDataUtils';

import { fetchUserTokenAssociatedAccount } from '../../../utils/web3/dataUtils/userDataUtils';
import { LockedStakeVars } from '../types/DataVars';
import { ADDRESSES } from '../../../constants';

export const fetchDataVars = async (
    providerMut: Provider,
    walletAddr: web3.PublicKey,
    amount: number
): Promise<LockedStakeVars> => {
    try {
        const instructionQueue: TransactionInstruction[] = [];

        // Fetch the SVT token mint key

        const tokenMintKey = new web3.PublicKey(ADDRESSES.SVT_MINT_ADDRESS);

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

        // Fetch the SVT token vault - flexible staking

        let tokenVaultLocked;
        let tokenVaultBump;

        [tokenVaultLocked, tokenVaultBump] =
            await web3.PublicKey.findProgramAddress(
                [tokenMintKey.toBuffer()],
                new web3.PublicKey(ADDRESSES.LOCKED_TOKEN_STAKING_PROGRAM_ID)
            );

        // Fetch the SVT staking pubkey - PDA for stored initializer key and lock end date

        let stakingPubkey;
        let stakingBump;

        [stakingPubkey, stakingBump] = await web3.PublicKey.findProgramAddress(
            [Buffer.from(utils.bytes.utf8.encode('staking'))],
            new web3.PublicKey(ADDRESSES.LOCKED_TOKEN_STAKING_PROGRAM_ID)
        );

        // Fetcth the user staking account fot stored deposit amount

        let userStakingPubkey;
        let userStakingBump;

        [userStakingPubkey, userStakingBump] =
            await web3.PublicKey.findProgramAddress(
                [walletAddr.toBuffer()],
                new web3.PublicKey(ADDRESSES.LOCKED_TOKEN_STAKING_PROGRAM_ID)
            );

        // Convert amount into lamports

        const amountInBN = new BN(amount);

        const tokenProgramId = fetchTokenProgramID();

        return {
            status: true,
            amount: amountInBN,
            tokenMintKey,
            userTokenAc,
            userWallet: walletAddr,
            tokenVaultKey: tokenVaultLocked,
            tokenVaultBump,
            stakingPubkey,
            stakingBump,
            userStakingAccount: userStakingPubkey,
            userStakingBump,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: tokenProgramId,
            rent: web3.SYSVAR_RENT_PUBKEY,
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
            userTokenAc: tempKey,
            userWallet: tempKey,
            tokenVaultKey: tempKey,
            tokenVaultBump: -1,
            stakingPubkey: tempKey,
            stakingBump: -1,
            userStakingAccount: tempKey,
            userStakingBump: -1,
            systemProgram: tempKey,
            tokenProgram: tempKey,
            rent: tempKey,
            ixQueue: {
                ixs: [],
            },
        };
    }
};
