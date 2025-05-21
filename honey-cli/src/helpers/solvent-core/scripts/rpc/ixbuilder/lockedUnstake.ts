import { Program, Idl, BN, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import idl from '../../../utils/web3/store/idl/locked_staking.json';
import { ADDRESSES } from '../../../constants/addresses';
import { LockedUnstakeVars } from '../../data/types/DataVars';


export const lockedUnstakeInstruction = async(provider: Provider, dataVars: LockedUnstakeVars) 
: Promise<TransactionInstruction> => {

    const lockedStakingProgramID = ADDRESSES.LOCKED_TOKEN_STAKING_PROGRAM_ID;

    const program = new Program(idl as Idl, lockedStakingProgramID, provider);

    const instruction = (await program.instruction.unstake(
            dataVars.tokenVaultBump,
            dataVars.stakingBump,
            dataVars.userStakingBump,
            dataVars.amount,
            {
                accounts: {
                    tokenMint: dataVars.tokenMintKey,
                    xTokenFromAuthority: dataVars.userWallet,
                    tokenVault: dataVars.tokenVaultKey,
                    stakingAccount: dataVars.stakingPubkey,
                    userStakingAccount: dataVars.userStakingAccount,
                    tokenTo: dataVars.userTokenAc,
                    tokenProgram: dataVars.tokenProgram,
                }
            }
        )
    ) as TransactionInstruction;

    return instruction;
}