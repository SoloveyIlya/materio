import Pusher from 'pusher-js';

export const initPusher = () => {
  if (typeof window === 'undefined') return null;
  
  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'local', {
    wsHost: process.env.NEXT_PUBLIC_WEBSOCKET_HOST || 'pickleflavor.info',
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1',
  });
  
  return pusher;
};
