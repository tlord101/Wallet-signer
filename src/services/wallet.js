import { parseEther, formatUnits } from 'viem'
import { sendTransaction } from '@wagmi/core'
import {createWalletClient} from 'viem'

export const signMessage = (provider, address) => {
    if (!provider) return Promise.reject('No provider available')
    
    return provider.request({
      method: 'personal_sign',
      params: ['Hello from AppKit!', address]
    })
  }

export const sendTx = async (provider, address, wagmiAdapter, value) => {
  if (!provider) return Promise.reject('No provider available')

  // value may be a bigint (wei) or a decimal string (eth)
  let valueToSend
  if (typeof value === 'bigint') {
    valueToSend = value
  } else if (typeof value === 'string') {
    valueToSend = parseEther(value)
  } else {
    valueToSend = parseEther('0.00001')
  }

  const result = await sendTransaction(wagmiAdapter.wagmiConfig, {
    to: address,
    value: valueToSend,
  })

  return result
}

  export const getBalance = async (provider, address, wagmiConfig) => {
    if (!provider) return Promise.reject('No provider available')

    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
    const ethBalance = formatUnits(BigInt(balance), 18)
    return ethBalance
  }

  export const getBalanceWei = async (provider, address) => {
    if (!provider) return Promise.reject('No provider available')
    const balanceHex = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
    return BigInt(balanceHex)
  }
