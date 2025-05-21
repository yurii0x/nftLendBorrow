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
use anchor_spl::token::{ self, Mint, TokenAccount, Transfer };
use crate::utils::validate;

use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::verify_valid_metadata;

#[event]
pub struct WithdrawCollateralEvent {
    depositor: Pubkey,
    market: Pubkey,
    amount: u64,
}

#[derive(Accounts)]
pub struct WithdrawNFT<'info> {
    /// The relevant market the collateral is in
    #[account(mut,
        has_one = market_authority,
        has_one = nft_collection_creator)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation the collateral is being withdrawn from
    /// todo verify depositor?
    #[account(mut,
              has_one = market,
              has_one = owner)]
    pub obligation: AccountLoader<'info, Obligation>,

    /// The user/authority that owns the deposited collateral (depositor)
    pub owner: Signer<'info>,

    /// The account that stores the user's deposit notes, where
    /// the collateral will be returned to.
    #[account(mut)]
    pub deposit_to: Account<'info, TokenAccount>,

    /// The account that stores the user's deposit notes
    /// CHECK: market must have a nft_collection_creator account
    pub nft_collection_creator: AccountInfo<'info>,

    /// CHECK: metadata validated with validate check
    pub metadata: AccountInfo<'info>,

    #[account(mut)]
    pub deposit_nft_mint: Account<'info, Mint>,

    /// The account that contains the collateral to be withdrawn
    #[account(mut,
        associated_token::mint = deposit_nft_mint,
        associated_token::authority = market_authority)]
    pub collateral_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> WithdrawNFT<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Transfer {
            from: self.collateral_account.to_account_info(),
            to: self.deposit_to.to_account_info(),
            authority: self.market_authority.clone(),
        })
    }
}

/// Withdraw reserve notes previously deposited as collateral for an obligation
#[access_control(validate(metadata_bump, &ctx.accounts.metadata, &ctx.accounts.deposit_nft_mint))]
pub fn handler(ctx: Context<WithdrawNFT>, metadata_bump: u8) -> Result<()> {
    // Transfer the notes from the collateral account back to the
    // regular deposit account.
    let market = ctx.accounts.market.load()?;
    let deposit_nft_mint = ctx.accounts.deposit_nft_mint.key();

    verify_valid_metadata(&ctx.accounts.metadata, &ctx.accounts.nft_collection_creator)?;

    market.verify_ability_deposit_withdraw()?;

    let note_amount = 1;

    token::transfer(
        ctx.accounts.transfer_context().with_signer(&[&market.authority_seeds()]),
        note_amount
    )?;

    // Also update the collateral values stored in the obligation account
    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let _collateral_account = ctx.accounts.collateral_account.key();

    // unregister the collateral from the init_nft_account
    // TODO: this also means we need to close and refund the account
    obligation.unregister_nft(deposit_nft_mint)?;

    // Verify this doesn't leave the loan subject to liquidation
    let clock = Clock::get().unwrap();
    let market_info = market.reserves();
    let market_oracle = market.market_oracle();

    obligation.cache_calculations(market.reserves(), clock.slot, market_oracle);
    if !obligation.is_healthy(market_info, clock.slot) {
        return Err(ErrorCode::ObligationUnhealthy.into());
    }

    //market.total_tokens_deposited = total_tokens_deposited.checked_sub(1).unwrap();

    emit!(WithdrawCollateralEvent {
        depositor: ctx.accounts.owner.key(),
        market: ctx.accounts.market.key(),
        amount: note_amount,
    });

    Ok(())
}