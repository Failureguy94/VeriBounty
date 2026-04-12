import { Link, NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Browse Bounties' },
    { to: '/submit', label: 'Submit Claim' },
    { to: '/profile', label: 'My Profile' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-glow-gold group-hover:shadow-glow-gold transition-all duration-200">
              <Shield size={16} className="text-background" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight">
              <span className="gradient-text">Veri</span>
              <span className="text-textPrimary">Bounty</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-surfaceLight text-primary'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceLight/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Wallet + Mobile menu */}
          <div className="flex items-center gap-3">
            <WalletMultiButton />
            <button
              className="md:hidden text-textSecondary hover:text-textPrimary p-1.5"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-border/50 py-3 space-y-1 animate-fadeIn">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-surfaceLight text-primary'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceLight/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
