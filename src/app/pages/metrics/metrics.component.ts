import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import {
  Chart,
  registerables,
} from 'chart.js';

import { BenchmarkService } from '../../services/benchmark.service';
import { BenchmarkResult, PersistedMetric } from '../../models/benchmark-result.interface';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterModule,
  ],
  templateUrl: './metrics.component.html',
  styleUrl: './metrics.component.scss',
})
export class MetricsComponent implements OnInit, OnDestroy {
  private benchmarkService = inject(BenchmarkService);

  // Signals del servicio
  readonly progress = this.benchmarkService.progress;
  readonly running = this.benchmarkService.running;
  readonly currentStep = this.benchmarkService.currentStep;

  // Estado local
  readonly hasResults = signal(false);
  readonly result = signal<BenchmarkResult | null>(null);
  readonly selectedBackend = signal<'wasm' | 'cpu'>('wasm');
  readonly history = signal<PersistedMetric[]>([]);

  // KPIs
  readonly kpiAntiReplay = signal('—');
  readonly kpiWasmSpeedup = signal('—');
  readonly kpiTotalMfa = signal('—');
  readonly kpiLatency = signal('—');
  readonly kpiDetection = signal('—');
  readonly kpiPayload = signal('—');
  readonly kpiThreshold = signal('0.80');
  readonly kpiTotalTime = signal('—');

