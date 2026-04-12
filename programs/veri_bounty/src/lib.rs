use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_lang::system_program;

declare_id!("8xmwE6esqnwxKMGrdszEiBEKnA6PjZNSsh6ByKZxC8Za");

const SEED_BOUNTY: &[u8] = b"bounty";
const SEED_ESCROW_VAULT: &[u8] = b"escrow_vault";
const SEED_REPUTATION: &[u8] = b"reputation";

pub const MAX_EVIDENCE_IPFS_HASH_LEN: usize = 128;

// Replace with your DAO / trusted resolver wallet before deployment.
pub const TRUSTED_RESOLVER: Pubkey = pubkey!("3GkUrSgQpdSFVg7xmc5Zfe6SDQV61GE757VKCMfZ4K48");

#[program]
pub mod veri_bounty {
    use super::*;

    pub fn create_bounty(ctx: Context<CreateBounty>, bounty_id: u64, stake_lamports: u64) -> Result<()> {
        require_gt!(stake_lamports, 0, ErrorCode::InvalidStakeAmount);

        let submitter_key = ctx.accounts.submitter.key();
        let bounty_key = ctx.accounts.bounty.key();

        let bounty = &mut ctx.accounts.bounty;
        bounty.submitter = submitter_key;
        bounty.bounty_id = bounty_id;
        bounty.stake_lamports = stake_lamports;
        bounty.fact_checker = Pubkey::default();
        bounty.submitted_verdict = None;
        bounty.status = BountyStatus::Open;
        bounty.resolution = None;
        bounty.evidence_ipfs_hash = String::new();
        bounty.bump = ctx.bumps.bounty;
        bounty.vault_bump = ctx.bumps.escrow_vault;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.submitter.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            ),
            stake_lamports,
        )?;

        emit!(BountyCreated {
            bounty: bounty_key,
            submitter: submitter_key,
            bounty_id,
            stake_lamports,
        });

        Ok(())
    }

    pub fn claim_bounty(ctx: Context<ClaimBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);
        require_keys_neq!(
            ctx.accounts.fact_checker.key(),
            bounty.submitter,
            ErrorCode::CannotClaimOwnBounty
        );

        bounty.fact_checker = ctx.accounts.fact_checker.key();
        bounty.status = BountyStatus::Claimed;

        emit!(BountyClaimed {
            bounty: bounty.key(),
            fact_checker: bounty.fact_checker,
        });

        Ok(())
    }

    pub fn submit_verdict(
        ctx: Context<SubmitVerdict>,
        verdict: bool,
        evidence_ipfs_hash: String,
    ) -> Result<()> {
        require!(
            evidence_ipfs_hash.len() <= MAX_EVIDENCE_IPFS_HASH_LEN,
            ErrorCode::EvidenceHashTooLong
        );

        let bounty = &mut ctx.accounts.bounty;
        require!(
            bounty.status == BountyStatus::Claimed,
            ErrorCode::BountyNotClaimed
        );
        require_keys_eq!(
            ctx.accounts.fact_checker.key(),
            bounty.fact_checker,
            ErrorCode::UnauthorizedClaimant
        );

        bounty.submitted_verdict = Some(verdict);
        bounty.evidence_ipfs_hash = evidence_ipfs_hash.clone();
        bounty.status = BountyStatus::VerdictSubmitted;

        emit!(VerdictSubmitted {
            bounty: bounty.key(),
            fact_checker: bounty.fact_checker,
            verdict,
            evidence_ipfs_hash,
        });

        Ok(())
    }

    pub fn resolve_bounty(ctx: Context<ResolveBounty>, resolution: Resolution) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;

        require!(
            bounty.status == BountyStatus::VerdictSubmitted,
            ErrorCode::BountyNotReadyForResolution
        );

        let payout_lamports = bounty.stake_lamports;
        require_gte!(
            ctx.accounts.escrow_vault.to_account_info().lamports(),
            payout_lamports,
            ErrorCode::InsufficientEscrowBalance
        );

        match resolution {
            Resolution::Accepted => {
                transfer_from_escrow(
                    ctx.accounts.escrow_vault.to_account_info(),
                    ctx.accounts.fact_checker.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    payout_lamports,
                    &bounty.key(),
                    bounty.vault_bump,
                )?;

                upsert_reputation(
                    ctx.program_id,
                    &ctx.accounts.resolver,
                    &ctx.accounts.fact_checker.key(),
                    &ctx.accounts.reputation.to_account_info(),
                    &ctx.accounts.system_program,
                )?;
            }
            Resolution::Rejected => {
                transfer_from_escrow(
                    ctx.accounts.escrow_vault.to_account_info(),
                    ctx.accounts.submitter.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    payout_lamports,
                    &bounty.key(),
                    bounty.vault_bump,
                )?;
            }
        }

        // Return any vault rent dust to the original submitter.
        let vault_balance = ctx.accounts.escrow_vault.to_account_info().lamports();
        if vault_balance > 0 {
            transfer_from_escrow(
                ctx.accounts.escrow_vault.to_account_info(),
                ctx.accounts.submitter.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                vault_balance,
                &bounty.key(),
                bounty.vault_bump,
            )?;
        }

        bounty.status = BountyStatus::Resolved;
        bounty.resolution = Some(resolution);

        emit!(BountyResolved {
            bounty: bounty.key(),
            resolver: ctx.accounts.resolver.key(),
            resolution,
            payout_lamports,
            fact_checker: bounty.fact_checker,
            submitter: bounty.submitter,
        });

        Ok(())
    }
}

