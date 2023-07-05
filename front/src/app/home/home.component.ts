import { Component } from '@angular/core';
import { Observable, interval, map, mergeMap, share } from 'rxjs';
import { HealthCheckService } from '../health.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  connectionStatus: Observable<string>;
  connectionCssClass: Observable<string>;
  isConnected: Observable<boolean>;

  constructor(
    healthCheckService: HealthCheckService
  ) {
    this.isConnected =
      interval(1000)
        .pipe(
          mergeMap(() => healthCheckService.isConnectedToBackend()),
          share()
        );

        this.connectionStatus = this.isConnected.pipe(
          map(value => value ? "Yes" : "No"),
        );
        this.connectionCssClass = this.isConnected.pipe(
          map(value => value ? "connected" : "disconnected"),
        );
  }

  get AppVersion(): string {
    return environment.production ? "Production" : "dev"
  }

  get AppVersionClass(): string {
    return environment.production ? "prod" : "dev"
  }
}
