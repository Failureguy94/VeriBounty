import { Link } from 'react-router-dom';
import { Shield, Github, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-border/50 bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center">
              <Shield size={13} className="text-background" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">
              <span className="gradient-text">Veri</span>
              <span className="text-textPrimary">Bounty</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-textSecondary">
            <Link to="/" className="hover:text-primary transition-colors">Browse</Link>
            <Link to="/submit" className="hover:text-primary transition-colors">Submit</Link>
            <Link to="/profile" className="hover:text-primary transition-colors">Profile</Link>
            <span className="text-border">|</span>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <Github size={14} /> GitHub
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <Twitter size={14} /> Twitter
            </a>
          </div>

          {/* Network */}
          <div className="flex items-center gap-2 text-xs text-textSecondary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Solana Devnet
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/30 text-center text-xs text-textSecondary/60">
          © 2025 VeriBounty. Built on Solana. All bounties are managed by smart contracts.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
