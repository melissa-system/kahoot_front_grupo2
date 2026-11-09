import { useEffect, useRef } from 'react';
import type { CurrentQuestionView, SessionPhase, SessionStatus } from '../api/types';
import type { ConnectionStatus } from '../realtime/useHostSession';
import { isCorrectChoice } from './questionKind';
import { playSfx } from './sfx';

export function useGameSfx({
  ready,
  status,
  phase,
  question,
  participantCount,
  myChoice,
  connection,
}: {
  ready: boolean;
  status?: SessionStatus;
  phase?: SessionPhase;
  question?: CurrentQuestionView | null;
  participantCount: number;
  myChoice?: boolean | number;
  connection?: ConnectionStatus;
}) {
  const prev = useRef<{
    status?: SessionStatus;
    phase?: SessionPhase;
    questionId?: string;
    questionStatus?: CurrentQuestionView['status'];
    participantCount: number;
    connection?: ConnectionStatus;
  } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const snapshot = {
      status,
      phase,
      questionId: question?.id,
      questionStatus: question?.status,
      participantCount,
      connection,
    };
    const last = prev.current;
    if (!last) {
      prev.current = snapshot;
      return;
    }
    if (participantCount > last.participantCount) playSfx('pop');
    if (last.status === 'WAITING' && status === 'IN_PROGRESS') playSfx('question');
    else if (last.questionId && question?.id && last.questionId !== question.id) playSfx('question');
    if (last.questionStatus === 'OPEN' && question?.status === 'CLOSED') {
      if (myChoice !== undefined && isCorrectChoice(question, myChoice)) playSfx('correct');
      else if (myChoice !== undefined) playSfx('wrong');
      else playSfx('reveal');
    }
    if (last.status !== 'FINISHED' && status === 'FINISHED') playSfx('finish');
    if ((last.connection === 'reconnecting' || last.connection === 'offline') && connection === 'online') playSfx('reconnect');
    prev.current = snapshot;
  }, [ready, status, phase, question, participantCount, myChoice, connection]);
}
