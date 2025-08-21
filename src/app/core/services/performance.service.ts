import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface PerformanceMetrics {
  memoryUsage: number;
  connectionType: string;
  isOnline: boolean;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics>({
    memoryUsage: 0,
    connectionType: 'unknown',
    isOnline: navigator.onLine
  });

  public readonly metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Monitor network status
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).pipe(
      debounceTime(1000)
    ).subscribe(() => {
      this.updateMetrics();
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      fromEvent(connection, 'change').pipe(
        debounceTime(1000)
      ).subscribe(() => {
        this.updateMetrics();
      });
    }

    // Monitor battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        fromEvent(battery, 'levelchange').pipe(
          debounceTime(5000)
        ).subscribe(() => {
          this.updateMetrics();
        });
      });
    }

    // Initial metrics update
    this.updateMetrics();

    // Periodic updates
    setInterval(() => this.updateMetrics(), 30000);
  }

  private updateMetrics(): void {
    const metrics: PerformanceMetrics = {
      memoryUsage: this.getMemoryUsage(),
      connectionType: this.getConnectionType(),
      isOnline: navigator.onLine
    };

    // Add battery info if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        metrics.batteryLevel = battery.level;
        metrics.isLowPowerMode = battery.level < 0.2;
        this.metricsSubject.next(metrics);
      });
    } else {
      this.metricsSubject.next(metrics);
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || connection.type || 'unknown';
    }
    return 'unknown';
  }

  shouldReduceUpdates(): boolean {
    const metrics = this.metricsSubject.value;
    return !metrics.isOnline || 
           metrics.memoryUsage > 0.8 || 
           metrics.isLowPowerMode === true ||
           ['slow-2g', '2g'].includes(metrics.connectionType);
  }

  getOptimalUpdateInterval(): number {
    const metrics = this.metricsSubject.value;
    
    if (!metrics.isOnline) return 0; // No updates when offline
    if (metrics.isLowPowerMode) return 600000; // 10 minutes
    if (['slow-2g', '2g'].includes(metrics.connectionType)) return 600000;
    if (metrics.connectionType === '3g') return 300000; // 5 minutes
    
    return 180000; // 3 minutes for good connections
  }
}