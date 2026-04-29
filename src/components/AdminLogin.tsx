/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ChevronLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useA11y } from '../lib/A11yContext';

interface AdminLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AdminLogin({ onSuccess, onBack }: AdminLoginProps) {
  const { speak } = useA11y();
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified admin login for this demo
    if (password === 'admin123') {
      onSuccess();
      speak('Acesso administrativo autorizado');
      toast.success('Acesso administrativo autorizado.');
    } else {
      speak('Senha incorreta');
      toast.error('Senha incorreta.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="text-primary w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Administrativo</CardTitle>
          <CardDescription>
            Insira a senha de administrador para visualizar o painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full font-bold">
              Entrar no Painel
            </Button>
            <Button variant="ghost" className="w-full flex items-center gap-2" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" />
              Voltar para Login de Colaborador
            </Button>
          </form>
        </CardContent>
        <div className="px-6 pb-6 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            A senha padrão para teste é: <span className="font-bold underline">admin123</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
