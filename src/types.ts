/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  employeeId: string;
  sector: string;
  isAdmin?: boolean;
  createdAt: string;
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
