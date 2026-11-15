import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, X } from 'lucide-react';
import { Container } from './ui';

const navLinks = [
  { to: '/', label: 'Bounties' },
  { to: '/submit', label: 'Submit a claim' },
  { to: '/profile', label: 'Profile' },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex h-full items-center gap-10">
          <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
            VeriBounty
          </Link>

          <nav className="hidden h-full items-center gap-7 md:flex" aria-label="Main">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `inline-flex h-full items-center border-b-2 text-sm transition-colors ${
                    isActive
                      ? 'border-ink font-medium text-ink'
                      : 'border-transparent text-ink-2 hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-3 sm:inline">
            Devnet
          </span>
          <WalletMultiButton />
          <button
            type="button"
            className="-mr-1 p-1 text-ink-2 hover:text-ink md:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-rule md:hidden" aria-label="Main">
          <Container className="flex flex-col py-2">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `py-2.5 text-sm ${isActive ? 'font-medium text-ink' : 'text-ink-2'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </Container>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
