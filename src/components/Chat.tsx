/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { Message, UserProfile } from '../types';
import { Send, Users, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';

interface ChatProps {
  currentUser: UserProfile;
}

export default function Chat({ currentUser: initialUser }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myMatricula, setMyMatricula] = useState(initialUser.employeeId);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(100));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            // Handle serverTimestamp which might be null initially
            timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate().toISOString() : new Date().toISOString()
          } as Message;
        });
        setMessages(data);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, 'list', 'messages')
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        text,
        senderId: myMatricula || 'ADMIN',
        senderName: myMatricula === 'ADMIN' ? 'Encarregado Central' : `Líder ${myMatricula}`,
        senderSector: initialUser.sector,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      <CardHeader className="border-b bg-white dark:bg-slate-900 pb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <MessageSquareText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Canal de Liderança</CardTitle>
            <CardDescription className="text-xs">Identificação por matrícula obrigatória.</CardDescription>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sua Matrícula</span>
          <Input 
            value={myMatricula}
            onChange={(e) => setMyMatricula(e.target.value.toUpperCase())}
            className="h-7 w-24 text-[11px] font-black text-center border-blue-200 bg-blue-50/50"
            placeholder="MAT-000"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 relative bg-slate-50/50 dark:bg-slate-950/20">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMe = msg.senderId === myMatricula;
              return (
                <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMe && (
                      <>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">MAT: {msg.senderId}</span>
                        <span className="text-[10px] font-bold text-slate-400">•</span>
                        <span className="text-[10px] font-medium text-slate-500">{msg.senderName}</span>
                      </>
                    )}
                    {isMe && <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Você ({msg.senderId})</span>}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className="flex items-center justify-between mt-1 gap-4">
                       <Badge variant="outline" className={`text-[8px] h-3 px-1 border-current uppercase opacity-70 ${isMe ? 'text-white border-white/30' : 'text-blue-600 border-blue-200'}`}>
                        {msg.senderSector}
                      </Badge>
                      <span className={`text-[9px] block opacity-60 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full pt-20 text-slate-400 text-center space-y-2">
                <Users className="w-10 h-10 opacity-20" />
                <p className="text-sm">Inicie uma conversa sobre os indicadores da equipe.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-4 bg-white dark:bg-slate-950">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Input 
            placeholder="Digite sua mensagem para os outros encarregados..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-full border-slate-200 focus-visible:ring-blue-500"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full bg-blue-600 hover:bg-blue-700 h-10 w-10 shrink-0 shadow-lg shadow-blue-500/30"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
