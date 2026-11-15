#!/bin/bash
# VeriBounty Devnet Deployment / Upgrade Script
# Run from the repo root: bash deploy.sh
#
# Builds the program, upgrades it in place on devnet (same program ID), and
# copies the fresh IDL into the frontend.

set -euo pipefail

PROGRAM_ID="36aWnuK3fcbHBXhuSDZcEwgnZhgcQKdB9Drgkj8twUMW"
KEYPAIR="$HOME/.config/solana/id.json"
PROGRAM_KEYPAIR="target/deploy/veri_bounty-keypair.json"
SO="target/deploy/veri_bounty.so"
URL="devnet"

echo "═══════════════════════════════════════════"
echo "  VeriBounty – Solana Devnet Deployment"
echo "═══════════════════════════════════════════"

# 1. Wallet (must be the program's upgrade authority for upgrades)
if [ ! -f "$KEYPAIR" ]; then
  echo "❌ No wallet at $KEYPAIR. Create one with: solana-keygen new -o $KEYPAIR"
  exit 1
fi
solana config set --url "$URL" --keypair "$KEYPAIR" > /dev/null
echo "📍 Wallet:  $(solana-keygen pubkey "$KEYPAIR")"
echo "💰 Balance: $(solana balance)"

# 2. Always rebuild so the deployed binary matches the source
echo ""
echo "🔨 Building program..."
anchor build --no-idl
# Anchor 0.30.1 builds the IDL with the default `nightly`, whose proc_macro no
# longer has `SourceFile`. Use the repo's pinned toolchain with nightly features.
echo "📄 Building IDL..."
(cd programs/veri_bounty && RUSTUP_TOOLCHAIN=1.79.0 RUSTC_BOOTSTRAP=1 \
  anchor idl build -o ../../target/idl/veri_bounty.json -t ../../target/types/veri_bounty.ts)

if [ "$(solana-keygen pubkey "$PROGRAM_KEYPAIR")" != "$PROGRAM_ID" ]; then
  echo "❌ $PROGRAM_KEYPAIR does not match $PROGRAM_ID"
  exit 1
fi

SO_SIZE=$(stat -c %s "$SO")

# 3. Balance check: deploying writes the binary to a temporary buffer account
#    whose rent is refunded afterwards, so we need roughly rent(SO_SIZE) plus
#    margin for fees and a possible (non-refundable) program extend.
NEEDED_SOL=$(solana rent "$SO_SIZE" --output json | python3 -c 'import json,sys; print(round(json.load(sys.stdin)["rentExemptMinimumLamports"]/1e9 * 1.2 + 0.05, 3))')
BALANCE_SOL=$(solana balance | awk '{print $1}')
if python3 -c "import sys; sys.exit(0 if $BALANCE_SOL >= $NEEDED_SOL else 1)"; then
  echo "✅ Balance OK (need ~${NEEDED_SOL} SOL)"
else
  echo "❌ Need ~${NEEDED_SOL} SOL, have ${BALANCE_SOL} SOL."
  echo "   Get devnet SOL at https://faucet.solana.com and re-run."
  exit 1
fi

# 4. If this is an upgrade and the new binary is larger, extend the program first
if solana program show "$PROGRAM_ID" > /dev/null 2>&1; then
  CURRENT_LEN=$(solana program show "$PROGRAM_ID" --output json | python3 -c 'import json,sys; print(json.load(sys.stdin)["dataLen"])')
  if [ "$SO_SIZE" -gt "$CURRENT_LEN" ]; then
    EXTRA=$((SO_SIZE - CURRENT_LEN))
    echo "📏 Extending program data by $EXTRA bytes..."
    solana program extend "$PROGRAM_ID" "$EXTRA"
  fi
fi

# 5. Deploy / upgrade
echo ""
echo "🚀 Deploying to Devnet..."
solana program deploy --program-id "$PROGRAM_KEYPAIR" "$SO"

# 6. Ship the IDL to the frontend
cp target/idl/veri_bounty.json app/src/lib/veri_bounty_idl.json
echo "📄 Copied IDL → app/src/lib/veri_bounty_idl.json"

echo ""
echo "✅ Program deployed!"
echo "   Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
