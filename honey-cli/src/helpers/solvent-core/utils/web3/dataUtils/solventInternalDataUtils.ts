import { web3, Provider } from '@project-serum/anchor';
import { LABELS } from '../../../constants';
import { fetchSolventProgramID, fetchSolventMintFeeAccount } from './ids';
import { createATAWrapper, createATAWrapperResponse } from '../general';

export async function fetchSolventAuthVars() {
    const programID = fetchSolventProgramID();
    const authoritySeed = Buffer.from(LABELS.AUTHORITY_SEED);

    let _solventAuthorityAddr;
    let _solventAuthorityBump;

    [_solventAuthorityAddr, _solventAuthorityBump] =
        await web3.PublicKey.findProgramAddress([authoritySeed], programID);

    return {
        solventAuthAddr: _solventAuthorityAddr,
        solventAuthBump: _solventAuthorityBump,
    };
}

// export async function fetchBucketStateVars(dropletMintKey: web3.PublicKey) {
//     const programID = fetchSolventProgramID();

//     let _bucketStateAddr;
//     let _bucketStateBump;

//     [_bucketStateAddr, _bucketStateBump] =
//         await web3.PublicKey.findProgramAddress(
//             [dropletMintKey.toBuffer()],
//             programID
//         );

//     return {
//         bucketStateAddr: _bucketStateAddr,
//         bucketStateBump: _bucketStateBump,
//     };
// }

export async function fetchBucketStateVars(dropletMintKey: web3.PublicKey) {
    
    const programID = fetchSolventProgramID();

    let _bucketStateAddr;
    let _bucketStateBump;

    [_bucketStateAddr, _bucketStateBump] =
        await web3.PublicKey.findProgramAddress(
            [dropletMintKey.toBuffer(),
             Buffer.from(LABELS.BUCKET_STATE_V2_SEED)
            ],
            programID
        );

    return {
        bucketStateAddr: _bucketStateAddr,
        bucketStateBump: _bucketStateBump,
    };
}

export async function fetchSolventNFTAssociatedAccount(
    providerMut: Provider,
    nftMintKey: web3.PublicKey,
    userAddress: web3.PublicKey
): Promise<createATAWrapperResponse> {
    const solventAuthVars = await fetchSolventAuthVars();

    // const solventNFTAssociatedAccount = await getAssociatedTokenAddressWrapper(
    //     nftMintKey,
    //     solventAuthVars.solventAuthAddr
    // );

    const solventNFTAssociatedAccount = await createATAWrapper(
        providerMut,
        nftMintKey,
        solventAuthVars.solventAuthAddr,
        userAddress
    );

    return solventNFTAssociatedAccount;
}

export async function fetchSolventMintFeeDropletAssociatedAccount(
    providerMut: Provider,
    bucketMintAddr: web3.PublicKey,
    userAddress: web3.PublicKey
): Promise<createATAWrapperResponse> {
    const solventMintFeeAccount = await fetchSolventMintFeeAccount();

    const associatedAddr = await createATAWrapper(
        providerMut,
        bucketMintAddr,
        solventMintFeeAccount,
        userAddress
    );

    return associatedAddr;
}
