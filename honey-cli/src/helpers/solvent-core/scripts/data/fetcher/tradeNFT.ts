import { web3, Provider } from "@project-serum/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  fetchSolventAuthVars,
  fetchBucketStateVars,
  fetchSolventNFTAssociatedAccount,
  fetchSolventMintFeeDropletAssociatedAccount,
} from "../../../utils/web3/dataUtils/solventInternalDataUtils";

import { fetchTokenProgramID } from "../../../utils/web3/dataUtils/predefinedDataUtils";

import {
  fetchMetadataAccountForNFT,
  fetchUserTokenAssociatedAccount,
  fetchUserNFTAssociatedAccount,
  fetchNFTHoldingTokenAccount,
} from "../../../utils/web3/dataUtils/userDataUtils";
import {
  MintDropletDataVars,
  RedeemNFTDataVars,
  TradeNFTDataVars,
} from "../types/DataVars";

export const fetchDataVars = async (
  providerMut: Provider,
  sellingNftMintKey: web3.PublicKey,
  buyingNftMintKey: web3.PublicKey,
  dropletMintKey: web3.PublicKey
): Promise<TradeNFTDataVars> => {
  try {
    // Mint Droplet param prep
    //

    const instructionQueue: TransactionInstruction[] = [];

    // Fetch the solvent auth vars

    const solventAuthVars = await fetchSolventAuthVars();

    // Fetch the bucket state auth vars

    const bucketStateVars = await fetchBucketStateVars(dropletMintKey);

    // Fetch the NFT account associated with user's wallet

    const userAssociatedSellingNFTAcResponse =
      await fetchUserNFTAssociatedAccount(
        providerMut,
        sellingNftMintKey,
        providerMut.wallet.publicKey
      );

    const userAssociatedSellingNFTAccount =
      userAssociatedSellingNFTAcResponse.addr;

    const userAssociatedSellingNFTIx = userAssociatedSellingNFTAcResponse.ix;
    if (userAssociatedSellingNFTIx !== undefined) {
      instructionQueue.push(userAssociatedSellingNFTIx);
    }

    // Fetch the NFT token account holding the NFT
    // and check if it is the associated token account of the user.
    // If not, add migration transfer instruction to the queue.

    const nftHolderTokenAccountAddr = await fetchNFTHoldingTokenAccount(
      providerMut,
      sellingNftMintKey
    );

    if (
      nftHolderTokenAccountAddr !== undefined &&
      nftHolderTokenAccountAddr !== userAssociatedSellingNFTAccount
    ) {
      // user's nft token account is not equal to their associated token account.
      // transfer the nft from nftHolderTokenAccountAddr to userAssociatedNFTAccount.

      const migrationIx = await Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        nftHolderTokenAccountAddr,
        userAssociatedSellingNFTAccount,
        providerMut.wallet.publicKey,
        [],
        1
      );

      instructionQueue.push(migrationIx);
    }

    // Fetch the NFT account associated with Solvent inventory

    const solventAssociatedSellingNFTAcResponse =
      await fetchSolventNFTAssociatedAccount(
        providerMut,
        sellingNftMintKey,
        providerMut.wallet.publicKey
      );

    const solventAssociatedSellingNFTAccount =
      solventAssociatedSellingNFTAcResponse.addr;

    const solventAssociatedSellingNFTIx =
      solventAssociatedSellingNFTAcResponse.ix;
    if (solventAssociatedSellingNFTIx !== undefined) {
      instructionQueue.push(solventAssociatedSellingNFTIx);
    }

    // Fetch the Token account for the droplet associated with Solvent authority for
    // collecting the minting fees.

    const solventAssociatedMintFeeAcResponse =
      await fetchSolventMintFeeDropletAssociatedAccount(
        providerMut,
        dropletMintKey,
        providerMut.wallet.publicKey
      );

    const solventAssociatedMintFeeAccount =
      solventAssociatedMintFeeAcResponse.addr;

    const solventAssociatedMintFeeAcIx = solventAssociatedMintFeeAcResponse.ix;
    if (solventAssociatedMintFeeAcIx !== undefined) {
      instructionQueue.push(solventAssociatedMintFeeAcIx);
    }

    // Fetch the Token account for the droplet associated with user's wallet

    const userAssociatedDropletAcResponse =
      await fetchUserTokenAssociatedAccount(
        providerMut,
        dropletMintKey,
        providerMut.wallet.publicKey
      );

    const userAssociatedDropletAccount = userAssociatedDropletAcResponse.addr;

    const userAssociatedDropletAcIx = userAssociatedDropletAcResponse.ix;
    if (userAssociatedDropletAcIx !== undefined) {
      instructionQueue.push(userAssociatedDropletAcIx);
    }

    // Fetch the metadata account of the NFT mint.

    const metadataAccountSellingNFT = await fetchMetadataAccountForNFT(
      sellingNftMintKey
    );

    const tokenProgramId = fetchTokenProgramID();

    // Redeem NFT param prep
    //

    // Fetch the NFT account associated with user's wallet

    const userAssociatedBuyingNFTAcResponse =
      await fetchUserNFTAssociatedAccount(
        providerMut,
        buyingNftMintKey,
        providerMut.wallet.publicKey
      );

    const userAssociatedBuyingNFTAccount =
      userAssociatedBuyingNFTAcResponse.addr;

    const userAssociatedBuyingNFTIx = userAssociatedBuyingNFTAcResponse.ix;
    if (userAssociatedBuyingNFTIx !== undefined) {
      instructionQueue.push(userAssociatedBuyingNFTIx);
    }

    // Fetch the NFT account associated with Solvent inventory

    const solventAssociatedBuyingNFTAcResponse =
      await fetchSolventNFTAssociatedAccount(
        providerMut,
        buyingNftMintKey,
        providerMut.wallet.publicKey
      );

    const solventAssociatedBuyingNFTAccount =
      solventAssociatedBuyingNFTAcResponse.addr;

    const solventAssociatedBuyingNFTIx =
      solventAssociatedBuyingNFTAcResponse.ix;
    if (solventAssociatedBuyingNFTIx !== undefined) {
      instructionQueue.push(solventAssociatedBuyingNFTIx);
    }

    // Fetch the metadata account of the NFT mint.

    const metadataAccountBuyingNFT = await fetchMetadataAccountForNFT(
      buyingNftMintKey
    );

    let mintDropletVars: MintDropletDataVars = {
      status: true,
      userWallet: providerMut.wallet.publicKey,
      solventAuthority: solventAuthVars.solventAuthAddr,
      solventAuthorityBump: solventAuthVars.solventAuthBump,
      bucketStateV2: bucketStateVars.bucketStateAddr,
      bucketMint: dropletMintKey,
      nftMintKey: sellingNftMintKey,
      metadata: metadataAccountSellingNFT,
      userNFTAc: userAssociatedSellingNFTAccount,
      solventNFTAc: solventAssociatedSellingNFTAccount,
      solventDropletFeeAc: solventAssociatedMintFeeAccount,
      userDropletAc: userAssociatedDropletAccount,
      tokenProgram: tokenProgramId,
      ixQueue: {
        ixs: instructionQueue,
      },
    };

    let redeemNFTVars: RedeemNFTDataVars = {
      status: true,
      userWallet: providerMut.wallet.publicKey,
      solventAuthority: solventAuthVars.solventAuthAddr,
      solventAuthorityBump: solventAuthVars.solventAuthBump,
      bucketStateV2: bucketStateVars.bucketStateAddr,
      bucketMint: dropletMintKey,
      nftMintKey: buyingNftMintKey,
      metadata: metadataAccountBuyingNFT,
      userNFTAc: userAssociatedBuyingNFTAccount,
      solventNFTAc: solventAssociatedBuyingNFTAccount,
      userDropletAc: userAssociatedDropletAccount,
      tokenProgram: tokenProgramId,
      ixQueue: {
        ixs: instructionQueue,
      },
    };

    return {
      mintDropletVars,
      redeemNFTVars,
    };
  } catch (err) {
    console.log(`${"caught while fetch TradeNFT data vars: " + " - "}${err}`);

    // Passing "status: false" will directly throw the error to frontend.
    // The other account params are being passed just because they're mandatory
    // to be passed for now. Temporary fix: Passing Solvent contract program ID.
    // TODO: Fix the temporary fix.

    const tempKey = new web3.PublicKey(
      "4PjKbESEtkFa7rm9sjDp2nzkx9iQNTZEfxVgyBcnsWYt"
    );

    let mintDropletVars: MintDropletDataVars = {
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
      solventDropletFeeAc: tempKey,
      userDropletAc: tempKey,
      tokenProgram: tempKey,
      ixQueue: {
        ixs: [],
      },
    };

    let redeemNFTVars: RedeemNFTDataVars = {
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

    return {
      mintDropletVars,
      redeemNFTVars,
    };
  }
};
