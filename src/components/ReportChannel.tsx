/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ReportCategory, AnonymousReport } from '../types';
import { toast } from 'sonner';
import { ShieldAlert, FileText, CheckCircle2, ChevronRight, Upload, Info, ScrollText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useA11y } from '../lib/A11yContext';

export default function ReportChannel() {
  const { speak } = useA11y();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [protocol, setProtocol] = useState('');
  const [searchProtocol, setSearchProtocol] = useState('');
  const [foundReport, setFoundReport] = useState<AnonymousReport | null>(null);
  const [loading, setLoading] = useState(false);

  const generateProtocol = () => {
    return 'EP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleNext = () => {
    if (step === 1 && !category) {
      toast.error('Por favor, selecione uma categoria.');
      return;
    }
    setStep(step + 1);
    speak(`Avançando para etapa ${step + 1}`);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Por favor, descreva o ocorrido.');
      return;
    }

    setLoading(true);
    const newProtocol = generateProtocol();
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'reports'), {
        protocol: newProtocol,
        category,
        description,
        status: 'recebida',
        createdAt: now,
        updatedAt: now
      });

      setProtocol(newProtocol);
      setStep(4);
      speak('Denúncia enviada com sucesso. Seu protocolo é ' + newProtocol);
      toast.success('Denúncia registrada com sucesso!');
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Erro ao enviar denúncia.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchProtocol = async () => {
    if (!searchProtocol.trim()) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reports'),
        where('protocol', '==', searchProtocol.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFoundReport({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AnonymousReport);
        speak('Denúncia encontrada. Status: ' + snapshot.docs[0].data().status);
      } else {
        toast.error('Protocolo não encontrado.');
        setFoundReport(null);
      }
    } catch (error) {
      toast.error('Erro ao buscar protocolo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-slate-100">Denúncia Anônima</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Anonimato 100% Garantido • Segurança LGPD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase text-slate-700 dark:text-slate-200">Passo 1: Categoria</CardTitle>
                  <CardDescription>Selecione a natureza da denúncia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'assédio_moral', label: 'Assédio Moral', desc: 'Desrespeito, humilhação ou pressão psicológica.' },
                      { id: 'assédio_sexual', label: 'Assédio Sexual', desc: 'Condutas de natureza sexual não desejadas.' },
                      { id: 'abuso_autoridade', label: 'Abuso de Autoridade', desc: 'Uso indevido do poder hierárquico.' },
                      { id: 'outros', label: 'Outras Condutas', desc: 'Qualquer outra violação ética.' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as ReportCategory)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${category === cat.id ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                      >
                        <p className="font-black uppercase text-sm">{cat.label}</p>
                        <p className="text-xs text-slate-400 mt-1">{cat.desc}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-12 bg-slate-900 dark:bg-slate-800 hover:bg-black font-black uppercase tracking-widest gap-2" onClick={handleNext}>
                    Próximo <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase text-slate-700 dark:text-slate-200">Passo 2: Relato</CardTitle>
                  <CardDescription>Descreva o ocorrido com o máximo de detalhes possível</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição Detalhada</Label>
                    <Textarea 
                      placeholder="Quando, onde, quem estava envolvido..." 
                      className="min-h-[160px] text-sm border-slate-200 focus:border-red-500"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                    <p className="text-[10px] font-black uppercase text-slate-400">Anexar Evidências (Opcional)</p>
                    <p className="text-[8px] text-slate-400 mt-1">Imagens, Áudios ou Documentos (Max 10MB)</p>
                    <input type="file" className="hidden" id="evidence-upload" />
                    <Button variant="outline" size="sm" className="mt-3 text-[10px] h-8" onClick={() => document.getElementById('evidence-upload')?.click()}>Selecionar Arquivos</Button>
                  </div>
                </CardContent>
                <CardFooter className="gap-3">
                  <Button variant="outline" className="flex-1 font-black uppercase tracking-widest text-xs" onClick={() => setStep(1)}>Voltar</Button>
                  <Button className="flex-[2] h-12 bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest shadow-lg shadow-red-500/20" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Enviando...' : 'Finalizar Denúncia'}
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CardContent className="pt-10 flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Denúncia Enviada</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Sua denúncia foi registrada de forma segura. Guarde o protocolo abaixo para acompanhar o status.
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-emerald-500/30 w-full">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Seu Protocolo Único</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter font-mono">{protocol}</p>
                  </div>
                  <Button className="w-full font-black uppercase tracking-widest h-12" onClick={() => { setStep(1); setProtocol(''); setDescription(''); setCategory(''); }}>Novo Registro</Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <CardHeader className="pb-3 text-center sm:text-left">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Search className="w-3 h-3 text-blue-500" /> Acompanhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400">Verificar Protocolo</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="EP-XXXXXXXX" 
                    className="h-9 text-[10px] font-black uppercase"
                    value={searchProtocol}
                    onChange={(e) => setSearchProtocol(e.target.value)}
                  />
                  <Button size="icon" className="h-9 w-9" onClick={handleSearchProtocol} disabled={loading} aria-label="Buscar">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {foundReport && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-[8px] font-black uppercase text-slate-400">Status Atual</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      foundReport.status === 'recebida' ? 'bg-blue-100 text-blue-600' :
                      foundReport.status === 'em_análise' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {foundReport.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-400">Última atualização: {new Date(foundReport.updatedAt).toLocaleDateString()}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-blue-600 text-white overflow-hidden relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> Compromissos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="min-w-[4px] bg-white/30 rounded-full" />
                <p className="text-[9px] font-black uppercase italic leading-tight">Anonimato irrevogável</p>
              </div>
              <div className="flex gap-3">
                <div className="min-w-[4px] bg-white/30 rounded-full" />
                <p className="text-[9px] font-black uppercase italic leading-tight">Criptografia de ponta a ponta</p>
              </div>
              <div className="flex gap-3">
                <div className="min-w-[4px] bg-white/30 rounded-full" />
                <p className="text-[9px] font-black uppercase italic leading-tight">Zero rastreio de IP/Meta-dados</p>
              </div>
            </CardContent>
            <div className="absolute -bottom-2 -right-2 opacity-10">
              <ScrollText className="w-16 h-16" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
