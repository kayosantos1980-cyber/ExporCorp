/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  category: string;
  type: 'emoji' | 'objective';
}

export const QUESTIONS: Question[] = [
  // Interpessoais
  { id: 'rel_1', text: 'Como foi sua interação com colegas de trabalho hoje?', category: 'Interpessoais', type: 'emoji' },
  { id: 'rel_2', text: 'Você se sentiu respeitado(a) pelos colegas hoje?', category: 'Interpessoais', type: 'objective' },
  { id: 'rel_3', text: 'Como foi sua comunicação com sua liderança hoje?', category: 'Interpessoais', type: 'emoji' },
  { id: 'rel_4', text: 'Você conseguiu se expressar com clareza hoje?', category: 'Interpessoais', type: 'objective' },
  { id: 'rel_5', text: 'O ambiente de trabalho esteve colaborativo hoje?', category: 'Interpessoais', type: 'objective' },
  // Clima Organizacional
  { id: 'cli_1', text: 'Como você avalia o clima organizacional hoje?', category: 'Clima', type: 'emoji' },
  { id: 'cli_2', text: 'Você se sentiu motivado(a) durante o trabalho hoje?', category: 'Clima', type: 'objective' },
  { id: 'cli_3', text: 'Houve situações de estresse que impactaram seu dia?', category: 'Clima', type: 'objective' },
  { id: 'cli_4', text: 'Você se sentiu valorizado(a) hoje?', category: 'Clima', type: 'objective' },
  { id: 'cli_5', text: 'O ambiente esteve harmonioso hoje?', category: 'Clima', type: 'objective' },
  // Desempenho e Produtividade
  { id: 'des_1', text: 'Como você avalia sua produtividade hoje?', category: 'Desempenho', type: 'emoji' },
  { id: 'des_2', text: 'Você conseguiu cumprir suas tarefas planejadas?', category: 'Desempenho', type: 'objective' },
  { id: 'des_3', text: 'Você manteve o foco durante suas atividades?', category: 'Desempenho', type: 'objective' },
  { id: 'des_4', text: 'Houve dificuldades que impactaram seu desempenho?', category: 'Desempenho', type: 'objective' },
  { id: 'des_5', text: 'Você se sentiu eficiente nas atividades realizadas?', category: 'Desempenho', type: 'objective' },
  // Condições de Trabalho
  { id: 'con_1', text: 'Como estavam as condições do ambiente hoje?', category: 'Condições', type: 'emoji' },
  { id: 'con_2', text: 'Os recursos e ferramentas atenderam às suas necessidades?', category: 'Condições', type: 'objective' },
  { id: 'con_3', text: 'Você se sentiu seguro(a) no ambiente de trabalho hoje?', category: 'Condições', type: 'objective' },
  { id: 'con_4', text: 'O volume de trabalho foi adequado hoje?', category: 'Condições', type: 'objective' },
  { id: 'con_5', text: 'Você teve pausas suficientes durante o expediente?', category: 'Condições', type: 'objective' },
  // Gestão e Organização
  { id: 'ges_1', text: 'As orientações recebidas foram claras hoje?', category: 'Gestão', type: 'objective' },
  { id: 'ges_2', text: 'Você recebeu suporte quando necessário?', category: 'Gestão', type: 'objective' },
  { id: 'ges_3', text: 'A organização das atividades foi adequada hoje?', category: 'Gestão', type: 'objective' },
  { id: 'ges_4', text: 'Houve alinhamento nas tarefas da equipe hoje?', category: 'Gestão', type: 'objective' },
  { id: 'ges_5', text: 'A liderança esteve presente quando necessário?', category: 'Gestão', type: 'objective' },
  // Bem-estar e Satisfação
  { id: 'bem_1', text: 'Como você se sentiu ao longo do dia de trabalho?', category: 'Bem-estar', type: 'emoji' },
  { id: 'bem_2', text: 'Você terminou o dia satisfeito(a) com seu desempenho?', category: 'Bem-estar', type: 'objective' },
  { id: 'bem_3', text: 'Você se sentiu muito cansado(a) ao final do dia?', category: 'Bem-estar', type: 'objective' },
  { id: 'bem_4', text: 'Você considera que teve um dia positivo no trabalho?', category: 'Bem-estar', type: 'objective' },
  { id: 'bem_5', text: 'Você se sente disposto(a) para retornar ao trabalho amanhã?', category: 'Bem-estar', type: 'objective' },
];

export const EMOJI_OPTIONS = [
  { label: 'Muito bom', value: 4, emoji: '😄' },
  { label: 'Bom', value: 3, emoji: '🙂' },
  { label: 'Regular', value: 2, emoji: '😐' },
  { label: 'Ruim', value: 1, emoji: '🙁' },
];

export const OBJECTIVE_OPTIONS = [
  { label: 'SIM', value: 4, emoji: '✅' },
  { label: 'TALVEZ', value: 3, emoji: '🤔' },
  { label: 'NÃO', value: 2, emoji: '❌' },
  { label: 'NEM UM POUCO', value: 1, emoji: '🚫' },
];

export const SECTORS = [
  'Recursos Humanos',
  'Tecnologia',
  'Comercial',
  'Marketing',
  'Operações',
  'Financeiro',
  'Atendimento',
];

export const ALERT_THRESHOLD = 2.5;
