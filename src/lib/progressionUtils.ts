/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { UserProfile, EmployeeLevel, DailyCheckin } from '../types';
import { subDays, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';

/**
 * Checks if an employee is eligible for a level up based on performance.
 * Rule: 1 month (30 days) with average performance of 4.00.
 */
export async function checkLevelProgression(user: UserProfile): Promise<EmployeeLevel | null> {
  if (user.level === 'ouro') return null; // Already at max level

  const levelOrder: EmployeeLevel[] = ['bronze', 'prata', 'ouro'];
  const nextLevel = levelOrder[levelOrder.indexOf(user.level) + 1];

  // We check performance over the last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  
  // Also respect the last level up date - we need 30 days at the NEW level
  const referenceDate = user.lastLevelUpDate || user.createdAt;
  
  // If they haven't even been at this level for 30 days, they can't level up yet
  const daysAtCurrentLevel = (new Date().getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAtCurrentLevel < 30) {
    return null;
  }

  try {
    const q = query(
      collection(db, 'checkins'),
      where('userId', '==', user.id),
      where('timestamp', '>=', thirtyDaysAgo)
    );

    const snapshot = await getDocs(q);
    const checkins = snapshot.docs.map(d => d.data() as DailyCheckin);

    if (checkins.length < 20) {
      // Not enough data points to represent a full month of work (assuming ~5 days a week)
      return null;
    }

    const totalAverage = checkins.reduce((acc, curr) => acc + curr.averageScore, 0) / checkins.length;

    // Requirement: Performance of 4.00 (perfect score)
    if (totalAverage >= 4.0) {
      return nextLevel;
    }
  } catch (error) {
    console.error('Error checking progression:', error);
  }

  return null;
}

export async function processLevelUp(user: UserProfile, nextLevel: EmployeeLevel): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.id);
  const now = new Date().toISOString();
  
  const updates = {
    level: nextLevel,
    lastLevelUpDate: now
  };

  await updateDoc(userRef, updates);
  
  toast.success(`PARABÉNS! Você subiu para o nível ${nextLevel.toUpperCase()}!`, {
    description: 'Novos benefícios foram desbloqueados em sua aba de Carreira.',
    duration: 10000,
  });

  return { ...user, ...updates };
}
