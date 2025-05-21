import { Program, Idl, BN, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import idl from '../../../utils/web3/store/idl/locked_staking.json';
import { ADDRESSES } from '../../../constants/addresses';
import { LockedStakeVars } from '../../data/types/DataVars';


export const lockedStakeInstruction = async(provider: Provider, dataVars: LockedStakeVars) 
: Promise<TransactionInstruction> => {

    const lockedStakingProgramID = ADDRESSES.LOCKED_TOKEN_STAKING_PROGRAM_ID;

    const program = new Program(idl as Idl, lockedStakingProgramID, provider);

    const instruction = (await program.instruction.stake(
            dataVars.tokenVaultBump,
            dataVars.stakingBump,
            dataVars.userStakingBump,
            dataVars.amount,
            {
                accounts: {
                    tokenMint: dataVars.tokenMintKey,
                    tokenFrom: dataVars.userTokenAc,
                    tokenFromAuthority: dataVars.userWallet,
                    tokenVault: dataVars.tokenVaultKey,
                    stakingAccount: dataVars.stakingPubkey,
                    userStakingAccount: dataVars.userStakingAccount,
                    systemProgram: dataVars.systemProgram,
                    tokenProgram: dataVars.tokenProgram,
                    rent: dataVars.rent
                }
            }
        )
    ) as TransactionInstruction;

    return instruction;
}