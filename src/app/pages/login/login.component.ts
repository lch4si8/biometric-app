import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CameraCaptureComponent } from '../../components/camera-capture/camera-capture.component';
import { OtpDialogComponent } from '../../components/otp-dialog/otp-dialog.component';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-login',
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
    MatDialogModule,
    CameraCaptureComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  step = signal<'email' | 'biometric'>('email');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) {
      this.loginForm.patchValue({ email: emailParam });
    }
  }

  proceedToBiometric(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.step.set('biometric');
  }

  backToEmail(): void {
    this.step.set('email');
  }

  async onFaceCaptured(descriptor: Float32Array): Promise<void> {
    const email = this.loginForm.get('email')?.value;
    if (!email) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      // 1. Enviar vector a backend para cálculo de Distancia Coseno
      const loginRes = await this.authService.login(email, descriptor);

      // 2. Si la distancia es válida, el backend genera OTP y lo envía con Amazon SES
      this.openOtpModal(email);
    } catch (err: any) {
      console.error('Error durante autenticación biométrica:', err);
      const status = err?.status;
      let msg = 'Identidad no verificada. El patrón facial no coincide con el registrado.';
      if (status === 404) {
        msg = 'No se encontró ningún usuario registrado con ese correo electrónico.';
      } else if (err?.error?.message) {
        msg = err.error.message;
      }
      this.errorMessage.set(msg);
      this.snackBar.open(msg, 'Cerrar', {
        duration: 6000,
        panelClass: ['snackbar-error'],
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private openOtpModal(email: string): void {
    const dialogRef = this.dialog.open(OtpDialogComponent, {
      data: { email },
      disableClose: true,
      panelClass: 'custom-dialog-container',
      backdropClass: 'custom-dialog-backdrop',
    });

    dialogRef.afterClosed().subscribe(async (otp: string | null) => {
      if (!otp) return;

      this.isSubmitting.set(true);
      this.errorMessage.set(null);

      try {
        await this.authService.verifyOtp(email, otp);

        // Guardar sesión en memoria y redirigir
        this.sessionService.setSession(email);

        this.snackBar.open('¡Autenticación completada con éxito!', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });

        this.router.navigate(['/dashboard']);
      } catch (err: any) {
        console.error('Error validando OTP:', err);
        const msg =
          err?.error?.message ||
          'Código OTP inválido o expirado. Por favor, vuelve a intentar el inicio de sesión.';
        this.errorMessage.set(msg);
        this.snackBar.open(msg, 'Cerrar', {
          duration: 6000,
          panelClass: ['snackbar-error'],
        });
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
