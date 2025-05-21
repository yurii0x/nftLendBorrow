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
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::{
    token::{Mint, self, Transfer, TokenAccount},
};
use crate::state::*;
use crate::utils::verify_valid_metadata;
use crate::utils::validate;

#[event]
pub struct DepositCollateralEvent {
    depositor: Pubkey,
    market: Pubkey,
    amount: u64,
}

#[derive(Accounts)]
pub struct DepositNFT<'info> {
    /// The relevant market this deposit is for
    #[account(mut, 
              has_one = market_authority,
              has_one = nft_collection_creator)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation the collateral is being deposited toward
    #[account(mut, 
        has_one = market, 
        has_one = owner,
        // constraint = obligation.load().unwrap().has_collateral_custody(&collateral_account.key()),
    )]
    pub obligation: AccountLoader<'info, Obligation>,

    /// The user/authority that owns the deposit
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The account that stores the user's deposit notes
    #[account(mut)]
    pub deposit_source: Account<'info, TokenAccount>,

    /// The account that stores the user's deposit notes
    #[account(mut)]
    pub deposit_nft_mint: Account<'info, Mint>,

    /// verified collection creator
    /// CHECK: market must have a nft_collection_creator account
    pub nft_collection_creator: AccountInfo<'info>,

    /// CHECK: metadata validated with validate check
    pub metadata: AccountInfo<'info>,

    /// The account that will store the deposit nft as collateral
    #[account(init_if_needed,        
        associated_token::mint = deposit_nft_mint,
        associated_token::authority = market_authority,
        payer = owner,
    )]
    pub collateral_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}

impl<'info> DepositNFT<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info().clone(),
            Transfer {
                from: self.deposit_source.to_account_info(),
                to: self.collateral_account.to_account_info(),
                authority: self.owner.to_account_info().clone(),
            },
        )
    }

}

/// Deposit reserve notes as collateral for an obligation
#[access_control(validate(metadata_bump, &ctx.accounts.metadata, &ctx.accounts.deposit_nft_mint))]
pub fn handler(
    ctx: Context<DepositNFT>,
    metadata_bump: u8
) -> Result<()> {

    // Transfer the notes into the collateral account
    let market = ctx.accounts.market.load()?;
    let deposit_nft_mint = ctx.accounts.deposit_nft_mint.key();

    verify_valid_metadata(&ctx.accounts.metadata, &ctx.accounts.nft_collection_creator)?;

    market.verify_ability_deposit_withdraw()?;

    let note_amount = 1;

    token::transfer(
        ctx.accounts
            .transfer_context(),
        note_amount,
    )?;

    // To make things hopefully a bit more efficient, we also
    // record the amount of the collateral inside the obligation
    // account, to avoid needing to access the collateral account
    // to verify the position.
    let mut obligation = ctx.accounts.obligation.load_mut()?;
    obligation.register_nft(deposit_nft_mint)?;


    emit!(DepositCollateralEvent {
        depositor: ctx.accounts.owner.key(),
        market: ctx.accounts.market.key(),
        amount: note_amount
    });

    Ok(())
}
