import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { 
  catchError, 
  retry, 
  retryWhen, 
  delayWhen, 
  take, 
  concatMap,
  tap,
  map
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WeatherForecast, ApiError } from '../models/weather.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly apiKey = environment.apiKey;

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  getForecast(city: string, countryCode?: string): Observable<WeatherForecast> {
    const location = countryCode ? `${city},${countryCode}` : city;
    const cacheKey = `forecast_${location}`;

    // Check cache first
    const cachedData = this.cacheService.get<WeatherForecast>(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    const params = new HttpParams()
      .set('q', location)
      .set('appid', this.apiKey)
      .set('units', 'metric')
      .set('cnt', '40'); // 5 days forecast (8 data points per day)

    return this.http.get<WeatherForecast>(`${this.baseUrl}/forecast`, { params })
      .pipe(
        tap(data => {
          // Cache the successful response
          this.cacheService.set(cacheKey, data, environment.cacheTimeout);
        }),
        retryWhen(errors => this.retryStrategy(errors)),
        catchError(this.handleError.bind(this))
      );
  }

  getCurrentWeather(city: string, countryCode?: string): Observable<any> {
    const location = countryCode ? `${city},${countryCode}` : city;
    const cacheKey = `current_${location}`;

    // Check cache first
    const cachedData = this.cacheService.get<any>(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    const params = new HttpParams()
      .set('q', location)
      .set('appid', this.apiKey)
      .set('units', 'metric');

    return this.http.get(`${this.baseUrl}/weather`, { params })
      .pipe(
        tap(data => {
          // Cache the successful response
          this.cacheService.set(cacheKey, data, environment.cacheTimeout);
        }),
        retryWhen(errors => this.retryStrategy(errors)),
        catchError(this.handleError.bind(this))
      );
  }

  private retryStrategy(errors: Observable<any>): Observable<any> {
    return errors.pipe(
      concatMap((error, index) => {
        const retryAttempt = index + 1;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          return throwError(() => error);
        }

        // Stop retrying after max attempts
        if (retryAttempt > environment.retryAttempts) {
          return throwError(() => error);
        }

        console.warn(`Retry attempt ${retryAttempt} after error:`, error.message);
        
        // Exponential backoff
        const delay = environment.retryDelay * Math.pow(2, retryAttempt - 1);
        return timer(delay);
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      const apiError = error.error as ApiError;
      errorMessage = apiError?.message || `Server Error: ${error.status} - ${error.message}`;
    }

    console.error('Weather API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Health check method
  isApiHealthy(): Observable<boolean> {
    return this.getCurrentWeather(environment.defaultCity, environment.defaultCountryCode)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }
}