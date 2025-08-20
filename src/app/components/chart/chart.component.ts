// src/app/components/chart/chart.component.ts
import { 
  Component, 
  Input, 
  OnInit, 
  OnChanges, 
  SimpleChanges, 
  ViewChild, 
  ElementRef, 
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { TemperaturePoint } from '../../core/services/weather-api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full">
      <!-- Loading State -->
      <div *ngIf="isLoading" 
           class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
        <div class="flex flex-col items-center space-y-3">
          <div class="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p class="text-sm text-gray-600">Carregando dados do gráfico...</p>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="!isLoading && data.length === 0" 
           class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p class="text-lg font-medium text-gray-500 mb-2">Aguardando dados</p>
          <p class="text-sm text-gray-400">Os dados de temperatura aparecerão aqui em breve</p>
        </div>
      </div>
      
      <!-- Chart Canvas -->
      <canvas #chartCanvas 
              class="w-full h-full"
              [class.opacity-30]="isLoading">
      </canvas>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 400px;
    }
    
    @media (max-width: 768px) {
      :host {
        height: 300px;
      }
    }
  `]
})
export class ChartComponent implements OnInit, OnChanges {
  @Input() data: TemperaturePoint[] = [];
  @Input() isLoading = false;
  
  @ViewChild('chartCanvas', { static: true }) 
  canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | null = null;
  private chartData = signal<TemperaturePoint[]>([]);

  constructor() {
    // Effect para reagir a mudanças nos dados
    effect(() => {
      const currentData = this.chartData();
      if (currentData.length > 0) {
        this.updateChart();
      }
    });
  }

  ngOnInit(): void {
    this.initializeChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && changes['data'].currentValue) {
      this.chartData.set(changes['data'].currentValue);
    }
  }

  private initializeChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: [],
        datasets: [{
          label: 'Temperatura (°C)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 500
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            titleFont: {
              family: 'Inter, sans-serif',
              size: 14,
              weight: 600
            },
            bodyFont: {
              family: 'Inter, sans-serif',
              size: 13
            },
            padding: 12,
            callbacks: {
              title: (context) => {
                const point = this.data[context[0].dataIndex];
                return `${point.hour.toString().padStart(2, '0')}:${point.minute.toString().padStart(2, '0')}`;
              },
              label: (context) => {
                const point = this.data[context.dataIndex];
                return [
                  `🌡️ Temperatura: ${point.temperature}°C`,
                  `💧 Umidade: ${point.humidity}%`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Horário',
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 500
              },
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(229, 231, 235, 0.5)',
                          },
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 11
              },
              color: '#6b7280',
              maxTicksLimit: 8,
              callback: function(value, index) {
                // Mostra apenas alguns labels para evitar sobreposição
                const data = (this as any).chart.data.labels;
                if (data && index % Math.ceil(data.length / 6) === 0) {
                  return data[index];
                }
                return '';
              }
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Temperatura (°C)',
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 500
              },
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(229, 231, 235, 0.5)',
                          },
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 11
              },
              color: '#6b7280',
              callback: function(value) {
                return value + '°C';
              }
            },
            beginAtZero: false
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart'
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) return;

    const labels = this.data.map(point => 
      `${point.hour.toString().padStart(2, '0')}:${point.minute.toString().padStart(2, '0')}`
    );
    
    const temperatures = this.data.map(point => point.temperature);

    // Atualiza dados do gráfico
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = temperatures;

    // Ajusta escala Y baseada nos dados
    if (temperatures.length > 0) {
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);
      const padding = (maxTemp - minTemp) * 0.1 || 2;
      
      if (this.chart.options.scales && this.chart.options.scales['y']) {
        (this.chart.options.scales['y'] as any).min = Math.floor(minTemp - padding);
        (this.chart.options.scales['y'] as any).max = Math.ceil(maxTemp + padding);
      }
    }

    // Animação suave para novos dados
    this.chart.update('active');
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}