import React, { useState, useEffect } from 'react';
import { createWeb3Modal, defaultWagmiConfig, useWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiConfig, useAccount, useSignMessage } from 'wagmi';
import { arbitrum, mainnet, polygon } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2 as Loader } from 'lucide-react';

// 1. Get projectId from https://cloud.walletconnect.com
// FIX: Explicitly type `projectId` as a string to resolve a TypeScript comparison error.
const projectId: string = 'f340171a355aad487eb6daa39b4b6c10';

// 2. Create wagmiConfig
const metadata = {
  name: 'Web3 Auto-Signer',
  description: 'A dApp demonstrating WalletConnect v2, Wagmi, and automatic signing.',
  url: 'https://web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const chains = [mainnet, polygon, arbitrum];
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// 3. Create modal
createWeb3Modal({ wagmiConfig, projectId, chains });

// 4. Create QueryClient
const queryClient = new QueryClient();

// Main App Component
function App() {
  // Show instructions if the projectId hasn't been set.
  if (projectId === 'YOUR_PROJECT_ID' || !projectId) {
    return <MissingProjectIdView />;
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletDapp />
      </QueryClientProvider>
    </WagmiConfig>
  );
}

// Component to display when projectId is missing
function MissingProjectIdView() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-2xl bg-red-900/20 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/50 p-6 md:p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-red-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-red-400">Configuration Required</h1>
        <p className="text-red-300 mt-2 text-lg">
          You need to provide a WalletConnect <span className="font-bold">Project ID</span> to continue.
        </p>
        <div className="text-left bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <p className="text-gray-300">Follow these steps:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Go to <a href="https://cloud.walletconnect.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">cloud.walletconnect.com</a> and sign in.</li>
            <li>Create a new project for your dApp.</li>
            <li>Find and copy your unique Project ID.</li>
            <li>Open the <code className="bg-gray-700 text-cyan-300 px-2 py-1 rounded">App.tsx</code> file in your editor.</li>
            <li>Replace the placeholder <code className="bg-gray-700 text-cyan-300 px-2 py-1 rounded">'YOUR_PROJECT_ID'</code> with your actual Project ID.</li>
          </ol>
        </div>
        <p className="text-gray-500 text-sm pt-4">Once you've updated the Project ID, this message will disappear and the app will be ready to use.</p>
      </div>
    </div>
  );
}

// Helper component to render UI and use hooks.
function WalletDapp() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  
  const [hasAttemptedSign, setHasAttemptedSign] = useState(false);
  
  const SIGNATURE_MESSAGE = "Hello Welcome to your first wallet connect test";
  
  const { 
    data: signature, 
    error, 
    isLoading: isSigning, 
    signMessage,
    reset
  } = useSignMessage();

  useEffect(() => {
    if (isConnected && !hasAttemptedSign) {
      signMessage({ message: SIGNATURE_MESSAGE });
      setHasAttemptedSign(true);
    } else if (!isConnected) {
      // Reset state on disconnect to allow for a fresh attempt on reconnect
      reset();
      setHasAttemptedSign(false);
    }
  }, [isConnected, hasAttemptedSign, signMessage, reset]);

  const truncateAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const StatusDisplay = () => {
    if (!isConnected) {
      return <div className="flex items-center text-yellow-400"><Loader className="mr-2 h-5 w-5 animate-spin" /><span>Awaiting Connection</span></div>;
    }
    if (isSigning) {
      return <div className="flex items-center text-blue-400"><Loader className="mr-2 h-5 w-5 animate-spin" /><span>Check your wallet to sign...</span></div>;
    }
    if (signature) {
      return <div className="flex items-center text-green-400"><CheckCircle className="mr-2 h-5 w-5" /><span>Signature Confirmed!</span></div>;
    }
    if (error) {
      return <div className="flex items-center text-red-400"><XCircle className="mr-2 h-5 w-5" /><span>Signature Rejected</span></div>;
    }
    // Default connected state before signing is initiated or if user navigates away from wallet prompt
    return <div className="flex items-center text-gray-400"><CheckCircle className="mr-2 h-5 w-5" /><span>Connected</span></div>;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700 p-6 md:p-8 space-y-6">
        
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Web3 Auto-Signer</h1>
          <p className="text-gray-400 mt-2">Connect your wallet and sign a message automatically.</p>
        </header>

        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-semibold">Status</span>
            <StatusDisplay />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-semibold">Wallet</span>
            {isConnected && address ? (
              <span className="bg-gray-700 text-cyan-300 px-3 py-1 rounded-full text-sm font-medium">{truncateAddress(address)}</span>
            ) : (
              <span className="text-gray-500">Not Connected</span>
            )}
          </div>
        </div>
        
        {!isConnected ? (
           <button 
              onClick={() => open()} 
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-bold py-3 px-4 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
            >
              Connect Wallet
            </button>
        ) : (
            <button 
              onClick={() => open()} 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all duration-300"
            >
              Manage Connection
            </button>
        )}

        {signature && (
          <div className="space-y-2">
            <label htmlFor="signature" className="block text-sm font-medium text-gray-400">Signature Result:</label>
            <textarea
              id="signature"
              readOnly
              value={signature}
              className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-300 text-xs font-mono focus:ring-cyan-500 focus:border-cyan-500 break-all"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <label htmlFor="error" className="block text-sm font-medium text-red-400">Error Details:</label>
            <div
              id="error"
              className="w-full p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-300 text-xs font-mono"
            >
              <p>{error.name}: {error.message}</p>
            </div>
          </div>
        )}

      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by WalletConnect, Wagmi, & React</p>
      </footer>
    </div>
  );
}

export default App;