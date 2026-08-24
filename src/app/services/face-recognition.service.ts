import { Injectable, signal } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

@Injectable({
  providedIn: 'root',
})
export class FaceRecognitionService {
  private isModelLoaded = signal(false);
  private isLoading = signal(false);
  private loadError = signal<string | null>(null);

  readonly modelsLoaded = this.isModelLoaded.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly error = this.loadError.asReadonly();

  async initialize(): Promise<boolean> {
    if (this.isModelLoaded()) {
      return true;
    }

    if (this.isLoading()) {
      return false;
    }

    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      // Configurar backend a través del motor de TensorFlow.js
      if ((faceapi as any).tf) {
        await (faceapi as any).tf.ready();
        console.log(`[FaceRecognitionService] Backend TensorFlow.js activo: ${(faceapi as any).tf.getBackend()}`);
      }

      // Cargar las redes neuronales de face-api (SSD MobileNet v1, Landmarks 68, ResNet-34)
      const modelPath = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      ]);

      this.isModelLoaded.set(true);
      console.log('[FaceRecognitionService] Modelos ResNet-34 cargados exitosamente.');
      return true;
    } catch (err: any) {
      const msg = `Error al cargar modelos biométricos: ${err?.message || err}`;
      console.error(msg, err);
      this.loadError.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Extrae el descriptor facial (vector maestro de 128 dimensiones).
   * La lógica garantiza que los datos se procesan estrictamente en la memoria RAM (Float32Array)
   */
  async extractDescriptor(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<Float32Array | null> {
    if (!this.isModelLoaded()) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Los modelos biométricos no han podido inicializarse.');
      }
    }

    const detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      return null;
    }

    // Retorna Float32Array de 128 elementos
    return detection.descriptor;
  }
}
