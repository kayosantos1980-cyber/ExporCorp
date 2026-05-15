/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfile, EmployeeLevel, DailyCheckin } from '../types';
import { LEVELS, DAYS_OF_WEEK, SUNDAY_OPTIONS } from '../constants';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { Trophy, Calendar, Plane, CheckCircle2, Star, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { subDays } from 'date-fns';

interface CareerProgressionProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function CareerProgression({ user, onUpdateUser }: CareerProgressionProps) {
  const [selectedDayOff, setSelectedDayOff] = useState(user.preferredDayOff || '');
  const [selectedSundays, setSelectedSundays] = useState<string[]>(user.preferredSundaysOff || []);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ avg: 0, count: 0, daysAtLevel: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.id),
        where('timestamp', '>=', thirtyDaysAgo)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => d.data() as DailyCheckin);
      
      const avg = docs.length > 0 
        ? docs.reduce((acc, curr) => acc + curr.averageScore, 0) / docs.length 
        : 0;
      
      const referenceDate = user.lastLevelUpDate || user.createdAt;
      const daysAtLevel = Math.floor((new Date().getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24));
      
      setStats({ avg, count: docs.length, daysAtLevel });
    };
    fetchStats();
  }, [user.id, user.lastLevelUpDate, user.createdAt]);

  const currentLevelInfo = LEVELS[user.level];
  
  const handleSaveBenefits = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const updates = {
        preferredDayOff: selectedDayOff,
        preferredSundaysOff: selectedSundays
      };
      await updateDoc(userRef, updates);
      onUpdateUser({ ...user, ...updates });
      toast.success('Benefícios atualizados com sucesso!');
    } catch (error) {
      console.error('Error saving benefits:', error);
      toast.error('Erro ao salvar preferências.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSunday = (sunday: string) => {
    if (selectedSundays.includes(sunday)) {
      setSelectedSundays(selectedSundays.filter(s => s !== sunday));
    } else {
      if (selectedSundays.length < 2) {
        setSelectedSundays([...selectedSundays, sunday]);
      } else {
        toast.error('Você só pode escolher 2 domingos no nível Ouro.');
      }
    }
  };

  const levelOrder: EmployeeLevel[] = ['bronze', 'prata', 'ouro'];
  const currentIdx = levelOrder.indexOf(user.level);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className={`h-2 w-full bg-gradient-to-r ${
          user.level === 'ouro' ? 'from-yellow-400 to-yellow-600' : 
          user.level === 'prata' ? 'from-slate-300 to-slate-500' : 
          'from-amber-600 to-amber-800'
        }`} />
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                <Trophy className={`w-5 h-5 ${currentLevelInfo.color}`} /> 
                Minha Progressão de Carreira
              </CardTitle>
              <CardDescription>Acompanhe seu nível e desbloqueie benefícios exclusivos</CardDescription>
            </div>
            <Badge className={`${currentLevelInfo.bg} ${currentLevelInfo.color} ${currentLevelInfo.border} border h-7 px-4 font-black uppercase text-[10px] tracking-widest`}>
              Nível {currentLevelInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Level Roadmap */}
          <div className="flex items-center justify-between px-4 relative">
             {/* Connector Line */}
             <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
             
             {levelOrder.map((lvl, idx) => {
               const info = LEVELS[lvl];
               const isReached = idx <= currentIdx;
               const isCurrent = idx === currentIdx;
               
               return (
                 <div key={lvl} className="flex flex-col items-center gap-2 relative z-10">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                     isReached ? `${info.bg} ${info.color} shadow-lg ring-2 ring-white dark:ring-slate-900` : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                   }`}>
                     {isReached ? <CheckCircle2 className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? info.color : 'text-slate-400'}`}>
                     {info.name}
                   </span>
                 </div>
               );
             })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Benefits */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Star className="w-3 h-3" /> Benefícios Atuais ({currentLevelInfo.name})
              </h4>
              <ul className="space-y-3">
                {currentLevelInfo.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Level Requirement */}
            {currentIdx < levelOrder.length - 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo Nível: {LEVELS[levelOrder[currentIdx + 1]].name}</h4>
                  <Badge variant="outline" className="text-[9px] font-black text-blue-500">Auto</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tempo no nível</span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{stats.daysAtLevel}/30 dias</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((stats.daysAtLevel / 30) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Desempenho (Meta 4.00)</span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{stats.avg.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.avg / 4) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Frequência (Mín. 20)</span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">{stats.count}/20</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((stats.count / 20) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-[9px] font-bold text-slate-400 italic text-center pt-2">
                  "Mantenha nota 4.00 por 30 dias para subir automaticamente"
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Configuration - Silver & Gold */}
      {(user.level === 'prata' || user.level === 'ouro') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2 text-blue-400">
                <Calendar className="w-5 h-5" /> Configurar Meus Benefícios
              </CardTitle>
              <CardDescription className="text-slate-400">Escolha seus dias de descanso conforme seu nível</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Day Off Selection */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Folga Semanal Preferencial</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDayOff(day)}
                      className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                        selectedDayOff === day 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {day.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sunday Selection - Gold only */}
              {user.level === 'ouro' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-2">
                    <Star className="w-3 h-3" /> Domingos de Folga (Escolha 2)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {SUNDAY_OPTIONS.map((sunday) => (
                      <button
                        key={sunday}
                        onClick={() => toggleSunday(sunday)}
                        className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                          selectedSundays.includes(sunday)
                            ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg shadow-yellow-500/20'
                            : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {sunday}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-6 border-t border-white/5">
              <Button 
                onClick={handleSaveBenefits}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest h-12 mt-4"
              >
                {isSaving ? 'Salvando...' : 'Atualizar Minhas Preferências'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
