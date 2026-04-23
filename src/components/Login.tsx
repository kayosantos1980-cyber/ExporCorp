/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile } from '@/src/types';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onAdminMode: () => void;
}

export default function Login({ onLogin, onAdminMode }: LoginProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !sector) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', employeeId);
      const userDoc = await getDoc(userRef);

      let userData: UserProfile;

      if (userDoc.exists()) {
        userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      } else {
        // If user doesn't exist, use employeeId as name
        userData = {
          id: employeeId,
          name: `Colaborador ${employeeId}`,
          employeeId,
          sector,
          createdAt: new Date().toISOString(),
          isAdmin: false
        };
        await setDoc(userRef, userData);
      }

      onLogin(userData);
      toast.success(`Bem-vindo(a)!`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <User className="text-primary w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Check-in Diário</CardTitle>
          <CardDescription>
            Insira sua matrícula e setor para iniciar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Matrícula</Label>
              <Input
                id="employeeId"
                placeholder="Ex: 12345"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Setor</Label>
              <Input
                id="sector"
                placeholder="Ex: Comercial, RH, etc."
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full font-bold text-lg h-12 mt-4" disabled={loading}>
              {loading ? 'Carregando...' : 'Acessar Check-in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-0">
          <div className="w-full h-px bg-border" />
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors w-full border-none shadow-md shadow-emerald-500/20"
            onClick={onAdminMode}
          >
            <ShieldCheck className="w-4 h-4" />
            Acesso Administrativo
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