  // Canvas references
  @ViewChild('histogramCanvas') histogramCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('latencyCanvas') latencyCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('latencyEvolutionCanvas') latencyEvolutionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('httpDistCanvas') httpDistCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rocCanvas') rocCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wasmVsCpuCanvas') wasmVsCpuCanvas!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadHistory();
  }

  setBackend(backend: 'wasm' | 'cpu'): void {
    if (!this.running()) {
      this.selectedBackend.set(backend);
    }
  }

  async loadHistory(): Promise<void> {
    const list = await this.benchmarkService.fetchMetricsHistory();
    this.history.set(list);
  }

  // Ejecutar benchmark

  async runBenchmark(): Promise<void> {
    this.destroyCharts();

    const benchmarkResult = await this.benchmarkService.runFullBenchmark(this.selectedBackend());
    this.result.set(benchmarkResult);
    this.hasResults.set(true);

    // Actualizar KPIs
    this.kpiAntiReplay.set(benchmarkResult.security.antiReplayRate + '%');
    this.kpiWasmSpeedup.set(benchmarkResult.client.wasmSpeedup.toFixed(1) + 'x');
    this.kpiTotalMfa.set(benchmarkResult.latency.totalMfaLatencyMs + ' ms');
    this.kpiLatency.set(benchmarkResult.latency.loginLatencyMs + ' ms');
    this.kpiDetection.set(benchmarkResult.biometric.detectionRate.toFixed(1) + '%');
    this.kpiPayload.set((benchmarkResult.client.payloadSizeBytes / 1024).toFixed(1) + ' KB');
    this.kpiTotalTime.set((benchmarkResult.totalDurationMs / 1000).toFixed(1) + ' s');

    // Recargar historial para reflejar la persistencia en DynamoDB
    await this.loadHistory();

    setTimeout(() => this.renderAllCharts(benchmarkResult), 0);
  }

  private renderAllCharts(r: BenchmarkResult): void {
    this.renderHistogram(r);
    this.renderLatencyBars(r);
    this.renderLatencyEvolution(r);
    this.renderHttpDistribution(r);
    this.renderRocCurve(r);
    this.renderWasmVsCpu(r);
  }

  // Distribución de Similitud Coseno
  private renderHistogram(r: BenchmarkResult): void {
    const ctx = this.histogramCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const bins = this.createHistogramBins(r.security.genuineSimilarities, r.security.impostorSimilarities);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bins.labels,
        datasets: [
          {
            label: 'Genuinos',
            data: bins.genuine,
            backgroundColor: 'rgba(0, 229, 160, 0.7)',
            borderColor: '#00e5a0',
            borderWidth: 1,
          },
          {
            label: 'Impostores',
            data: bins.impostor,
            backgroundColor: 'rgba(248, 113, 113, 0.7)',
            borderColor: '#f87171',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Distribución de Similitud Coseno', color: '#e2e8f0', font: { size: 14, weight: 'bold' as const } },
          legend: { labels: { color: '#94a3b8' } },
        },
        scales: {
          x: {
            title: { display: true, text: 'Similitud Coseno (SC)', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: 'Frecuencia', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Latencias por Fase
  private renderLatencyBars(r: BenchmarkResult): void {
    const ctx = this.latencyCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Registro', 'Login (genuino)', 'Login (impostor)', 'Verificar OTP', 'Total MFA'],
        datasets: [
          {
            label: 'Latencia (ms)',
            data: [
              r.latency.registerLatencyMs,
              r.latency.loginLatencyMs,
              r.latency.loginImpostorLatencyMs,
              r.latency.verifyOtpLatencyMs,
              r.latency.totalMfaLatencyMs,
            ],
            backgroundColor: [
              'rgba(96, 165, 250, 0.8)',
              'rgba(0, 229, 160, 0.8)',
              'rgba(248, 113, 113, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(34, 211, 238, 0.8)',
            ],
            borderColor: ['#60a5fa', '#00e5a0', '#f87171', '#8b5cf6', '#22d3ee'],
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Latencias por Fase del MFA', color: '#e2e8f0', font: { size: 14, weight: 'bold' as const } },
          legend: { display: false },
        },
        scales: {
          x: {
            title: { display: true, text: 'Tiempo (ms)', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: { color: '#e2e8f0', font: { size: 12 } },
            grid: { display: false },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Evolución temporal de latencias
  private renderLatencyEvolution(r: BenchmarkResult): void {
    const ctx = this.latencyEvolutionCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const hist = this.history();
    let labels: string[] = [];
    let registerData: number[] = [];
    let loginData: number[] = [];
    let verifyOtpData: number[] = [];
    let totalMfaData: number[] = [];

    if (hist.length > 0) {
      const recent = hist.slice(-8);
      labels = recent.map((h, i) => `#${i + 1} (${h.backend.toUpperCase()})`);
      registerData = recent.map((h) => h.registerLatencyMs);
      loginData = recent.map((h) => h.loginLatencyMs);
      verifyOtpData = recent.map((h) => h.verifyOtpLatencyMs);
      totalMfaData = recent.map((h) => h.totalMfaLatencyMs);
    } else {
      const history = r.latency.latencyHistory;
      labels = history.map((h) => `#${h.iteration} (${r.client.selectedBackend.toUpperCase()})`);
      registerData = history.map((h) => h.registerMs);
      loginData = history.map((h) => h.loginMs);
      verifyOtpData = history.map((h) => h.verifyOtpMs);
      totalMfaData = history.map((h) => h.totalMfaMs ?? (h.loginMs + h.verifyOtpMs));
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total MFA (ms)',
            data: totalMfaData,
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.15)',
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#22d3ee',
            borderWidth: 2,
          },
          {
            label: 'Login (ms)',
            data: loginData,
            borderColor: '#00e5a0',
            backgroundColor: 'rgba(0, 229, 160, 0.1)',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#00e5a0',
          },
          {
            label: 'Verify OTP (ms)',
            data: verifyOtpData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#8b5cf6',
          },
          {
            label: 'Registro (ms)',
            data: registerData,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#60a5fa',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Evolución Temporal de Latencias',
            color: '#e2e8f0',
            font: { size: 14, weight: 'bold' as const },
          },
          legend: { labels: { color: '#94a3b8' } },
        },
        scales: {
          x: {
            title: { display: true, text: 'Ejecución', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: 'Latencia (ms)', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            min: 0,
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Distribución de Respuestas HTTP
  private renderHttpDistribution(r: BenchmarkResult): void {
    const ctx = this.httpDistCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const hist = this.history();
    const aggregatedCounts: Record<string, number> = {};

    if (hist.length > 0) {
      for (const h of hist) {
        if (h.httpStatusCounts) {
          for (const [code, count] of Object.entries(h.httpStatusCounts)) {
            aggregatedCounts[code] = (aggregatedCounts[code] || 0) + Number(count);
          }
        }
      }
    }

    // Si no hay histórico acumulado en DynamoDB, usar la distribución de la ejecución actual
    if (Object.keys(aggregatedCounts).length === 0) {
      for (const d of r.usage.httpStatusDistribution) {
        const code = String(d.statusCode);
        aggregatedCounts[code] = (aggregatedCounts[code] || 0) + d.count;
      }
    }

    const statusColorMap: Record<string, string> = {
      '200': '#00e5a0',
      '201': '#60a5fa',
      '400': '#fbbf24',
      '401': '#f87171',
      '404': '#fb923c',
      '409': '#a78bfa',
      '500': '#ef4444',
    };

    const statusLabelsMap: Record<string, string> = {
      '200': '200 OK (Login/OTP)',
      '201': '201 Created (Registro)',
      '400': '400 Bad Request',
      '401': '401 Unauthorized (Anti-Replay)',
      '404': '404 Not Found',
      '409': '409 Conflict',
      '500': '500 Server Error',
    };

    const sortedCodes = Object.keys(aggregatedCounts).sort();
    const labels = sortedCodes.map(
      (code) => `${statusLabelsMap[code] || `HTTP ${code}`}: ${aggregatedCounts[code]}`
    );
    const data = sortedCodes.map((code) => aggregatedCounts[code]);
    const backgroundColor = sortedCodes.map((code) => statusColorMap[code] ?? '#64748b');

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderColor: '#0d1a2d',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Respuestas HTTP',
            color: '#e2e8f0',
            font: { size: 14, weight: 'bold' as const },
          },
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', padding: 12, font: { size: 11 } },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Curva ROC / DET
  private renderRocCurve(r: BenchmarkResult): void {
    const ctx = this.rocCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const rocData = r.security.rocCurve;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rocData.map((p) => p.threshold.toFixed(2)),
        datasets: [
          {
            label: 'FAR (%)',
            data: rocData.map((p) => p.far),
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#f87171',
          },
          {
            label: 'FRR (%)',
            data: rocData.map((p) => p.frr),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#60a5fa',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Curva DET — FAR vs FRR por Umbral', color: '#e2e8f0', font: { size: 14, weight: 'bold' as const } },
          legend: { labels: { color: '#94a3b8' } },
        },
        scales: {
          x: {
            title: { display: true, text: 'Umbral de Similitud', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: 'Tasa (%)', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            min: 0,
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Benchmark WASM vs CPU
  private renderWasmVsCpu(r: BenchmarkResult): void {
    const ctx = this.wasmVsCpuCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const wasmTimes = [...r.client.wasmInferenceTimesMs].sort((a, b) => a - b);
    const cpuTimes = [...r.client.cpuInferenceTimesMs].sort((a, b) => a - b);

    const percentile = (arr: number[], p: number) => arr[Math.floor((arr.length * p) / 100)] ?? 0;

    const labels = ['Media', 'P50', 'P90', 'P95', 'P99'];
    const wasmData = [
      r.client.wasmAvgMs,
      percentile(wasmTimes, 50),
      percentile(wasmTimes, 90),
      percentile(wasmTimes, 95),
      percentile(wasmTimes, 99),
    ];
    const cpuData = [
      r.client.cpuAvgMs,
      percentile(cpuTimes, 50),
      percentile(cpuTimes, 90),
      percentile(cpuTimes, 95),
      percentile(cpuTimes, 99),
    ];

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Float32Array (WASM-like)',
            data: wasmData,
            backgroundColor: 'rgba(34, 211, 238, 0.8)',
            borderColor: '#22d3ee',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Array JS (CPU)',
            data: cpuData,
            backgroundColor: 'rgba(251, 191, 36, 0.8)',
            borderColor: '#fbbf24',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Benchmark: WASM (${r.client.wasmSpeedup}x más rápido) vs CPU`,
            color: '#e2e8f0',
            font: { size: 14, weight: 'bold' as const },
          },
          legend: { labels: { color: '#94a3b8' } },
        },
        scales: {
          x: {
            ticks: { color: '#e2e8f0' },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: 'Tiempo (ms)', color: '#94a3b8' },
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            min: 0,
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Utilidades
  private createHistogramBins(genuine: number[], impostor: number[]) {
    const binCount = 20;
    const min = -0.2;
    const max = 1.0;
    const binWidth = (max - min) / binCount;

    const labels: string[] = [];
    const genuineBins = new Array(binCount).fill(0);
    const impostorBins = new Array(binCount).fill(0);

    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binWidth;
      labels.push(lo.toFixed(2));
    }

    for (const sc of genuine) {
      const idx = Math.min(Math.floor((sc - min) / binWidth), binCount - 1);
      if (idx >= 0 && idx < binCount) genuineBins[idx]++;
    }

    for (const sc of impostor) {
      const idx = Math.min(Math.floor((sc - min) / binWidth), binCount - 1);
      if (idx >= 0 && idx < binCount) impostorBins[idx]++;
    }

    return { labels, genuine: genuineBins, impostor: impostorBins };
  }

  private destroyCharts(): void {
    for (const chart of this.charts) {
      chart.destroy();
    }
    this.charts = [];
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
