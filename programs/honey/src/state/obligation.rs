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

use std::fmt::Debug;

use anchor_lang::prelude::*;
use anchor_lang::Key;
use bytemuck::{ Contiguous, Pod, Zeroable };

use jet_math::Number;
use jet_proc_macros::assert_size;
use solana_program::entrypoint::ProgramResult;

use crate::errors::ErrorCode;
use crate::state::{ CachedReserveInfo, ReserveIndex };
use crate::utils::{ FixedBuf, StoredPubkey };

use super::Cache;
use super::MarketOracle;
use super::MarketReserves;

/// Limit the total positions that can be registered on an obligation
const MAX_OBLIGATION_POSITIONS: usize = 11;

#[assert_size(2912)]
/// Tracks information about a user's obligation to repay a borrowed position.
#[account(zero_copy)]
pub struct Obligation {
    pub version: u32,

    pub _reserved0: u32,

    /// The market this obligation is a part of
    pub market: Pubkey,

    /// The address that owns the debt/assets as a part of this obligation
    pub owner: Pubkey,

    /// Unused space before start of collateral info
    pub _reserved1: [u8; 184],

    /// stores collateral nft key
    pub collateral_nft_mint: [Pubkey; 11], // can store 11 nfts max for now

    /// The storage for cached calculations
    pub cached: [u8; 256],

    /// The storage for the information on positions owed by this obligation
    pub loans: [u8; 2048],
}

impl Obligation {
    pub fn register_nft(&mut self, account: Pubkey) -> Result<()> {
        if self.position_count() >= MAX_OBLIGATION_POSITIONS {
            return err!(ErrorCode::NoFreeObligation);
        }

        for nft_mint in self.collateral_nft_mint.iter_mut() {
            if *nft_mint != Pubkey::default() {
                return err!(ErrorCode::NftCollateralExists); //allow only 1 nft position per obligation
            }

            *nft_mint = account;
            return Ok(());
        }

        return err!(ErrorCode::NoFreeObligation);
    }

    pub fn unregister_nft(&mut self, account: Pubkey) -> Result<()> {
        for nft_mint in self.collateral_nft_mint.iter_mut() {
            if *nft_mint != account {
                continue;
            }
            *nft_mint = Pubkey::default();
            return Ok(());
        }

        err!(ErrorCode::UnregisteredNFTPosition)
    }

    pub fn register_loan(&mut self, account: &Pubkey, reserve_index: ReserveIndex) -> Result<()> {
        if self.position_count() >= MAX_OBLIGATION_POSITIONS {
            return err!(ErrorCode::NoFreeObligation);
        }

        self.loans_mut().register(Position::new(Side::Loan, *account, reserve_index))
    }

    pub fn unregister_loan(&mut self, account: &Pubkey) -> Result<()> {
        self.loans_mut().unregister(*account)
    }

    /// Record the loan borrowed from an obligation (borrow notes deposited)
    pub fn borrow(&mut self, loan_account: &Pubkey, loan_notes_amount: Number) -> ProgramResult {
        self.cached_mut().invalidate();
        self.loans_mut().add(loan_account, loan_notes_amount)
    }

    /// Record the loan repaid from an obligation (borrow notes burned)
    pub fn repay(&mut self, loan_account: &Pubkey, loan_notes_amount: Number) -> ProgramResult {
        self.cached_mut().invalidate();
        self.loans_mut().subtract(loan_account, loan_notes_amount)
    }

    /// Be smarter about compute
    pub fn cache_calculations(
        &mut self,
        market: &MarketReserves,
        current_slot: u64,
        nft_price_data: &MarketOracle
    ) {
        let loans: &ObligationSide = bytemuck::from_bytes(&self.loans);
        // let collateral: &ObligationSide = bytemuck::from_bytes(&self.collateral);
        let nft_deposited_collateral = &self.nft_collateral_value(nft_price_data.price);
        let cached: &mut CalculationCache = bytemuck::from_bytes_mut(&mut self.cached);

        cached.refresh(current_slot);

        let values = cached.get_stale_mut();
        values.loan_value = loans._market_value(market, current_slot);
        // let reserve_deposited_collateral = collateral._market_value(market, current_slot);
        values.collateral_value = *nft_deposited_collateral;
    }

