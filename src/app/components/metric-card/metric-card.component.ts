// src/app/components/metric-card/metric-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metric-card" [class]="'border-l-4 border-' + color + '-500'">
      <div>
        <p class="text-sm text-gray-500 mb-1">{{ title }}</p>
        <p class="text-3xl font-bold" [class]="'text-' + color + '-600'">
          <span *ngIf="value !== null; else noData">{{ value }}{{ unit }}</span>
          <ng-template #noData>--</ng-template>
        </p>
        <p *ngIf="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
      </div>
      <div [class]="'bg-' + color + '-100 p-3 rounded-full'">
        <ng-container [ngSwitch]="icon">
          <!-- Thermometer -->
          <svg *ngSwitchCase="'thermometer'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          
          <!-- Arrow Up -->
          <svg *ngSwitchCase="'arrow-up'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 11l5-5m0 0l5 5m-5-5v12"/>
          </svg>
          
          <!-- Arrow Down -->
          <svg *ngSwitchCase="'arrow-down'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
          </svg>
          
          <!-- Droplets -->
          <svg *ngSwitchCase="'droplets'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
          </svg>
          
          <!-- Wind -->
          <svg *ngSwitchCase="'wind'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1a3 3 0 000-6h1m-6 6h6m6 0h-3a2 2 0 100 4h-1"/>
          </svg>
          
          <!-- Eye (Visibility) -->
          <svg *ngSwitchCase="'eye'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          
          <!-- Gauge -->
          <svg *ngSwitchCase="'gauge'" [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          
          <!-- Default Icon -->
          <svg *ngSwitchDefault [class]="'w-8 h-8 text-' + color + '-600'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .metric-card {
      transition: all 0.3s ease;
    }
    
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
  `]
})
export class MetricCardComponent {
  @Input() title: string = '';
  @Input() value: number | null = null;
  @Input() unit: string = '';
  @Input() subtitle?: string;
  @Input() icon: string = 'gauge';
  @Input() color: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'indigo' = 'blue';
}