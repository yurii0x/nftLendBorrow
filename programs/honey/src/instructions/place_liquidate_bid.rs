use crate::errors::ErrorCode;
use crate::state::Bid;
use crate::Market;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

#[event]
pub struct PlaceBidEvent {
    bid: Pubkey,
    bidder: Pubkey,
    bid_limit: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlaceLiquidateBidBumps {
    bid: u8,
    bid_escrow: u8,
    bid_escrow_authority: u8,
}
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct PlaceLiquidateBid<'info> {
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    #[account(init,
        seeds = [
            b"bid".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref(),
        ],
        bump,
        space = 8 + std::mem::size_of::<Bid>(),
        payer = bidder)]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    /// The account that stores the user's deposit notes
    #[account(mut)]
    pub deposit_source: Account<'info, TokenAccount>,

    pub bid_mint: Account<'info, Mint>,

    #[account(init_if_needed,
        seeds = [
            b"escrow".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref()
        ],
        bump,
        payer = bidder,
        token::mint = bid_mint,
        token::authority = bid_escrow_authority)]
    pub bid_escrow: Account<'info, TokenAccount>,

    /// CHECK: in handler if authority = bid_escrow_authority
    pub bid_escrow_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> PlaceLiquidateBid<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Transfer {
                from: self.deposit_source.to_account_info(),
                to: self.bid_escrow.to_account_info(),
                authority: self.bidder.to_account_info().clone(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<PlaceLiquidateBid>,
    _bump: PlaceLiquidateBidBumps,
    bid_limit: u64,
) -> Result<()> {
    let initial_seeds = &[ctx.accounts.bid_escrow.to_account_info().key.as_ref()];
    let (authority, authority_seed) = Pubkey::find_program_address(initial_seeds, ctx.program_id);
    let bid_escrow_address = ctx.accounts.bid_escrow.key();
    let bid_escrow_authority = ctx.accounts.bid_escrow_authority.key();
    if bid_escrow_authority != authority {
        return Err(ErrorCode::ObligationHealthy.into());
    }

    let bid = &mut ctx.accounts.bid;
    bid.market = ctx.accounts.market.key();
    bid.bid_escrow = ctx.accounts.bid_escrow.key();
    bid.bid_escrow_authority = authority;
    bid.bid_mint = ctx.accounts.bid_mint.key();
    bid.authority_bump_seed = [authority_seed];
    bid.authority_seed = bid_escrow_address;
    bid.bidder = ctx.accounts.bidder.key();
    bid.bid_limit = bid_limit;

    token::transfer(ctx.accounts.transfer_context(), bid_limit)?;

    emit!(PlaceBidEvent {
        bid: ctx.accounts.bid.key(),
        bidder: ctx.accounts.bidder.key(),
        bid_limit,
    });

    Ok(())
}
