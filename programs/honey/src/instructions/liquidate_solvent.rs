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
use crate::errors::ErrorCode;
use crate::state::*;
use crate::{Amount, Rounding};
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use jet_math::Number;

#[event]
pub struct LiquidateSolventEvent {
    owner: Pubkey,
    nft_mint: Pubkey
}

#[derive(Accounts)]
pub struct LiquidateSolvent<'info> {
    //need to add other necessary constraints
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    #[account(mut,
        has_one = market,
        has_one = loan_note_mint,
        has_one = vault
    )]
    pub reserve: AccountLoader<'info, Reserve>,

    pub vault: Account<'info, TokenAccount>,

    /// The obligation with debt to be repaid
    #[account(mut, 
        has_one = market, 
        constraint = obligation.load().unwrap().has_loan_custody(&loan_account.key()),
    )]
    pub obligation: AccountLoader<'info, Obligation>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: Account<'info, Mint>,

    #[account(mut)]
    pub collateral_account: Account<'info, TokenAccount>,

    /// The account that holds the borrower's debt balance
    #[account(mut)]
    pub loan_account: Account<'info, TokenAccount>,

    pub nft_mint: Account<'info, Mint>,

    /// The admin/authority that has permission to execute solvent liquidation
    #[cfg_attr(not(feature = "testing"), account(address = crate::ROOT_AUTHORITY))]
    #[account(mut)]
    pub executor: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> LiquidateSolvent<'info> {
    fn note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Burn {
                from: self.loan_account.to_account_info(),
                mint: self.loan_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Mint solvent droplets to liquidate
pub fn handler(ctx: Context<LiquidateSolvent>, amount: Amount) -> Result<()> {
    // 0. Gather the needed data
    let market = ctx.accounts.market.load()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let clock = Clock::get().unwrap();

    let market_reserves = market.reserves();
    let reserve_info = market_reserves.get_cached(reserve.index, clock.slot);
    let loan_account = &ctx.accounts.loan_account;
    let new_oracle = &MarketOracle {
        price: Number::from_decimal(amount.as_tokens(reserve_info, Rounding::Down), 0),
    };

    obligation.cache_calculations(market.reserves(), clock.slot, new_oracle);

    // 1. Check that the obligation is unhealthy
    // this can liquidate any nft later add some rarity based stuff
    if obligation.is_healthy(market_reserves, clock.slot) {
        return Err(ErrorCode::ObligationHealthy.into());
    }

    // 2. Update nft's price according to the solvent swap result
    let _nft_collateral_value = obligation.nft_collateral_value(new_oracle.price);

    // 3. Determine the amount of collateral to be liquidated
    let _loan_value = obligation.loan_value(market.reserves(), clock.slot);

    // 4. unregister collateral and nft
    // let nft_mint = ctx.accounts.nft_mint.key();
    // obligation.unregister_nft(nft_mint)?;

    // some portion of loan is repaid due to obligation
    market.verify_ability_repay()?;

    let payoff_notes = amount.as_loan_notes(reserve_info, Rounding::Down)?;
    let payoff_notes = std::cmp::min(
        payoff_notes,
        token::accessor::amount(&loan_account.to_account_info())?,
    );
    let payoff_tokens = std::cmp::min(
        reserve_info.loan_notes_to_tokens(payoff_notes, Rounding::Up),
        reserve.unwrap_outstanding_debt(clock.slot).as_u64(0),
    );
    msg!(
        "payoff_notes after comparing outstanding debt{}",
        payoff_notes
    );

    msg!("burning");
    // 5. Burn the debt that's being repaid
    token::burn(
        ctx.accounts
            .note_burn_context()
            .with_signer(&[&market.authority_seeds()]),
        payoff_notes,
    )?;

    // Keep the reserve's borrow tracking updated
    reserve.repay(clock.slot, payoff_tokens, payoff_notes);

    msg!("recoriding repay");
    // 6. record the repayment in the obligation which is used to determine the obligation's health
    obligation.repay(&loan_account.key(), reserve.amount(payoff_notes))?;

    emit!(LiquidateSolventEvent {
        owner: obligation.owner.key(),
        nft_mint: ctx.accounts.nft_mint.key()
    });

    Ok(())
}
