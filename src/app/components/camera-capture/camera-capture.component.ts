import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FaceRecognitionService } from '../../services/face-recognition.service';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './camera-capture.component.html',
  styleUrl: './camera-capture.component.scss',
})
export class CameraCaptureComponent implements AfterViewInit, OnDestroy {
  private faceService = inject(FaceRecognitionService);

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() faceCaptured = new EventEmitter<Float32Array>();

  stream: MediaStream | null = null;
  status = signal('Inicializando cámara...');
  isCameraActive = signal(false);
  isProcessing = signal(false);
  hasCaptured = signal(false);
  errorMessage = signal<string | null>(null);

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  async startCamera(): Promise<void> {
    this.errorMessage.set(null);
    this.status.set('Accediendo a la cámara...');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.stream;
        this.isCameraActive.set(true);
        this.status.set('Cámara activa. Encuadra tu rostro y presiona "Capturar".');
      }

      // Pre-cargar modelos en segundo plano si no están listos
      this.faceService.initialize().catch((err) => {
        console.warn('Error precargando modelos:', err);
      });
    } catch (error: any) {
      const msg = `No se pudo acceder a la cámara: ${error?.message || error}`;
      this.status.set(msg);
      this.errorMessage.set(msg);
      this.isCameraActive.set(false);
    }
  }

  async capture(): Promise<void> {
    if (!this.stream || this.isProcessing()) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.isProcessing.set(true);
    this.status.set('Procesando biometría facial...');
    this.errorMessage.set(null);

    try {
      // Ajuste de contraste para nitidez
      ctx.filter = 'contrast(110%) saturate(120%)';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Inferencia con ResNet-34 sobre el canvas
      const descriptor = await this.faceService.extractDescriptor(canvas);

      if (!descriptor) {
        this.status.set('No se detectó ningún rostro con suficiente claridad.');
        this.errorMessage.set('No se detectó un rostro claro. Asegúrate de tener buena iluminación.');
        this.isProcessing.set(false);
        return;
      }

      this.hasCaptured.set(true);
      this.status.set('¡Rostro detectado y vector extraído con éxito!');

      // Emitir descriptor Float32Array
      this.faceCaptured.emit(descriptor);
    } catch (err: any) {
      const errorMsg = `Error en el análisis biométrico: ${err?.message || err}`;
      this.status.set(errorMsg);
      this.errorMessage.set(errorMsg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  retry(): void {
    this.hasCaptured.set(false);
    this.errorMessage.set(null);
    this.status.set('Cámara activa. Encuadra tu rostro y presiona "Capturar".');
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  ngOnDestroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
