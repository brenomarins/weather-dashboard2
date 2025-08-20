// src/app/components/weather-dashboard/weather-dashboard.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  WeatherApiService, 
  TemperaturePoint, 
  WeatherData 
} from '../../core/services/weather-api.service';
import { ChartComponent } from '../chart/chart.component';
import { MetricCardComponent } from '../metric-card/metric-card.component';
import { Subscription, catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent, MetricCardComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div class="max-w-7xl mx-auto">
        
        <!-- Header -->
        <header class="card mb-6 animate-fade-in">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-center space-x-4">
              <div class="bg-blue-500 p-3 rounded-full">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gray-800">Dashboard de Temperatura</h1>
                <p class="text-gray-600">{{ selectedCity() }} - Tempo Real</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <!-- Seletor de Cidade -->
              <div class="flex items-center space-x-2">
                <label class="text-sm font-medium text-gray-700">Cidade:</label>
                <select 
                  [(ngModel)]="selectedCityValue"
                  (change)="onCityChange()"
                  class="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="São Paulo">São Paulo</option>
                  <option value="Rio de Janeiro">Rio de Janeiro</option>
                  <option value="Brasília">Brasília</option>
                  <option value="Salvador">Salvador</option>
                  <option value="Fortaleza">Fortaleza</option>
                </select>
              </div>
              
              <!-- Status de Conexão -->
              <div class="flex items-center space-x-2">
                <div class="status-indicator" 
                     [class.status-connected]="isConnected()" 
                     [class.status-disconnected]="!isConnected()"></div>
                <span class="text-sm font-medium" 
                      [class.text-green-600]="isConnected()" 
                      [class.text-red-600]="!isConnected()">
                  {{ isConnected() ? 'Conectado' : 'Desconectado' }}
                </span>
              </div>
              
              <!-- Última Atualização -->
              <div class="text-right">
                <p class="text-xs text-gray-500">Última atualização</p>
                <p class="text-sm font-medium text-gray-700">
                  {{ lastUpdate() | date:'HH:mm:ss' }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Error Display -->
          <div *ngIf="error()" 
               class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <span class="text-sm text-yellow-800">{{ error() }}</span>
          </div>
        </header>

        <!-- Cards de Métricas -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <app-metric-card
            title="Temperatura Atual"
            [value]="currentTemperature()"
            unit="°C"
            icon="thermometer"
            color="blue"
            class="animate-slide-up">
          </app-metric-card>
          
          <app-metric-card
            title="Máxima Hoje"
            [value]="maxTemperature()"
            unit="°C"
            icon="arrow-up"
            color="red"
            class="animate-slide-up"
            style="animation-delay: 100ms">
          </app-metric-card>
          
          <app-metric-card
            title="Mínima Hoje"
            [value]="minTemperature()"
            unit="°C"
            icon="arrow-down"
            color="blue"
            class="animate-slide-up"
            style="animation-delay: 200ms">
          </app-metric-card>
          
          <app-metric-card
            title="Umidade"
            [value]="currentHumidity()"
            unit="%"
            icon="droplets"
            color="green"
            class="animate-slide-up"
            style="animation-delay: 300ms">
          </app-metric-card>
        </div>

        <!-- Gráfico Principal -->
        <div class="card animate-fade-in" style="animation-delay: 400ms">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <h2 class="text-xl font-semibold text-gray-800">
              Variação de Temperatura - Últimas {{ maxDataPoints }} horas
            </h2>
            <div class="flex items-center space-x-3">
              <!-- Indicador de Loading -->
              <div *ngIf="isLoading()" class="flex items-center space-x-2 text-sm text-gray-600">
                <div class="loading-spinner w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Carregando...</span>
              </div>
              
              <!-- Botão de Atualização Manual -->
              <button
                (click)="refreshData()"
                [disabled]="isLoading()"
                class="btn-primary flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Atualizar</span>
              </button>
            </div>
          </div>
          
          <app-chart
            [data]="temperatureData()"
            [isLoading]="isLoading()"
            class="chart-container">
          </app-chart>
        </div>

        <!-- Informações Técnicas -->
        <div class="card mt-6 animate-fade-in" style="animation-delay: 600ms">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Informações Técnicas</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p class="text-gray-500">Fonte de Dados</p>
              <p class="font-medium">OpenWeatherMap API</p>
            </div>
            <div>
              <p class="text-gray-500">Intervalo</p>
              <p class="font-medium">{{ updateInterval }}s</p>
            </div>
            <div>
              <p class="text-gray-500">Pontos no Gráfico</p>
              <p class="font-medium">{{ temperatureData().length }}/{{ maxDataPoints }}</p>
            </div>
            <div>
              <p class="text-gray-500">Status da API</p>
              <p class="font-medium" [class.text-green-600]="isConnected()" [class.text-red-600]="!isConnected()">
                {{ isConnected() ? 'Ativa' : 'Indisponível' }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">Cidade Atual</p>
              <p class="font-medium">{{ selectedCity() }}</p>
            </div>
            <div>
              <p class="text-gray-500">Próxima Atualização</p>
              <p class="font-medium">{{ nextUpdateCountdown }}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class WeatherDashboardComponent implements OnInit, OnDestroy {
  private readonly weatherService = inject(WeatherApiService);
  
  // Signals para estado reativo
  temperatureData = signal<TemperaturePoint[]>([]);
  currentWeather = signal<WeatherData | null>(null);
  isConnected = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  lastUpdate = signal<Date | null>(null);
  selectedCity = signal<string>('São Paulo');
  
  // Propriedades computadas
  currentTemperature = computed(() => {
    const data = this.temperatureData();
    return data.length > 0 ? data[data.length - 1].temperature : null;
  });
  
  maxTemperature = computed(() => {
    const data = this.temperatureData();
    return data.length > 0 ? Math.max(...data.map(d => d.temperature)) : null;
  });
  
  minTemperature = computed(() => {
    const data = this.temperatureData();
    return data.length > 0 ? Math.min(...data.map(d => d.temperature)) : null;
  });
  
  currentHumidity = computed(() => {
    const data = this.temperatureData();
    return data.length > 0 ? data[data.length - 1].humidity : null;
  });
  
  // Propriedades do componente
  selectedCityValue = 'São Paulo';
  maxDataPoints = 24;
  updateInterval = 30;
  nextUpdateCountdown = 30;
  
  private subscription = new Subscription();
  private countdownInterval: any;

  constructor() {
    // Effect para reagir a mudanças na cidade selecionada
    effect(() => {
      const city = this.selectedCity();
      this.startRealtimeUpdates();
    });
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private initializeComponent(): void {
    // Carrega dados iniciais
    this.loadInitialData();
    
    // Inicia atualizações em tempo real
    this.startRealtimeUpdates();
    
    // Inicia countdown para próxima atualização
    this.startUpdateCountdown();
    
    // Monitora status de conexão
    this.subscription.add(
      this.weatherService.isOnline$.subscribe(online => {
        this.isConnected.set(online);
      })
    );
  }

  private loadInitialData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.subscription.add(
      this.weatherService.getCurrentWeather(this.selectedCity()).pipe(
        catchError(err => {
          this.error.set(err.message);
          return EMPTY;
        })
      ).subscribe({
        next: (weather) => {
          this.currentWeather.set(weather);
          this.addTemperaturePoint(weather);
          this.isLoading.set(false);
          this.lastUpdate.set(new Date());
        },
        error: (err) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        }
      })
    );
  }

  private startRealtimeUpdates(): void {
    // Remove subscription anterior se existir
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    
    this.subscription.add(
      this.weatherService.getRealtimeWeatherStream(this.selectedCity()).subscribe({
        next: (point) => {
          this.addTemperaturePoint(point);
          this.error.set(null);
          this.lastUpdate.set(new Date());
          this.resetUpdateCountdown();
        },
        error: (err) => {
          this.error.set(err.message);
          console.error('Erro no stream de dados:', err);
        }
      })
    );
  }

  private startUpdateCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.nextUpdateCountdown--;
      if (this.nextUpdateCountdown <= 0) {
        this.resetUpdateCountdown();
      }
    }, 1000);
  }

  private resetUpdateCountdown(): void {
    this.nextUpdateCountdown = this.updateInterval;
  }

  private addTemperaturePoint(data: WeatherData | TemperaturePoint): void {
    const point: TemperaturePoint = 'main' in data ? {
      timestamp: new Date(),
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      day: new Date().getDate()
    } : data;

    this.temperatureData.update(current => {
      const updated = [...current, point];
      return updated.slice(-this.maxDataPoints); // Mantém apenas os últimos pontos
    });
  }

  onCityChange(): void {
    this.selectedCity.set(this.selectedCityValue);
    this.temperatureData.set([]); // Limpa dados anteriores
    this.loadInitialData();
  }

  refreshData(): void {
    this.loadInitialData();
    this.resetUpdateCountdown();
  }
}