/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Progress } from '@/components/ui/progress';
import { getDailyQuestions, EMOJI_OPTIONS, OBJECTIVE_OPTIONS } from '../constants';
import { FEEDBACK_BONUS_MINUTES } from '../lib/timeUtils';
import { UserProfile, DailyCheckin } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useA11y } from '../lib/A11yContext';

import { format } from 'date-fns';

interface QuestionnaireProps {
  user: UserProfile;
  onComplete: (checkinId: string) => void;
  onBack: () => void;
}

export default function Questionnaire({ user, onComplete, onBack }: QuestionnaireProps) {
  const { speak } = useA11y();
  const [dailyQuestions] = useState(() => getDailyQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = dailyQuestions[currentIndex];
  const progress = ((currentIndex) / dailyQuestions.length) * 100;
  
  const handleSelect = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: value }));
    const selectedOption = currentQuestion.type === 'emoji' 
      ? EMOJI_OPTIONS.find(o => o.value === value)?.label 
      : OBJECTIVE_OPTIONS.find(o => o.value === value)?.label;
    
    speak(`Selecionado: ${selectedOption}`);
    
    // Automatically advance after a short delay for better UX
    setTimeout(() => {
      if (currentIndex < dailyQuestions.length - 1) {
        const nextQ = dailyQuestions[currentIndex + 1].text;
        setCurrentIndex(currentIndex + 1);
        speak(`Próxima pergunta: ${nextQ}`);
      } else {
        setIsFinishing(true);
        speak('Questionário finalizado. Deseja adicionar comentários?');
      }
    }, 400);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    speak('Enviando seu feedback, por favor aguarde');
    try {
      const { query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const scores = Object.values(responses) as number[];
      const totalScore = scores.reduce((acc, curr) => acc + curr, 0);
      const averageScore = totalScore / scores.length;
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      const checkinData = {
        userId: user.id,
        userName: anonymous ? 'Anônimo' : user.name,
        sector: user.sector,
        date: todayDate,
        timestamp: new Date().toISOString(),
        responses,
        totalScore,
        averageScore,
        comments,
        anonymous,
        feedbackBonusMinutes: FEEDBACK_BONUS_MINUTES
      };

      // Check for existing record of today
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.id),
        where('date', '==', todayDate)
      );
      const snapshot = await getDocs(q);

      let finalId = '';
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'checkins', existingDoc.id), checkinData);
        finalId = existingDoc.id;
      } else {
        const docRef = await addDoc(collection(db, 'checkins'), checkinData);
        finalId = docRef.id;
      }

      toast.success('Check-in enviado com sucesso! Bom descanso.');
      onComplete(finalId);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Erro ao enviar check-in. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isFinishing) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="text-green-600 w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Quase lá!</CardTitle>
              <p className="text-muted-foreground mt-2">Deseja adicionar algum comentário ou observação sobre o seu dia?</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="comments">Comentários (opcional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Conte-nos mais sobre como foi seu dia..."
                  className="min-h-[120px]"
                  value={comments}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, '');
                    setComments(val);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={(checked) => setAnonymous(!!checked)}
                />
                <Label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                  Enviar este feedback de forma anônima
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="flex-1 font-semibold" onClick={() => setIsFinishing(false)}>
                Voltar
              </Button>
              <Button className="flex-1 font-bold text-lg h-12" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Finalizar Check-in'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  const options = currentQuestion.type === 'emoji' ? EMOJI_OPTIONS : OBJECTIVE_OPTIONS;

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="mb-8 space-y-4 px-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 font-bold uppercase text-[10px] tracking-wider px-0 hover:bg-transparent hover:text-slate-600">
            <ChevronLeft className="w-3 h-3 mr-1" />
            Sair
          </Button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pergunta {currentIndex + 1} de {dailyQuestions.length}
            </span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="px-4"
        >
          <div className="space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                Cat: {currentQuestion.category}
              </span>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {currentQuestion.text}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    emoji-btn group
                    ${responses[currentQuestion.id] === option.value 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500' 
                      : 'border-slate-200 dark:border-slate-800'
                    }
                  `}
                >
                  <span className="text-4xl mb-3 transition-transform group-hover:scale-110 group-active:scale-95">
                    {option.emoji}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-2"
              >
                Anterior
              </Button>
              <div 
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => setCurrentIndex(Math.min(dailyQuestions.length - 1, currentIndex + 1))}
              >
                Pular Pergunta
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <MessageSquare className="w-3 h-3" />
        Suas respostas ajudam a construir um ambiente melhor para todos.
      </div>
    </div>
  );
}
