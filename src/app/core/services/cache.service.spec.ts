import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve data', () => {
    const testData = { test: 'data' };
    const key = 'test-key';
    const ttl = 60000; // 1 minute

    service.set(key, testData, ttl);
    const retrieved = service.get(key);

    expect(retrieved).toEqual(testData);
  });

  it('should return null for expired data', (done) => {
    const testData = { test: 'data' };
    const key = 'test-key';
    const ttl = 100; // 100ms

    service.set(key, testData, ttl);

    setTimeout(() => {
      const retrieved = service.get(key);
      expect(retrieved).toBeNull();
      done();
    }, 150);
  });

  it('should check if key exists', () => {
    const key = 'test-key';
    expect(service.has(key)).toBe(false);

    service.set(key, 'data', 60000);
    expect(service.has(key)).toBe(true);
  });

  it('should delete entries', () => {
    const key = 'test-key';
    service.set(key, 'data', 60000);
    
    expect(service.has(key)).toBe(true);
    service.delete(key);
    expect(service.has(key)).toBe(false);
  });

  it('should clear all entries', () => {
    service.set('key1', 'data1', 60000);
    service.set('key2', 'data2', 60000);
    
    expect(service.size()).toBe(2);
    service.clear();
    expect(service.size()).toBe(0);
  });

  it('should cleanup expired entries', (done) => {
    service.set('key1', 'data1', 100); // 100ms TTL
    service.set('key2', 'data2', 60000); // 1 minute TTL

    setTimeout(() => {
      service.cleanup();
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(true);
      done();
    }, 150);
  });

  it('should implement LRU eviction', () => {
    // Mock environment to have small cache size
    spyOn(service as any, 'evictLRU').and.callThrough();
    
    // Fill cache beyond max size (assuming maxCacheSize is mocked to be small)
    for (let i = 0; i < 60; i++) {
      service.set(`key${i}`, `data${i}`, 60000);
    }

    expect((service as any).evictLRU).toHaveBeenCalled();
  });

  it('should provide cache statistics', () => {
    service.set('key1', 'data1', 60000);
    service.set('key2', 'data2', 60000);

    const stats = service.getStats();
    expect(stats.size).toBe(2);
    expect(typeof stats.memoryUsage).toBe('number');
    expect(stats.memoryUsage).toBeGreaterThan(0);
  });
});