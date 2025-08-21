import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, NEVER } from 'rxjs';
import { 
  webSocket, 
  WebSocketSubject 
} from 'rxjs/webSocket';
import { 
  retry, 
  retryWhen, 
  delay, 
  takeUntil, 
  catchError,
  tap,
  switchMap
} from 'rxjs/operators';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket$: WebSocketSubject<any> | null = null;
  private messagesSubject = new Subject<WebSocketMessage>();
  private statusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  private destroy$ = new Subject<void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  public readonly messages$ = this.messagesSubject.asObservable();
  public readonly status$ = this.statusSubject.asObservable();

  constructor() {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  connect(url: string): void {
    if (this.socket$) {
      this.disconnect();
    }

    this.statusSubject.next(ConnectionStatus.CONNECTING);

    this.socket$ = webSocket({
      url,
      openObserver: {
        next: () => {
          console.log('WebSocket connected');
          this.statusSubject.next(ConnectionStatus.CONNECTED);
          this.reconnectAttempts = 0;
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket disconnected');
          this.statusSubject.next(ConnectionStatus.DISCONNECTED);
          this.handleReconnection();
        }
      }
    });

    this.socket$.pipe(
      retry({
        count: this.maxReconnectAttempts,
        delay: (error, retryCount) => {
          console.warn(`WebSocket retry attempt ${retryCount}:`, error);
          return timer(this.reconnectInterval * Math.pow(2, retryCount - 1));
        }
      }),
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('WebSocket error:', error);
        this.statusSubject.next(ConnectionStatus.ERROR);
        return NEVER;
      })
    ).subscribe({
      next: (message) => {
        this.messagesSubject.next({
          type: message.type || 'data',
          data: message,
          timestamp: Date.now()
        });
      },
      error: (error) => {
        console.error('WebSocket stream error:', error);
        this.statusSubject.next(ConnectionStatus.ERROR);
      }
    });
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.statusSubject.next(ConnectionStatus.DISCONNECTED);
  }

  send(message: any): void {
    if (this.socket$ && this.statusSubject.value === ConnectionStatus.CONNECTED) {
      this.socket$.next(message);
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      timer(delay).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.statusSubject.value === ConnectionStatus.DISCONNECTED) {
          // Reconnect logic would go here
          console.log('Reconnection attempt...');
        }
      });
    } else {
      console.error('Max reconnection attempts reached');
      this.statusSubject.next(ConnectionStatus.ERROR);
    }
  }

  isConnected(): boolean {
    return this.statusSubject.value === ConnectionStatus.CONNECTED;
  }
}