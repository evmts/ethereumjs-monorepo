import { Blockchain } from '@ethereumjs/blockchain'
import { assert, describe, it } from 'vitest'

import { Config } from '../../src/config'
import { PeerPool } from '../../src/net/peerpool'
import { EthProtocol } from '../../src/net/protocol'
import { Event } from '../../src/types'

import { MockChain } from './mocks/mockchain'
import { MockServer } from './mocks/mockserver'
import { wait } from './util'

describe('[Integration:PeerPool]', async () => {
  async function setup(protocols: EthProtocol[] = []): Promise<[MockServer, PeerPool]> {
    const serverConfig = new Config({ accountCache: 10000, storageCache: 1000 })
    const server = new MockServer({ config: serverConfig }) as any
    server.addProtocols(protocols)
    const config = new Config({ server, accountCache: 10000, storageCache: 1000 })
    await server.start()
    const pool = new PeerPool({ config })
    await pool.open()
    return [server, pool]
  }

  async function destroy(server: MockServer, pool: PeerPool) {
    await pool.stop()
    await server.stop()
  }

  it('should open', async () => {
    const [server, pool] = await setup()
    assert.ok((pool as any).opened, 'opened')
    await destroy(server, pool)
  })

  it('should add/remove peer', async () => {
    const [server, pool] = await setup()
    pool.config.events.on(Event.POOL_PEER_ADDED, (peer: any) =>
      assert.equal(peer.id, 'peer0', 'added peer')
    )
    pool.config.events.on(Event.POOL_PEER_REMOVED, (peer: any) =>
      assert.equal(peer.id, 'peer0', 'removed peer')
    )
    pool.add(await server.accept('peer0'))
    await wait(100)
    server.disconnect('peer0')
    await destroy(server, pool)
    assert.ok(true, 'destroyed')
  })

  it('should ban peer', async () => {
    const [server, pool] = await setup()
    pool.config.events.on(Event.POOL_PEER_ADDED, (peer: any) =>
      assert.equal(peer.id, 'peer0', 'added peer')
    )
    pool.config.events.on(Event.POOL_PEER_BANNED, (peer: any) =>
      assert.equal(peer.id, 'peer0', 'banned peer')
    )
    pool.add(await server.accept('peer0'))
    await wait(100)
    pool.ban(pool.peers[0])
    await destroy(server, pool)
    assert.ok(true, 'destroyed')
  })

  it('should handle peer messages', async () => {
    const config = new Config({ accountCache: 10000, storageCache: 1000 })
    const blockchain = await Blockchain.create({
      validateBlocks: false,
      validateConsensus: false,
    })
    const chain = new MockChain({ config, blockchain })
    await chain.open()
    const protocols = [
      new EthProtocol({
        config,
        chain,
      }),
    ]
    const [server, pool] = await setup(protocols)
    config.events.on(Event.POOL_PEER_ADDED, (peer: any) =>
      assert.equal(peer.id, 'peer0', 'added peer')
    )
    config.events.on(Event.PROTOCOL_MESSAGE, (msg: any, proto: any, peer: any) => {
      assert.deepEqual([msg, proto, peer.id], ['msg0', 'proto0', 'peer0'], 'got message')
    })
    pool.add(await server.accept('peer0'))
    await wait(100)
    config.events.emit(Event.PROTOCOL_MESSAGE, 'msg0', 'proto0', pool.peers[0])
    await destroy(server, pool)
    assert.ok(true, 'destroyed')
  })
})
