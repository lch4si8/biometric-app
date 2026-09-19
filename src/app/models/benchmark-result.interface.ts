/**
 * Interfaces de resultados del benchmark de rendimiento
 * del sistema de autenticación biométrica MFA.
 */

// Métricas Biométricas (Motor Facial)

export interface BiometricMetrics {
  // Tiempo de carga de modelos SSD MobileNet + Landmarks + ResNet-34 (ms)
  modelLoadTimeMs: number;
  // Tiempos de inferencia facial individuales por iteración (ms)
  inferenceTimesMs: number[];
  // Media de tiempos de inferencia (ms)
  inferenceAvgMs: number;
  // Tasa de detección facial (%) — rostros detectados / intentos totales
  detectionRate: number;
  // Backend TF.js activo ('wasm' | 'cpu')
  tfBackend: string;
  // Valores de Similitud Coseno obtenidos en las pruebas
  cosineSimilarities: number[];
}

// Métricas de Rendimiento del Cliente

export interface ClientMetrics {
  // Tamaño del payload JSON con el vector 128D (bytes)
  payloadSizeBytes: number;
  // Uso de memoria JS heap durante inferencia (MB) — puede ser null si no disponible
  heapUsageMb: number | null;
  // Backend seleccionado para el benchmark ('wasm' | 'cpu')
  selectedBackend: 'wasm' | 'cpu';
  // Tiempos de inferencia con backend WASM (ms)
  wasmInferenceTimesMs: number[];
  // Tiempos de inferencia con backend CPU (ms)
  cpuInferenceTimesMs: number[];
  // Media de inferencia WASM (ms)
  wasmAvgMs: number;
  // Media de inferencia CPU (ms)
  cpuAvgMs: number;
  // Factor de aceleración de WASM frente a CPU (ej: 3.9x)
  wasmSpeedup: number;
}

// Métricas de Latencia End-to-End

export interface LatencyMetrics {
  // Latencia de POST /register (ms)
  registerLatencyMs: number;
  // Latencia de POST /login con vector genuino (ms)
  loginLatencyMs: number;
  // Latencia de POST /login con vector impostor (ms)
  loginImpostorLatencyMs: number;
  // Latencia de POST /verify-otp (ms)
  verifyOtpLatencyMs: number;
  // Tiempo total del flujo MFA: login + verify-otp (ms)
  totalMfaLatencyMs: number;
  // Histórico de latencias por iteración para el gráfico de evolución
  latencyHistory: LatencyHistoryEntry[];
}

export interface LatencyHistoryEntry {
  iteration: number;
  registerMs: number;
  loginMs: number;
  verifyOtpMs: number;
  totalMfaMs?: number;
}

// Métricas de Seguridad

export interface SecurityMetrics {
  // Tasa de Falsa Aceptación (%)
  far: number;
  // Tasa de Falso Rechazo (%)
  frr: number;
  // Tasa de bloqueo de Replay Attacks (%) — objetivo 100%
  antiReplayRate: number;
  // Intentos fallidos de login (SC < 0.8) durante el benchmark
  failedLoginAttempts: number;
  // OTPs expirados durante el benchmark
  expiredOtps: number;
  // Puntos de la curva ROC/DET: { threshold, far, frr }
  rocCurve: RocPoint[];
  // Similitudes coseno de pares genuinos
  genuineSimilarities: number[];
  // Similitudes coseno de pares impostores
  impostorSimilarities: number[];
}

export interface RocPoint {
  threshold: number;
  far: number;
  frr: number;
}

// Métricas de Uso y Disponibilidad

export interface UsageMetrics {
  // Total de registros exitosos (201)
  successfulRegistrations: number;
  // Total de logins exitosos (200)
  successfulLogins: number;
  // Total de logins fallidos (401/404)
  failedLogins: number;
  // Tasa de éxito OTP (%)
  otpSuccessRate: number;
  // Distribución de códigos HTTP por endpoint
  httpStatusDistribution: HttpStatusEntry[];
}

export interface HttpStatusEntry {
  endpoint: string;
  statusCode: number;
  count: number;
}

// Métricas Persistidas en DynamoDB

export interface PersistedMetric {
  id: string;
  timestamp: string;
  backend: 'wasm' | 'cpu';
  totalMfaLatencyMs: number;
  loginLatencyMs: number;
  verifyOtpLatencyMs: number;
  registerLatencyMs: number;
  wasmSpeedup: number;
  antiReplayRate: number;
  detectionRate: number;
  similarityThreshold: number;
  totalDurationMs: number;
  httpStatusCounts?: Record<string, number>;
}

// Resultado Raíz

export interface BenchmarkResult {
  timestamp: string;
  iterations: number;
  totalDurationMs: number;
  persistedId?: string;

  biometric: BiometricMetrics;
  client: ClientMetrics;
  latency: LatencyMetrics;
  security: SecurityMetrics;
  usage: UsageMetrics;
}
