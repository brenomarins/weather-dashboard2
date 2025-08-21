import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { WeatherDataService } from './weather-data.service';
import { WeatherApiService } from './weather-api.service';
import { WeatherForecast } from '../models/weather.model';

describe('WeatherDataService', () => {
  let service: WeatherDataService;
  let weatherApiService: jasmine.SpyObj<WeatherApiService>;

  const mockForecast: WeatherForecast = {
    cod: '200',
    message: 0,
    cnt: 40,
    list: [
      {
        dt: 1640995200,
        main: {
          temp: 15.5,
          feels_like: 14.2,
          temp_min: 12.1,
          temp_max: 18.3,
          pressure: 1013,
          humidity: 65
        },
        weather: [{
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d'
        }],
        wind: {
          speed: 3.2,
          deg: 180
        },
        dt_txt: '2022-01-01 12:00:00'
      }
    ],
    city: {
      id: 2643743,
      name: 'London',
      coord: { lat: 51.5085, lon: -0.1257 },
      country: 'GB',
      population: 1000000,
      timezone: 0,
      sunrise: 1640934000,
      sunset: 1640965200
    }
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('WeatherApiService', ['getForecast']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WeatherDataService,
        { provide: WeatherApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(WeatherDataService);
    weatherApiService = TestBed.inject(WeatherApiService) as jasmine.SpyObj<WeatherApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default state', () => {
    const state = service.getCurrentState();
    expect(state.data).toBeNull();
    expect(state.loading).toBeFalse();
    expect(state.error).toBeNull();
    expect(state.lastUpdated).toBeNull();
  });

  it('should update city', () => {
    const newCity = 'Paris';
    service.setCity(newCity);
    
    service.city$.subscribe(city => {
      expect(city).toBe(newCity);
    });
  });

  it('should handle API success', (done) => {
    weatherApiService.getForecast.and.returnValue(of(mockForecast));
    
    service.state$.subscribe(state => {
      if (state.data && !state.loading) {
        expect(state.error).toBeNull();
        expect(state.data).toBeTruthy();
        expect(state.lastUpdated).toBeTruthy();
        done();
      }
    });

    service.refreshData();
  });

  it('should handle API error', (done) => {
    const errorMessage = 'API Error';
    weatherApiService.getForecast.and.returnValue(throwError(() => new Error(errorMessage)));
    
    service.state$.subscribe(state => {
      if (state.error && !state.loading) {
        expect(state.error).toBe(errorMessage);
        expect(state.data).toBeNull();
        done();
      }
    });

    service.refreshData();
  });

  afterEach(() => {
    service.ngOnDestroy();
  });
});