    /// Determine if the obligation is healthy, or otherwise unhealthy and
    /// at risk of liquidation.
    pub fn is_healthy(&self, market: &MarketReserves, current_slot: u64) -> bool {
        let max_min_c_ratio: Number;
        let _max_min_c_ratio = self
            .loans()
            .iter()
            .filter(|p| p.amount != Number::ZERO)
            .map(|p| { market.get_cached(p.reserve_index, current_slot).min_collateral_ratio })
            .max();
        if let Some(c) = _max_min_c_ratio {
            max_min_c_ratio = c;
        } else {
            return true; // No loans
        }

        let cached: &CalculationCache = bytemuck::from_bytes(&self.cached);

        let cache_values = cached.expect(current_slot, "calculations not performed");
        msg!("loan value {}", cache_values.loan_value);
        let min_collateral_value = cache_values.loan_value * max_min_c_ratio;

        msg!("{}, {}", min_collateral_value, cache_values.collateral_value);
        min_collateral_value <= cache_values.collateral_value
    }

    pub fn can_borrow_from_reserve(&self, index: ReserveIndex) -> Result<()> {
        for position in self.loans().iter() {
            if position.reserve_index == index {
                continue;
            }
            if position.amount > Number::ZERO {
                return err!(ErrorCode::AnotherLoanOutstanding);
            }
        }

        Ok(())
    }

    /// Determine if this obligation has a custody over some account,
    /// by checking if its in the list of registered accounts.
    pub fn has_loan_custody(&self, account: &Pubkey) -> bool {
        self.loans()
            .iter()
            .any(|p| p.account.as_ref() == account)
    }

    pub fn nft_collateral_value(&self, price: Number) -> Number {
        let mut value = Number::ZERO;

        for nft in self.collateral_nft_mint.iter() {
            if *nft != Pubkey::default() {
                value += price;
            }
        }
        msg!("nft collateral value: {}", value);
        value
    }

    pub fn loan_value(&self, market: &MarketReserves, current_slot: u64) -> Number {
        if let Ok(values) = self.cached().try_get(current_slot) {
            return values.loan_value;
        }

        self.loans()._market_value(market, current_slot)
    }

    pub fn position_count(&self) -> usize {
        let loans = self.loans().iter().count();

        loans
    }

    fn cached(&self) -> &CalculationCache {
        bytemuck::from_bytes(&self.cached)
    }

    fn cached_mut(&mut self) -> &mut CalculationCache {
        bytemuck::from_bytes_mut(&mut self.cached)
    }

    pub fn loans(&self) -> &ObligationSide {
        bytemuck::from_bytes(&self.loans)
    }

    fn loans_mut(&mut self) -> &mut ObligationSide {
        bytemuck::from_bytes_mut(&mut self.loans)
    }
}

#[assert_size(240)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
struct CalculationCacheInner {
    collateral_value: Number,
    loan_value: Number,

    _reserved: FixedBuf<192>,
}

type CalculationCache = Cache<CalculationCacheInner, 0>;

#[assert_size(4)]
#[derive(Contiguous, Debug, Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
enum Side {
    Loan,
}

/// Tracks information about the collateral deposited towards an obligation
#[assert_size(aligns, 2048)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct ObligationSide {
    positions: [Position; 16],
}

