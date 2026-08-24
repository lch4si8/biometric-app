import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface UserSession {
  email: string;
  authenticatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private currentSession = signal<UserSession | null>(null);

  readonly user = this.currentSession.asReadonly();
  readonly isAuthenticated = computed(() => this.currentSession() !== null);
  readonly userEmail = computed(() => this.currentSession()?.email ?? '');
  readonly userName = computed(() => {
    const email = this.currentSession()?.email;
    if (!email) return 'Usuario';
    return email.split('@')[0];
  });

  constructor(private router: Router) {}

  setSession(email: string): void {
    this.currentSession.set({
      email,
      authenticatedAt: new Date(),
    });
  }

  logout(): void {
    this.currentSession.set(null);
    this.router.navigate(['/login']);
  }
}
