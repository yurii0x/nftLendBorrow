import { web3, BN } from "@project-serum/anchor";

export type CreateBucketDataVars = {
  status: boolean;
  userWallet: web3.PublicKey;
  solventAuthority: web3.PublicKey;
  solventAuthorityBump: number;
  bucketStateV2: web3.PublicKey;
  bucketStateBump: number;
  bucketSymbol: string;
  bucketMint: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  systemProgram: web3.PublicKey;
  rent: web3.PublicKey;
  dropletKeypair: web3.Keypair;
  verifiedCreators: web3.AccountMeta[];
  ixQueue: InstructionQueue;
}

export type MintDropletDataVars = {
  status: boolean;
  userWallet: web3.PublicKey;
  solventAuthority: web3.PublicKey;
  solventAuthorityBump: number;
  bucketStateV2: web3.PublicKey;
  bucketMint: web3.PublicKey;
  nftMintKey: web3.PublicKey;
  metadata: web3.PublicKey;
  userNFTAc: web3.PublicKey;
  solventNFTAc: web3.PublicKey;
  solventDropletFeeAc: web3.PublicKey;
  userDropletAc: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  ixQueue: InstructionQueue;
};

export type RedeemNFTDataVars = {
  status: boolean;
  userWallet: web3.PublicKey;
  solventAuthority: web3.PublicKey;
  solventAuthorityBump: number;
  bucketStateV2: web3.PublicKey;
  bucketMint: web3.PublicKey;
  nftMintKey: web3.PublicKey;
  metadata: web3.PublicKey;
  userNFTAc: web3.PublicKey;
  solventNFTAc: web3.PublicKey;
  userDropletAc: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  ixQueue: InstructionQueue;
};

export type InstructionQueue = {
  ixs: web3.TransactionInstruction[];
};

export type TradeNFTDataVars = {
  mintDropletVars: MintDropletDataVars;
  redeemNFTVars: RedeemNFTDataVars;
};

export type FlexibleStakeVars = {
  status: boolean;
  amount: BN;
  tokenMintKey: web3.PublicKey;
  xtokenMintKey: web3.PublicKey;
  userTokenAc: web3.PublicKey;
  userWallet: web3.PublicKey;
  tokenVaultKey: web3.PublicKey;
  tokenVaultBump: number;
  userxTokenAc: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  ixQueue: InstructionQueue;
};

export type FlexibleUnStakeVars = {
  status: boolean;
  amount: BN;
  tokenMintKey: web3.PublicKey;
  xtokenMintKey: web3.PublicKey;
  userxTokenAc: web3.PublicKey;
  userWallet: web3.PublicKey;
  tokenVaultKey: web3.PublicKey;
  tokenVaultBump: number;
  userTokenAc: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  ixQueue: InstructionQueue;
};

export type LockedStakeVars = {
  status: boolean;
  amount: BN;
  tokenMintKey: web3.PublicKey;
  userTokenAc: web3.PublicKey;
  userWallet: web3.PublicKey;
  tokenVaultKey: web3.PublicKey;
  tokenVaultBump: number;
  stakingPubkey: web3.PublicKey;
  stakingBump: number;
  userStakingAccount: web3.PublicKey;
  userStakingBump: number;
  systemProgram: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  rent: web3.PublicKey;
  ixQueue: InstructionQueue;
};

export type LockedUnstakeVars = {
  status: boolean;
  amount: BN;
  tokenMintKey: web3.PublicKey;
  userTokenAc: web3.PublicKey;
  userWallet: web3.PublicKey;
  tokenVaultKey: web3.PublicKey;
  tokenVaultBump: number;
  stakingPubkey: web3.PublicKey;
  stakingBump: number;
  userStakingAccount: web3.PublicKey;
  userStakingBump: number;
  tokenProgram: web3.PublicKey;
  ixQueue: InstructionQueue;
};
