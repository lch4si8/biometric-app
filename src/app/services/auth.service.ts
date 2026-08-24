import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RegisterRequest {
  email: string;
  faceVector: number[];
}

export interface RegisterResponse {
  message: string;
}

export interface LoginRequest {
  email: string;
  faceVector: number[];
}

export interface LoginResponse {
  requiresOtp: boolean;
  message?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  async register(email: string, faceVector: number[] | Float32Array): Promise<RegisterResponse> {
    const vectorArray = Array.isArray(faceVector) ? faceVector : Array.from(faceVector);
    const body: RegisterRequest = {
      email,
      faceVector: vectorArray,
    };

    return firstValueFrom(
      this.http.post<RegisterResponse>(`${this.apiUrl}/register`, body, {
        withCredentials: true,
      })
    );
  }

  async login(email: string, faceVector: number[] | Float32Array): Promise<LoginResponse> {
    const vectorArray = Array.isArray(faceVector) ? faceVector : Array.from(faceVector);
    const body: LoginRequest = {
      email,
      faceVector: vectorArray,
    };

    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, body, {
        withCredentials: true,
      })
    );
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
    const body: VerifyOtpRequest = {
      email,
      otp,
    };

    return firstValueFrom(
      this.http.post<VerifyOtpResponse>(`${this.apiUrl}/verify-otp`, body, {
        withCredentials: true,
      })
    );
  }
}
