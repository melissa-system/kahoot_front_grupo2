import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pl-skeleton rounded-md', className)} />;
}

function Screen({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" aria-label={label} className={className}>
      {children}
    </div>
  );
}

function BannerBones() {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
    </div>
  );
}

function HeaderBones({ withAction }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      {withAction && <Skeleton className="h-11 w-44 rounded-xl" />}
    </div>
  );
}

function QuizListBones() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-4 border-b border-line px-5 py-5 last:border-b-0 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-3 pl-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 pl-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuizListSkeleton() {
  return (
    <Screen label="Cargando cuestionarios…">
      <QuizListBones />
    </Screen>
  );
}

export function HistorySkeleton() {
  return (
    <Screen label="Cargando historial…" className="space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <span className="absolute inset-y-0 left-0 w-1 bg-line" />
          <div className="space-y-4 pl-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56 max-w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </Screen>
  );
}

export function QuizEditorSkeleton() {
  return (
    <Screen label="Cargando cuestionario…" className="space-y-6">
      <Skeleton className="h-5 w-40" />
      <HeaderBones withAction />
      <Skeleton className="h-8 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="hidden h-20 w-28 shrink-0 rounded-lg sm:block" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function ProfileSkeleton() {
  return (
    <Screen label="Cargando perfil…" className="space-y-6">
      <HeaderBones />
      <div className="max-w-xl space-y-4 rounded-2xl border border-line bg-surface p-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>
    </Screen>
  );
}

export function AdminShellSkeleton() {
  return (
    <Screen label="Verificando tu sesión…" className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-r border-line bg-sidebar lg:block">
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-6 px-4 py-5">
          {Array.from({ length: 3 }, (_, section) => (
            <div key={section} className="space-y-2">
              <Skeleton className="mb-3 h-3 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
              {section === 1 && (
                <>
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-20 bg-header px-4 sm:px-6">
          <div className="flex h-full items-center gap-3">
            <Skeleton className="h-10 w-36" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          <BannerBones />
          <HeaderBones withAction />
          <QuizListBones />
        </div>
      </div>
    </Screen>
  );
}

function PublicHeaderBones() {
  return (
    <header className="sticky top-0 z-30 bg-header/95">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="hidden h-3 w-48 sm:block" />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>
      <div className="h-[3px] bg-line" />
    </header>
  );
}

export function AuthSkeleton() {
  return (
    <Screen label="Cargando…" className="min-h-screen bg-bg">
      <PublicHeaderBones />
      <div className="flex min-h-[calc(100vh-83px)] items-start justify-center px-4 py-10 sm:items-center">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="hidden flex-col items-center lg:flex">
            <Skeleton className="h-72 w-72 rounded-3xl" />
            <Skeleton className="mt-6 h-5 w-72" />
            <Skeleton className="mt-2 h-5 w-56" />
          </div>
          <div className="w-full space-y-4 rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-5 w-full max-w-sm" />
            <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="mx-auto h-5 w-48" />
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function LandingSkeleton() {
  return (
    <Screen label="Cargando inicio…" className="min-h-screen bg-bg">
      <PublicHeaderBones />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <div className="order-2 space-y-5 lg:order-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full max-w-xl sm:h-16" />
            <Skeleton className="h-12 w-4/5 max-w-lg sm:h-16" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-5 w-2/3 max-w-md" />
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Skeleton className="h-14 w-full rounded-xl sm:w-72" />
              <Skeleton className="h-14 w-full rounded-xl sm:w-48" />
            </div>
          </div>
          <div className="order-1 mx-auto lg:order-2 lg:mx-0">
            <Skeleton className="h-60 w-60 rounded-[28px] sm:h-72 sm:w-72 lg:h-80 lg:w-80" />
          </div>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-line bg-surface/70 p-5">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

export function HostSessionSkeleton() {
  return (
    <Screen label="Abriendo la sala…" className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-8">
          <Skeleton className="h-24 w-24 rounded-2xl" />
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="mb-4 flex justify-between">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-8 w-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
