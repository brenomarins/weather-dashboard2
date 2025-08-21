import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, concatMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retryWhen(errors => this.retryStrategy(errors)),
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        return throwError(() => error);
      })
    );
  }

  private retryStrategy(errors: Observable<HttpErrorResponse>): Observable<any> {
    return errors.pipe(
      concatMap((error, index) => {
        const retryAttempt = index + 1;
        
        // Don't retry on client errors (4xx) except 408, 429
        if (error.status >= 400 && error.status < 500 && 
            error.status !== 408 && error.status !== 429) {
          return throwError(() => error);
        }

        // Stop retrying after max attempts
        if (retryAttempt > environment.retryAttempts) {
          return throwError(() => error);
        }

        // Exponential backoff with jitter
        const delay = this.calculateRetryDelay(retryAttempt);
        console.warn(`Retry attempt ${retryAttempt} in ${delay}ms`);
        
        return timer(delay);
      }),
      take(environment.retryAttempts)
    );
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = environment.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }
}