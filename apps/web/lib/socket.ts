import { io, Socket } from 'socket.io-client'

let _socket: Socket | null = null
let _token: string | null = null

/**
 * Returns a singleton Socket.io connection.
 * For the same token, ALWAYS returns the same socket object so socket.io
 * can handle reconnection internally without losing event listeners.
 * Only creates a new socket when the token changes (e.g. different user).
 */
export function getSocket(token: string): Socket {
  if (_socket && _token === token) return _socket

  // Token changed — close old connection first
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }

  _socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
  _token = token

  return _socket
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect()
    _socket = null
    _token = null
  }
}
