import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  ViewChild, 
  ElementRef,
  AfterViewInit,
  signal,
  computed,
  inject,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

import { WeatherDataService, WeatherState } from '../../core/services/weather-data.service';
import { PerformanceService } from '../../core/services/performance.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { PerformanceMonitorComponent } from '../../shared/components/performance-monitor/performance-monitor.component';
import { environment } from '../../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-weather-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, ErrorMessageComponent, PerformanceMonitorComponent],
  template: `
    <div class="weather-chart-container">
      <app-performance-monitor></app-performance-monitor>
      
      <div class="chart-header">
        <div class="header-content">
          <h1 class="chart-title">Weather Temperature Trends</h1>
          <p class="chart-subtitle">Real-time temperature data for {{ currentCity() }}</p>
        </div>
        
        <div class="controls">
          <div class="city-input-group">
            <label for="cityInput" class="city-label">City:</label>
            <input
              id="cityInput"
              type="text"
              [(ngModel)]="cityInput"
              (keyup.enter)="updateCity()"
              (blur)="updateCity()"
              class="city-input"
              placeholder="Enter city name"
              [disabled]="isLoading()"
            />
          </div>
          
          <button 
            class="refresh-button"
            (click)="refreshData()"
            [disabled]="isLoading()"
            type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div class="chart-status" *ngIf="lastUpdated()">
        <span class="status-text">Last updated: {{ formatLastUpdated() }}</span>
        <span class="status-indicator" [class.active]="!isLoading()"></span>
      </div>

      <div class="chart-wrapper">
        <app-loading-spinner 
          *ngIf="isLoading() && !hasData()"
          [overlay]="false"
          message="Loading weather data..."
          [size]="48">
        </app-loading-spinner>

        <app-error-message
          *ngIf="hasError() && !isLoading()"
          title="Failed to Load Weather Data"
          [message]="errorMessage()"
          [showRetry]="true"
          (retry)="refreshData()">
        </app-error-message>

        <div class="chart-container" *ngIf="hasData() && !hasError()">
          <canvas 
            #chartCanvas
            class="weather-chart"
            [class.loading]="isLoading()">
          </canvas>
          
          <app-loading-spinner 
            *ngIf="isLoading() && hasData()"
            [overlay]="true"
            message="Updating data..."
            [size]="32">
          </app-loading-spinner>
        </div>

        <div class="empty-state" *ngIf="!hasData() && !isLoading() && !hasError()">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
          </div>
          <h3>No Weather Data Available</h3>
          <p>Click refresh to load weather data for {{ currentCity() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .weather-chart-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .header-content {
      flex: 1;
    }

    .chart-title {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.2;
    }

    .chart-subtitle {
      margin: 0;
      color: #6b7280;
      font-size: 1rem;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .city-input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .city-label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .city-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      min-width: 200px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .city-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .city-input:disabled {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .refresh-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .refresh-button:hover:not(:disabled) {
      background: #2563eb;
    }

    .refresh-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .chart-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
    }

    .status-text {
      font-size: 0.875rem;
      color: #64748b;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      transition: background-color 0.3s;
    }

    .status-indicator.active {
      background: #10b981;
    }

    .chart-wrapper {
      position: relative;
      min-height: 400px;
    }

    .chart-container {
      position: relative;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
    }

    .weather-chart {
      max-width: 100%;
      height: 400px;
      transition: opacity 0.3s;
    }

    .weather-chart.loading {
      opacity: 0.6;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      color: #6b7280;
    }

    .empty-icon {
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .weather-chart-container {
        padding: 1rem;
      }

      .chart-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .controls {
        flex-direction: column;
        align-items: stretch;
      }

      .city-input {
        min-width: auto;
      }

      .chart-title {
        font-size: 1.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeatherChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();
  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;

  // Signals for reactive state management
  private weatherState = signal<WeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  private performanceMetrics = signal({
    memoryUsage: 0,
    connectionType: 'unknown',
    isOnline: true,
    shouldReduceAnimations: false
  });
  public cityInput = environment.defaultCity;

  // Computed signals for template
  public isLoading = computed(() => this.weatherState().loading);
  public hasError = computed(() => !!this.weatherState().error);
  public hasData = computed(() => !!this.weatherState().data);
  public errorMessage = computed(() => this.weatherState().error || '');
  public lastUpdated = computed(() => this.weatherState().lastUpdated);
  public currentCity = computed(() => this.cityInput);
  public shouldShowPerformanceWarning = computed(() => 
    this.performanceMetrics().memoryUsage > 0.8 || 
    !this.performanceMetrics().isOnline
  );

  constructor(
    private weatherDataService: WeatherDataService,
    private performanceService: PerformanceService
  ) {}

  ngOnInit(): void {
    this.subscribeToWeatherData();
    this.subscribeToCityChanges();
    this.subscribeToPerformanceMetrics();
  }

  ngAfterViewInit(): void {
    this.initializeChart();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyChart();
    this.cleanupResizeObserver();
    this.cancelAnimationFrame();
  }

  updateCity(): void {
    if (this.cityInput.trim()) {
      this.weatherDataService.setCity(this.cityInput.trim());
    }
  }

  refreshData(): void {
    this.weatherDataService.refreshData();
  }

  formatLastUpdated(): string {
    const lastUpdated = this.lastUpdated();
    if (!lastUpdated) return '';
    
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private subscribeToWeatherData(): void {
    this.weatherDataService.state$.pipe(
      debounceTime(100), // Debounce rapid state changes
      distinctUntilChanged((prev, curr) => 
        prev.loading === curr.loading && 
        prev.error === curr.error &&
        prev.data === curr.data
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(state => {
      this.weatherState.set(state);
      this.scheduleChartUpdate(state.data);
    });
  }

  private subscribeToPerformanceMetrics(): void {
    this.performanceService.metrics$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(metrics => {
      this.performanceMetrics.set({
        memoryUsage: metrics.memoryUsage,
        connectionType: metrics.connectionType,
        isOnline: metrics.isOnline,
        shouldReduceAnimations: metrics.memoryUsage > 0.7 || 
                               ['slow-2g', '2g'].includes(metrics.connectionType)
      });
      
      // Adjust chart performance based on metrics
      this.adjustChartPerformance();
    });
  }

  private scheduleChartUpdate(data: any): void {
    // Use requestAnimationFrame for smooth updates
    this.cancelAnimationFrame();
    
    this.animationFrameId = requestAnimationFrame(() => {
      this.updateChart(data);
    });
  }

  private cancelAnimationFrame(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private setupResizeObserver(): void {
    if (!this.chartCanvas?.nativeElement || !('ResizeObserver' in window)) {
      return;
    }

    this.resizeObserver = new ResizeObserver(entries => {
      // Debounce resize events
      this.cancelAnimationFrame();
      this.animationFrameId = requestAnimationFrame(() => {
        if (this.chart) {
          this.chart.resize();
        }
      });
    });

    this.resizeObserver.observe(this.chartCanvas.nativeElement);
  }

  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private adjustChartPerformance(): void {
    if (!this.chart) return;

    const metrics = this.performanceMetrics();
    const shouldReduceAnimations = metrics.shouldReduceAnimations;

    // Adjust chart options based on performance
    if (this.chart.options.animation) {
      this.chart.options.animation.duration = shouldReduceAnimations ? 0 : 750;
    }

    // Reduce point radius on low-end devices
    if (this.chart.options.elements?.point) {
      this.chart.options.elements.point.radius = shouldReduceAnimations ? 2 : 4;
    }

    this.chart.update('none'); // Update without animation
  }

  private subscribeToWeatherDataLegacy(): void {
    this.weatherDataService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.weatherState.set(state);
        this.updateChart(state.data);
      });
  }

  private subscribeToCityChanges(): void {
    this.weatherDataService.city$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(city => {
        this.cityInput = city;
      });
  }

  private initializeChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          title: {
            display: true,
            text: 'Temperature Trends - Current Month',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Temperature (°C)'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        elements: {
          point: {
            radius: 4,
            hoverRadius: 6
          },
          line: {
            borderWidth: 2
          }
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
          onComplete: () => {
            // Callback when animation completes
            console.log('Chart animation completed');
          }
        },
        // Performance optimizations
        parsing: {
          xAxisKey: 'x',
          yAxisKey: 'y'
        },
        datasets: {
          line: {
            pointHoverRadius: 8,
            pointHitRadius: 10
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(data: any): void {
    if (!this.chart || !data) return;

    // Performance optimization: only update if data actually changed
    const currentData = JSON.stringify(this.chart.data);
    const newData = JSON.stringify(data);
    
    if (currentData === newData) {
      return; // No update needed
    }
    this.chart.data = data;
    
    // Use different update modes based on performance
    const metrics = this.performanceMetrics();
    const updateMode = metrics.shouldReduceAnimations ? 'none' : 'active';
    
    this.chart.update(updateMode);
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  // Method to export chart as image (useful for sharing/reports)
  exportChart(): string | null {
    if (!this.chart) return null;
    
    return this.chart.toBase64Image('image/png', 1.0);
  }

  // Method to get chart performance metrics
  getChartMetrics(): any {
    return {
      isInitialized: !!this.chart,
      dataPoints: this.chart?.data?.datasets?.[0]?.data?.length || 0,
      performanceMetrics: this.performanceMetrics(),
      lastUpdate: this.lastUpdated()
    };
  }
}