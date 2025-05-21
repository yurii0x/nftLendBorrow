import { web3 } from '@project-serum/anchor';

export function fetchSolventProgramID(): web3.PublicKey {
    const SOLVENT_PROGRAM_ID = new web3.PublicKey(
        'nft3agWJsaL1nN7pERYDFJUf54BzDZwS3oRbEzjrq6q'
    );

    return SOLVENT_PROGRAM_ID;
}

export function fetchSolventMintFeeAccount(): web3.PublicKey {
    const SOLVENT_MINT_FEE_ACCOUNT = new web3.PublicKey(
        'HkjFiwUW7qnREVm2PxBg8LUrCvjExrJjyYY51wsZTUK8'
    );

    return SOLVENT_MINT_FEE_ACCOUNT;
}

export function fetchSolventDevnetNFTCreatorAccount(): web3.PublicKey {
    const SOLVENT_DEVNET_NFT_CREATOR_ACCOUNT = new web3.PublicKey(
        'AV1wqWXvfftSVAjoxY6scNGaN116MJwEodsTZe2Aadr5'
    );

    return SOLVENT_DEVNET_NFT_CREATOR_ACCOUNT;
}
