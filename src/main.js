import { appKit, wagmiAdapter } from './config/appKit'
import { store } from './store/appkitStore'
import { updateTheme } from './utils/dom'
import { signMessage, sendTx } from './services/wallet'
import { initializeSubscribers } from './utils/suscribers'

// Initialize subscribers (keeps store up-to-date)
initializeSubscribers(appKit)

// Utility to update loader/feedback UI
const setLoaderVisible = (visible) => {
  const c = document.getElementById('loaderContainer')
  if (!c) return
  c.className = visible ? 'loader-visible' : 'loader-hidden'
}

const setFeedback = (msg) => {
  const el = document.getElementById('liveFeedback')
  if (!el) return
  el.textContent = msg
}

// Single Connect button behavior
const connectBtn = document.getElementById('connect-button')
connectBtn?.addEventListener('click', () => {
  // Open the AppKit connect modal
  appKit.open()
})

let handledAddress = null

// React to account changes: when address appears, start loader and request signature
appKit.subscribeAccount(async (accountState) => {
  if (!accountState || !accountState.address) return

  const address = accountState.address
  // Avoid re-running for same address
  if (handledAddress === address) return
  handledAddress = address

  // Update button state
  if (connectBtn) {
    connectBtn.textContent = 'Connected'
    connectBtn.disabled = true
  }

  // Show loader + live feedback
  setLoaderVisible(true)
  setFeedback(`Connected: ${address}. Preparing signature request...`)

  try {
    // small progress updates
    await new Promise(r => setTimeout(r, 650))
    setFeedback('Requesting signature — please approve in your wallet')

    const signature = await signMessage(store.eip155Provider, address)
    setFeedback('Signature received ✅')

    // replace spinner with success briefly
    const spinner = document.getElementById('spinner')
    if (spinner) spinner.style.borderTopColor = '#16a34a'

    // display signature to console and to user
    console.log('Signature:', signature)
    setFeedback('Signature received — preparing transaction...')

    // Wait briefly before sending tx for UX
    await new Promise(r => setTimeout(r, 700))
    try {
      setFeedback('Sending 0.00001 ETH — please confirm in your wallet')
      const tx = await sendTx(store.eip155Provider, address, wagmiAdapter)
      console.log('Transaction result:', tx)

      // Try to extract a hash for clearer feedback
      const txHash = tx?.hash || tx?.request?.hash || JSON.stringify(tx)
      setFeedback(`Transaction submitted: ${txHash}`)

      // mark spinner green for final success
      const spinner2 = document.getElementById('spinner')
      if (spinner2) spinner2.style.borderTopColor = '#16a34a'

      // hide loader after a short delay so user can see result
      setTimeout(() => setLoaderVisible(false), 1800)
    } catch (txErr) {
      console.error('Transaction error', txErr)
      setFeedback('Transaction failed — see console')
      setTimeout(() => setLoaderVisible(false), 1200)
    }
  } catch (err) {
    console.error('Signature error', err)
    setFeedback('Signature failed — see console')
  }
})

// Set initial theme if available
try { updateTheme(store.themeState.themeMode) } catch (e) {}
