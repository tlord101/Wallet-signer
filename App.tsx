
import React, { useState, useEffect } from 'react';
import { WagmiProvider, useAccount, useSignMessage, useSendTransaction, useWaitForTransactionReceipt, createConfig, http, useConnect, useDisconnect } from 'wagmi';
import { arbitrum, mainnet, polygon } from 'wagmi/chains';
import { walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2 as Loader, Clipboard, Check, Wallet } from 'lucide-react';
import { parseEther } from 'viem';

// 1. Get projectId from https://cloud.walletconnect.com
// FIX: Explicitly type `projectId` as a string to resolve a TypeScript comparison error.
const projectId: string = 'f340171a355aad487eb6daa39b4b6c10';

// 2. Create wagmiConfig
const chains = [mainnet, polygon, arbitrum] as const;
const metadata = {
    name: 'Web3 Action Requester',
    description: 'A dApp that connects to a wallet, requests a signature, and sends a test transaction.',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const wagmiConfig = createConfig({
  chains,
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: true }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});

// 3. Create QueryClient
const queryClient = new QueryClient();

// Main App Component
function App() {
  // Show instructions if the projectId hasn't been set.
  if (projectId === 'YOUR_PROJECT_ID' || !projectId) {
    return <MissingProjectIdView />;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletDapp />
      </QueryClientProvider>
    </WagmiProvider>
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

// FIX: Moved statusStyles outside the component to define a reusable Status type.
// This improves type safety and allows us to fix the missing 'children' prop error by properly typing the component props.
const statusStyles = {
  idle: {
    icon: <div className="h-5 w-5 rounded-full bg-gray-600 border-2 border-gray-500" />,
    borderColor: 'border-gray-700',
    textColor: 'text-gray-400',
    detailsColor: 'text-gray-500'
  },
  pending: {
    icon: <Loader className="h-5 w-5 animate-spin text-blue-400" />,
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-300',
    detailsColor: 'text-blue-400'
  },
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-400" />,
    borderColor: 'border-green-500/50',
    textColor: 'text-green-300',
    detailsColor: 'text-green-400'
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-400" />,
    borderColor: 'border-red-500/50',
    textColor: 'text-red-300',
    detailsColor: 'text-red-400'
  },
};
type Status = keyof typeof statusStyles;


// Helper component to render a step in the process
const ProcessStep = ({ title, status, children, details }: { title: string; status: Status; children?: React.ReactNode; details: string; }) => {

  const currentStyle = statusStyles[status];

  return (
    <div className={`bg-gray-900/50 border ${currentStyle.borderColor} rounded-lg p-4 transition-all`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {currentStyle.icon}
          <span className={`font-semibold ${currentStyle.textColor}`}>{title}</span>
        </div>
        <span className={`text-sm font-medium ${currentStyle.detailsColor}`}>{details}</span>
      </div>
      {children && <div className="mt-3 pl-8">{children}</div>}
    </div>
  );
};

// Helper component to display results with a copy button
const ResultDisplay = ({ label, value }: { label: string; value: string; }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">{label}</label>
      <div className="relative">
        <textarea
          readOnly
          value={value}
          className="w-full h-24 p-3 pr-12 bg-gray-900 border border-gray-600 rounded-md text-gray-300 text-xs font-mono focus:ring-cyan-500 focus:border-cyan-500 break-all"
        />
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-400 hover:text-white transition-colors"
          aria-label="Copy to clipboard"
        >
          {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

// Helper component for displaying errors
const ErrorDisplay = ({ label, message }: { label: string; message: string; }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-red-400">{label}</label>
    <div className="w-full p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-300 text-xs font-mono">
      <p>{message}</p>
    </div>
  </div>
);

// Custom Connect Button Component
function CustomConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // We only have one connector configured, so we can grab it directly.
  const connector = connectors[0];

  if (isConnected && address) {
    const truncateAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    return (
      <div className="flex items-center space-x-4">
        <span className="bg-gray-700 text-cyan-300 px-4 py-2 rounded-full text-sm font-semibold flex items-center">
          <Wallet className="w-4 h-4 mr-2" />
          {truncateAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg hover:bg-red-500/40 transition-colors font-semibold"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector })}
      disabled={!connector?.ready}
      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Connect Wallet
    </button>
  );
}

// Main Dapp UI component
function WalletDapp() {
  const { address, isConnected } = useAccount();
  
  const [hasAttemptedSign, setHasAttemptedSign] = useState(false);
  const [hasAttemptedTransaction, setHasAttemptedTransaction] = useState(false);
  
  const SIGNATURE_MESSAGE = "Hello Welcome to your first wallet connect test";
  
  const { 
    data: signature, 
    error: signError, 
    isPending: isSigning, 
    signMessage,
    reset: resetSignMessage
  } = useSignMessage();

  const {
    data: hash,
    error: sendTransactionError,
    isPending: isSending,
    sendTransaction,
    reset: resetSendTransaction
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConnected && !hasAttemptedSign) {
      signMessage({ message: SIGNATURE_MESSAGE });
      setHasAttemptedSign(true);
    } else if (!isConnected) {
      resetSignMessage();
      resetSendTransaction();
      setHasAttemptedSign(false);
      setHasAttemptedTransaction(false);
    }
  }, [isConnected, hasAttemptedSign, signMessage, resetSignMessage, resetSendTransaction]);

  useEffect(() => {
    if (signature && isConnected && !hasAttemptedTransaction && sendTransaction) {
        sendTransaction({
            to: '0x000000000000000000000000000000000000dEaD',
            value: parseEther('0.0001'),
        });
        setHasAttemptedTransaction(true);
    }
  }, [signature, isConnected, hasAttemptedTransaction, sendTransaction]);

  const truncateAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  // FIX: Added the 'Status' return type to ensure type consistency with the ProcessStep component.
  const getStatus = (
    isPending: boolean,
    isSuccess: boolean,
    isError: boolean,
    isIdleCondition: boolean = false
  ): Status => {
    if (isPending) return 'pending';
    if (isSuccess) return 'success';
    if (isError) return 'error';
    if (isIdleCondition) return 'idle';
    return 'idle';
  };
  
  const connectionStatus = getStatus(false, isConnected, false);
  const signatureStatus = getStatus(isSigning, !!signature, !!signError, !isConnected);
  const transactionStatus = getStatus(
    isSending || isConfirming,
    isConfirmed,
    !!sendTransactionError || !!confirmError,
    !signature
  );
  
  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-cyan-500/10 border border-gray-700/50 p-6 md:p-8 space-y-8">
        
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Web3 Action Requester</h1>
          <p className="text-gray-400 mt-3">Connect your wallet to auto-sign a message and send a test transaction.</p>
        </header>

        <div className="space-y-4">
          <ProcessStep title="1. Connect Wallet" status={connectionStatus} details={isConnected ? 'Connected' : 'Awaiting'}>
            {isConnected && address && (
              <span className="bg-gray-700 text-cyan-300 px-3 py-1 rounded-full text-sm font-medium flex items-center w-fit">
                <Wallet className="w-4 h-4 mr-2"/>
                {truncateAddress(address)}
              </span>
            )}
          </ProcessStep>
          <ProcessStep title="2. Sign Message" status={signatureStatus} details={isSigning ? 'Check Wallet' : signature ? 'Signed' : signError ? 'Rejected' : 'Pending'}/>
          <ProcessStep title="3. Send Transaction" status={transactionStatus} details={isSending ? 'Check Wallet' : isConfirming ? 'Confirming...' : isConfirmed ? 'Success' : (sendTransactionError || confirmError) ? 'Failed' : 'Pending'}/>
        </div>
        
        <div className="flex justify-center">
          <CustomConnectButton />
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-700/50">
          {signature && <ResultDisplay label="Signature Result" value={signature} />}
          {hash && <ResultDisplay label="Transaction Hash" value={hash} />}
          {signError && <ErrorDisplay label="Signature Error" message={`${signError.name}: ${signError.message}`} />}
          {(sendTransactionError || confirmError) && (
            <ErrorDisplay label="Transaction Error" message={(sendTransactionError || confirmError)?.shortMessage || (sendTransactionError || confirmError)?.message || "An unknown error occurred."} />
          )}
        </div>

      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by WalletConnect, Wagmi, & React</p>
      </footer>
    </div>
  );
}

export default App;
