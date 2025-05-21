// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2022 HONEY.
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

#![cfg_attr(feature = "no-entrypoint", allow(dead_code))]

use anchor_lang::prelude::*;
#[cfg(not(feature = "testing"))]
use anchor_lang::solana_program::pubkey;

extern crate jet_proc_macros;
extern crate static_assertions;

pub mod common;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use common::Amount;
use common::Rounding;
use instructions::*;
use state::*;

declare_id!("F1PypuidC78bosb7cHfU2ERZSd1RWLdbsq82nR9Tdgkh");

#[cfg(not(feature = "testing"))]
static ROOT_AUTHORITY: Pubkey = pubkey!("2J2K1wHK3U8bsow1shUZJvEx1L2og2h5T5JGPqBS1uKA");

#[derive(Clone)]
pub struct Honey;

impl anchor_lang::Id for Honey {
    fn id() -> Pubkey {
        ID
    }
}

#[program]
mod honey {
    use super::*;

    /// Initialize a new empty market with a given owner.
    pub fn init_market(
        ctx: Context<InitializeMarket>,
        owner: Pubkey,
        quote_currency: String,
        quote_token_mint: Pubkey,
        nft_collection_creator: Pubkey,
    ) -> Result<()> {
        instructions::init_market::handler(
            ctx,
            owner,
            quote_currency,
            quote_token_mint,
            nft_collection_creator,
        )
    }

    /// Initialize a new reserve in a market with some initial liquidity.
    pub fn init_reserve(
        ctx: Context<InitializeReserve>,
        bump: InitReserveBumpSeeds,
        config: ReserveConfig,
    ) -> Result<()> {
        instructions::init_reserve::handler(ctx, bump, config)
    }

    /// Replace an existing reserve config
    pub fn update_reserve_config(
        ctx: Context<UpdateReserveConfig>,
        new_config: ReserveConfig,
    ) -> Result<()> {
        instructions::update_reserve_config::handler(ctx, new_config)
    }

    /// Initialize an account that can be used to store deposit notes
    pub fn init_deposit_account(ctx: Context<InitializeDepositAccount>, bump: u8) -> Result<()> {
        instructions::init_deposit_account::handler(ctx, bump)
    }

    /// Initialize an account that can be used to store deposit notes as collateral
    pub fn init_loan_account(ctx: Context<InitializeLoanAccount>, bump: u8) -> Result<()> {
        instructions::init_loan_account::handler(ctx, bump)
    }

    /// Initialize an account that can be used to borrow from a reserve
    pub fn init_obligation(ctx: Context<InitializeObligation>, bump: u8) -> Result<()> {
        instructions::init_obligation::handler(ctx, bump)
    }

    /// Change the owner on a market
    pub fn set_market_owner(ctx: Context<SetMarketOwner>, new_owner: Pubkey) -> Result<()> {
        instructions::set_market_owner::handler(ctx, new_owner)
    }

    /// Change the flags on a market
    pub fn set_market_flags(ctx: Context<SetMarketFlags>, flags: u64) -> Result<()> {
        instructions::set_market_flags::handler(ctx, flags)
    }

    /// Deposit tokens into a reserve (unmanaged)
    pub fn deposit_tokens(ctx: Context<DepositTokens>, bump: u8, amount: Amount) -> Result<()> {
        instructions::deposit_tokens::handler(ctx, bump, amount)
    }

    /// Withdraw tokens from a reserve (unmanaged)
    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, bump: u8, amount: Amount) -> Result<()> {
        instructions::withdraw_tokens::handler(ctx, bump, amount)
    }

    /// Deposit notes as collateral in an obligation
    pub fn deposit_nft(ctx: Context<DepositNFT>, metadata_bump: u8) -> Result<()> {
        instructions::deposit_nft::handler(ctx, metadata_bump)
    }

    /// Withdraw notes previously deposited as collateral in an obligation
    pub fn withdraw_nft(ctx: Context<WithdrawNFT>, metadata_bump: u8) -> Result<()> {
        instructions::withdraw_nft::handler(ctx, metadata_bump)
    }

    /// Borrow tokens from a reserve
    pub fn borrow(ctx: Context<Borrow>, bump: BorrowBumpSeeds, amount: Amount) -> Result<()> {
        instructions::borrow::handler(ctx, bump, amount)
    }

    /// Repay a loan
    pub fn repay(ctx: Context<Repay>, amount: Amount) -> Result<()> {
        instructions::repay::handler(ctx, amount)
    }

    /// liquidate through solvent droplets
    pub fn liquidate_solvent(ctx: Context<LiquidateSolvent>, amount: Amount) -> Result<()> {
        instructions::liquidate_solvent::handler(ctx, amount)
    }

    /// Withdraw notes previously deposited as collateral in an obligation
    pub fn withdraw_nft_solvent(ctx: Context<WithdrawNFTSolvent>, metadata_bump: u8) -> Result<()> {
        instructions::withdraw_nft_solvent::handler(ctx, metadata_bump)
    }

    pub fn place_liquidate_bid(
        ctx: Context<PlaceLiquidateBid>,
        bump: PlaceLiquidateBidBumps,
        bid_limit: u64,
    ) -> Result<()> {
        instructions::place_liquidate_bid::handler(ctx, bump, bid_limit)
    }

    pub fn increase_liquidate_bid(
        ctx: Context<IncreaseLiquidateBid>,
        bump: IncreaseLiquidateBidBumps,
        bid_increase: u64,
    ) -> Result<()> {
        instructions::increase_liquidate_bid::handler(ctx, bump, bid_increase)
    }

    pub fn revoke_liquidate_bid(
        ctx: Context<RevokeLiquidateBid>,
        bump: RevokeLiquidateBidBumps,
    ) -> Result<()> {
        instructions::revoke_liquidate_bid::handler(ctx, bump)
    }

    pub fn execute_liquidate_bid(
        ctx: Context<ExecuteLiquidateBid>,
        bump: ExecuteLiquidateBidBumps,
    ) -> Result<()> {
        instructions::execute_liquidate_bid::handler(ctx, bump)
    }

    /// Refresh a reserve's market price and interest owed
    ///
    /// If the reserve is extremely stale, only a partial update will be
    /// performed. It may be necessary to call refresh_reserve multiple
    /// times to get the reserve up to date.
    pub fn refresh_reserve(ctx: Context<RefreshReserve>) -> Result<()> {
        instructions::refresh_reserve::handler(ctx)
    }
}
