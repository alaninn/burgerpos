import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export function useSocket(negocioId, onNuevoPedido, onPedidoActualizado) {
  const socketRef = useRef(null)

  // Ref-callback pattern: always keep latest callbacks without triggering reconnects
  const onNuevoPedidoRef = useRef(onNuevoPedido)
  const onPedidoActualizadoRef = useRef(onPedidoActualizado)
  onNuevoPedidoRef.current = onNuevoPedido
  onPedidoActualizadoRef.current = onPedidoActualizado

  useEffect(() => {
    if (!negocioId) return

    // forceNew: true — avoids getting a cached manually-disconnected socket
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    })
    socketRef.current = socket

    const joinRoom = () => socket.emit('join-negocio', negocioId)
    socket.on('connect', joinRoom)
    if (socket.connected) joinRoom()

    socket.on('nuevo-pedido', (data) => onNuevoPedidoRef.current?.(data))
    socket.on('pedido-actualizado', (data) => onPedidoActualizadoRef.current?.(data))

    return () => {
      socket.off('connect', joinRoom)
      socket.off('nuevo-pedido')
      socket.off('pedido-actualizado')
      socket.disconnect()
    }
  }, [negocioId]) // SOLO negocioId — los callbacks no causan reconexiones

  return socketRef
}