fn transfer_from_escrow<'info>(
    escrow_vault: AccountInfo<'info>,
    recipient: AccountInfo<'info>,
    system_program_ai: AccountInfo<'info>,
    lamports: u64,
    bounty_key: &Pubkey,
    vault_bump: u8,
) -> Result<()> {
    if lamports == 0 {
        return Ok(());
    }

    let signer_seeds: [&[u8]; 3] = [SEED_ESCROW_VAULT, bounty_key.as_ref(), &[vault_bump]];
    invoke_signed(
        &system_instruction::transfer(escrow_vault.key, recipient.key, lamports),
        &[escrow_vault, recipient, system_program_ai],
        &[&signer_seeds],
    )?;

    Ok(())
}

fn upsert_reputation<'info>(
    program_id: &Pubkey,
    payer: &Signer<'info>,
    fact_checker: &Pubkey,
    reputation_ai: &AccountInfo<'info>,
    system_program_program: &Program<'info, System>,
) -> Result<()> {
    let (expected_pda, bump) = Pubkey::find_program_address(
        &[SEED_REPUTATION, fact_checker.as_ref()],
        program_id,
    );
    require_keys_eq!(expected_pda, reputation_ai.key(), ErrorCode::InvalidReputationPda);

    let space = 8 + UserReputation::INIT_SPACE;
    let needs_init = reputation_ai.owner == &system_program::ID && reputation_ai.data_len() == 0;

    if needs_init {
        let rent_lamports = Rent::get()?.minimum_balance(space);
        invoke_signed(
            &system_instruction::create_account(
                &payer.key(),
                reputation_ai.key,
                rent_lamports,
                space as u64,
                program_id,
            ),
            &[
                payer.to_account_info(),
                reputation_ai.clone(),
                system_program_program.to_account_info(),
            ],
            &[&[SEED_REPUTATION, fact_checker.as_ref(), &[bump]]],
        )?;

        let reputation = UserReputation {
            wallet: *fact_checker,
            score: 1,
            bump,
        };
        let mut rep_data = reputation_ai.try_borrow_mut_data()?;
        reputation.try_serialize(&mut &mut rep_data[..])?;
        return Ok(());
    }

    require_keys_eq!(
        *reputation_ai.owner,
        *program_id,
        ErrorCode::ReputationAccountInvalid
    );

    let mut rep_data = reputation_ai.try_borrow_mut_data()?;
    let mut rep_slice: &[u8] = &rep_data;
    let mut reputation = UserReputation::try_deserialize(&mut rep_slice)
        .map_err(|_| error!(ErrorCode::ReputationAccountInvalid))?;

    require_keys_eq!(
        reputation.wallet,
        *fact_checker,
        ErrorCode::ReputationAccountInvalid
    );

    reputation.score = reputation
        .score
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    reputation.bump = bump;
    reputation.try_serialize(&mut &mut rep_data[..])?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub submitter: Signer<'info>,
    #[account(
        init,
        payer = submitter,
        space = 8 + Bounty::INIT_SPACE,
        seeds = [SEED_BOUNTY, submitter.key().as_ref(), bounty_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,
    /// CHECK: System-owned vault PDA; created by Anchor `init` in this context.
    #[account(
        init,
        payer = submitter,
        space = 0,
        owner = system_program::ID,
        seeds = [SEED_ESCROW_VAULT, bounty.key().as_ref()],
        bump
    )]
    pub escrow_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimBounty<'info> {
    pub fact_checker: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_BOUNTY, bounty.submitter.as_ref(), bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct SubmitVerdict<'info> {
    pub fact_checker: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_BOUNTY, bounty.submitter.as_ref(), bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump,
        constraint = bounty.fact_checker == fact_checker.key() @ ErrorCode::UnauthorizedClaimant
    )]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct ResolveBounty<'info> {
    #[account(mut, address = TRUSTED_RESOLVER @ ErrorCode::UnauthorizedResolver)]
    pub resolver: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_BOUNTY, bounty.submitter.as_ref(), bounty.bounty_id.to_le_bytes().as_ref()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        mut,
        seeds = [SEED_ESCROW_VAULT, bounty.key().as_ref()],
        bump = bounty.vault_bump
    )]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut, address = bounty.submitter @ ErrorCode::InvalidSubmitterAccount)]
    pub submitter: SystemAccount<'info>,
    #[account(mut, address = bounty.fact_checker @ ErrorCode::InvalidFactCheckerAccount)]
    pub fact_checker: SystemAccount<'info>,
    /// CHECK: PDA at seeds ["reputation", fact_checker], created/updated in-program.
    #[account(mut)]
    pub reputation: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Bounty {
    pub submitter: Pubkey,
    pub bounty_id: u64,
    pub stake_lamports: u64,
    pub fact_checker: Pubkey,
    pub submitted_verdict: Option<bool>,
    #[max_len(MAX_EVIDENCE_IPFS_HASH_LEN)]
    pub evidence_ipfs_hash: String,
    pub status: BountyStatus,
    pub resolution: Option<Resolution>,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserReputation {
    pub wallet: Pubkey,
    pub score: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BountyStatus {
    Open,
    Claimed,
    VerdictSubmitted,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Resolution {
    Accepted,
    Rejected,
}

#[event]
pub struct BountyCreated {
    pub bounty: Pubkey,
    pub submitter: Pubkey,
    pub bounty_id: u64,
    pub stake_lamports: u64,
}

#[event]
pub struct BountyClaimed {
    pub bounty: Pubkey,
    pub fact_checker: Pubkey,
}

#[event]
pub struct VerdictSubmitted {
    pub bounty: Pubkey,
    pub fact_checker: Pubkey,
    pub verdict: bool,
    pub evidence_ipfs_hash: String,
}

#[event]
pub struct BountyResolved {
    pub bounty: Pubkey,
    pub resolver: Pubkey,
    pub resolution: Resolution,
    pub payout_lamports: u64,
    pub fact_checker: Pubkey,
    pub submitter: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stake amount must be greater than zero")]
    InvalidStakeAmount,
    #[msg("Bounty is not open for claiming")]
    BountyNotOpen,
    #[msg("Submitter cannot claim their own bounty")]
    CannotClaimOwnBounty,
    #[msg("Bounty must be claimed before verdict submission")]
    BountyNotClaimed,
    #[msg("Only the claiming fact-checker can submit the verdict")]
    UnauthorizedClaimant,
    #[msg("Evidence IPFS hash exceeds maximum length")]
    EvidenceHashTooLong,
    #[msg("Bounty is not ready for resolution")]
    BountyNotReadyForResolution,
    #[msg("Only the trusted resolver can resolve bounties")]
    UnauthorizedResolver,
    #[msg("Escrow vault does not hold enough lamports")]
    InsufficientEscrowBalance,
    #[msg("Submitter account does not match bounty submitter")]
    InvalidSubmitterAccount,
    #[msg("Fact-checker account does not match bounty claimant")]
    InvalidFactCheckerAccount,
    #[msg("Invalid reputation PDA for fact-checker")]
    InvalidReputationPda,
    #[msg("Invalid or corrupted reputation account")]
    ReputationAccountInvalid,
    #[msg("Math overflow")]
    MathOverflow,
}
