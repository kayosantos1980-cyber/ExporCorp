/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Fingerprint, X, CheckCircle2, History, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserProfile, DailyCheckin } from '@/src/types';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { formatTimeDisplay } from '@/src/lib/timeUtils';
import { toast } from 'sonner';

interface FloatingPunchClockProps {
  user: UserProfile;
}

type PunchState = 'idle' | 'scanning' | 'success' | 'history';

export default function FloatingPunchClock({ user }: FloatingPunchClockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<PunchState>('idle');
  const [todayRecord, setTodayRecord] = useState<DailyCheckin | null>(null);
  const [history, setHistory] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const timerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<any>(null);
  const HOLD_DURATION = 3000;

  const startHolding = () => {
    if (todayRecord?.checkOutTime !== undefined || state !== 'idle') return;
    
    setHoldProgress(0);
    const startTime = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
      
      if (elapsed >= HOLD_DURATION) {
        clearInterval(intervalRef.current);
        clearTimeout(timerRef.current);
        setHoldProgress(0);
        handlePunch();
      }
    }, 50);

    timerRef.current = setTimeout(() => {}, HOLD_DURATION);
  };

  const stopHolding = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHoldProgress(0);
  };

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    // Listen for today's record
    const q = query(
      collection(db, 'checkins'),
      where('userId', '==', user.id),
      where('date', '==', todayDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as DailyCheckin;
        setTodayRecord({ id: snapshot.docs[0].id, ...data });
      } else {
        setTodayRecord(null);
      }
    });

    // Fetch history
    const historyQ = query(
      collection(db, 'checkins'),
      where('userId', '==', user.id),
      orderBy('date', 'desc')
    );

    const unsubscribeHistory = onSnapshot(historyQ, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyCheckin));
      setHistory(records);
    });

    return () => {
      unsubscribe();
      unsubscribeHistory();
    };
  }, [user, todayDate]);

  const calculateHours = (record: DailyCheckin): number => {
    if (!record.checkInTime) return 0;
    
    let morningMinutes = 0;
    let afternoonMinutes = 0;

    if (record.checkInTime && record.lunchStartTime) {
      morningMinutes = differenceInMinutes(parseISO(record.lunchStartTime), parseISO(record.checkInTime));
    }

    if (record.lunchEndTime && record.checkOutTime) {
      afternoonMinutes = differenceInMinutes(parseISO(record.checkOutTime), parseISO(record.lunchEndTime));
    } else if (record.checkInTime && record.checkOutTime && !record.lunchStartTime) {
      // Direct shift without lunch
      morningMinutes = differenceInMinutes(parseISO(record.checkOutTime), parseISO(record.checkInTime));
    }

    const bonusHours = (record.feedbackBonusMinutes || 0) / 60;
    return ((morningMinutes + afternoonMinutes) / 60) + bonusHours;
  };

  const totalAccumulatedHours = history.reduce((acc, curr) => acc + (curr.totalWorkHours || 0), 0);

  const handlePunch = async () => {
    setState('scanning');
    
    // Simulate biometric scan
    setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        let updateData: Partial<DailyCheckin> = {};
        let message = '';

        if (!todayRecord) {
          // First punch: Entrada
          const newDoc: Partial<DailyCheckin> = {
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
          await addDoc(collection(db, 'checkins'), newDoc);
          message = 'Ponto de Entrada registrado!';
        } else {
          // Sequence check
          if (!todayRecord.lunchStartTime) {
            updateData.lunchStartTime = now;
            message = 'Entrada do Almoço registrada!';
          } else if (!todayRecord.lunchEndTime) {
            updateData.lunchEndTime = now;
            message = 'Saída de Almoço registrada!';
          } else if (!todayRecord.checkOutTime) {
            updateData.checkOutTime = now;
            message = 'Saída do Trabalho registrada!';
            
            // Final calculation
            const tempRecord = { ...todayRecord, checkOutTime: now };
            updateData.totalWorkHours = calculateHours(tempRecord);
          } else {
            toast.info('Ponto de hoje já concluído!');
            setState('idle');
            return;
          }

          await updateDoc(doc(db, 'checkins', todayRecord.id!), updateData);
        }

        toast.success(message);
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } catch (error) {
        console.error('Error punching:', error);
        toast.error('Falha na biometria. Tente novamente.');
        setState('idle');
      }
    }, 2000);
  };

  const getNextActionLabel = () => {
    if (!todayRecord) return 'Registrar Entrada';
    if (!todayRecord.lunchStartTime) return 'Entrada Almoço';
    if (!todayRecord.lunchEndTime) return 'Saída Almoço';
    if (!todayRecord.checkOutTime) return 'Saída Trabalho';
    return 'Ponto Concluído';
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="mb-2"
            >
              <Card className="w-80 shadow-2xl border-blue-100 dark:border-blue-900 overflow-hidden">
                <CardHeader className="bg-blue-600 text-white p-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                       <Clock className="w-4 h-4" /> Meu Ponto
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setState(state === 'history' ? 'idle' : 'history')}>
                        <History className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-blue-100 text-xs font-bold">
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {state === 'history' ? (
                    <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black uppercase text-slate-400">Total Acumulado</h4>
                        <span className="text-sm font-black text-blue-600">{formatTimeDisplay(totalAccumulatedHours)}</span>
                      </div>
                      {history.map((h) => (
                        <div key={h.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{format(parseISO(h.date), 'dd/MM/yyyy')}</p>
                            <div className="flex gap-2 text-[9px] font-bold text-slate-500 uppercase mt-1">
                              <span>E: {h.checkInTime ? format(parseISO(h.checkInTime), 'HH:mm') : '--'}</span>
                              <span>S: {h.checkOutTime ? format(parseISO(h.checkOutTime), 'HH:mm') : '--'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                               {h.totalWorkHours ? formatTimeDisplay(h.totalWorkHours) : 'Em aberto'}
                             </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 space-y-6 text-center">
                      <AnimatePresence mode="wait">
                        {state === 'idle' && (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                          >
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Ação</p>
                              <h3 className="text-xl font-black text-blue-600">{getNextActionLabel()}</h3>
                            </div>
                            
                            <Button 
                              size="lg"
                              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-lg font-black uppercase tracking-tighter gap-3 shadow-xl shadow-blue-500/20 relative overflow-hidden select-none touch-none transition-all active:scale-95"
                              onMouseDown={startHolding}
                              onMouseUp={stopHolding}
                              onMouseLeave={stopHolding}
                              onTouchStart={startHolding}
                              onTouchEnd={stopHolding}
                              disabled={todayRecord?.checkOutTime !== undefined || state !== 'idle'}
                            >
                              {holdProgress > 0 && (
                                <motion.div 
                                  className="absolute bottom-0 left-0 h-1 bg-white/40 z-10"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${holdProgress}%` }}
                                  transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                                />
                              )}
                              
                              {holdProgress > 0 ? (
                                <span className="animate-pulse flex items-center gap-2">
                                  <Clock className="w-5 h-5" /> Segure...
                                </span>
                              ) : (
                                <>
                                  <Fingerprint className="w-8 h-8" /> 
                                  Bater Ponto
                                </>
                              )}
                            </Button>

                            <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase text-slate-500">
                              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                                Entrada: {todayRecord?.checkInTime ? format(parseISO(todayRecord.checkInTime), 'HH:mm') : '--:--'}
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                                Saída: {todayRecord?.checkOutTime ? format(parseISO(todayRecord.checkOutTime), 'HH:mm') : '--:--'}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {state === 'scanning' && (
                          <motion.div
                            key="scanning"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="py-8 space-y-4"
                          >
                            <div className="relative mx-auto w-24 h-24">
                              <motion.div
                                animate={{ 
                                  y: [0, 80, 0],
                                  opacity: [0.5, 1, 0.5]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-blue-400/20 rounded-lg border-t-2 border-blue-500 z-10"
                              />
                              <Fingerprint className="w-24 h-24 text-blue-500 animate-pulse" />
                            </div>
                            <p className="text-sm font-black text-blue-600 uppercase animate-pulse">Aguardando Biometria...</p>
                            <p className="text-[10px] text-slate-400">Posicione seu dedo no sensor</p>
                          </motion.div>
                        )}

                        {state === 'success' && (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8 space-y-4 text-emerald-500"
                          >
                            <CheckCircle2 className="w-20 h-20 mx-auto" />
                            <p className="text-lg font-black uppercase">Ponto Registrado!</p>
                            <p className="text-xs text-slate-400">Verificado via Identidade Digital</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center border-4 border-white dark:border-slate-800 transition-all duration-300 ${isOpen ? 'bg-slate-900 rotate-90' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </Button>
      </div>
    </>
  );
}

import { ptBR } from 'date-fns/locale';
