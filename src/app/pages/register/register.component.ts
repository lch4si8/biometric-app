import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { CameraCaptureComponent } from '../../components/camera-capture/camera-capture.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    CameraCaptureComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  registerForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  step = signal<'email' | 'biometric'>('email');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  proceedToBiometric(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.step.set('biometric');
  }

  backToEmail(): void {
    this.step.set('email');
  }

  async onFaceCaptured(descriptor: Float32Array): Promise<void> {
    const email = this.registerForm.get('email')?.value;
    if (!email) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.register(email, descriptor);

      this.snackBar.open('¡Registro biométrico completado con éxito! Inicia sesión.', 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-success'],
      });

      this.router.navigate(['/login'], { queryParams: { email } });
    } catch (err: any) {
      console.error('Error registrando usuario:', err);
      const msg =
        err?.error?.message || err?.message || 'Error al conectar con el servidor de autenticación.';
      this.errorMessage.set(msg);
      this.snackBar.open(`Error: ${msg}`, 'Cerrar', {
        duration: 5000,
        panelClass: ['snackbar-error'],
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
