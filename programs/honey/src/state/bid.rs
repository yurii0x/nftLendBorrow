use anchor_lang::prelude::*;


#[account]
pub struct Bid {
    pub market: Pubkey,
    pub bid_escrow: Pubkey,
    pub bid_escrow_authority: Pubkey,
    pub bid_mint: Pubkey,
    pub authority_bump_seed: [u8; 1],
    pub authority_seed: Pubkey,
    pub bidder: Pubkey,
    pub bid_limit: u64
}

impl Default for Bid {
    fn default() -> Self {
        Bid {
            market: Pubkey::default(),
            bid_escrow: Pubkey::default(),
            bid_escrow_authority: Pubkey::default(),
            bid_mint: Pubkey::default(),
            authority_bump_seed: [0; 1],
            authority_seed: Pubkey::default(),
            bidder: Pubkey::default(),
            bid_limit: 0
        }
    }
}

impl Bid {
    /// Gets the authority seeds for signing requests with the
    /// market authority address.
    pub fn authority_seeds(&self) -> [&[u8]; 2] {
        [self.authority_seed.as_ref(), &self.authority_bump_seed]
    }
}