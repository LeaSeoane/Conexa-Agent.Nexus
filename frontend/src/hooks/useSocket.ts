import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { JobProgress } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinJobRoom = (jobId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-job', jobId);
    }
  };

  const onProgress = (callback: (progress: JobProgress) => void) => {
    if (socketRef.current) {
      socketRef.current.on('analysis-progress', callback);
    }
  };

  const offProgress = (callback: (progress: JobProgress) => void) => {
    if (socketRef.current) {
      socketRef.current.off('analysis-progress', callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinJobRoom,
    onProgress,
    offProgress,
  };
};