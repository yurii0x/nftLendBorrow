import { Program, Idl, BN, Provider } from "@project-serum/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import idl from "../../../utils/web3/store/idl/solvent.json";
import { fetchSolventProgramID } from "../../../utils/web3/dataUtils/ids";
import { RedeemNFTDataVars } from "../../data/types/DataVars";

export const redeemNFTInstruction = async (
  provider: Provider,
  dataVars: RedeemNFTDataVars
): Promise<TransactionInstruction> => {
  const solventProgramId = fetchSolventProgramID();

  const program = new Program(idl as Idl, solventProgramId, provider);

  const instruction = (await program.instruction.burnDropletAndRedeemTokenV2(
    new BN(dataVars.solventAuthorityBump),
    {
      accounts: {
        signerWallet: dataVars.userWallet,
        solventAuthority: dataVars.solventAuthority,
        bucketStateV2: dataVars.bucketStateV2,
        bucketMint: dataVars.bucketMint,
        nftMint: dataVars.nftMintKey,
        metadata: dataVars.metadata,
        solventTokenAc: dataVars.solventNFTAc,
        destinationTokenAc: dataVars.userNFTAc,
        signerDropletAc: dataVars.userDropletAc,
        tokenProgram: dataVars.tokenProgram,
      },
    }
  )) as TransactionInstruction;

  return instruction;
};
