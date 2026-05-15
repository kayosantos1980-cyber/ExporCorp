/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, cloneElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { UserProfile, DailyCheckin } from '../types';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatTimeDisplay } from '../lib/timeUtils';
import { Clock, LogIn, Utensils, LogOut, CheckCircle2, MessageSquare, Fingerprint, History, CalendarDays, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useA11y } from '../lib/A11yContext';

import { handleFirestoreError } from '../lib/firebase';

import CareerProgression from './CareerProgression';

interface EmployeeHomeProps {
  user: UserProfile;
  onStartFeedback: () => void;
  onNavigateToReports?: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function EmployeeHome({ user, onStartFeedback, onNavigateToReports, onUpdateUser }: EmployeeHomeProps) {
  const { speak } = useA11y();
  const [activeTab, setActiveTab] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUpdateModal, setShowUpdateModal] = useState(() => {
    return !localStorage.getItem('update_1_4_seen');
  });
  const [todayRecord, setTodayRecord] = useState<DailyCheckin | null>(null);
  const [history, setHistory] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Listen for today's record
    const q = query(
      collection(db, 'checkins'),
      where('userId', '==', user.id),
      where('date', '==', todayDate)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as DailyCheckin;
          setTodayRecord({ id: snapshot.docs[0].id, ...data });
        } else {
          setTodayRecord(null);
        }
        setLoading(false);
      },
      (error) => handleFirestoreError(error, 'list', 'checkins')
    );

    // Fetch history
    const historyQ = query(
      collection(db, 'checkins'),
      where('userId', '==', user.id),
      where('date', '<=', todayDate)
    );

    const unsubscribeHistory = onSnapshot(
      historyQ, 
      (snapshot) => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyCheckin));
        // Sort in memory for the UI (descending date)
        setHistory(records.sort((a,b) => b.date.localeCompare(a.date)));
      },
      (error) => handleFirestoreError(error, 'list', 'checkins')
    );

    return () => {
      clearInterval(timer);
      unsubscribe();
      unsubscribeHistory();
    };
  }, [user.id, todayDate]);

  const totalAccumulatedHours = history.reduce((acc, curr) => acc + (curr.totalWorkHours || 0), 0);

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
      morningMinutes = differenceInMinutes(parseISO(record.checkOutTime), parseISO(record.checkInTime));
    }
    const bonusHours = (record.feedbackBonusMinutes || 0) / 60;
    return ((morningMinutes + afternoonMinutes) / 60) + bonusHours;
  };

  const handlePunch = async (type: 'entry' | 'lunchEntry' | 'lunchExit' | 'workExit') => {
    setPunching(true);
    // Simulate biometry
    toast.info('Validando biometria...');
    
    setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        if (type === 'entry') {
          if (todayRecord?.checkInTime) {
            toast.error('Entrada já registrada hoje!');
            setPunching(false);
            return;
          }
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
          speak('Ponto de Entrada registrado com sucesso');
          toast.success('Ponto de Entrada registrado!');
        } else {
          if (!todayRecord?.id) {
            speak('Erro: Matrícula de entrada não encontrada');
            toast.error('Você precisa registrar a Entrada primeiro!');
            setPunching(false);
            return;
          }

          const updateData: Partial<DailyCheckin> = {};
          let msg = '';
          if (type === 'lunchEntry') {
            updateData.lunchStartTime = now;
            msg = 'Início do intervalo de almoço registrado';
          }
          if (type === 'lunchExit') {
            updateData.lunchEndTime = now;
            msg = 'Retorno do intervalo de almoço registrado';
          }
          if (type === 'workExit') {
            updateData.checkOutTime = now;
            const temp = { ...todayRecord, checkOutTime: now };
            updateData.totalWorkHours = calculateHours(temp);
            msg = 'Encerramento de jornada registrado com sucesso';
          }

          await updateDoc(doc(db, 'checkins', todayRecord.id), updateData);
          speak(msg);
          toast.success('Ponto registrado com sucesso!');
        }
      } catch (error) {
        toast.error('Erro ao registrar ponto.');
      } finally {
        setPunching(false);
      }
    }, 1500);
  };

  if (loading) return <div className="flex items-center justify-center p-12">Abrindo portal do colaborador...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <AnimatePresence>
        {showUpdateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Atualização Ética & Inclusiva</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Implementamos novos recursos voltados para a sua segurança e acessibilidade universal.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Canal de Denúncias Anônimo</p>
                    <p className="text-[10px] text-slate-400">Relate condutas inadequadas com 100% de sigilo e acompanhamento por protocolo.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                   🤟
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Acessibilidade Total</p>
                    <p className="text-[10px] text-slate-400">Modo de alto contraste, narração de botões e suporte nativo a Libras.</p>
                  </div>
                </div>
              </div>
              <Button 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest"
                onClick={() => {
                  setShowUpdateModal(false);
                  localStorage.setItem('update_1_4_seen', 'true');
                  speak('Exploração iniciada');
                }}
              >
                Começar a usar
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black italic text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
            Olá, {user.name}
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            {user.sector} • MAT: {user.employeeId} • NÍVEL {user.level.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black tabular-nums text-blue-600 drop-shadow-sm">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-800">
        {[
          { id: 'home', label: 'Início' },
          { id: 'progression', label: 'Carreira' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              speak(`Aba ${tab.label} selecionada`);
            }}
            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100 ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'home' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Punch Options Card */}
        <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Registro de Jornada
            </CardTitle>
            <CardDescription className="text-slate-400">Clique no botão correspondente para bater seu ponto</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ponto de Entrada */}
              <PunchButton 
                label="Ponto de Entrada" 
                icon={<LogIn />} 
                active={!todayRecord?.checkInTime}
                time={todayRecord?.checkInTime}
                onClick={() => handlePunch('entry')}
                disabled={punching}
                color="blue"
              />

              {/* Entrada do Almoço (Saída para Almoço) */}
              <PunchButton 
                label="Entrada do Almoço" 
                icon={<Utensils />} 
                active={!!todayRecord?.checkInTime && !todayRecord?.lunchStartTime}
                time={todayRecord?.lunchStartTime}
                onClick={() => handlePunch('lunchEntry')}
                disabled={!todayRecord?.checkInTime || punching}
                color="orange"
              />

              {/* Saída de Almoço (Volta do Almoço) */}
              <PunchButton 
                label="Saída de Almoço" 
                icon={<Clock />} 
                active={!!todayRecord?.lunchStartTime && !todayRecord?.lunchEndTime}
                time={todayRecord?.lunchEndTime}
                onClick={() => handlePunch('lunchExit')}
                disabled={!todayRecord?.lunchStartTime || punching}
                color="indigo"
              />

              {/* Saída do Trabalho */}
              <PunchButton 
                label="Saída do Trabalho" 
                icon={<LogOut />} 
                active={!!todayRecord?.lunchEndTime && !todayRecord?.checkOutTime}
                time={todayRecord?.checkOutTime}
                onClick={() => handlePunch('workExit')}
                disabled={!todayRecord?.lunchEndTime || punching}
                color="emerald"
              />
            </div>
            
            {punching && (
              <div className="mt-8 flex items-center justify-center gap-3 text-blue-400 font-bold uppercase text-xs animate-pulse">
                <Fingerprint className="w-5 h-5" /> Validando Biometria...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Feedback Diário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Sua opinião é fundamental para melhorarmos nossa cultura. Responda às 6 questões rápidas de hoje.
              </p>
              <Button 
                variant="secondary"
                className="w-full h-12 font-black uppercase text-xs tracking-widest shadow-lg"
                onClick={() => {
                  onStartFeedback();
                  speak('Iniciando pesquisa de feedback diário');
                }}
              >
                Iniciar Feedback
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldAlert size={80} />
            </div>
            <CardHeader>
              <CardTitle className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" /> Denúncia Anônima
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Canal seguro e 100% anônimo para denúncias e relatos de conduta. Sua voz protegida por criptografia.
              </p>
              <Button 
                variant="outline"
                className="w-full h-10 border-white/10 hover:bg-white/5 text-white font-black uppercase text-[10px] tracking-widest"
                onClick={() => {
                  if (onNavigateToReports) onNavigateToReports();
                  speak('Abrindo canal de denúncia anônima');
                }}
              >
                Acessar Canal
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                 <History className="w-4 h-4 text-blue-500" /> Histórico & Acumulado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Trabalhado Hoje</span>
                  <span className="text-blue-600">
                    {todayRecord?.totalWorkHours ? formatTimeDisplay(todayRecord.totalWorkHours) : '--:--'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((todayRecord?.totalWorkHours || 0) / 8 * 100, 100)}%` }} 
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Acumulado</p>
                <p className="text-3xl font-black text-blue-600">{formatTimeDisplay(totalAccumulatedHours)}</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
                    <div className="flex justify-between font-black uppercase mb-1">
                      <span className="text-slate-400">{format(parseISO(h.date), 'dd/MM')}</span>
                      <span className="text-blue-500">{formatTimeDisplay(h.totalWorkHours || 0)}</span>
                    </div>
                    <div className="flex gap-2 text-slate-500 font-bold uppercase overflow-hidden text-ellipsis whitespace-nowrap">
                      E: {h.checkInTime ? format(parseISO(h.checkInTime), 'HH:mm') : '--'} | 
                      S: {h.checkOutTime ? format(parseISO(h.checkOutTime), 'HH:mm') : '--'}
                    </div>
                  </div>
                ))}
                {history.length > 5 && (
                  <p className="text-center text-[10px] font-black text-slate-400 uppercase pt-2">
                    Ver mais no relógio flutuante
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      ) : (
        <CareerProgression user={user} onUpdateUser={onUpdateUser} />
      )}
    </div>
  );
}

function PunchButton({ label, icon, active, time, onClick, disabled, color }: any) {
  const [holdProgress, setHoldProgress] = useState(0);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const HOLD_DURATION = 3000; // 3 seconds

  const startHolding = () => {
    if (disabled || !active || time) return;
    
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
        onClick();
      }
    }, 50);

    timerRef.current = setTimeout(() => {
      // Safety fallback but the interval handles the logic
    }, HOLD_DURATION);
  };

  const stopHolding = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHoldProgress(0);
  };

  const colorMap: any = {
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
    orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
  };

  return (
    <button
      disabled={disabled || (!active && !time)}
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      className={`
        relative h-32 rounded-2xl border-none p-4 flex flex-col justify-between transition-all duration-300 group overflow-hidden select-none touch-none
        ${active ? `${colorMap[color]} text-white shadow-xl scale-100` : 'bg-slate-800/50 text-slate-500 opacity-60 scale-95'}
        ${time ? 'bg-slate-800/80 !opacity-100 !text-white border-2 border-blue-500/30' : ''}
        disabled:cursor-not-allowed
      `}
    >
      {/* Progress Overlay */}
      {holdProgress > 0 && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1.5 bg-white/40 z-20"
          initial={{ width: 0 }}
          animate={{ width: `${holdProgress}%` }}
          transition={{ type: "tween", ease: "linear", duration: 0.05 }}
        />
      )}

      {/* Hold Indicator Overlay */}
      {holdProgress > 0 && (
        <div className="absolute inset-0 bg-white/10 flex items-center justify-center z-10">
          <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Segure para bater...</p>
        </div>
      )}

      <div className="flex justify-between items-start w-full relative z-30">
        <div className={`p-2 rounded-xl bg-white/10 ${active ? 'animate-pulse' : ''}`}>
          {cloneElement(icon, { size: 24 } as any)}
        </div>
        {time && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
      </div>
      
      <div className="text-left w-full relative z-30">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
        <p className="text-2xl font-black tabular-nums tracking-tighter">
          {time ? format(parseISO(time), 'HH:mm') : '--:--'}
        </p>
      </div>

      {active && holdProgress === 0 && (
        <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-ping opacity-20 pointer-events-none" />
      )}
    </button>
  );
}
