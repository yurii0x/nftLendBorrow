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

use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token::Token;
use anchor_spl::token::Mint;
use anchor_spl::token::TokenAccount;

use crate::state::*;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeLoanAccount<'info> {
    /// The relevant market this loan is for
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation the loan account is used for
    #[account(mut,
              has_one = market,
              has_one = owner)]
    pub obligation: AccountLoader<'info, Obligation>,

    /// The reserve that the loan comes from
    #[account(has_one = market,
              has_one = loan_note_mint)]
    pub reserve: AccountLoader<'info, Reserve>,

    /// The mint for the loan notes being used as loan
    pub loan_note_mint: Account<'info, Mint>,

    /// The user/authority that owns the loan
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The account that will store the loan notes
    #[account(init,
              seeds = [
                  b"loan".as_ref(),
                  reserve.key().as_ref(),
                  obligation.key().as_ref(),
                  owner.key.as_ref()
              ],
              bump,
              token::mint = loan_note_mint,
              token::authority = market_authority,
              payer = owner)]
    pub loan_account: Account<'info, TokenAccount>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Initialize an account that can be used to store loan notes to represent debt in an obligation
pub fn handler(ctx: Context<InitializeLoanAccount>, _bump: u8) -> Result<()> {
    // Anchor would have already initialized the new loan token account,
    // so all that's left is to register it in the obligation account. This
    // provides an exact record of which accounts are associated with the
    // obligation.

    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let reserve = &ctx.accounts.reserve.load()?;
    let account = ctx.accounts.loan_account.key();

    obligation.register_loan(&account, reserve.index)?;

    msg!("initialized loan account");
    Ok(())
}
