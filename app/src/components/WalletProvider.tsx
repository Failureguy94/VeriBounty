import { useMemo, FC, ReactNode, ComponentType } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

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
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

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
