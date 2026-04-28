/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useA11y } from '../lib/A11yContext';
import { Accessibility, Eye, Volume2, Type, Languages } from 'lucide-react';

export default function AccessibilitySettings() {
  const { settings, updateSettings, speak } = useA11y();

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden max-w-xl mx-auto">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
            <Accessibility className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Acessibilidade Universal</CardTitle>
            <CardDescription className="text-[10px] font-bold">Personalize sua experiência inclusiva</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Visual A11y */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-slate-400" />
              <Label htmlFor="high-contrast" className="text-xs font-black uppercase cursor-pointer">Alto Contraste</Label>
            </div>
            <Switch 
              id="high-contrast" 
              checked={settings.highContrast} 
              onCheckedChange={(checked) => {
                updateSettings({ highContrast: checked });
                speak(checked ? 'Alto contraste ativado' : 'Alto contraste desativado');
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Type className="w-4 h-4 text-slate-400" />
              <Label className="text-xs font-black uppercase">Tamanho da Fonte</Label>
            </div>
            <RadioGroup 
              value={settings.fontSize} 
              onValueChange={(val: any) => {
                updateSettings({ fontSize: val });
                speak('Tamanho da fonte alterado');
              }}
              className="flex flex-wrap gap-2"
            >
              {[
                { value: 'small', label: 'P' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'G' },
                { value: 'xlarge', label: 'GG' },
              ].map((opt) => (
                <div key={opt.value} className="flex-1">
                  <RadioGroupItem value={opt.value} id={`font-${opt.value}`} className="sr-only" />
                  <Label 
                    htmlFor={`font-${opt.value}`}
                    className={`flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all font-black ${settings.fontSize === opt.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Audio A11y */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <Label htmlFor="voice-narration" className="text-xs font-black uppercase cursor-pointer">Narração de Interface</Label>
            </div>
            <Switch 
              id="voice-narration" 
              checked={settings.voiceNarration} 
              onCheckedChange={(checked) => {
                updateSettings({ voiceNarration: checked });
                if (checked) speak('Narração de interface ativada');
              }}
            />
          </div>
        </div>

        {/* Libras Placeholder */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <Languages className="w-4 h-4 text-slate-400" />
            <Label className="text-xs font-black uppercase">Tradutor de Libras (VLibras)</Label>
          </div>
          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-4 border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mb-2 shadow-sm">
               🤟
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500">Integração com VLibras Ativa</p>
            <p className="text-[8px] text-slate-400 mt-1 max-w-xs">Nosso avatar virtual traduzirá os textos da interface para Libras automaticamente ao passar o cursor.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
