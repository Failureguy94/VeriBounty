import { useMemo, FC, ReactNode, ComponentType } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { DEVNET_ENDPOINT } from '../lib/anchorClient';

// Default styles for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

/** Resolves React 18/19 JSX typing mismatch with wallet-adapter `FC` return types. */
const DevnetConnectionProvider = ConnectionProvider as ComponentType<{
  endpoint: string;
  children?: ReactNode;
}>;

const SolanaWalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => DEVNET_ENDPOINT, []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <DevnetConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </DevnetConnectionProvider>
  );
};

export default SolanaWalletProvider;
