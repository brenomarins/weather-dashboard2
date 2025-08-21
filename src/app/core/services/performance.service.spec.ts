import { TestBed } from '@angular/core/testing';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should provide initial metrics', (done) => {
    service.metrics$.subscribe(metrics => {
      expect(metrics).toBeDefined();
      expect(typeof metrics.isOnline).toBe('boolean');
      expect(typeof metrics.connectionType).toBe('string');
      expect(typeof metrics.memoryUsage).toBe('number');
      done();
    });
  });

  it('should determine if updates should be reduced', () => {
    // Mock poor performance conditions
    spyOn(service as any, 'getMemoryUsage').and.returnValue(0.9);
    spyOn(service as any, 'getConnectionType').and.returnValue('2g');
    
    const shouldReduce = service.shouldReduceUpdates();
    expect(shouldReduce).toBe(true);
  });

  it('should calculate optimal update interval', () => {
    // Mock good performance conditions
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    spyOn(service as any, 'getConnectionType').and.returnValue('4g');
    
    const interval = service.getOptimalUpdateInterval();
    expect(interval).toBe(180000); // 3 minutes for good connections
  });

  it('should return 0 interval when offline', () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    
    const interval = service.getOptimalUpdateInterval();
    expect(interval).toBe(0);
  });
});