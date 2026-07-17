import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VeriBounty } from "../target/types/veri_bounty";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";

describe("veri_bounty", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VeriBounty as Program<VeriBounty>;

  // Load the resolver keypair
  const resolverKeypairRaw = JSON.parse(fs.readFileSync("./tests/resolver.json", "utf-8"));
  const resolver = Keypair.fromSecretKey(Uint8Array.from(resolverKeypairRaw));

  // Keypairs for testing
  const submitter = Keypair.generate();
  const factChecker = Keypair.generate();
  const unauthorizedUser = Keypair.generate();

  // PDA seeds constant
  const SEED_BOUNTY = Buffer.from("bounty");
  const SEED_ESCROW_VAULT = Buffer.from("escrow_vault");
  const SEED_REPUTATION = Buffer.from("reputation");

  before(async () => {
    // Airdrop SOL to test accounts
    const signature1 = await provider.connection.requestAirdrop(submitter.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature1, "confirmed");

    const signature2 = await provider.connection.requestAirdrop(factChecker.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature2, "confirmed");

    const signature3 = await provider.connection.requestAirdrop(resolver.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature3, "confirmed");

    const signature4 = await provider.connection.requestAirdrop(unauthorizedUser.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature4, "confirmed");
  });

  // Helper to derive PDA keys
  const getBountyPda = (submitterPubkey: PublicKey, bountyId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [SEED_BOUNTY, submitterPubkey.toBuffer(), bountyId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  };

  const getEscrowVaultPda = (bountyPda: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [SEED_ESCROW_VAULT, bountyPda.toBuffer()],
      program.programId
    );
  };

  const getReputationPda = (factCheckerPubkey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [SEED_REPUTATION, factCheckerPubkey.toBuffer()],
      program.programId
    );
  };

  it("Should create a bounty successfully", async () => {
    const bountyId = new anchor.BN(Date.now());
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    // Verify bounty account state
    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(bountyAccount.submitter.toBase58()).to.equal(submitter.publicKey.toBase58());
    expect(bountyAccount.bountyId.toString()).to.equal(bountyId.toString());
    expect(bountyAccount.stakeLamports.toString()).to.equal(stakeAmount.toString());
    expect(bountyAccount.factChecker.toBase58()).to.equal(PublicKey.default.toBase58());
    expect(bountyAccount.submittedVerdict).to.be.null;
    expect(JSON.stringify(bountyAccount.status)).to.contain("open");
    expect(bountyAccount.resolution).to.be.null;

    // Verify vault balance
    const vaultBalance = await provider.connection.getBalance(escrowVaultPda);
    expect(vaultBalance).to.equal(stakeAmount.toNumber());
  });

  it("Should not allow a submitter to claim their own bounty", async () => {
    const bountyId = new anchor.BN(Date.now() + 1);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    try {
      await program.methods
        .claimBounty()
        .accounts({
          factChecker: submitter.publicKey,
          bounty: bountyPda,
        })
        .signers([submitter])
        .rpc();
      expect.fail("Should have failed with CannotClaimOwnBounty");
    } catch (err: any) {
      expect(err.message).to.contain("CannotClaimOwnBounty");
    }
  });

  it("Should claim a bounty successfully", async () => {
    const bountyId = new anchor.BN(Date.now() + 2);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(bountyAccount.factChecker.toBase58()).to.equal(factChecker.publicKey.toBase58());
    expect(JSON.stringify(bountyAccount.status)).to.contain("claimed");
  });

  it("Should not allow unauthorized users to submit verdict", async () => {
    const bountyId = new anchor.BN(Date.now() + 3);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    try {
      await program.methods
        .submitVerdict(true, "ipfs://evidencehash")
        .accounts({
          factChecker: unauthorizedUser.publicKey,
          bounty: bountyPda,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect.fail("Should have failed with UnauthorizedClaimant");
    } catch (err: any) {
      expect(err.message).to.contain("UnauthorizedClaimant");
    }
  });

  it("Should submit a verdict successfully", async () => {
    const bountyId = new anchor.BN(Date.now() + 4);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const evidenceHash = "ipfs://QmSomeEvidenceHashHashHash1234567890";
    await program.methods
      .submitVerdict(true, evidenceHash)
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(bountyAccount.submittedVerdict).to.be.true;
    expect(bountyAccount.evidenceIpfsHash).to.equal(evidenceHash);
    expect(JSON.stringify(bountyAccount.status)).to.contain("verdictSubmitted");
  });

  it("Should fail if a non-resolver tries to resolve the bounty", async () => {
    const bountyId = new anchor.BN(Date.now() + 5);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    await program.methods
      .submitVerdict(true, "ipfs://evidencehash")
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const [reputationPda] = getReputationPda(factChecker.publicKey);

    try {
      await program.methods
        .resolveBounty({ accepted: {} })
        .accounts({
          resolver: unauthorizedUser.publicKey,
          bounty: bountyPda,
          escrowVault: escrowVaultPda,
          submitter: submitter.publicKey,
          factChecker: factChecker.publicKey,
          reputation: reputationPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect.fail("Should have failed with UnauthorizedResolver or address constraint");
    } catch (err: any) {
      expect(err.message).to.satisfy((msg: string) => 
        msg.includes("An address constraint was violated") || 
        msg.includes("UnauthorizedResolver")
      );
    }
  });

  it("Should resolve bounty as Accepted successfully (payout to fact-checker & increment reputation)", async () => {
    const bountyId = new anchor.BN(Date.now() + 6);
    const stakeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    await program.methods
      .submitVerdict(true, "ipfs://evidencehash")
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const [reputationPda] = getReputationPda(factChecker.publicKey);

    const initialFactCheckerBalance = await provider.connection.getBalance(factChecker.publicKey);

    // Resolve as Accepted
    await program.methods
      .resolveBounty({ accepted: {} })
      .accounts({
        resolver: resolver.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        submitter: submitter.publicKey,
        factChecker: factChecker.publicKey,
        reputation: reputationPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([resolver])
      .rpc();

    // Verify status and resolution
    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(JSON.stringify(bountyAccount.status)).to.contain("resolved");
    expect(JSON.stringify(bountyAccount.resolution)).to.contain("accepted");

    // Verify vault balance is now 0
    const vaultBalance = await provider.connection.getBalance(escrowVaultPda);
    expect(vaultBalance).to.equal(0);

    // Verify fact-checker received the payout
    const finalFactCheckerBalance = await provider.connection.getBalance(factChecker.publicKey);
    expect(finalFactCheckerBalance).to.be.greaterThan(initialFactCheckerBalance);

    // Verify reputation account score
    const reputationAccount = await program.account.userReputation.fetch(reputationPda);
    expect(reputationAccount.wallet.toBase58()).to.equal(factChecker.publicKey.toBase58());
    expect(reputationAccount.score.toNumber()).to.equal(1);
  });

  it("Should resolve bounty as Rejected successfully (payout back to submitter)", async () => {
    const bountyId = new anchor.BN(Date.now() + 7);
    const stakeAmount = new anchor.BN(1.5 * LAMPORTS_PER_SOL);

    const [bountyPda] = getBountyPda(submitter.publicKey, bountyId);
    const [escrowVaultPda] = getEscrowVaultPda(bountyPda);

    await program.methods
      .createBounty(bountyId, stakeAmount)
      .accounts({
        submitter: submitter.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter])
      .rpc();

    await program.methods
      .claimBounty()
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    await program.methods
      .submitVerdict(false, "ipfs://evidencehash")
      .accounts({
        factChecker: factChecker.publicKey,
        bounty: bountyPda,
      })
      .signers([factChecker])
      .rpc();

    const [reputationPda] = getReputationPda(factChecker.publicKey);

    const initialSubmitterBalance = await provider.connection.getBalance(submitter.publicKey);

    // Resolve as Rejected
    await program.methods
      .resolveBounty({ rejected: {} })
      .accounts({
        resolver: resolver.publicKey,
        bounty: bountyPda,
        escrowVault: escrowVaultPda,
        submitter: submitter.publicKey,
        factChecker: factChecker.publicKey,
        reputation: reputationPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([resolver])
      .rpc();

    // Verify status and resolution
    const bountyAccount = await program.account.bounty.fetch(bountyPda);
    expect(JSON.stringify(bountyAccount.status)).to.contain("resolved");
    expect(JSON.stringify(bountyAccount.resolution)).to.contain("rejected");

    // Verify vault balance is now 0
    const vaultBalance = await provider.connection.getBalance(escrowVaultPda);
    expect(vaultBalance).to.equal(0);

    // Verify submitter received their SOL back
    const finalSubmitterBalance = await provider.connection.getBalance(submitter.publicKey);
    expect(finalSubmitterBalance).to.be.greaterThan(initialSubmitterBalance);
  });
});
