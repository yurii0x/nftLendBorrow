import { Program, Idl, BN, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import idl from '../../../utils/web3/store/idl/flexible_staking.json';
import { ADDRESSES } from '../../../constants/addresses';
import { FlexibleStakeVars } from '../../data/types/DataVars';


export const flexibleStakeInstruction = async(provider: Provider, dataVars: FlexibleStakeVars) 
: Promise<TransactionInstruction> => {

    const flexibleStakingProgramID = ADDRESSES.FLEXIBLE_TOKEN_STAKING_PROGRAM_ID;

    const program = new Program(idl as Idl, flexibleStakingProgramID, provider);

    const instruction = (await program.instruction.stake(
            dataVars.tokenVaultBump,
            dataVars.amount,
            {
                accounts: {
                    tokenMint: dataVars.tokenMintKey,
                    xTokenMint: dataVars.xtokenMintKey,
                    tokenFrom: dataVars.userTokenAc,
                    tokenFromAuthority: dataVars.userWallet,
                    tokenVault: dataVars.tokenVaultKey,
                    xTokenTo: dataVars.userxTokenAc,
                    tokenProgram: dataVars.tokenProgram
                }
            }
        )
    ) as TransactionInstruction;

    return instruction;
}