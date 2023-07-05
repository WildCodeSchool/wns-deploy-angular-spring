import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HealthCheckService {

  constructor(
    private readonly http: HttpClient
  ) {
  }

  isConnectedToBackend(): Observable<boolean> {
    return this.http.get('/api/ping', {
      responseType: 'text',
      headers: new HttpHeaders({ timeout: '2000' })
    })
      .pipe(
        timeout(2000),
        catchError((err) => of('no')),
        map(responseText => responseText == "pong")
      );
  }
}
