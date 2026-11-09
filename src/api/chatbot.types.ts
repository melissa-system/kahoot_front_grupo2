import type { Question } from './types';

export interface DraftQuestion {
  statement: string;
  kind?: 'boolean' | 'multiple';
  correctBoolean?: boolean;
  options?: string[];
  correctIndexes?: number[];
}
export interface QuestionProposal { questions: DraftQuestion[] }
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface QuizChatRequest {
  messages: ChatMessage[];
  requestedCount?: number;
  currentDraft?: QuestionProposal;
}
export interface QuizChatResponse { reply: string; draft: QuestionProposal | null }
export interface QuestionBatchRequest { operationId: string; questions: DraftQuestion[] }
export interface QuestionBatchReceipt { operationId: string; questions: Question[] }
