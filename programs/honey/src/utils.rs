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

use std::{
    fmt::Display,
    ops::{Deref, DerefMut},
};

use anchor_lang::prelude::*;
use mpl_token_metadata::state::Metadata;
use mpl_token_metadata::state::TokenMetadataAccount;
use mpl_token_metadata::ID as metadata_program_id;
use vipers::assert_keys_eq;
// use anchor_spl::dex::serum_dex::state::{Market as DexMarket, ToAlignedBytes};
use crate::errors::ErrorCode;
use anchor_spl::token::{self, Mint};
use bytemuck::{Pod, Zeroable};

/// Workaround for the fact that `Pubkey` doesn't implement the
/// `Pod` trait (even though it meets the requirements), and there
/// isn't really a way for us to extend the original type, so we wrap
/// it in a new one.
#[derive(Eq, PartialEq, Clone, Copy)]
#[repr(transparent)]
pub struct StoredPubkey(Pubkey);
static_assertions::const_assert_eq!(32, std::mem::size_of::<StoredPubkey>());

unsafe impl Pod for StoredPubkey {}
unsafe impl Zeroable for StoredPubkey {}

impl AsRef<Pubkey> for StoredPubkey {
    fn as_ref(&self) -> &Pubkey {
        &self.0
    }
}

impl From<StoredPubkey> for Pubkey {
    fn from(key: StoredPubkey) -> Self {
        key.0
    }
}

impl From<Pubkey> for StoredPubkey {
    fn from(key: Pubkey) -> Self {
        Self(key)
    }
}

impl Deref for StoredPubkey {
    type Target = Pubkey;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for StoredPubkey {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl PartialEq<Pubkey> for StoredPubkey {
    fn eq(&self, other: &Pubkey) -> bool {
        self.0.eq(other)
    }
}

impl std::fmt::Debug for StoredPubkey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        (&self.0 as &dyn std::fmt::Display).fmt(f)
    }
}

impl Display for StoredPubkey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

/// A fixed-size byte array
#[derive(Clone, Copy)]
#[repr(transparent)]
pub struct FixedBuf<const SIZE: usize> {
    data: [u8; SIZE],
}

static_assertions::const_assert_eq!(0, std::mem::size_of::<FixedBuf<0>>());
static_assertions::const_assert_eq!(61, std::mem::size_of::<FixedBuf<61>>());

unsafe impl<const SIZE: usize> Pod for FixedBuf<SIZE> {}
unsafe impl<const SIZE: usize> Zeroable for FixedBuf<SIZE> {}

impl<const SIZE: usize> std::fmt::Debug for FixedBuf<SIZE> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "FixedBuf<{}>", SIZE)
    }
}

impl<const SIZE: usize> AsRef<[u8]> for FixedBuf<SIZE> {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

impl<const SIZE: usize> AsMut<[u8]> for FixedBuf<SIZE> {
    fn as_mut(&mut self) -> &mut [u8] {
        &mut self.data
    }
}

impl<const SIZE: usize> Deref for FixedBuf<SIZE> {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<const SIZE: usize> DerefMut for FixedBuf<SIZE> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}

impl<const SIZE: usize> borsh::BorshDeserialize for FixedBuf<SIZE> {
    fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let mut data = [0u8; SIZE];
        data.copy_from_slice(buf);

        Ok(FixedBuf { data })
    }
}

impl<const SIZE: usize> borsh::BorshSerialize for FixedBuf<SIZE> {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        let _ = writer.write(&self.data)?;
        Ok(())
    }
}

pub enum JobCompletion {
    Partial,
    Full,
}

pub fn verify_account_empty(account: &AccountInfo) -> Result<()> {
    let notes_remaining = token::accessor::amount(&account)?;

    if notes_remaining > 0 {
        msg!("the account is not empty");
        return Err(ErrorCode::AccountNotEmptyError.into());
    }

    Ok(())
}

pub trait SafeCalc<T> {
    fn safe_add(&self, num: T) -> Result<T>;
    fn safe_sub(&self, num: T) -> Result<T>;
    fn safe_mul(&self, num: T) -> Result<T>;
    fn safe_div(&self, num: T) -> Result<T>;
}
impl SafeCalc<u32> for u32 {
    fn safe_add(&self, num: u32) -> Result<u32> {
        let result = self.checked_add(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_sub(&self, num: u32) -> Result<u32> {
        let result = self.checked_sub(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_mul(&self, num: u32) -> Result<u32> {
        let result = self.checked_mul(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_div(&self, num: u32) -> Result<u32> {
        let result = self.checked_div(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
}
impl SafeCalc<u64> for u64 {
    fn safe_add(&self, num: u64) -> Result<u64> {
        let result = self.checked_add(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_sub(&self, num: u64) -> Result<u64> {
        let result = self.checked_sub(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_mul(&self, num: u64) -> Result<u64> {
        let result = self.checked_mul(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_div(&self, num: u64) -> Result<u64> {
        let result = self.checked_div(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
}
impl SafeCalc<u128> for u128 {
    fn safe_add(&self, num: u128) -> Result<u128> {
        let result = self.checked_add(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_sub(&self, num: u128) -> Result<u128> {
        let result = self.checked_sub(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_mul(&self, num: u128) -> Result<u128> {
        let result = self.checked_mul(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
    fn safe_div(&self, num: u128) -> Result<u128> {
        let result = self.checked_div(num);
        if result.is_none() {
            return Err(error!(ErrorCode::MathOverflow));
        }
        Ok(result.unwrap())
    }
}

/// Verify that the market is currently allowing changes to borrows
pub fn verify_valid_metadata(metadata: &AccountInfo, nft_collection_creator: &AccountInfo) -> Result<()> {
    let metadata: Metadata = Metadata::from_account_info(metadata)?;
    let is_valid_metadata = metadata
        .data
        .creators
        .as_ref()
        .unwrap()
        .iter()
        .any(|creator| {
            creator.verified == true && creator.address == nft_collection_creator.key()
        });

    if !is_valid_metadata {
        return err!(ErrorCode::VerifiedCreatorMismatch)
    }

    Ok(())
}

pub fn validate(metadata_bump: u8, metadata: &AccountInfo, deposit_nft_mint: &Account<Mint>) -> Result<()> {
    msg!(
        "Received Metadata Pubkey {}",
        metadata.key().to_string()
    );

    let expected_metadata = Pubkey::create_program_address(
        &[
            b"metadata",
            &metadata_program_id.to_bytes(),
            &deposit_nft_mint.key().to_bytes(),
            &[metadata_bump],
        ],
        &metadata_program_id,
    );

    match expected_metadata {
        Ok(expected_metadata) => {
            assert_keys_eq!(metadata.key(), expected_metadata, "metadata");
        }
        Err(_) => {
            return Err(ErrorCode::InvalidMetadata.into());
        }
    }

    Ok(())
}