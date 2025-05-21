use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::CachedReserveInfo;

/// Specifies the units of some amount of value
#[derive(AnchorDeserialize, AnchorSerialize, Eq, PartialEq, Debug, Clone, Copy)]
pub enum AmountUnits {
    Tokens,
    DepositNotes,
    LoanNotes,
}

/// Represent an amount of some value (like tokens, or notes)
#[derive(AnchorDeserialize, AnchorSerialize, Eq, PartialEq, Debug, Clone, Copy)]
pub struct Amount {
    pub units: AmountUnits,
    pub value: u64,
}

/// Specifies rounding integers up or down
pub enum Rounding {
    Up,
    Down,
}

impl Amount {
    /// Get the amount represented in tokens
    pub fn as_tokens(&self, reserve_info: &CachedReserveInfo, rounding: Rounding) -> u64 {
        match self.units {
            AmountUnits::Tokens => self.value,
            AmountUnits::DepositNotes => reserve_info.deposit_notes_to_tokens(self.value, rounding),
            AmountUnits::LoanNotes => reserve_info.loan_notes_to_tokens(self.value, rounding),
        }
    }

    /// Get the amount represented in deposit notes
    pub fn as_deposit_notes(
        &self,
        reserve_info: &CachedReserveInfo,
        rounding: Rounding,
    ) -> Result<u64> {
        match self.units {
            AmountUnits::Tokens => Ok(reserve_info.deposit_notes_from_tokens(self.value, rounding)),
            AmountUnits::DepositNotes => Ok(self.value),
            AmountUnits::LoanNotes => err!(ErrorCode::InvalidAmountUnits),
        }
    }

    /// Get the amount represented in loan notes
    pub fn as_loan_notes(
        &self,
        reserve_info: &CachedReserveInfo,
        rounding: Rounding,
    ) -> Result<u64> {
        match self.units {
            AmountUnits::Tokens => Ok(reserve_info.loan_notes_from_tokens(self.value, rounding)),
            AmountUnits::LoanNotes => Ok(self.value),
            AmountUnits::DepositNotes => err!(ErrorCode::InvalidAmountUnits),
        }
    }

    pub fn from_tokens(value: u64) -> Amount {
        Amount {
            units: AmountUnits::Tokens,
            value,
        }
    }

    pub fn from_deposit_notes(value: u64) -> Amount {
        Amount {
            units: AmountUnits::DepositNotes,
            value,
        }
    }

    pub fn from_loan_notes(value: u64) -> Amount {
        Amount {
            units: AmountUnits::LoanNotes,
            value,
        }
    }
}
