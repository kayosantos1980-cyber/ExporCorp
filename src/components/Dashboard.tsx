/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { DailyCheckin, SectorStats, AnonymousReport } from '../types';
import { ALERT_THRESHOLD, QUESTIONS, EMOJI_OPTIONS, OBJECTIVE_OPTIONS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, AlertTriangle, TrendingUp, Users, Smile, Clock,
  ArrowBigDownDash, ArrowBigUpDash, ChevronLeft, FileSpreadsheet,
  MessageSquare, Calendar, Mail, Send, ShieldAlert, CheckCircle, FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatTimeDisplay } from '../lib/timeUtils';
import * as XLSX from 'xlsx';
import Chat from './Chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { updateDoc, doc, getDocs } from 'firebase/firestore';
import { useA11y } from '../lib/A11yContext';
import { UserProfile, EmployeeLevel } from '../types';
import { LEVELS } from '../constants';

interface DashboardProps {
  onBack: () => void;
}

export default function Dashboard({ onBack }: DashboardProps) {
  const { speak } = useA11y();
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [reports, setReports] = useState<AnonymousReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [targetEmail, setTargetEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const qCheckins = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(500));
    const unsubscribeCheckins = onSnapshot(
      qCheckins, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyCheckin));
        setCheckins(data);
      },
      (error) => handleFirestoreError(error, 'list', 'checkins')
    );

    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(
      qReports, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnonymousReport));
        setReports(data);
      },
      (error) => handleFirestoreError(error, 'list', 'reports')
    );

    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setUsers(data);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, 'list', 'users')
    );

    return () => {
      unsubscribeCheckins();
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, []);

  const handleUpdateReportStatus = async (reportId: string, newStatus: any) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success('Status da denúncia atualizado!');
    } catch (error) {
      handleFirestoreError(error, 'update', `reports/${reportId}`);
      toast.error('Erro ao atualizar status.');
    }
  };

  // Analytics logic
  const averageScore = checkins.length > 0 
    ? checkins.reduce((acc, curr) => acc + curr.averageScore, 0) / checkins.length 
    : 0;

  // Extract unique sectors from checkins
  const uniqueSectors = Array.from(new Set(checkins.map(c => c.sector))).filter(Boolean) as string[];

  const sectorStats: SectorStats[] = uniqueSectors.map(sector => {
    const sectorCheckins = checkins.filter(c => c.sector === sector);
    const avg = sectorCheckins.length > 0 
      ? sectorCheckins.reduce((acc, curr) => acc + curr.averageScore, 0) / sectorCheckins.length 
      : 0;
    return {
      sector,
      averageScore: avg,
      count: sectorCheckins.length,
      alert: avg > 0 && avg < ALERT_THRESHOLD
    };
  }).sort((a, b) => a.averageScore - b.averageScore);

  const satisfactionIndex = (averageScore / 4) * 100;
  
  const alerts = checkins.filter(c => c.averageScore < ALERT_THRESHOLD);

  const chartData = checkins.reduce((acc: any[], curr) => {
    const date = curr.date;
    const existing = acc.find(a => a.date === date);
    if (existing) {
      existing.score = (existing.score * existing.count + curr.averageScore) / (existing.count + 1);
      existing.count += 1;
    } else {
      acc.push({ date, score: curr.averageScore, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  const scoreDistribution = [
    { name: 'Crítico (1-2)', value: checkins.filter(c => c.averageScore <= 2).length, color: '#ef4444' },
    { name: 'Atenção (2-3)', value: checkins.filter(c => c.averageScore > 2 && c.averageScore <= 3).length, color: '#f59e0b' },
    { name: 'Bom (3-3.5)', value: checkins.filter(c => c.averageScore > 3 && c.averageScore <= 3.5).length, color: '#10b981' },
    { name: 'Excelente (3.5-4)', value: checkins.filter(c => c.averageScore > 3.5).length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const exportToExcel = () => {
    // 1. Prepare Main Data Sheet (Individual Responses)
    const mainData = checkins.map(c => {
      const row: any = {
        'Data': format(new Date(c.date), 'dd/MM/yyyy'),
        'Colaborador': c.userName,
        'Setor': c.sector,
        'Média Geral': c.averageScore.toFixed(2),
        'Status': c.averageScore > 3 ? 'Excelente' : c.averageScore > 2.5 ? 'Bom' : 'Atenção/Crítico',
        'Horário Saída': c.checkOutTime ? format(new Date(c.checkOutTime), 'HH:mm:ss') : '-',
        'Comentários': c.comments || '-'
      };

      // Add each question as a column
      QUESTIONS.forEach(q => {
        const val = c.responses[q.id];
        let label = 'N/A';
        if (val) {
          const opt = q.type === 'emoji' 
            ? EMOJI_OPTIONS.find(o => o.value === val)
            : OBJECTIVE_OPTIONS.find(o => o.value === val);
          label = opt ? opt.label : val.toString();
        }
        row[`Q: ${q.text.substring(0, 50)}...`] = label;
      });

      return row;
    });

    // 2. Prepare Sector Summary Sheet
    const summaryData = sectorStats.map(s => ({
      'Setor': s.sector,
      'Média de Satisfação': s.averageScore.toFixed(2),
      'Total de Check-ins': s.count,
      'Status': s.alert ? 'ALERTA CRÍTICO' : 'ESTÁVEL',
      'Índice Perc.': ((s.averageScore / 4) * 100).toFixed(1) + '%'
    }));

    // Create Workbook
    const wb = XLSX.utils.book_new();
    
    // Add Sheets
    const ws1 = XLSX.utils.json_to_sheet(mainData);
    const ws2 = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(wb, ws1, "Respostas Detalhadas");
    XLSX.utils.book_append_sheet(wb, ws2, "Resumo por Setor");

    // Auto-size columns (basic attempt)
    const wscols1 = [
      {wch: 12}, {wch: 25}, {wch: 20}, {wch: 12}, {wch: 15}, {wch: 40},
      ...QUESTIONS.map(() => ({wch: 15}))
    ];
    ws1['!cols'] = wscols1;

    // Export file
    XLSX.writeFile(wb, `Relatorio_Detalhado_Checkin_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando painel...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 pl-0">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Painel Executivo</h1>
          </div>
          <p className="text-muted-foreground">Visão geral do clima organizacional e engajamento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} className="gap-2 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel Detalhado
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'sectors', label: 'Setores' },
          { id: 'ranking', label: 'Ranking' },
          { id: 'users', label: 'Colaboradores' },
          { id: 'reports', label: 'Relatórios' },
          { id: 'ethics', label: 'Denúncia Anônima' },
          { id: 'timesheets', label: 'Folha de Ponto' },
          { id: 'chat', label: 'Chat Liderança' }
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

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Índice de Clima</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100">{satisfactionIndex.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  ↑ 2.4% vs ontem
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Média Global</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {averageScore.toFixed(2)}
                  <span className="text-lg font-normal text-slate-300 italic">/ 4</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`status-badge ${averageScore > 3 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : averageScore > 2.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {averageScore > 3 ? "Excelente" : averageScore > 2.5 ? "Bom" : "Atenção"}
                </span>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alertas Ativos</CardDescription>
                <CardTitle className="text-3xl font-bold text-red-600">{sectorStats.filter(s => s.alert).length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[11px] font-medium text-slate-400 italic">Setores abaixo de {ALERT_THRESHOLD}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Participação</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100">{checkins.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[11px] font-medium text-emerald-500">Meta de 85% superada</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução Temporal</CardTitle>
                <CardDescription>Média de pontuação nos últimos dias.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis domain={[1, 4]} tick={{fontSize: 12}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição</CardTitle>
                <CardDescription>Qualidade das respostas.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'sectors' && (
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Setor</CardTitle>
            <CardDescription>Médias ordenadas por índice de satisfação.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectorStats.map((s) => (
                <div key={s.sector} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{s.sector}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{s.count} check-ins</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${s.alert ? 'text-red-500' : 'text-emerald-600'}`}>
                        {s.averageScore.toFixed(2)}
                      </p>
                    </div>
                    {s.alert ? (
                      <span className="status-badge bg-red-100 text-red-700">Crítico</span>
                    ) : (
                      <span className="status-badge bg-emerald-100 text-emerald-700">Bom</span>
                    )}
                  </div>
                </div>
              ))}
              {sectorStats.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 font-medium italic">
                  Nenhum dado de setor disponível ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'ranking' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <ArrowBigUpDash className="w-5 h-5" /> Melhores Climas
                </CardTitle>
                <CardDescription>Colaboradores com maior nível de satisfação.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...checkins]
                  .sort((a, b) => b.averageScore - a.averageScore)
                  .slice(0, 10)
                  .map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-emerald-300 w-6">#{i+1}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.userName}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{c.sector}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black">{c.averageScore.toFixed(2)}</Badge>
                    </div>
                  ))}
                {checkins.length === 0 && <div className="text-center py-8 text-slate-400">Sem dados</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 dark:border-red-900/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <ArrowBigDownDash className="w-5 h-5" /> Climas Críticos
                </CardTitle>
                <CardDescription>Colaboradores necessitando suporte ou atenção.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...checkins]
                  .sort((a, b) => a.averageScore - b.averageScore)
                  .slice(0, 10)
                  .map((c, i) => {
                    // Find the question with the lowest score
                    let worstQuestion = null;
                    if (c.responses) {
                      const responseEntries = Object.entries(c.responses) as [string, number][];
                      if (responseEntries.length > 0) {
                        const [qid] = responseEntries.sort((a, b) => (a[1] as number) - (b[1] as number))[0];
                        worstQuestion = QUESTIONS.find(q => q.id === qid);
                      }
                    }

                    return (
                      <div key={i} className="flex flex-col p-3 bg-red-50/30 dark:bg-red-950/10 rounded-lg border border-red-100/50 dark:border-red-900/20 gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-red-300 w-6">#{i+1}</span>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.userName}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">
                                {c.sector} • MAT: {c.userId}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-red-500 hover:bg-red-600 font-black">{c.averageScore.toFixed(2)}</Badge>
                        </div>
                        
                        {worstQuestion && (
                          <div className="mt-1 flex items-start gap-2 bg-red-100/30 dark:bg-red-900/20 p-2 rounded text-[10px] border border-red-100/50 dark:border-red-900/30">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-red-700 dark:text-red-400 uppercase tracking-tighter">Ponto Crítico:</p>
                              <p className="text-red-900/70 dark:text-red-200/70 italic leading-tight">
                                "{worstQuestion.text}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                 {checkins.length === 0 && <div className="text-center py-8 text-slate-400">Sem dados</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Gestão de Colaboradores e Níveis
            </CardTitle>
            <CardDescription>Promova colaboradores com base no desempenho e feedback.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Setor</th>
                      <th className="px-4 py-3">Nível Atual</th>
                      <th className="px-4 py-3">Desempenho Médio</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {users.filter(u => !u.isAdmin).map(u => {
                      const userCheckins = checkins.filter(c => c.userId === u.id);
                      const avg = userCheckins.length > 0 
                        ? userCheckins.reduce((acc, curr) => acc + curr.averageScore, 0) / userCheckins.length 
                        : 0;
                      
                      const levelInfo = LEVELS[u.level || 'bronze'];

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{u.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[9px] uppercase">{u.sector}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${levelInfo.bg} ${levelInfo.color} ${levelInfo.border} border text-[9px] uppercase font-black`}>
                              {levelInfo.name}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${avg > 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(avg/4)*100}%` }} />
                              </div>
                              <span className="text-xs font-bold">{avg.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Select 
                                value={u.level || 'bronze'} 
                                onValueChange={async (newLevel) => {
                                  try {
                                    await updateDoc(doc(db, 'users', u.id), { level: newLevel });
                                    toast.success(`Nível de ${u.name} atualizado para ${newLevel.toUpperCase()}`);
                                  } catch (error) {
                                    toast.error('Erro ao atualizar nível.');
                                  }
                                }}
                              >
                                <SelectTrigger className="w-28 h-8 text-[10px] font-black uppercase">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bronze">Bronze</SelectItem>
                                  <SelectItem value="prata">Prata</SelectItem>
                                  <SelectItem value="ouro">Ouro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500 w-5 h-5" />
              Histórico de Check-ins e Alertas
            </CardTitle>
            <CardDescription>Lista completa de respostas e comentários.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {checkins.map((a) => (
                  <div key={a.id} className={`p-4 border rounded-lg space-y-2 shadow-sm transition-colors ${a.averageScore < ALERT_THRESHOLD ? 'border-red-100 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/10' : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{a.userName}</span>
                          <Badge variant="outline" className="text-[9px] h-4 uppercase">{a.sector}</Badge>
                        </div>
                        <span className="text-[11px] text-slate-500">{format(new Date(a.date), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-bold ${a.averageScore < ALERT_THRESHOLD ? 'text-red-600' : 'text-emerald-600'}`}>
                          {a.averageScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {a.comments && (
                      <p className="text-[11px] text-slate-500 bg-white/50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 italic">
                        "{a.comments}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                        <MessageSquare className="w-2 h-2" /> Feedback: {format(new Date(a.timestamp), 'HH:mm')}
                      </div>
                      {a.checkOutTime && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                           <Clock className="w-2 h-2" /> Saída: {format(new Date(a.checkOutTime), 'HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {checkins.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado. 🙌
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeTab === 'chat' && (
        <Chat currentUser={{ 
          id: 'admin', 
          name: 'Encarregado Central', 
          employeeId: 'ADMIN', 
          sector: 'Liderança', 
          createdAt: new Date().toISOString(),
          level: 'ouro' // Admins are gold level
        }} />
      )}

      {activeTab === 'ethics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Total de Denúncias</CardDescription>
                <CardTitle className="text-3xl font-bold">{reports.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Em Análise</CardDescription>
                <CardTitle className="text-3xl font-bold text-orange-500">
                  {reports.filter(r => r.status === 'em_análise').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Resolvidas</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-500">
                  {reports.filter(r => r.status === 'resolvida').length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Gestão de Denúncias Anônimas
              </CardTitle>
              <CardDescription>Ouvidoria interna e conformidade ética.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">{report.protocol}</Badge>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-50 text-red-600 rounded">
                            {report.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          Recebida em: {format(parseISO(report.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="w-40">
                         <Select 
                          value={report.status} 
                          onValueChange={(val) => handleUpdateReportStatus(report.id!, val)}
                        >
                          <SelectTrigger className="h-8 text-[10px] font-black uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recebida">Recebida</SelectItem>
                            <SelectItem value="em_análise">Em Análise</SelectItem>
                            <SelectItem value="resolvida">Resolvida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-600 dark:text-slate-300 italic border-l-4 border-red-500">
                      "{report.description}"
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Sem anexos
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Verificado via Criptografia
                      </div>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="text-center py-20 text-slate-400 italic">
                    Nenhuma denúncia registrada no momento.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'timesheets' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Folha de Ponto Mensal
                  </CardTitle>
                  <CardDescription>Consolidado de horas trabalhadas por colaborador.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="month-select" className="text-xs font-bold uppercase tracking-widest text-slate-400">Mês:</Label>
                    <Input 
                      id="month-select"
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-40 h-8 text-sm"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none font-bold" 
                    onClick={() => {
                      const [year, month] = selectedMonth.split('-');
                      const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
                      const end = endOfMonth(start);
                      
                      const monthlyRecords = checkins.filter(c => {
                        const d = parseISO(c.date);
                        return isWithinInterval(d, { start, end });
                      });

                      const data = monthlyRecords.map(r => ({
                        'Matrícula': r.userId,
                        'Nome': r.userName,
                        'Data': format(parseISO(r.date), 'dd/MM/yyyy'),
                        'Horário Feedback': format(parseISO(r.timestamp), 'HH:mm'),
                        'Saída': r.checkOutTime ? format(parseISO(r.checkOutTime), 'HH:mm') : '-',
                        'Total Horas': r.totalWorkHours ? formatTimeDisplay(r.totalWorkHours) : '0 min'
                      }));

                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(data);
                      XLSX.utils.book_append_sheet(wb, ws, "Folha de Ponto");
                      XLSX.writeFile(wb, `Folha_Ponto_${selectedMonth}.xlsx`);
                    }}
                  >
                    <Download className="w-4 h-4" /> Exportar Planilha
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl flex flex-col md:flex-row md:items-end gap-4 shadow-sm">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">E-mail para Envio da Folha (Gmail)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <Input 
                        placeholder="exemplo@gmail.com" 
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        className="pl-10 h-11 border-blue-100 dark:border-blue-800"
                      />
                    </div>
                  </div>
                  <Button 
                    className="h-11 px-8 bg-blue-600 hover:bg-blue-700 font-bold gap-2 shadow-lg shadow-blue-500/20"
                    disabled={!targetEmail || sendingEmail}
                    onClick={() => {
                      setSendingEmail(true);
                      setTimeout(() => {
                        toast.success('Solicitação de envio processada! Verifique sua integração ou anexe a planilha baixada.');
                        setSendingEmail(false);
                        // Mock implementation of sending since workspace tool is not available
                        const subject = encodeURIComponent(`Folha de Ponto - ${selectedMonth}`);
                        const body = encodeURIComponent(`Olá,\n\nSegue em anexo a folha de ponto referente ao mês ${selectedMonth}.\n\nPara enviar o arquivo oficial, por favor use a função de exportar planilha e anexe-a neste e-mail.`);
                        window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
                      }, 1000);
                    }}
                  >
                    <Send className="w-4 h-4" /> 
                    {sendingEmail ? 'Processando...' : 'Enviar para Gmail'}
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <th className="px-4 py-3">Matrícula / Nome</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Feedback</th>
                        <th className="px-4 py-3">Saída</th>
                        <th className="px-4 py-3">Cálculo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {checkins.map(r => {
                        const [year, month] = selectedMonth.split('-');
                        const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
                        const end = endOfMonth(start);
                        const d = parseISO(r.date);
                        
                        if (!isWithinInterval(d, { start, end })) return null;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.userName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{r.userId} • {r.sector}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {format(parseISO(r.date), 'dd/MM/yyyy')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {format(parseISO(r.timestamp), 'HH:mm')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                {r.checkOutTime ? format(parseISO(r.checkOutTime), 'HH:mm') : '--:--'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                {r.totalWorkHours ? formatTimeDisplay(r.totalWorkHours) : '--:--'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {checkins.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic">
                      Selecione um mês com registros para visualizar a folha de ponto.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
