import { web3, Provider } from '@project-serum/anchor';
import { getOrCreateATA } from '@saberhq/token-utils';

export type createATAWrapperResponse = {
    addr: web3.PublicKey;
    ix: web3.TransactionInstruction | undefined;
};

export const createATAWrapper = async (
    providerMut: Provider,
    tokenMintAddr: web3.PublicKey,
    userAddress: web3.PublicKey,
    payerAddress: web3.PublicKey
): Promise<createATAWrapperResponse> => {
    const tokenAssociatedAccount = await getOrCreateATA({
        // @ts-ignore
        provider: providerMut,
        mint: tokenMintAddr,
        owner: userAddress,
        payer: payerAddress,
    });

    if (
        tokenAssociatedAccount.address === null ||
        tokenAssociatedAccount.address === undefined
    ) {
        return {
            addr: new web3.PublicKey(''),
            ix: undefined,
        };
    }

    if (tokenAssociatedAccount.instruction !== null) {
        // const tx = new Transaction();
        // tx.add(tokenAssociatedAccount.instruction);
        // await providerMut.send(tx);

        return {
            addr: tokenAssociatedAccount.address,
            ix: tokenAssociatedAccount.instruction,
        };
    }

    return {
        addr: tokenAssociatedAccount.address,
        ix: undefined,
    };
};
