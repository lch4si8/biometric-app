import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface OtpDialogData {
  email: string;
}

@Component({
  selector: 'app-otp-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './otp-dialog.component.html',
  styleUrl: './otp-dialog.component.scss',
})
export class OtpDialogComponent {
  readonly dialogRef = inject(MatDialogRef<OtpDialogComponent>);
  readonly data = inject<OtpDialogData>(MAT_DIALOG_DATA);

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits = [0, 1, 2, 3, 4, 5];

  otpControls: FormControl<string>[] = [
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
    new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]$')] }),
  ];

  otpForm = new FormGroup({
    d0: this.otpControls[0],
    d1: this.otpControls[1],
    d2: this.otpControls[2],
    d3: this.otpControls[3],
    d4: this.otpControls[4],
    d5: this.otpControls[5],
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && value.length > 0) {
      const lastChar = value.slice(-1);
      if (/^[0-9]$/.test(lastChar)) {
        this.otpControls[index].setValue(lastChar);
        if (index < 5) {
          const nextInput = this.digitInputs.toArray()[index + 1]?.nativeElement;
          nextInput?.focus();
        }
      } else {
        this.otpControls[index].setValue('');
      }
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpControls[index].value && index > 0) {
      const prevInput = this.digitInputs.toArray()[index - 1]?.nativeElement;
      prevInput?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const cleanNumbers = pasted.replace(/\D/g, '').slice(0, 6);
    if (cleanNumbers.length === 6) {
      cleanNumbers.split('').forEach((num, i) => {
        this.otpControls[i]?.setValue(num);
      });
      const lastInput = this.digitInputs.toArray()[5]?.nativeElement;
      lastInput?.focus();
    }
  }

  get otpCode(): string {
    return this.otpControls.map((c) => c.value).join('');
  }

  submit(): void {
    if (this.otpForm.invalid || this.otpCode.length !== 6) {
      this.errorMessage.set('Por favor, introduce los 6 dígitos del código OTP.');
      return;
    }

    this.dialogRef.close(this.otpCode);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}