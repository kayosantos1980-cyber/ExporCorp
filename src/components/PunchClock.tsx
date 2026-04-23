/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/src/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { UserProfile, DailyCheckin } from '@/src/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, LogIn, Utensils, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PunchClockProps {
  user: UserProfile;
  onContinue: () => void;
}

export default function PunchClock({ user, onContinue }: PunchClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<DailyCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchTodayRecord();
    return () => clearInterval(timer);
  }, []);

  const fetchTodayRecord = async () => {
    try {
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.id),
        where('date', '==', todayDate)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setTodayRecord({ id: docSnap.id, ...docSnap.data() } as DailyCheckin);
      }
    } catch (error) {
      console.error('Error fetching punch record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (type: 'checkIn' | 'lunchStart' | 'lunchEnd') => {
    setActionLoading(true);
    const now = new Date().toISOString();
    try {
      if (type === 'checkIn') {
        const newRecord: Partial<DailyCheckin> = {
          userId: user.id,
          userName: user.name,
          sector: user.sector,
          date: todayDate,
          timestamp: now,
          checkInTime: now,
          anonymous: false,
          responses: {},
          totalScore: 0,
          averageScore: 0,
          comments: ''
        };
        const docRef = await addDoc(collection(db, 'checkins'), newRecord);
        setTodayRecord({ id: docRef.id, ...newRecord } as DailyCheckin);
        toast.success('Entrada registrada com sucesso!');
      } else {
        if (!todayRecord?.id) return;
        const updateData: Partial<DailyCheckin> = {};
        if (type === 'lunchStart') updateData.lunchStartTime = now;
        if (type === 'lunchEnd') updateData.lunchEndTime = now;

        await updateDoc(doc(db, 'checkins', todayRecord.id), updateData);
        setTodayRecord({ ...todayRecord, ...updateData });
        toast.success('Ponto atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Punch error:', error);
      toast.error('Erro ao registrar ponto.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12">Carregando ponto eletrônico...</div>;
  }

  const hasCheckIn = !!todayRecord?.checkInTime;
  const hasLunchStart = !!todayRecord?.lunchStartTime;
  const hasLunchEnd = !!todayRecord?.lunchEndTime;

  return (
    <Card className="max-w-md mx-auto border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-2xl">
      <CardHeader className="bg-blue-600 text-white pb-8">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-black italic tracking-tight uppercase">Ponto Digital</CardTitle>
            <CardDescription className="text-blue-100">Bem-vindo, {user.name}</CardDescription>
          </div>
          <Clock className="w-8 h-8 opacity-50" />
        </div>
        <div className="mt-6 text-center">
          <div className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-md">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm font-bold opacity-80 mt-1 uppercase tracking-widest">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Chegada */}
          {!hasCheckIn ? (
            <Button 
              className="h-16 text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 gap-3"
              onClick={() => handlePunch('checkIn')}
              disabled={actionLoading}
            >
              <LogIn className="w-5 h-5" /> REGISTRAR CHEGADA
            </Button>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-blue-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Chegada Registrada</p>
                  <p className="text-lg font-black tabular-nums">{format(new Date(todayRecord!.checkInTime!), 'HH:mm')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Almoço Ida */}
          <div className="grid grid-cols-2 gap-4">
            {!hasLunchStart ? (
              <Button 
                variant="outline"
                className="h-24 flex-col text-[10px] font-black uppercase tracking-tighter border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => handlePunch('lunchStart')}
                disabled={!hasCheckIn || actionLoading}
              >
                <Utensils className="w-6 h-6 mb-2 text-blue-600" />
                Saída Almoço
              </Button>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/50 p-2 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Início Almoço</p>
                <p className="text-xl font-black tabular-nums text-blue-600">{format(new Date(todayRecord!.lunchStartTime!), 'HH:mm')}</p>
              </div>
            )}

            {!hasLunchEnd ? (
              <Button 
                variant="outline"
                className="h-24 flex-col text-[10px] font-black uppercase tracking-tighter border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => handlePunch('lunchEnd')}
                disabled={!hasLunchStart || actionLoading}
              >
                <RotateCcw className="w-6 h-6 mb-2 text-blue-600" />
                Volta Almoço
              </Button>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/50 p-2 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Volta Almoço</p>
                <p className="text-xl font-black tabular-nums text-blue-600">{format(new Date(todayRecord!.lunchEndTime!), 'HH:mm')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <Button 
            className="w-full h-12 font-black bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onContinue}
            disabled={!hasCheckIn}
          >
            Continuar para o Feedback
          </Button>
          {!hasCheckIn && (
            <p className="text-[10px] text-center text-red-500 font-bold uppercase animate-pulse">
              * Registro de chegada obrigatório para prosseguir
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
