import { programs } from '@metaplex/js';
import { TokenAccount } from '@metaplex-foundation/mpl-core';
import { PublicKey, Connection } from '@solana/web3.js';
import { Provider, web3 } from '@project-serum/anchor';
import { Token } from '@solana/spl-token';
import { LABELS, ADDRESSES, ERRORS } from '../../../constants';
import { createATAWrapper, createATAWrapperResponse } from '../general';
import {
    fetchAssociatedTokenProgramID,
    fetchTokenProgramID,
} from './predefinedDataUtils';

const {
    metadata: { MetadataData, Metadata },
} = programs;

export async function fetchNFTsOwnedByWallet(
    connection: Connection,
    publickey: PublicKey | null
) {
    try {
        let ownedMetadata;

        if (publickey) {
            ownedMetadata = await Metadata.findByOwnerV2(connection, publickey);
        } else {
            throw new Error(ERRORS.WALLET_NOT_CONNECTED);
        }

        return ownedMetadata;
    } catch (error) {}
}

export const fetchNFTsOwnedByWalletV2 = async (
    connection: Connection,
    userWallet: web3.PublicKey
) => {
    const accounts = await TokenAccount.getTokenAccountsByOwner(
        connection,
        userWallet
    );
    const accountsWithAmount = accounts
        .map(({ data }) => data)
        .filter(({ amount }) => amount?.toNumber() > 0);

    const nftMintAddresses = accountsWithAmount.map(({ mint }) => mint);

    const nftMetadataAddresses = [];

    for (let i = 0; i < nftMintAddresses.length; i++) {
        nftMetadataAddresses[i] = await fetchMetadataAccountForNFT(
            nftMintAddresses[i]
        );
    }

    const nftAcInfo: any[] = [];

    for (let i = 0; i < nftMetadataAddresses.length; i += 100) {
        const metadataBatch = nftMetadataAddresses.slice(i, i + 100);

        const nftAcInfoSmallBatch = await connection.getMultipleAccountsInfo(
            metadataBatch,
            'processed'
        );
        nftAcInfo.push(...nftAcInfoSmallBatch);
    }

    const nftAcInfoDeserialized = nftAcInfo
        ?.map((info) =>
            info?.data !== undefined
                ? MetadataData.deserialize(info?.data)
                : undefined
        )
        .filter((element) => element !== undefined);

    return nftAcInfoDeserialized;
};

export async function fetchUserTokenAssociatedAccount(
    providerMut: Provider,
    tokenMint: PublicKey,
    userAddr: PublicKey
): Promise<createATAWrapperResponse> {
    const associatedAddr = await createATAWrapper(
        providerMut,
        tokenMint,
        userAddr,
        userAddr
    );

    return associatedAddr;
}

export async function fetchUserNFTAssociatedAccount(
    providerMut: Provider,
    nftMint: PublicKey,
    userAddr: PublicKey
): Promise<createATAWrapperResponse> {
    const userNFTAssociatedAddr = await createATAWrapper(
        providerMut,
        nftMint,
        userAddr,
        userAddr
    );

    return userNFTAssociatedAddr;
}

export async function fetchNFTHoldingTokenAccount(
    providerMut: Provider,
    nftMint: PublicKey
) {
    const nftHoldingTokenAccount =
        await providerMut.connection.getTokenLargestAccounts(
            nftMint,
            'processed'
        );

    const arr = nftHoldingTokenAccount.value;

    if (arr.length > 0) {
        if (arr[0].amount == '1') {
            const nftHolderTokenAccountAddr = arr[0].address;

            return nftHolderTokenAccountAddr;
        }
    }

    return undefined;
}

export async function fetchMetadataAccountForNFT(nftMintKey: PublicKey) {
    const metadataBuffer = Buffer.from(LABELS.METADATA);
    const metadataProgramIdPublicKey = new PublicKey(
        ADDRESSES.METADATA_PROGRAM_ID
    );

    const metadataAccount = (
        await PublicKey.findProgramAddress(
            [
                metadataBuffer,
                metadataProgramIdPublicKey.toBuffer(),
                nftMintKey.toBuffer(),
            ],
            metadataProgramIdPublicKey
        )
    )[0];

    return metadataAccount;
}

export async function fetchMetadataForNFTFromMint(
    connection: Connection,
    nftMintKey: PublicKey
) {
    try {
        if (nftMintKey) {
            const nftMetadataAddress = await fetchMetadataAccountForNFT(
                nftMintKey
            );

            const nftAcInfo = await connection.getAccountInfo(
                nftMetadataAddress,
                'processed'
            );

            if (nftAcInfo?.data !== undefined) {
                const nftMetadata = MetadataData.deserialize(nftAcInfo?.data);

                return nftMetadata;
            }
            return undefined;
        }
        throw new Error('nft mint key is invalid');
    } catch (error) {}
}

export async function fetchWalletBalanceWithMintV0(
    provider: any,
    walletAddress: web3.PublicKey,
    tokenMint: string
) {
    const tokenMintKey = new web3.PublicKey(tokenMint);

    const userTokenAssociatedAccount = await createATAWrapper(
        provider,
        new web3.PublicKey(tokenMint),
        walletAddress,
        walletAddress
    );

    let balance = 0;
    try {
        const info = await provider.connection.getTokenAccountBalance(
            userTokenAssociatedAccount.addr,
            'processed'
        );
        balance = info.value.uiAmount;
    } catch (err) {
        balance = 0;
    }
    return balance;
}

export async function fetchWalletBalanceWithMint(
    provider: any,
    walletAddress: web3.PublicKey,
    tokenMint: string
) {
    const associatedTokenProgramId = fetchAssociatedTokenProgramID();
    const tokenProgramId = fetchTokenProgramID();

    const tokenMintKey = new web3.PublicKey(tokenMint);
    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
        associatedTokenProgramId,
        tokenProgramId,
        tokenMintKey,
        walletAddress,
        true
    );

    let balance = 0;
    try {
        const info = await provider.connection.getTokenAccountBalance(
            associatedTokenAddress,
            'processed'
        );
        balance = info.value.uiAmount;
    } catch (err) {
        balance = 0;
    }
    return balance;
}
