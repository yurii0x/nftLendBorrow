use crate::errors::ErrorCode;
use crate::state::Bid;
use crate::{ Amount, Market, Obligation, Reserve, Rounding };
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ self, Burn, Mint, Token, TokenAccount, Transfer };
use jet_math::Number;
use solana_program::account_info::AccountInfo;

#[event]
pub struct ExecuteLiquidateEvent {
    bid: Pubkey,
    owner: Pubkey
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExecuteLiquidateBidBumps {
    bid: u8,
    bid_escrow: u8,
    bid_escrow_authority: u8,
}

#[derive(Accounts)]
#[instruction(bump: ExecuteLiquidateBidBumps)]
pub struct ExecuteLiquidateBid<'info> {
    /// The relevant market this liquidation is for
    #[account(has_one = market_authority)]
    pub market: AccountLoader<'info, Market>,

    /// The market's authority account
    /// CHECK: market must have a market_authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with debt to be repaid
    #[account(mut, 
        has_one = market, 
        constraint = obligation.load().unwrap().has_loan_custody(&loan_account.key()),
    )]
    pub obligation: AccountLoader<'info, Obligation>,

    #[account(mut,
        has_one = market,
        has_one = vault,
        has_one = loan_note_mint)]
    pub reserve: AccountLoader<'info, Reserve>,

    /// The reserve's vault where the payment will be transferred to
    #[account(mut)]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: Box<Account<'info, Mint>>,

    /// The account that holds the borrower's debt balance
    #[account(mut)]
    pub loan_account: Box<Account<'info, TokenAccount>>,

    // TODO: in the future we should allow people to shore up their collateral with a stable coin based collateral account
    /// The account that holds the borrower's collateral
    // #[account(mut)]
    // pub collateral_account: AccountInfo<'info>,

    #[account(mut,
        seeds = [
            b"bid".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref(),
        ],
        bump,
        has_one = bidder,
        has_one = bid_mint,
        has_one = bid_escrow_authority,
        close = bidder
    )]
    pub bid: Box<Account<'info, Bid>>,

    #[account(mut)]
    /// CHECK: bidder checked against bid
    pub bidder: AccountInfo<'info>,

    #[account(mut,
        constraint = * root_authority.key == crate::ROOT_AUTHORITY)]
    /// CHECK: constraint root authority address
    pub root_authority: AccountInfo<'info>,

    pub bid_mint: Box<Account<'info, Mint>>,

    #[account(mut,
        seeds = [
            b"escrow".as_ref(),
            market.key().as_ref(),
            bidder.key.as_ref()
        ],
        bump)]
    pub bid_escrow: Account<'info, TokenAccount>,

    /// CHECK: bid_escrow_authority checked against bid
    pub bid_escrow_authority: AccountInfo<'info>,

    /// mint of the nft you are liquidating
    pub nft_mint: Box<Account<'info, Mint>>,

    /// The account that stores the nft
    #[account(mut,
            associated_token::mint = nft_mint,
            associated_token::authority = market_authority)]
    pub collateral_account: Box<Account<'info, TokenAccount>>,

    /// The account that will receive a portion of the borrower's collateral
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = bidder
    )]
    pub receiver_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = bid_mint,
        associated_token::authority = payer
    )]
    pub liquidation_fee_receiver: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = bid_mint,
        associated_token::authority = root_authority
    )]
    pub leftovers_receiver: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ExecuteLiquidateBid<'info> {
    fn note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Burn {
            from: self.loan_account.to_account_info(),
            mint: self.loan_note_mint.to_account_info(),
            authority: self.market_authority.clone(),
        })
    }

    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Transfer {
            from: self.bid_escrow.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.bid_escrow_authority.clone(),
        })
    }

    fn liquidation_fee_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Transfer {
            from: self.bid_escrow.to_account_info(),
            to: self.liquidation_fee_receiver.as_ref().to_account_info(),
            authority: self.bid_escrow_authority.clone(),
        })
    }

    fn leftovers_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Transfer {
            from: self.bid_escrow.to_account_info(),
            to: self.leftovers_receiver.as_ref().to_account_info(),
            authority: self.bid_escrow_authority.clone(),
        })        
    }

    fn transfer_nft_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info().clone(), Transfer {
            from: self.collateral_account.to_account_info(),
            to: self.receiver_account.to_account_info(),
            authority: self.market_authority.clone(),
        })
    }
}

