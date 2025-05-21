import { Provider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { mintDropletWrapper } from "./scripts/processor/mintDroplet";

/**
 * Use this function to sell an NFT to a solvent bucket in exchange of 100 corresponding droplets.
 * @param provider The network and wallet context used to send transactions paid for and signed by the provider.
 * @param nftMintKey The mint key of the NFT to be bought.
 * @param dropletMintKey The mint key of the corresponding droplet.
 * @returns a promise resolved to RPCResponse when the function has executed.
 */
export async function sellNFT(
  provider: Provider,
  nftMintKey: PublicKey,
  dropletMintKey: PublicKey
) {
  const vars = await mintDropletWrapper(provider, nftMintKey, dropletMintKey);
  return vars;
}
