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

use crate::state::*;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeObligation<'info> {
    /// The relevant market
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The user/authority that is responsible for owning this obligation.
    #[account(mut)]
    pub borrower: Signer<'info>,

    /// The new account to track information about the borrower's loan,
    /// such as the collateral put up.
    #[account(init,
              seeds = [
                  b"obligation".as_ref(),
                  market.key().as_ref(),
                  borrower.key.as_ref()
              ],
              bump,
              space = 8 + std::mem::size_of::<Obligation>(),
              payer = borrower)]
    pub obligation: AccountLoader<'info, Obligation>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Initialize an account that tracks a portfolio of collateral deposits and loans.
pub fn handler(ctx: Context<InitializeObligation>, _bump: u8) -> Result<()> {
    let mut obligation = ctx.accounts.obligation.load_init()?;

    obligation.market = ctx.accounts.market.key();
    obligation.owner = *ctx.accounts.borrower.key;

    msg!("initialized obligation account");
    Ok(())
}
