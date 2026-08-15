/**
 * Yjs WebSocket provider factory.
 * ------------------------------------------------------------------
 * Wraps `y-websocket`'s WebsocketProvider with the gateway-compatible
 * URL scheme: the room name is placed in the *path* and the gateway's
 * `XTransformPort=3004` query routes the request to the yjs-sync
 * mini-service.
 *
 * The provider is constructed lazily (client-only) because y-websocket
 * touches `window`/`WebSocket` at construction time.
 */
import { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'

export const YJS_SYNC_PORT = 3004

/**
 * Build the WebSocket URL pair for a room.
 *
 * y-websocket concatenates `${wsUrl}/${roomName}`. By putting the
 * XTransformPort query inside roomName we end up with a URL that the
 * Caddy gateway will forward to our mini-service.
 */
function buildWsParams(roomId: string) {
  if (typeof window === 'undefined') {
    throw new Error('createCanvasProvider must be called in the browser')
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsUrl = `${proto}//${host}`
  const roomName = `${encodeURIComponent(roomId)}?XTransformPort=${YJS_SYNC_PORT}`
  return { wsUrl, roomName }
}

export interface CreateProviderOptions {
  roomId: string
  doc: Y.Doc
  /** Forwarded to y-websocket's `params`; not used for auth here. */
  token?: string
}

export function createCanvasProvider({
  roomId,
  doc,
}: CreateProviderOptions): WebsocketProvider {
  const { wsUrl, roomName } = buildWsParams(roomId)
  const provider = new WebsocketProvider(wsUrl, roomName, doc, {
    // Disable the built-in awareness broadcast throttle so cursor
    // motion stays responsive; we throttle at the call-site instead.
    awareness: undefined,
    // Don't resync on focus by default — it causes a visible hitch.
    resyncInterval: 0,
    // Bump BC so multiple tabs on the same origin share one socket.
    broadcast: true,
    maxBackoffTime: 4000,
  })
  return provider
}
