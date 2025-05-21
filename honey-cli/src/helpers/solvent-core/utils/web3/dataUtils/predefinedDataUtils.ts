import {
    TOKEN_PROGRAM_ID,
    Token,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    u64,
} from '@solana/spl-token';
import { web3 } from '@project-serum/anchor';
import { Commitment, ConfirmOptions } from '@solana/web3.js';

export function fetchTokenProgramID() {
    return TOKEN_PROGRAM_ID;
}

export function fetchAssociatedTokenProgramID() {
    return ASSOCIATED_TOKEN_PROGRAM_ID;
}

export function fetchSystemProgramID() {
    return web3.SystemProgram.programId;
}

export function fetchRentVal() {
    return web3.SYSVAR_RENT_PUBKEY;
}

export function fetchWeb3Opts(): ConfirmOptions {
    const commitment: Commitment = 'processed';

    const opts: ConfirmOptions = {
        preflightCommitment: commitment,
    };

    return opts;
}
