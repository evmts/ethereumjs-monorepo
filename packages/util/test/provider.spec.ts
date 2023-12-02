import { assert, describe, it, vi } from 'vitest'

import { fetchFromProvider, getProvider } from '../src/index.js'

const providerUrl = 'https://myfakeprovider.com'
const fakeEthersProvider = {
  _getConnection(): any {
    const fakeConnection = {
      url: 'localhost:8545',
    }
    return fakeConnection
  },
}

describe('getProvider', () => {
  it('should work', () => {
    assert.equal(getProvider(providerUrl), providerUrl, 'returned correct provider url string')
    assert.equal(
      getProvider(fakeEthersProvider),
      fakeEthersProvider._getConnection().url,
      'returned correct provider url string'
    )
    assert.throws(
      () => getProvider(<any>1),
      'Must provide valid provider URL or Web3Provider',
      undefined,
      'throws correct error'
    )
  })
})

describe('fetchFromProvider', () => {
  it('should work', async () => {
    try {
      await fetchFromProvider(providerUrl, {
        method: 'eth_getBalance',
        params: ['0xabcd'],
      })
      assert.fail('should throw')
    } catch (err: any) {
      assert.ok(err.message.includes('fetch'), 'tried to fetch and failed')
    }
  })

  it('should throw a formatted error when an error is returned from the RPC', async () => {
    vi.stubGlobal('fetch', async (_url: string, _req: any) => {
      return {
        text: () => {
          return 'ERROR'
        },
        ok: false,
      }
    })
    try {
      await fetchFromProvider(providerUrl, {
        method: 'eth_getBalance',
        params: ['0xabcd'],
      })
      assert.fail('should throw')
    } catch (err: any) {
      assert.ok(err.message.includes('ERROR'), 'received a formatted RPC error')
      assert.ok(err.message.includes('eth_getBalance'), 'error is for correct method')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