pub fn handler(ctx: Context<ExecuteLiquidateBid>, _bump: ExecuteLiquidateBidBumps) -> Result<()> {
    execute_liquidation(ctx.accounts)?;

    Ok(())
}

fn execute_liquidation(accounts: &mut ExecuteLiquidateBid) -> Result<()> {
    // 0. Gather the needed data
    msg!("Gathering data");
    let market = accounts.market.load()?;
    let mut reserve = accounts.reserve.load_mut()?;
    let mut obligation = accounts.obligation.load_mut()?;
    let clock = Clock::get().unwrap();
    let bid = accounts.bid.as_ref();

    let market_reserves = market.reserves();
    let market_oracle = market.market_oracle();
    obligation.cache_calculations(market.reserves(), clock.slot, market_oracle);

    // preliquidation checks
    if reserve.token_mint != bid.bid_mint {
        return Err(ErrorCode::BidMintMismatch.into());
    }

    // 1. Verify the obligation is unhealthy
    if obligation.is_healthy(market_reserves, clock.slot) {
        return Err(ErrorCode::ObligationHealthy.into());
    }

    msg!("Determining the amount of collateral");
    // 3. Determine the amount of collateral to be liquidated
    let loan_account = &accounts.loan_account;
    let reserve_info = market_reserves.get_cached(reserve.index, clock.slot);
    let override_authority = accounts.payer.key.key() == crate::ROOT_AUTHORITY;
    let bid_limit = token::accessor::amount(&accounts.bid_escrow.to_account_info())?;
    let payoff_notes = token::accessor::amount(&loan_account.to_account_info())?;
    let payoff_tokens = std::cmp::min(
        reserve_info.loan_notes_to_tokens(payoff_notes, Rounding::Up),
        reserve.unwrap_outstanding_debt(clock.slot).as_u64(0)
    );

    if payoff_notes == 0 {
        return Err(ErrorCode::InvalidParameter.into());
    }
    if bid_limit < payoff_tokens && !override_authority {
        return Err(ErrorCode::LiquidationLowCollateral.into());
    }
    msg!("Burning");
    // 4. Burn the debt that's being repaid
    token::burn(
        accounts.note_burn_context().with_signer(&[&market.authority_seeds()]),
        payoff_notes
    )?;

    msg!("Transfering");
    // 5. Transfer the payment tokens to the reserve's vault
    token::transfer(
        accounts.transfer_context().with_signer(&[&bid.authority_seeds()]),
        payoff_tokens
    )?;

    // Pay the liquidator a small bonus for their efforts
    let liquidation_fee = Number::from_bps(reserve.config.liquidation_premium);
    let leftovers = bid.bid_limit - payoff_tokens;
    let liquidation_fee_tokens = leftovers * liquidation_fee.as_u64(0);
    token::transfer(
        accounts.liquidation_fee_transfer_context().with_signer(&[&bid.authority_seeds()]),
        liquidation_fee_tokens
    )?;

    // 6. Send the rest of the collateral to the original nft owner
    let leftovers_after_fees = leftovers - liquidation_fee_tokens;
    token::transfer(
        accounts.leftovers_transfer_context().with_signer(&[&bid.authority_seeds()]),
        leftovers_after_fees
    )?;

    // 7. remove the NFT from the obligation
    obligation.unregister_nft(accounts.nft_mint.key())?;

    // 8. send the NFT to the bidder's new account
    token::transfer(accounts.transfer_nft_context().with_signer(&[&market.authority_seeds()]), 1)?;

    // 9. Keep the reserve's borrow tracking updated
    reserve.repay(clock.slot, payoff_tokens, payoff_notes);

    // 10. record the repayment in the obligation which is used to determine the obligation's health
    obligation.repay(&loan_account.key(), reserve.amount(payoff_notes))?;

    // close the liquidator bid account
    // accounts.bid.close()?;
    obligation.cache_calculations(market.reserves(), clock.slot, market_oracle);
    if !obligation.is_healthy(market_reserves, clock.slot) {
        return Err(ErrorCode::ObligationUnhealthy.into());
    }

    emit!(ExecuteLiquidateEvent {
        bid: accounts.bid.key(),
        owner: obligation.owner.key()
    });

    Ok(())
}