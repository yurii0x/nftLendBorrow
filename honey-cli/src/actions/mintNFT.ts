import { METADATA_PROGRAM_ID } from "@honey-finance/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";

import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import {
  CreateMetadata,
  Creator,
  MetadataData,
  MetadataDataData,
} from "@metaplex-foundation/mpl-token-metadata";

export async function mintNFT(wallet: Keypair, provider: anchor.Provider) {
  const nftMint = await splToken.Token.createMint(
    provider.connection,
    wallet,
    wallet.publicKey,
    null,
    0,
    splToken.TOKEN_PROGRAM_ID
  );
  console.log("NFT Mint: ", nftMint.publicKey.toString());

  // Get/Create the Associated Account for the user to hold the NFT
  const userAssosciatedAccount = await nftMint.getOrCreateAssociatedAccountInfo(
    wallet.publicKey
  );

  // Mint 1 token to the user's associated account
  await nftMint.mintTo(userAssosciatedAccount.address, wallet.publicKey, [], 1);

  const [metadataKey, metadataBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      nftMint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log("Verified creator in metadata", wallet.publicKey.toString());

  // create metadata for nft
  const metadataParams: CreateMetadataParams = {
    metadata: metadataKey,
    metadataData: new MetadataDataData({
      name: "name",
      symbol: "SMBD",
      uri: "uri",
      sellerFeeBasisPoints: 0,
      creators: [
        new Creator({
          address: wallet.publicKey.toString(),
          share: 100,
          verified: true,
        }),
      ],
    }),
    updateAuthority: wallet.publicKey,
    mint: nftMint.publicKey,
    mintAuthority: wallet.publicKey,
  };

  const createMetadata = new CreateMetadata(
    { feePayer: wallet.publicKey },
    metadataParams
  );

  await provider.send(createMetadata, [], { skipPreflight: true });
  const metadataAccount = await provider.connection.getAccountInfo(metadataKey);
  const metadataData = MetadataData.deserialize(metadataAccount.data);

  return {
    userAssosciatedAccount,
    nftMint,
  };
}

type CreateMetadataParams = {
  metadata: PublicKey;
  metadataData: MetadataDataData;
  updateAuthority: PublicKey;
  mint: PublicKey;
  mintAuthority: PublicKey;
};
