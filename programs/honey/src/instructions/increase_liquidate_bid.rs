use crate::state::Bid;
use crate::Market;
use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;

use crate::utils::*;

#[event]
pub struct IncreaseBidEvent {
    bid: Pubkey,
    bidder: Pubkey,
    bid_limit: u64,
    bid_increase: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct IncreaseLiquidateBidBumps {
    bid: u8,
    bid_escrow: u8,
    bid_escrow_authority: u8,
}
#[derive(Accounts)]
#[instruction(bump: IncreaseLiquidateBidBumps)]
pub struct IncreaseLiquidateBid<'info> {
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    #[account(mut,
        seeds = [
            b"bid".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref(),
        ],
        bump,
        has_one = bidder,
        has_one = bid_mint,
        has_one = bid_escrow_authority
    )]
    pub bid: Account<'info, Bid>,

    pub bidder: Signer<'info>,

    /// The account that stores the user's deposit notes
    #[account(mut)]
    pub deposit_source: Account<'info, TokenAccount>,

    pub bid_mint: Account<'info, Mint>,

    #[account(mut,
        seeds = [
            b"escrow".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref()
        ],
        bump)]
    pub bid_escrow: Account<'info, TokenAccount>,

    /// CHECK: checked in bid
    pub bid_escrow_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> IncreaseLiquidateBid<'info> {
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
    ctx: Context<IncreaseLiquidateBid>,
    _bump: IncreaseLiquidateBidBumps,
    bid_increase: u64,
) -> Result<()> {
    let bid = &mut ctx.accounts.bid;
    bid.bid_limit = bid.bid_limit.safe_add(bid_increase)?;

    token::transfer(ctx.accounts.transfer_context(), bid_increase)?;

    emit!(IncreaseBidEvent {
        bid: ctx.accounts.bid.key(),
        bidder: ctx.accounts.bidder.key(),
        bid_limit: ctx.accounts.bid.bid_limit,
        bid_increase,
    });

    Ok(())
}
