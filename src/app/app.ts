import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WeatherChartComponent } from './features/weather-chart/weather-chart.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WeatherChartComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('weather-dashboard2');
}
