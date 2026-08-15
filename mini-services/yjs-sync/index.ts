/**
 * Yjs WebSocket Sync Mini-Service
 * ------------------------------------------------------------------
 * A persistent CRDT sync server implementing the y-websocket wire
 * protocol (the same protocol used by the `y-websocket` client).
 *
 * Wire protocol (two-level):
 *   Outer message type (varUint):
 *     0 = messageSync      → followed by a sync sub-message
 *     1 = messageAwareness → followed by a varUint8Array awareness update
 *     3 = messageQueryAwareness → reply with full awareness state
 *
 *   Sync sub-message (when outer == 0):
 *     0 = step1 (state vector)    → reply with step2
 *     1 = step2 (missing updates) → apply, no reply
 *     2 = update                  → apply + broadcast
 *
 * Routing:
 *   Caddy forwards `?XTransformPort=3004` to this service. The URL path
 *   (e.g. `/room-abc`) is the room name. The client connects with:
 *     new WebsocketProvider(`wss://${host}`, `${roomId}?XTransformPort=3004`, doc)
 */
import { createServer, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { encoding, decoding } from 'lib0'

const PORT = 3004

// y-websocket outer message types (must match the client).
const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

// ----- persistence: one Y.Doc per room, kept in memory ----------------------
interface Room {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  conns: Map<WebSocket, Set<number>>
}

const rooms = new Map<string, Room>()

const getRoom = (roomName: string): Room => {
  let room = rooms.get(roomName)
  if (!room) {
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)
    room = { doc, awareness, conns: new Map() }
    rooms.set(roomName, room)
    console.log(`[yjs-sync] created room "${roomName}" (total: ${rooms.size})`)
  }
  return room
}

const removeRoomIfEmpty = (roomName: string) => {
  const room = rooms.get(roomName)
  if (room && room.conns.size === 0) {
    room.doc.destroy()
    rooms.delete(roomName)
    console.log(`[yjs-sync] gc empty room "${roomName}"`)
  }
}

const send = (conn: WebSocket, data: Uint8Array) => {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(data, { binary: true })
  }
}

const broadcast = (room: Room, data: Uint8Array, exclude?: WebSocket) => {
  room.conns.forEach((_, peer) => {
    if (peer !== exclude && peer.readyState === WebSocket.OPEN) {
      peer.send(data, { binary: true })
    }
  })
}

/**
 * Process one inbound message from a client, following the y-websocket
 * two-level protocol.
 */
const handleMessage = (conn: WebSocket, data: Buffer, room: Room) => {
  const message = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  const decoder = decoding.createDecoder(message)
  const outerType = decoding.readVarUint(decoder)

  switch (outerType) {
    case messageSync: {
      // The sync sub-message is itself an encoded buffer starting with
      // the sync sub-type. We re-decode it via the sync protocol.
      const syncDecoder = decoding.createDecoder(message)
      decoding.readVarUint(syncDecoder) // skip outer messageSync
      const subType = decoding.readVarUint(syncDecoder)
      const encoder = encoding.createEncoder()

      if (subType === syncProtocol.messageYjsSyncStep1) {
        // Client sent state vector → reply with step2 (missing updates).
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncStep1(syncDecoder, encoder, room.doc)
        send(conn, encoding.toUint8Array(encoder))
      } else if (subType === syncProtocol.messageYjsSyncStep2) {
        // Client sent missing updates → apply them.
        syncProtocol.readSyncStep2(syncDecoder, room.doc, conn)
      } else if (subType === syncProtocol.messageYjsUpdate) {
        // Client sent an update → apply + relay to other peers.
        syncProtocol.readSyncStep2(syncDecoder, room.doc, conn)
        broadcast(room, message, conn)
      }
      break
    }
    case messageAwareness: {
      // Awareness update: varUint8Array payload. Apply + relay.
      const update = decoding.readVarUint8Array(decoder)
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn)
      broadcast(room, message, conn)
      break
    }
    case messageQueryAwareness: {
      // Client asked for the full awareness state.
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(room.awareness.getStates().keys())
        )
      )
      send(conn, encoding.toUint8Array(encoder))
      break
    }
    default:
      // Unknown outer type — ignore.
      break
  }
}

const closeConn = (conn: WebSocket, room: Room, roomName: string) => {
  const controlledIds = room.conns.get(conn)
  if (controlledIds) {
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      Array.from(controlledIds),
      conn
    )
  }
  room.conns.delete(conn)
  if (room.conns.size === 0) {
    removeRoomIfEmpty(roomName)
  }
}

// ----- HTTP server + WebSocket upgrade -------------------------------------
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        service: 'yjs-sync',
        port: PORT,
        rooms: rooms.size,
        connections: Array.from(rooms.values()).reduce(
          (sum, r) => sum + r.conns.size,
          0
        ),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    )
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('yjs-sync service is running')
})

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (conn: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const roomName = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'default'

  const room = getRoom(roomName)
  room.conns.set(conn, new Set())

  // On connect, send sync step1 (our state vector) wrapped in the
  // messageSync envelope. The client replies with step2 + its own step1.
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, room.doc)
    send(conn, encoding.toUint8Array(encoder))
  }

  // Relay awareness from other peers to the newcomer.
  const awarenessStates = Array.from(room.awareness.getStates().keys())
  if (awarenessStates.length > 0) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, awarenessStates)
    )
    send(conn, encoding.toUint8Array(encoder))
  }

  conn.on('message', (data: Buffer) => {
    try {
      handleMessage(conn, data, room)
    } catch (err) {
      console.error('[yjs-sync] message error:', err)
    }
  })

  // Relay doc updates (originating from other connections) to this peer.
  const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate)
      encoding.writeVarUint8Array(encoder, update)
      send(conn, encoding.toUint8Array(encoder))
    }
  }
  room.doc.on('update', docUpdateHandler)

  // Relay awareness changes to this peer.
  const awarenessUpdateHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    const changedClients = added.concat(updated).concat(removed)
    if (origin !== conn && changedClients.length > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients)
      )
      send(conn, encoding.toUint8Array(encoder))
    }
  }
  room.awareness.on('update', awarenessUpdateHandler)

  conn.on('close', () => {
    room.doc.off('update', docUpdateHandler)
    room.awareness.off('update', awarenessUpdateHandler)
    closeConn(conn, room, roomName)
  })

  conn.on('error', (err) => {
    console.error('[yjs-sync] conn error:', err)
    closeConn(conn, room, roomName)
  })

  console.log(
    `[yjs-sync] client → room "${roomName}" (${room.conns.size} peers)`
  )
})

httpServer.listen(PORT, () => {
  console.log(`✓ yjs-sync WebSocket server on port ${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/health`)
})

const shutdown = (signal: string) => {
  console.log(`[yjs-sync] ${signal}, shutting down...`)
  wss.clients.forEach((c) => c.terminate())
  rooms.forEach((room) => room.doc.destroy())
  rooms.clear()
  httpServer.close(() => process.exit(0))
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
