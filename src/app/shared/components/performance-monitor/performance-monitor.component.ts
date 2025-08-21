import { Component, ChangeDetectionStrategy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PerformanceService, PerformanceMetrics } from '../../../core/services/performance.service';
import { WebSocketService, ConnectionStatus } from '../../../core/services/websocket.service';
import { CacheService } from '../../../core/services/cache.service';

@Component({
  selector: 'app-performance-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-monitor" *ngIf="showMonitor()">
      <div class="monitor-header">
        <h4>Performance Monitor</h4>
        <button 
          class="toggle-button"
          (click)="toggleExpanded()"
          [attr.aria-expanded]="isExpanded()">
          {{ isExpanded() ? '−' : '+' }}
        </button>
      </div>
      
      <div class="monitor-content" *ngIf="isExpanded()">
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Memory Usage</span>
            <div class="metric-bar">
              <div 
                class="metric-fill"
                [style.width.%]="memoryUsagePercent()"
                [class.warning]="memoryUsagePercent() > 70"
                [class.critical]="memoryUsagePercent() > 90">
              </div>
            </div>
            <span class="metric-value">{{ memoryUsagePercent() }}%</span>
          </div>

          <div class="metric-item">
            <span class="metric-label">Connection</span>
            <span class="metric-value" [class]="connectionClass()">
              {{ connectionType() }}
            </span>
          </div>

          <div class="metric-item">
            <span class="metric-label">Online Status</span>
            <span class="metric-value" [class]="onlineClass()">
              {{ isOnline() ? 'Online' : 'Offline' }}
            </span>
          </div>

          <div class="metric-item" *ngIf="batteryLevel() !== null">
            <span class="metric-label">Battery</span>
            <span class="metric-value" [class]="batteryClass()">
              {{ batteryLevel() }}%
            </span>
          </div>

          <div class="metric-item">
            <span class="metric-label">WebSocket</span>
            <span class="metric-value" [class]="websocketClass()">
              {{ websocketStatus() }}
            </span>
          </div>

          <div class="metric-item">
            <span class="metric-label">Cache Size</span>
            <span class="metric-value">
              {{ cacheStats().size }} entries
            </span>
          </div>
        </div>

        <div class="recommendations" *ngIf="hasRecommendations()">
          <h5>Performance Recommendations</h5>
          <ul class="recommendation-list">
            <li *ngFor="let recommendation of recommendations()">
              {{ recommendation }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .performance-monitor {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      z-index: 10000;
      min-width: 280px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .monitor-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .toggle-button {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
    }

    .toggle-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .metric-grid {
      display: grid;
      gap: 8px;
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-label {
      min-width: 80px;
      font-weight: 500;
    }

    .metric-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }

    .metric-fill {
      height: 100%;
      background: #10b981;
      transition: width 0.3s ease;
    }

    .metric-fill.warning {
      background: #f59e0b;
    }

    .metric-fill.critical {
      background: #ef4444;
    }

    .metric-value {
      min-width: 60px;
      text-align: right;
      font-weight: 600;
    }

    .metric-value.good {
      color: #10b981;
    }

    .metric-value.warning {
      color: #f59e0b;
    }

    .metric-value.critical {
      color: #ef4444;
    }

    .recommendations {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .recommendations h5 {
      margin: 0 0 8px 0;
      font-size: 12px;
      font-weight: 600;
      color: #f59e0b;
    }

    .recommendation-list {
      margin: 0;
      padding-left: 16px;
      list-style-type: disc;
    }

    .recommendation-list li {
      margin-bottom: 4px;
      font-size: 11px;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .performance-monitor {
        position: relative;
        top: auto;
        right: auto;
        margin: 16px;
        min-width: auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceMonitorComponent {
  private destroyRef = inject(DestroyRef);
  private performanceService = inject(PerformanceService);
  private webSocketService = inject(WebSocketService);
  private cacheService = inject(CacheService);

  private metrics = signal<PerformanceMetrics>({
    memoryUsage: 0,
    connectionType: 'unknown',
    isOnline: true
  });

  private wsStatus = signal<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  private expanded = signal(false);
  private cacheStatsSignal = signal({ size: 0, hitRate: 0, memoryUsage: 0 });

  // Computed values
  public showMonitor = computed(() => !this.metrics().isOnline || this.metrics().memoryUsage > 0.5);
  public isExpanded = computed(() => this.expanded());
  public memoryUsagePercent = computed(() => Math.round(this.metrics().memoryUsage * 100));
  public connectionType = computed(() => this.metrics().connectionType);
  public isOnline = computed(() => this.metrics().isOnline);
  public batteryLevel = computed(() => this.metrics().batteryLevel ? Math.round(this.metrics().batteryLevel * 100) : null);
  public websocketStatus = computed(() => this.wsStatus());
  public cacheStats = computed(() => this.cacheStatsSignal());

  public connectionClass = computed(() => {
    const type = this.connectionType();
    if (['4g', 'wifi'].includes(type)) return 'good';
    if (type === '3g') return 'warning';
    return 'critical';
  });

  public onlineClass = computed(() => this.isOnline() ? 'good' : 'critical');
  
  public batteryClass = computed(() => {
    const level = this.batteryLevel();
    if (!level) return '';
    if (level > 50) return 'good';
    if (level > 20) return 'warning';
    return 'critical';
  });

  public websocketClass = computed(() => {
    const status = this.websocketStatus();
    if (status === ConnectionStatus.CONNECTED) return 'good';
    if (status === ConnectionStatus.CONNECTING) return 'warning';
    return 'critical';
  });

  public hasRecommendations = computed(() => this.recommendations().length > 0);

  public recommendations = computed(() => {
    const recs: string[] = [];
    const metrics = this.metrics();

    if (metrics.memoryUsage > 0.8) {
      recs.push('High memory usage detected. Consider refreshing the page.');
    }

    if (!metrics.isOnline) {
      recs.push('You are offline. Data updates are paused.');
    }

    if (['slow-2g', '2g'].includes(metrics.connectionType)) {
      recs.push('Slow connection detected. Update frequency has been reduced.');
    }

    if (metrics.isLowPowerMode) {
      recs.push('Low power mode detected. Animations and updates are reduced.');
    }

    if (this.cacheStats().size > 80) {
      recs.push('Cache is nearly full. Old entries will be automatically removed.');
    }

    return recs;
  });

  constructor() {
    this.subscribeToMetrics();
    this.subscribeToWebSocketStatus();
    this.updateCacheStats();
  }

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  private subscribeToMetrics(): void {
    this.performanceService.metrics$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(metrics => {
      this.metrics.set(metrics);
    });
  }

  private subscribeToWebSocketStatus(): void {
    this.webSocketService.status$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(status => {
      this.wsStatus.set(status);
    });
  }

  private updateCacheStats(): void {
    // Update cache stats periodically
    setInterval(() => {
      const stats = this.cacheService.getStats();
      this.cacheStatsSignal.set(stats);
    }, 5000);
  }
}