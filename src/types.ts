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
}

export function calculateHours(checkin: DailyCheckin): number {
  if (!checkin.checkInTime || !checkin.checkOutTime) return 0;
  
  const start = new Date(checkin.checkInTime).getTime();
  const end = new Date(checkin.checkOutTime).getTime();
  
  let totalMs = end - start;
  
  // Subtract lunch break if it exists
  if (checkin.lunchStartTime && checkin.lunchEndTime) {
    const lStart = new Date(checkin.lunchStartTime).getTime();
    const lEnd = new Date(checkin.lunchEndTime).getTime();
    const lunchMs = lEnd - lStart;
    totalMs -= lunchMs;
  }
  
  return totalMs / (1000 * 60 * 60);
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