impl ObligationSide {
    /// Register a position for this obligation (account which holds loan or collateral notes)
    fn register(&mut self, new: Position) -> Result<()> {
        for position in self.positions.iter_mut() {
            if position.account == new.account.key() {
                panic!(
                    "Cannot register account {:?} as {:?} for reserve index {:?} since it is \
                        already registered with {:?} for this obligation",
                    new.account,
                    new.side,
                    position.reserve_index,
                    position
                );
            }

            if position.reserve_index == new.reserve_index && position.account != Pubkey::default() {
                panic!(
                    "Cannot register account {:?} as {:?} for reserve index {:?} since the \
                       reserve index is already registered with {:?} for this obligation",
                    new.account,
                    new.side,
                    position.reserve_index,
                    position
                );
            }
        }

        for position in self.positions.iter_mut() {
            if position.account != Pubkey::default() {
                continue;
            }
            *position = new;

            return Ok(());
        }
        err!(ErrorCode::NoFreeObligation)
    }

    /// Unregister a position for this obligation (account which holds loan or collateral notes)
    fn unregister(&mut self, existing_account: Pubkey) -> Result<()> {
        for position in self.positions.iter_mut() {
            if position.account != existing_account {
                continue;
            }

            *position.account = Pubkey::default();

            return Ok(());
        }

        err!(ErrorCode::ObligationPositionNotFound)
    }

    /// Record the loan borrowed from an obligation (borrow notes deposited)
    fn add(&mut self, account: &Pubkey, notes_amount: Number) -> ProgramResult {
        let position = self.position_mut(account)?;
        position.amount += notes_amount;
        Ok(())
    }

    /// Record the loan repaid from an obligation (borrow notes burned)
    fn subtract(&mut self, account: &Pubkey, notes_amount: Number) -> ProgramResult {
        let position = self.position_mut(account)?;
        position.amount = position.amount.saturating_sub(notes_amount);
        Ok(())
    }

    pub fn position(&self, account: &Pubkey) -> Result<&Position> {
        let position = self.positions
            .iter()
            .find(|p| p.account == *account)
            .ok_or(ErrorCode::UnregisteredPosition)?;
        Ok(position)
    }

    fn position_mut(&mut self, account: &Pubkey) -> Result<&mut Position> {
        let position = self.positions
            .iter_mut()
            .find(|p| p.account == *account)
            .ok_or(ErrorCode::UnregisteredPosition)?;
        Ok(position)
    }

    pub fn market_value(&self, market_info: &MarketReserves, current_slot: u64) -> PositionValue {
        let mut value = PositionValue::zeroed();

        for position in self.iter() {
            let reserve = market_info.get(position.reserve_index).unwrap(current_slot);
            let position_value = position.market_value(reserve);
            value.market_value += position_value.market_value;
            value.complementary_limit += position_value.complementary_limit;
        }

        value
    }

    fn _market_value(&self, market: &MarketReserves, current_slot: u64) -> Number {
        let mut value = Number::ZERO;

        for pos in self.iter() {
            let reserve = market.get_cached(pos.reserve_index, current_slot);
            value = pos._market_value(reserve).saturating_add(value);
        }

        value
    }

    pub fn iter(&self) -> impl Iterator<Item = &Position> {
        self.positions.iter().filter(|p| p.account != Pubkey::default())
    }
}

/// Information about a single collateral or loan account registered with an obligation
#[assert_size(aligns, 128)]
#[derive(Pod, Zeroable, Debug, Clone, Copy)]
#[repr(C)]
pub struct Position {
    /// The token account holding the bank notes
    pub account: StoredPubkey,

    /// Non-authoritative number of bank notes placed in the account
    pub amount: Number,

    pub side: u32,

    /// The index of the reserve that this position's assets are from
    pub reserve_index: ReserveIndex,

    _reserved: FixedBuf<66>,
}

/// The value of a collateral or loan position within an obligation
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct PositionValue {
    /// The market value in USD of the assets that were either deposited or borrowed.
    pub market_value: Number,

    /// For loans, this is the minimum collateral requirement in USD.
    /// For collateral, this is the maximum in USD that can be borrowed against it.
    pub complementary_limit: Number,
}

impl Position {
    fn new(side: Side, account: Pubkey, reserve_index: ReserveIndex) -> Position {
        Position {
            account: account.into(),
            side: side.into_integer(),
            amount: Number::ZERO,
            reserve_index,
            _reserved: FixedBuf::zeroed(),
        }
    }

