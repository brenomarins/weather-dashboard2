export const environment = {
  production: false,
  apiUrl: 'https://api.openweathermap.org/data/2.5',
  apiKey: 'your-openweathermap-api-key-here', // Replace with your actual API key
  websocketUrl: '', // WebSocket URL for real-time updates (if available)
  updateInterval: 300000, // 5 minutes in milliseconds
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTimeout: 600000, // 10 minutes
  defaultCity: 'London',
  defaultCountryCode: 'GB',
  enablePerformanceMonitoring: true,
  enableWebSocket: false,
  maxCacheSize: 50, // Maximum number of cached entries
  compressionEnabled: true,
  lazyLoadingEnabled: true
};