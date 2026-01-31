import Pusher from 'pusher-js';

export const initPusher = () => {
  if (typeof window === 'undefined') return null;

  // Получаем host и протокол из переменной окружения
  let wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:6001';
  let wsHost = 'localhost';
  let wsPort;
  let forceTLS = false;

  try {
    const urlObj = new URL(wsUrl);
    wsHost = urlObj.hostname;
    forceTLS = urlObj.protocol === 'wss:' || urlObj.protocol === 'https:';
    // Если явно указан порт, используем его, иначе: 443 для wss, 80 для ws
    if (urlObj.port) {
      wsPort = parseInt(urlObj.port, 10);
    } else {
      wsPort = forceTLS ? 443 : 80;
    }
    // Не допускаем wss с портом 80
    if (forceTLS && wsPort === 80) {
      wsPort = 443;
    }
  } catch (e) {
    // fallback
    wsHost = 'localhost';
    wsPort = 6001;
    forceTLS = false;
  }

  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'local', {
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1',
  });

  return pusher;
};
