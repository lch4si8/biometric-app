import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SessionService } from '../../services/session.service';

interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  isPositive: boolean;
  icon: string;
}

interface AssetAllocation {
  name: string;
  percentage: number;
  colorClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private sessionService = inject(SessionService);

  readonly userName = this.sessionService.userName;
  readonly userEmail = this.sessionService.userEmail;

  totalBalance = '124.562,80 €';
  monthlyChange = '+4.250,50 € (3,5%) este mes';

  assets: AssetAllocation[] = [
    { name: 'Acciones', percentage: 65, colorClass: 'actions-bar' },
    { name: 'Criptomonedas', percentage: 20, colorClass: 'crypto-bar' },
    { name: 'Efectivo', percentage: 15, colorClass: 'cash-bar' },
  ];

  transactions: Transaction[] = [
    {
      id: '1',
      title: 'Apple Inc.',
      subtitle: 'Hoy, 14:30',
      amount: '150,00 €',
      isPositive: false,
      icon: 'shopping_bag',
    },
    {
      id: '2',
      title: 'Transferencia recibida',
      subtitle: 'Ayer, 09:15',
      amount: '+3.200,00 €',
      isPositive: true,
      icon: 'account_balance',
    },
    {
      id: '3',
      title: 'Starbucks',
      subtitle: 'Ayer, 08:45',
      amount: '4,50 €',
      isPositive: false,
      icon: 'local_cafe',
    },
    {
      id: '4',
      title: 'Dividendo Vanguard',
      subtitle: '15 Jul, 10:00',
      amount: '+125,40 €',
      isPositive: true,
      icon: 'trending_up',
    },
  ];

  // Puntos del gráfico de área de rendimiento anual (normalizados)
  chartPoints = [
    { x: 0, y: 130 },
    { x: 75, y: 120 },
    { x: 145, y: 80 },
    { x: 220, y: 110 },
    { x: 295, y: 35 },
    { x: 370, y: 70 },
  ];

  logout(): void {
    this.sessionService.logout();
  }
}
