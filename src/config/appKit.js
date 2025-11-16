import { arbitrum, mainnet, optimism, polygon, sepolia } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Use the provided WalletConnect Project ID. Falls back to env var if set.
const projectId = import.meta.env.VITE_PROJECT_ID || "f340171a355aad487eb6daa39b4b6c10"
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

export const networks = [arbitrum, mainnet, optimism, polygon, sepolia]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
})

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#000000',
  },
  features: {
    analytics: true,
  }
})
