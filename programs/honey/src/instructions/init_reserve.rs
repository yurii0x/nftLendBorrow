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
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, TokenAccount},
};

use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitReserveBumpSeeds {
    pub vault: u8,
    pub fee_note_vault: u8,
    pub protocol_fee_note_vault: u8,
    pub deposit_note_mint: u8,
    pub loan_note_mint: u8
}

#[derive(Accounts)]
#[instruction(bump: InitReserveBumpSeeds)]
pub struct InitializeReserve<'info> {
    /// The market the new reserve is being added to.
    #[account(mut,
              has_one = owner,
              has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account, which owns the vault
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The new account to store data about the reserve
    #[account(zero)]
    pub reserve: AccountLoader<'info, Reserve>,

    /// The account to hold custody of the tokens being
    /// controlled by this reserve.
    #[account(init,
              seeds = [
                  b"vault".as_ref(),
                  reserve.key().as_ref()
              ],
              bump,
              token::mint = token_mint,
              token::authority = market_authority,
              payer = owner)]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// The mint for notes which will represent user deposits
    #[account(init,
        seeds = [
            b"deposits".as_ref(),
            reserve.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        payer = owner,

        mint::decimals=token_mint.decimals,
        mint::authority=market_authority,
      )]
    pub deposit_note_mint: Box<Account<'info, Mint>>,

    /// The account to hold the notes created from fees collected by the reserve
    #[account(init,
        seeds = [
            b"fee-vault".as_ref(),
            reserve.key().as_ref()
        ],
        bump,
        payer = owner,
        token::mint = deposit_note_mint,
        token::authority = market_authority)]
    pub fee_note_vault: Box<Account<'info, TokenAccount>>,

    /// The account to hold the notes created from protocol fees collected by the reserve
    #[account(init,
            seeds = [
                b"protocol-fee-vault".as_ref(),
                reserve.key().as_ref()
            ],
            bump,
            payer = owner,
            token::mint = deposit_note_mint,
            token::authority = market_authority,
        )]
    pub protocol_fee_note_vault: Box<Account<'info, TokenAccount>>,

    /// The mint for the token being stored in this reserve.
    pub token_mint: Box<Account<'info, Mint>>,

    /// The program for interacting with the token.
    pub token_program: Program<'info, Token>,

    /// The account containing the price information for the token.
    /// CHECK: TODO how should we check this?
    pub switchboard_price_aggregator: AccountInfo<'info>,

    /// The mint for notes which will represent user loans
    #[account(init,
              seeds = [
                  b"loans".as_ref(),
                  reserve.key().as_ref(),
                  token_mint.key().as_ref()
              ],
              bump,
              payer = owner,
              mint::decimals = token_mint.decimals,
              mint::authority = market_authority
            )]
    pub loan_note_mint: Box<Account<'info, Mint>>,

    /// The market owner, which must sign to make this change to the market.
    #[account(mut)]
    pub owner: Signer<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitializeReserve<'info> {
    fn register_with_market(&mut self, config: ReserveConfig) -> Result<()> {
        let mut market = self.market.load_mut()?;
        let mut reserve = self.reserve.load_init()?;
        let oracle_price = &self.switchboard_price_aggregator;
        let token_mint = &self.token_mint;

        reserve.version = 0;
        reserve.config = config;
        reserve.market = self.market.key();
        reserve.switchboard_price_aggregator = oracle_price.key();
        reserve.vault = self.vault.key();
        reserve.fee_note_vault = self.fee_note_vault.key();
        reserve.protocol_fee_note_vault = self.protocol_fee_note_vault.key();

        reserve.exponent = -(token_mint.decimals as i32);
        reserve.token_mint = token_mint.key();
        reserve.deposit_note_mint = self.deposit_note_mint.key();
        reserve.loan_note_mint = self.loan_note_mint.key();

        let clock = Clock::get()?;
        reserve.init(&clock);

        // Register an entry with the market account for this new reserve
        let reserve_key = self.reserve.key();
        let market_reserves = market.reserves_mut();
        reserve.index = market_reserves.register(&reserve_key)?;

        Ok(())
    }
}

/// Initialize a new reserve in a market with some initial liquidity.
pub fn handler(
    ctx: Context<InitializeReserve>,
    _bump: InitReserveBumpSeeds,
    config: ReserveConfig,
) -> Result<()> {
    // Initialize the reserve data
    ctx.accounts.register_with_market(config)?;

    Ok(())
}
