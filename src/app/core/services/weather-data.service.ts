import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, EMPTY, Subject } from 'rxjs';
import { 
  switchMap, 
  catchError, 
  takeUntil, 
  distinctUntilChanged,
  debounceTime,
  share,
  startWith
} from 'rxjs/operators';
import { format, isToday, parseISO } from 'date-fns';
import { WeatherApiService } from './weather-api.service';
import { WeatherForecast, ChartDataPoint, WeatherChartData } from '../models/weather.model';
import { environment } from '../../../environments/environment';

export interface WeatherState {
  data: WeatherChartData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherDataService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private citySubject = new BehaviorSubject<string>(environment.defaultCity);
  private stateSubject = new BehaviorSubject<WeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  public readonly state$ = this.stateSubject.asObservable();
  public readonly city$ = this.citySubject.asObservable();

  private dataStream$: Observable<WeatherForecast>;

  constructor(private weatherApi: WeatherApiService) {
    this.initializeDataStream();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setCity(city: string): void {
    if (city && city.trim() !== this.citySubject.value) {
      this.citySubject.next(city.trim());
    }
  }

  getCurrentState(): WeatherState {
    return this.stateSubject.value;
  }

  refreshData(): void {
    this.loadWeatherData();
  }

  private initializeDataStream(): void {
    this.dataStream$ = this.city$.pipe(
      debounceTime(300), // Debounce city changes
      distinctUntilChanged(),
      switchMap(city => {
        this.updateState({ loading: true, error: null });
        return this.weatherApi.getForecast(city, environment.defaultCountryCode);
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: error.message || 'Failed to load weather data' 
        });
        return EMPTY;
      }),
      share() // Share the stream among multiple subscribers
    );
  }

  private startPolling(): void {
    // Initial load
    this.loadWeatherData();

    // Set up polling interval
    interval(environment.updateInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.dataStream$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (forecast) => this.processWeatherData(forecast),
        error: (error) => this.handleError(error)
      });
  }

  private loadWeatherData(): void {
    this.dataStream$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (forecast) => this.processWeatherData(forecast),
        error: (error) => this.handleError(error)
      });
  }

  private processWeatherData(forecast: WeatherForecast): void {
    try {
      const chartData = this.transformToChartData(forecast);
      this.updateState({
        data: chartData,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private transformToChartData(forecast: WeatherForecast): WeatherChartData {
    // Filter data for current month and group by day
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const dailyData = new Map<string, { temps: number[], date: Date }>();

    forecast.list.forEach(item => {
      const date = parseISO(item.dt_txt);
      
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const dayKey = format(date, 'yyyy-MM-dd');
        
        if (!dailyData.has(dayKey)) {
          dailyData.set(dayKey, { temps: [], date });
        }
        
        dailyData.get(dayKey)!.temps.push(item.main.temp);
      }
    });

    // Calculate daily averages and prepare chart data
    const labels: string[] = [];
    const temperatures: number[] = [];
    const minTemps: number[] = [];
    const maxTemps: number[] = [];

    Array.from(dailyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dayKey, { temps, date }]) => {
        const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);

        labels.push(format(date, 'MMM dd'));
        temperatures.push(Math.round(avgTemp * 10) / 10);
        minTemps.push(Math.round(minTemp * 10) / 10);
        maxTemps.push(Math.round(maxTemp * 10) / 10);
      });

    return {
      labels,
      datasets: [
        {
          label: 'Average Temperature (°C)',
          data: temperatures,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'Min Temperature (°C)',
          data: minTemps,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'Max Temperature (°C)',
          data: maxTemps,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };
  }

  private updateState(partialState: Partial<WeatherState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }

  private handleError(error: any): void {
    console.error('Weather data service error:', error);
    this.updateState({
      loading: false,
      error: error?.message || 'An unexpected error occurred'
    });
  }
}