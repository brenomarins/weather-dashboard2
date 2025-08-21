export const environment = {
  production: true,
  apiUrl: 'https://api.openweathermap.org/data/2.5',
  apiKey: 'your-production-openweathermap-api-key-here',
  websocketUrl: 'wss://your-websocket-server.com/weather', // Production WebSocket URL
  updateInterval: 300000, // 5 minutes in milliseconds
  retryAttempts: 5,
  retryDelay: 2000,
  cacheTimeout: 600000, // 10 minutes
  defaultCity: 'London',
  defaultCountryCode: 'GB',
  enablePerformanceMonitoring: true,
  enableWebSocket: true,
  maxCacheSize: 100,
  compressionEnabled: true,
  lazyLoadingEnabled: true
};