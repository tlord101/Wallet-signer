import { store, updateStore } from '../store/appkitStore'
import { updateStateDisplay, updateTheme, updateButtonVisibility } from './dom'
import { sepolia, mainnet } from '@reown/appkit/networks'

export const initializeSubscribers = (modal) => {
  modal.subscribeProviders(state => {
    updateStore('eip155Provider', state['eip155'])
  })

  modal.subscribeAccount(state => {
    updateStore('accountState', state)
    updateStateDisplay('accountState', state)
  })

  modal.subscribeNetwork(state => {
    updateStore('networkState', state)
    updateStateDisplay('networkState', state)
    
    const switchNetworkBtn = document.getElementById('switch-network')
    if (switchNetworkBtn) {
      // If currently Sepolia, show option to switch to Mainnet, otherwise show Sepolia
      switchNetworkBtn.textContent = `Switch to ${state?.chainId === sepolia.id ? 'Mainnet' : 'Sepolia'}`
    }
  })

  modal.subscribeState(state => {
    store.appKitState = state

    updateButtonVisibility(modal.getIsConnectedState())
  })
}