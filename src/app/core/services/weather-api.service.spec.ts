import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherApiService } from './weather-api.service';
import { CacheService } from './cache.service';
import { environment } from '../../../environments/environment';

describe('WeatherApiService', () => {
  let service: WeatherApiService;
  let httpMock: HttpTestingController;
  let cacheService: jasmine.SpyObj<CacheService>;

  const mockForecast = {
    cod: '200',
    message: 0,
    cnt: 40,
    list: [
      {
        dt: 1640995200,
        main: { temp: 15.5, feels_like: 14.2, temp_min: 12.1, temp_max: 18.3, pressure: 1013, humidity: 65 },
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
        wind: { speed: 3.2, deg: 180 },
        dt_txt: '2022-01-01 12:00:00'
      }
    ],
    city: {
      id: 2643743, name: 'London', coord: { lat: 51.5085, lon: -0.1257 },
      country: 'GB', population: 1000000, timezone: 0, sunrise: 1640934000, sunset: 1640965200
    }
  };

  beforeEach(() => {
    const cacheSpy = jasmine.createSpyObj('CacheService', ['get', 'set', 'has']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WeatherApiService,
        { provide: CacheService, useValue: cacheSpy }
      ]
    });

    service = TestBed.inject(WeatherApiService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch forecast data', () => {
    cacheService.get.and.returnValue(null);

    service.getForecast('London', 'GB').subscribe(data => {
      expect(data).toEqual(mockForecast);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/forecast?q=London,GB&appid=${environment.apiKey}&units=metric&cnt=40`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockForecast);

    expect(cacheService.set).toHaveBeenCalled();
  });

  it('should return cached data when available', () => {
    cacheService.get.and.returnValue(mockForecast);

    service.getForecast('London', 'GB').subscribe(data => {
      expect(data).toEqual(mockForecast);
    });

    httpMock.expectNone(`${environment.apiUrl}/forecast`);
  });

  it('should handle API errors', () => {
    cacheService.get.and.returnValue(null);

    service.getForecast('InvalidCity').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.message).toContain('city not found');
      }
    });

    const req = httpMock.expectOne(req => req.url.includes('/forecast'));
    req.flush({ cod: '404', message: 'city not found' }, { status: 404, statusText: 'Not Found' });
  });

  it('should implement retry logic', () => {
    cacheService.get.and.returnValue(null);
    let attemptCount = 0;

    service.getForecast('London').subscribe({
      next: (data) => {
        expect(data).toEqual(mockForecast);
        expect(attemptCount).toBe(2); // Initial + 1 retry
      }
    });

    // First request fails
    const req1 = httpMock.expectOne(req => req.url.includes('/forecast'));
    attemptCount++;
    req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    // Retry succeeds
    setTimeout(() => {
      const req2 = httpMock.expectOne(req => req.url.includes('/forecast'));
      attemptCount++;
      req2.flush(mockForecast);
    }, environment.retryDelay + 100);
  });

  it('should check API health', () => {
    cacheService.get.and.returnValue(null);

    service.isApiHealthy().subscribe(isHealthy => {
      expect(isHealthy).toBe(true);
    });

    const req = httpMock.expectOne(req => req.url.includes('/weather'));
    req.flush({ temp: 20 });
  });
});