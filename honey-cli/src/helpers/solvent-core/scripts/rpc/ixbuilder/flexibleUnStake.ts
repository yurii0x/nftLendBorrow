import { Program, Idl, BN, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import idl from '../../../utils/web3/store/idl/flexible_staking.json';
import { ADDRESSES } from '../../../constants/addresses';
import { FlexibleUnStakeVars } from '../../data/types/DataVars';


export const flexibleUnStakeInstruction = async(provider: Provider, dataVars: FlexibleUnStakeVars) 
: Promise<TransactionInstruction> => {

    const flexibleStakingProgramID = ADDRESSES.FLEXIBLE_TOKEN_STAKING_PROGRAM_ID;

    const program = new Program(idl as Idl, flexibleStakingProgramID, provider);

    const instruction = (await program.instruction.unstake(
            dataVars.tokenVaultBump,
            dataVars.amount,
            {
                accounts: {
                    tokenMint: dataVars.tokenMintKey,
                    xTokenMint: dataVars.xtokenMintKey,
                    xTokenFrom: dataVars.userxTokenAc,
                    xTokenFromAuthority: dataVars.userWallet,
                    tokenVault: dataVars.tokenVaultKey,
                    tokenTo: dataVars.userTokenAc,
                    tokenProgram: dataVars.tokenProgram
                }
            }
        )
    ) as TransactionInstruction;

    return instruction;
}