/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import Questionnaire from './components/Questionnaire';
import Dashboard from './components/Dashboard';
import { UserProfile } from './types';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Sun, Moon, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

type View = 'login' | 'admin-login' | 'questionnaire' | 'dashboard' | 'completed';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastCheckinId, setLastCheckinId] = useState<string | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (persistence)
    const savedUser = localStorage.getItem('checkin_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('checkin_user', JSON.stringify(userData));
    setView('questionnaire');
    setLastCheckinId(null);
    setCheckoutDone(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('checkin_user');
    setView('login');
    setLastCheckinId(null);
    setCheckoutDone(false);
  };

  const handleCheckout = async () => {
    if (!lastCheckinId) return;
    setCheckoutLoading(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      const checkinRef = doc(db, 'checkins', lastCheckinId);
      await updateDoc(checkinRef, {
        checkOutTime: new Date().toISOString()
      });
      setCheckoutDone(true);
      toast.success('Ponto de saída registrado com sucesso!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao registrar saída.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleComplete = (id: string) => {
    setLastCheckinId(id);
    setView('completed');
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-50' : ''}`}>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white dark:bg-slate-900 sticky top-0 z-50 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl italic shadow-[0_0_15px_rgba(37,99,235,0.7)] border border-blue-400/50 animate-pulse drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
              E
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              ExperCorp
              <span className="hidden sm:inline text-slate-400 font-normal">| Experiência Corporativa</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-600 dark:text-slate-400 mr-4">
              <span className="text-slate-400 opacity-50 cursor-not-allowed">Dashboard</span>
              <span className="text-slate-400 opacity-50 cursor-not-allowed">Setores</span>
              <span className="text-slate-400 opacity-50 cursor-not-allowed">Relatórios</span>
            </div>
            
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {user && view !== 'dashboard' && (
              <div className="flex items-center gap-3 ml-2">
                <div className="text-right hidden xs:block">
                  <p className="text-xs font-bold leading-none text-slate-900 dark:text-slate-50">{user.name}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="rounded-full h-8 px-3 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sair
                </Button>
              </div>
            )}
            {view === 'dashboard' && (
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setView('login')} 
                className="rounded-full h-8 px-3 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sair Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6">
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Login onLogin={handleLogin} onAdminMode={() => setView('admin-login')} />
            </motion.div>
          )}

          {view === 'admin-login' && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AdminLogin onSuccess={() => setView('dashboard')} onBack={() => setView('login')} />
            </motion.div>
          )}

          {view === 'questionnaire' && user && (
            <motion.div
              key="questionnaire"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Questionnaire 
                user={user} 
                onComplete={handleComplete} 
                onBack={handleLogout}
              />
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Dashboard onBack={() => setView('login')} />
            </motion.div>
          )}

          {view === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center min-h-[70vh] px-4"
            >
              <div className="text-center space-y-6 max-w-md w-full">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tight">Check-in Concluído!</h2>
                <p className="text-muted-foreground">
                  Obrigado por compartilhar seu dia conosco. Suas respostas foram salvas com segurança.
                </p>
                
                <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                  <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                       <Clock className="w-4 h-4 text-emerald-600" />
                       Ponto de Saída Eletrônico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {checkoutDone ? (
                      <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-4 rounded-lg">
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          SAÍDA REGISTRADA ÀS:
                        </p>
                        <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                           {format(new Date(), 'HH:mm:ss')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-500">
                          Clique no botão abaixo para registrar o encerramento do seu expediente agora.
                        </p>
                        <Button 
                          className="w-full h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                        >
                          {checkoutLoading ? 'Processando...' : 'REGISTRAR SAÍDA AGORA'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="pt-4">
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 font-bold" onClick={handleLogout}>
                    Voltar para o Início
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
        <span>&copy; {new Date().getFullYear()} ExperCorp • v1.3.0</span>
        <span className="ml-auto hidden sm:block">Fomentando uma cultura de feedback</span>
      </footer>
    </div>
  );
}
