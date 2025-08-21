import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { WeatherChartComponent } from './weather-chart.component';
import { WeatherDataService } from '../../core/services/weather-data.service';

describe('WeatherChartComponent', () => {
  let component: WeatherChartComponent;
  let fixture: ComponentFixture<WeatherChartComponent>;
  let weatherDataService: jasmine.SpyObj<WeatherDataService>;

  const mockState = {
    data: {
      labels: ['Jan 01', 'Jan 02'],
      datasets: [{
        label: 'Temperature',
        data: [15, 18],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false
      }]
    },
    loading: false,
    error: null,
    lastUpdated: new Date()
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('WeatherDataService', ['setCity', 'refreshData'], {
      state$: of(mockState),
      city$: of('London')
    });

    await TestBed.configureTestingModule({
      imports: [WeatherChartComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: WeatherDataService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherChartComponent);
    component = fixture.componentInstance;
    weatherDataService = TestBed.inject(WeatherDataService) as jasmine.SpyObj<WeatherDataService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default city', () => {
    expect(component.cityInput).toBeTruthy();
  });

  it('should call weatherDataService.setCity when updateCity is called', () => {
    component.cityInput = 'Paris';
    component.updateCity();
    expect(weatherDataService.setCity).toHaveBeenCalledWith('Paris');
  });

  it('should call weatherDataService.refreshData when refreshData is called', () => {
    component.refreshData();
    expect(weatherDataService.refreshData).toHaveBeenCalled();
  });

  it('should display loading state correctly', () => {
    component['weatherState'].set({ ...mockState, loading: true });
    fixture.detectChanges();
    expect(component.isLoading()).toBeTruthy();
  });

  it('should display error state correctly', () => {
    const errorState = { ...mockState, error: 'Test error', loading: false };
    component['weatherState'].set(errorState);
    fixture.detectChanges();
    expect(component.hasError()).toBeTruthy();
    expect(component.errorMessage()).toBe('Test error');
  });

  it('should format last updated time correctly', () => {
    const testDate = new Date('2022-01-01T12:00:00Z');
    component['weatherState'].set({ ...mockState, lastUpdated: testDate });
    const formatted = component.formatLastUpdated();
    expect(formatted).toContain(':');
  });
});