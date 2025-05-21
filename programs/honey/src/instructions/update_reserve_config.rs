use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateReserveConfig<'info> {
    #[account(has_one = owner)]
    pub market: AccountLoader<'info, Market>,

    #[account(mut, has_one = market)]
    pub reserve: AccountLoader<'info, Reserve>,

    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateReserveConfig>, new_config: ReserveConfig) -> Result<()> {
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    reserve.config = new_config;
    Ok(())
}
