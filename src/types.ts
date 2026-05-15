/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmployeeLevel = 'bronze' | 'prata' | 'ouro';

export interface UserProfile {
  id: string;
  name: string;
  employeeId: string;
  sector: string;
  isAdmin?: boolean;
  createdAt: string;
  level: EmployeeLevel;
  lastLevelUpDate?: string;
  preferredDayOff?: string; // e.g., "Segunda-feira"
  preferredSundaysOff?: string[]; // e.g., ["Primeiro", "Terceiro"]
}

export interface DailyCheckin {
  id?: string;
  userId: string;
  userName: string;
  sector: string;
  date: string;
  timestamp: string;
  responses: Record<string, number>;
  totalScore: number;
  averageScore: number;
  comments: string;
  anonymous: boolean;
  checkInTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  checkOutTime?: string;
  totalWorkHours?: number;
  feedbackBonusMinutes?: number;
}

export interface SectorStats {
  sector: string;
  averageScore: number;
  count: number;
  alert: boolean;
}

export interface Message {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderSector: string;
  timestamp: string;
}

export type ReportCategory = 'assédio_moral' | 'assédio_sexual' | 'abuso_autoridade' | 'outros';
export type ReportStatus = 'recebida' | 'em_análise' | 'resolvida';

export interface AnonymousReport {
  id?: string;
  protocol: string;
  category: ReportCategory;
  description: string;
  evidenceUrl?: string; // URL for optional evidence
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  voiceNarration: boolean;
}
