// src/app/core/services/weather-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, BehaviorSubject, EMPTY ,of} from 'rxjs';
import { 
  catchError, 
  retry, 
  timeout, 
  switchMap, 
  map, 
  startWith,
  shareReplay,
  tap
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WeatherData {
  main: {
    temp: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
    feels_like: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  name: string;
  dt: number;
}

export interface TemperaturePoint {
  timestamp: Date;
  temperature: number;
  humidity: number;
  hour: number;
  minute: number;
  day: number;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherApiService {
  private readonly http = inject(HttpClient);
  private readonly apiKey = environment.openWeatherApiKey;
  private readonly baseUrl = environment.apiUrl;
  
  private isOnlineSubject = new BehaviorSubject<boolean>(true);
  public isOnline$ = this.isOnlineSubject.asObservable();
  
  private lastSuccessfulData: WeatherData | null = null;

  constructor() {
    // Monitora status de conexão
    window.addEventListener('online', () => this.isOnlineSubject.next(true));
    window.addEventListener('offline', () => this.isOnlineSubject.next(false));
  }

  /**
   * Busca dados atuais do tempo para uma cidade
   */
  getCurrentWeather(city: string): Observable<WeatherData> {
    if (!this.apiKey || this.apiKey === 'SUA_API_KEY_AQUI') {
      console.warn('⚠️ API Key não configurada, usando dados simulados');
      return this.generateMockData(city);
    }

    const url = `${this.baseUrl}/weather`;
    const params = {
      q: city,
      appid: this.apiKey,
      units: 'metric',
      lang: 'pt'
    };

    return this.http.get<WeatherData>(url, { params }).pipe(
      timeout(10000),
      retry({ count: 3, delay: 2000 }),
      tap(data => {
        this.lastSuccessfulData = data;
        this.isOnlineSubject.next(true);
      }),
      catchError((err) => this.handleError<WeatherData>(err)),
      shareReplay(1)
    );
  }

  /**
   * Stream de dados em tempo real
   */
  getRealtimeWeatherStream(city: string): Observable<TemperaturePoint> {
    return timer(0, environment.updateInterval).pipe(
      switchMap(() => this.getCurrentWeather(city)),
      map(data => this.transformToTemperaturePoint(data)),
      catchError(error => {
        console.error('Erro no stream de dados:', error);
        return EMPTY;
      })
    );
  }

  /**
   * Gera dados simulados quando API não está disponível
   */
  private generateMockData(city: string): Observable<WeatherData> {
    const now = new Date();
    const hour = now.getHours();
    
    // Simula variação de temperatura baseada na hora
    const baseTemp = 22 + Math.sin((hour / 24) * 2 * Math.PI) * 8;
    const variation = (Math.random() - 0.5) * 3;
    const temperature = Math.round((baseTemp + variation) * 10) / 10;
    
    const mockData: WeatherData = {
      main: {
        temp: temperature,
        humidity: Math.round(45 + Math.random() * 30),
        temp_min: temperature - 3,
        temp_max: temperature + 4,
        feels_like: temperature + (Math.random() - 0.5) * 2
      },
      weather: [{
        main: 'Clear',
        description: 'céu limpo',
        icon: '01d'
      }],
      name: city,
      dt: Math.floor(Date.now() / 1000)
    };

    return new Observable(observer => {
      // Simula latência da API
      setTimeout(() => {
        observer.next(mockData);
        observer.complete();
      }, 200 + Math.random() * 300);
    });
  }

  /**
   * Transforma dados da API em formato de ponto de temperatura
   */
  private transformToTemperaturePoint(data: WeatherData): TemperaturePoint {
    const now = new Date();
    return {
      timestamp: now,
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      hour: now.getHours(),
      minute: now.getMinutes(),
      day: now.getDate()
    };
  }

  /**
   * Tratamento centralizado de erros
   */
  private handleError<T>(error: HttpErrorResponse): Observable<T> {
    let errorMessage = 'Erro desconhecido';
    
    if (error.error instanceof ErrorEvent) {
      // Erro do cliente
      errorMessage = `Erro de conexão: ${error.error.message}`;
    } else {
      // Erro do servidor
      switch (error.status) {
        case 401:
          errorMessage = 'Chave da API inválida';
          break;
        case 404:
          errorMessage = 'Cidade não encontrada';
          break;
        case 429:
          errorMessage = 'Muitas requisições. Tente novamente em alguns minutos';
          break;
        case 0:
          errorMessage = 'Sem conexão com a internet';
          break;
        default:
          errorMessage = `Erro do servidor: ${error.status}`;
      }
    }
    
    console.error('Erro na API:', errorMessage);
    this.isOnlineSubject.next(false);
    
    // Se temos dados anteriores, retorna dados simulados baseados neles
    if (this.lastSuccessfulData) {
      console.log('🔄 Usando dados simulados baseados na última requisição bem-sucedida');
      return this.generateMockData(this.lastSuccessfulData.name) as Observable<T>;
    }
    
    return throwError(() => new Error(errorMessage)) as Observable<T>;
  }

  /**
   * Verifica se a API está acessível
   */
  checkApiHealth(): Observable<boolean> {
    return this.getCurrentWeather('London').pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
  //checkApiHealth(): Observable<boolean> {
  //  return this.getCurrentWeather('London').pipe(
  //    map(() => true),
  //    catchError(() => new Observable(observer => {
   //     observer.next(false);
   //     observer.complete();
   //   }))
    //);
  //}
}