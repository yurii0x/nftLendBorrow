// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::errors::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::{self, Mint, MintTo, Transfer};
use jet_math::Number;
pub use switchboard_v2::AggregatorAccountData;

use crate::common::Amount;
use crate::common::Rounding;
use crate::state::*;

#[event]
pub struct BorrowEvent {
    borrower: Pubkey,
    reserve: Pubkey,
    debt: u64,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct BorrowBumpSeeds {
    loan_account: u8,
}

#[derive(Accounts)]
#[instruction(bump: BorrowBumpSeeds)]
pub struct Borrow<'info> {
    /// The relevant market this borrow is for
    #[account(
        mut,
        has_one = market_authority,
        has_one = nft_switchboard_price_aggregator)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with collateral to borrow with
    #[account(mut,
        has_one = market,
        constraint = obligation.load().unwrap().owner == borrower.key(),
        constraint = obligation.load().unwrap().has_loan_custody(&loan_account.key()),
    )]
    pub obligation: AccountLoader<'info, Obligation>,

    /// The reserve being borrowed from
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = loan_note_mint,
              has_one = token_mint)]
    pub reserve: AccountLoader<'info, Reserve>,

    /// The reserve's vault where the borrowed tokens will be transferred from
    #[account(mut)]
    /// CHECK:
    pub vault: AccountInfo<'info>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: Account<'info, Mint>,

    /// The user/authority that is borrowing
    pub borrower: Signer<'info>,

    /// The account to track the borrower's balance to repay
    #[account(mut,
              seeds = [
                  b"loan".as_ref(),
                  reserve.key().as_ref(),
                  obligation.key().as_ref(),
                  borrower.key.as_ref()
              ],
              bump)]
    pub loan_account: Account<'info, TokenAccount>,

    /// The token account that the borrowed funds will be transferred to
    #[account(mut,
        constraint = receiver_account.key() != vault.key())]
    pub receiver_account: Account<'info, TokenAccount>,

    /// The mint for the token being stored in this reserve.
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,

    // price account for the nft you're trying to borrow against
    /// CHECK: should be same as one in the market
    /// -- MIGHT NOT NEED THIS IF WE REQUIRE REFRESH RESERVE
    pub nft_switchboard_price_aggregator: AccountInfo<'info>,
}

impl<'info> Borrow<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.receiver_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }

    fn note_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            MintTo {
                to: self.loan_account.to_account_info(),
                mint: self.loan_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Borrow tokens from a reserve
pub fn handler(ctx: Context<Borrow>, _bump: BorrowBumpSeeds, amount: Amount) -> Result<()> {
    // update market's nft floor prices
    {
        let mut market = ctx.accounts.market.load_mut()?;
        let price_decimal =
            AggregatorAccountData::new(&ctx.accounts.nft_switchboard_price_aggregator)?
                .get_result()?;
        let market_oracle_mut = market.market_oracle_mut();
        market_oracle_mut.price = Number::from_decimal(
            price_decimal.mantissa as u128,
            -(price_decimal.scale as i32),
        );
    }
    let market = ctx.accounts.market.load()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    let loan_account = &ctx.accounts.loan_account.key();

    market.verify_ability_borrow()?;
    let market_reserves = market.reserves();
    let clock = Clock::get().unwrap();

    let reserve_info = market_reserves.get_cached(reserve.index, clock.slot);

    let requested_tokens = amount.as_tokens(reserve_info, Rounding::Down);
    let fees = reserve.borrow_fee(requested_tokens);
    let protocol_fees = reserve.protocol_fee(requested_tokens);
    let mut total_token_debt = requested_tokens
        .checked_add(fees)
        .expect("Requested a debt that would exceed the maximum potential supply for a token.");

    total_token_debt = total_token_debt
        .checked_add(protocol_fees)
        .expect("Requested a debt that would exceed the maximum potential supply for a token.");

    // check that user doesn't have open loan against another reserve
    let reserve_index = reserve.index;
    let _outstanding_loans = ctx
        .accounts
        .obligation
        .load()?
        .can_borrow_from_reserve(reserve_index)?;

    // Calculate the number of notes to create to match the value being
    // borrowed plus the fees, then mint the notes as a way of tracking
    // this borrower's debt.
    let new_notes = reserve_info.loan_notes_from_tokens(total_token_debt, Rounding::Up);

    // Record the borrow onto the reserve account, and also add any fees
    // to get the total amount borrowed.
    reserve.borrow(clock.slot, requested_tokens, new_notes, fees, protocol_fees);

    token::mint_to(
        ctx.accounts
            .note_mint_context()
            .with_signer(&[&market.authority_seeds()]),
        new_notes,
    )?;

    // record the loan in the obligation which is used to determine the obligation's health
    let obligation = &mut ctx.accounts.obligation.load_mut()?;
    obligation.borrow(loan_account, reserve.amount(new_notes))?;

    let market_oracle = market.market_oracle();
    obligation.cache_calculations(market.reserves(), clock.slot, market_oracle);

    // Validate that the obligation has sufficient collateral to borrow
    // the requested amount, by checking that its still healthy after
    // minting the new debt.
    if !obligation.is_healthy(&market_reserves, clock.slot) {
        return err!(ErrorCode::InsufficientCollateral);
    }

    // Now that we have the debt recorded, transfer the borrowed funds
    // to the requested receiving account.
    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&market.authority_seeds()]),
        requested_tokens,
    )?;

    emit!(BorrowEvent {
        borrower: ctx.accounts.borrower.key(),
        reserve: ctx.accounts.reserve.key(),
        debt: new_notes
    });

    Ok(())
}
