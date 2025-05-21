import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  HoneyUser
} from "@honey-finance/sdk";
export interface NftInfo {
    nftMintAddress: PublicKey;
    nftMetadataAddress: PublicKey;
    holderKeypair: anchor.web3.Keypair;
    holderTokenAccount: PublicKey;
    honeyUser: HoneyUser;
  }