/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile } from '@/src/types';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShieldCheck, User, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onAdminMode: () => void;
}

export default function Login({ onLogin, onAdminMode }: LoginProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState<{id: string, sector: string}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_matriculas');
    if (saved) {
      setRecentUsers(JSON.parse(saved));
    }
  }, []);

  const saveRecent = (id: string, sec: string) => {
    const updated = [{id, sector: sec}, ...recentUsers.filter(u => u.id !== id)].slice(0, 5);
    setRecentUsers(updated);
    localStorage.setItem('recent_matriculas', JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecentUsers([]);
    localStorage.removeItem('recent_matriculas');
  };

  const handleLogin = async (e: React.FormEvent | string, quickSector?: string) => {
    if (typeof e !== 'string') e.preventDefault();
    
    const idToUse = typeof e === 'string' ? e : employeeId;
    const sectorToUse = quickSector || sector;

    if (!idToUse || !sectorToUse) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', idToUse);
      const userDoc = await getDoc(userRef);

      let userData: UserProfile;

      if (userDoc.exists()) {
        userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      } else {
        userData = {
          id: idToUse,
          name: `Colaborador ${idToUse}`,
          employeeId: idToUse,
          sector: sectorToUse,
          createdAt: new Date().toISOString(),
          isAdmin: false
        };
        await setDoc(userRef, userData);
      }

      saveRecent(userData.employeeId, userData.sector);
      onLogin(userData);
      toast.success(`Bem-vindo(a), ${userData.employeeId}!`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="text-center bg-slate-50 dark:bg-slate-900/50 pb-8">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <User className="text-primary w-10 h-10" />
          </div>
          <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-slate-100">Portal do Colaborador</CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400">
            Acesso individual por matrícula
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Número da Matrícula</Label>
              <Input
                id="employeeId"
                placeholder="Ex: 502030"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                className="h-12 text-lg font-bold border-slate-200 focus:border-primary transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector" className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Seu Setor de Atuação</Label>
              <Input
                id="sector"
                placeholder="Ex: Logística, Vendas, etc."
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="h-12 text-lg font-bold border-slate-200 focus:border-primary transition-all"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-black text-lg h-14 mt-4 bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 shadow-xl" 
              disabled={loading}
            >
              {loading ? 'Validando...' : 'INICIAR JORNADA'}
            </Button>
          </form>

          {recentUsers.length > 0 && (
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Matrículas Recentes</span>
                </div>
                <button onClick={clearRecent} className="text-slate-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleLogin(u.id, u.sector)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold hover:border-primary hover:text-primary transition-all flex flex-col items-start min-w-[80px]"
                  >
                    <span className="text-slate-900 dark:text-slate-100">{u.id}</span>
                    <span className="text-[8px] text-slate-400 font-normal uppercase">{u.sector}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-slate-50 dark:bg-slate-900/50 pt-6">
          <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors w-full border-none shadow-md shadow-emerald-500/20 uppercase text-[10px] tracking-widest"
            onClick={onAdminMode}
          >
            <ShieldCheck className="w-4 h-4" />
            Painel Executivo
          </Button>
        </CardFooter>
      </Card>
      <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs leading-loose">
        Cada Matrícula Gera um registro separado no sistema de ponto e feedback empresarial.
      </p>
    </div>
  );
}
