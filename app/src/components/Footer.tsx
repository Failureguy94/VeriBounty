import { Container } from './ui';
import { PROGRAM_ID } from '../lib/anchorClient';
import { explorerUrl } from '../lib/format';

const Footer = () => (
  <footer className="mt-auto border-t border-rule">
    <Container className="flex flex-col gap-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-serif font-semibold text-ink">VeriBounty</span>
        <span className="mx-2" aria-hidden="true">·</span>
        Fact-checking bounties on Solana devnet. Stakes are held in escrow by an on-chain program.
      </p>
      <nav className="flex gap-5" aria-label="Footer">
        <a
          href={explorerUrl('address', PROGRAM_ID.toBase58())}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink"
        >
          Program
        </a>
        <a
          href="https://github.com/Failureguy94/VeriBounty"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink"
        >
          Source
        </a>
      </nav>
    </Container>
  </footer>
);

export default Footer;
