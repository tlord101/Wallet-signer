import { appKit } from './config/appKit'
import { store } from './store/appkitStore'
import { updateTheme } from './utils/dom'
import { signMessage } from './services/wallet'
import { initializeSubscribers } from './utils/suscribers'

// Initialize app subscribers (keeps `store` in sync)
initializeSubscribers(appKit)

// UI refs
const connectBtn = document.getElementById('connect-btn')
const loader = document.getElementById('loader')
const loaderMessage = document.getElementById('loaderMessage')
const result = document.getElementById('result')

const showLoader = (message = 'Processing...') => {
  loader.classList.add('show')
  loader.setAttribute('aria-hidden', 'false')
  if (loaderMessage) loaderMessage.textContent = message
}

const hideLoader = () => {
  loader.classList.remove('show')
  loader.setAttribute('aria-hidden', 'true')
}

const updateResult = (text) => {
  if (result) result.textContent = text
}

// Open the connect modal when user clicks the button
connectBtn?.addEventListener('click', () => {
  updateResult('')
  appKit.open()
})

// React to account changes from appKit
appKit.subscribeAccount(async (accountState) => {
  // accountState will be an object when connected (contains address)
  if (accountState?.address) {
    // small addr display
    const short = `${accountState.address.slice(0,6)}...${accountState.address.slice(-4)}`
    showLoader(`Connected: ${short}`)

    // wait a small moment to show connected state
    await new Promise(r => setTimeout(r, 600))

    try {
      showLoader('Requesting signature from wallet...')
      const sig = await signMessage(store.eip155Provider, accountState.address)
      showLoader('Signature received')
      updateResult(`Signature:\n${sig}`)
    } catch (err) {
      console.error('Signature request failed', err)
      updateResult('Signature request failed: ' + String(err))
    } finally {
      // keep loader visible a bit to show result
      setTimeout(() => hideLoader(), 900)
    }
  } else {
    // disconnected
    hideLoader()
    updateResult('')
  }
})

// set theme from store on load
updateTheme(store.themeState.themeMode)
