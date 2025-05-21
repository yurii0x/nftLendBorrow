import { Program, Idl, BN, Provider } from '@project-serum/anchor';
import { TransactionInstruction } from '@solana/web3.js';
import idl from '../../../utils/web3/store/idl/solvent.json';
import { fetchSolventProgramID } from '../../../utils/web3/dataUtils/ids';
import { CreateBucketDataVars } from '../../data/types/DataVars';

export const createBucketInstruction = async (
    provider: Provider,
    dataVars: CreateBucketDataVars
): Promise<TransactionInstruction> => {
    const solventProgramId = fetchSolventProgramID();

    const program = new Program(idl as Idl, solventProgramId, provider);

    const instruction = (await program.instruction.newBucketV2(
        new BN(dataVars.solventAuthorityBump),
        new BN(dataVars.bucketStateBump),
        dataVars.bucketSymbol,
        {
            accounts: {
                bucketCreator: dataVars.userWallet,
                solventAuthority: dataVars.solventAuthority,
                bucketStateV2: dataVars.bucketStateV2,
                bucketMint: dataVars.bucketMint,
                tokenProgram: dataVars.tokenProgram,
                systemProgram: dataVars.systemProgram,
                rent: dataVars.rent
            },
            signers: [
                dataVars.dropletKeypair
            ],
            remainingAccounts: dataVars.verifiedCreators
        }
    )) as TransactionInstruction;

    return instruction;
};