    pub fn market_value(&self, reserve: &CachedReserveInfo) -> PositionValue {
        let market_value = self._market_value(reserve);
        PositionValue {
            market_value,
            complementary_limit: self.complementary_limit(reserve, market_value),
        }
    }

    fn _market_value(&self, reserve: &CachedReserveInfo) -> Number {
        msg!(
            "amount: {} note_exchange_rate {} reserve.price {}",
            self.amount,
            self.note_exchange_rate(reserve),
            reserve.price
        );
        self.amount * self.note_exchange_rate(reserve) * reserve.price
    }

    fn complementary_limit(&self, reserve: &CachedReserveInfo, market_value: Number) -> Number {
        match Side::from_integer(self.side).expect("invalid side value") {
            // Side::Collateral => market_value / reserve.min_collateral_ratio,
            Side::Loan => market_value * reserve.min_collateral_ratio,
        }
    }

    fn note_exchange_rate(&self, reserve: &CachedReserveInfo) -> Number {
        match Side::from_integer(self.side).expect("invalid side value") {
            // Side::Collateral => reserve.deposit_note_exchange_rate,
            Side::Loan => reserve.loan_note_exchange_rate,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::ops::Mul;

    use crate::state::ReserveInfo;

    use super::*;

    struct ObligationTestContext {
        market: MarketReserves,
        obligation: Obligation,
    }

    impl ObligationTestContext {
        fn new() -> Self {
            Self {
                market: MarketReserves::zeroed(),
                obligation: Obligation::zeroed(),
            }
        }

        fn create_loan(&mut self, reserve_init: impl Fn(&mut ReserveInfo)) -> Pubkey {
            let reserve_key = Pubkey::new_unique();
            let loan_key = Pubkey::new_unique();

            let reserve_index = self.market.register(&reserve_key).unwrap();
            let reserve_info = self.market.get_mut(reserve_index);

            reserve_init(reserve_info);

            self.obligation.register_loan(&loan_key, reserve_index).unwrap();

            loan_key
        }
    }
    #[test]
    fn is_nft_value_included() {
        let mut ctx = ObligationTestContext::new();
        let deposit_nft_mint = Pubkey::new_unique();
        ctx.obligation.register_nft(deposit_nft_mint).unwrap();

        let price_from = Number::from(2u32);
        let nft_oracle_price: MarketOracle = MarketOracle { price: price_from };
        let expected_nft_value = ctx.obligation.nft_collateral_value(price_from);
        assert_eq!(expected_nft_value, Number::from(price_from.mul(1u32)));

        ctx.obligation.cache_calculations(&ctx.market, 0, &nft_oracle_price);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(healthy);

        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.cache.get_stale_mut();

            cache.price = Number::from(4u32);
            cache.loan_note_exchange_rate = Number::from(1u32);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        ctx.obligation.borrow(&loan, Number::from(1u32)).unwrap();

        // verify the obligation is still healthy
        ctx.obligation.cache_calculations(&ctx.market, 0, &nft_oracle_price);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(!healthy);
    }

    #[test]
    fn sane_is_obligation_healthy() {
        let mut ctx = ObligationTestContext::new();

        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.cache.get_stale_mut();

            cache.price = Number::from(2u32);
            cache.loan_note_exchange_rate = Number::from(1_000u32);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation.borrow(&loan, Number::from(500_000u32)).unwrap();

        let price_from = Number::from(122u32);
        let nft_oracle_price: MarketOracle = MarketOracle { price: price_from };
        // c-ratio = 100%
        ctx.obligation.cache_calculations(&ctx.market, 0, &nft_oracle_price);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(!healthy);

        // c-ratio = 250%
        ctx.obligation.repay(&loan, Number::from(500_000u32)).unwrap();

        ctx.obligation.cache_calculations(&ctx.market, 0, &nft_oracle_price);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(healthy);
    }
}