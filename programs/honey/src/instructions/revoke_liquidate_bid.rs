use crate::errors::ErrorCode;
use crate::state::Bid;
use crate::Market;
use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::{CloseAccount, Mint, Transfer};

#[event]
pub struct RevokeBidEvent {
    bid: Pubkey,
    bidder: Pubkey,
    bid_limit: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RevokeLiquidateBidBumps {
    bid: u8,
    bid_escrow: u8,
    bid_escrow_authority: u8,
}

#[derive(Accounts)]
#[instruction(bump: RevokeLiquidateBidBumps)]
pub struct RevokeLiquidateBid<'info> {
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
        has_one = bid_escrow_authority @ ErrorCode::InvalidParameter,
        has_one = bid_escrow @ ErrorCode::InvalidParameter,
        has_one = bidder @ ErrorCode::InvalidParameter,
        bump,
        close = bidder)]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(mut)]
    pub withdraw_destination: Account<'info, TokenAccount>,

    pub bid_mint: Account<'info, Mint>,

    #[account(mut,
        seeds = [
            b"escrow".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref()
        ],
        bump = bump.bid_escrow)]
    pub bid_escrow: Account<'info, TokenAccount>,

    /// CHECK: bid has one bid_escrow_authority
    pub bid_escrow_authority: AccountInfo<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> RevokeLiquidateBid<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Transfer {
                from: self.bid_escrow.to_account_info(),
                to: self.withdraw_destination.to_account_info(),
                authority: self.bid_escrow_authority.clone(),
            },
        )
    }

    fn close_context(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            CloseAccount {
                authority: self.bid_escrow_authority.clone(),
                account: self.bid_escrow.to_account_info(),
                destination: self.bidder.to_account_info(), // can we send SOL directly?
            },
        )
    }
}

pub fn handler(
    ctx: Context<RevokeLiquidateBid>,
    _bump: RevokeLiquidateBidBumps,
) -> Result<()> {
    let bid = &ctx.accounts.bid;

    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&bid.authority_seeds()]),
        bid.bid_limit,
    )?;

    token::close_account(
        ctx.accounts
            .close_context()
            .with_signer(&[&bid.authority_seeds()]),
    )?;

    emit!(RevokeBidEvent {
        bid: ctx.accounts.bid.key(),
        bidder: ctx.accounts.bidder.key(),
        bid_limit: ctx.accounts.bid.bid_limit,
    });

    Ok(())
}
