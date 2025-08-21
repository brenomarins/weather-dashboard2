import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, share } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {
  private inFlightRequests = new Map<string, Observable<HttpEvent<any>>>();

  constructor(private cacheService: CacheService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    const cacheKey = this.getCacheKey(req);
    
    // Check if request is already in flight
    const inFlightRequest = this.inFlightRequests.get(cacheKey);
    if (inFlightRequest) {
      return inFlightRequest;
    }

    // Check cache first
    const cachedResponse = this.cacheService.get<HttpResponse<any>>(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Make request and cache response
    const request$ = next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cacheService.set(cacheKey, event, this.getCacheTTL(req));
        }
      }),
      share()
    );

    // Store in-flight request
    this.inFlightRequests.set(cacheKey, request$);

    // Clean up in-flight request when complete
    request$.subscribe({
      complete: () => this.inFlightRequests.delete(cacheKey),
      error: () => this.inFlightRequests.delete(cacheKey)
    });

    return request$;
  }

  private getCacheKey(req: HttpRequest<any>): string {
    return `${req.method}_${req.urlWithParams}`;
  }

  private getCacheTTL(req: HttpRequest<any>): number {
    // Different TTL based on endpoint
    if (req.url.includes('/weather')) {
      return 300000; // 5 minutes for current weather
    }
    if (req.url.includes('/forecast')) {
      return 600000; // 10 minutes for forecast
    }
    return 300000; // Default 5 minutes
  }
}