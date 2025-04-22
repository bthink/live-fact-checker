'use client';

import React, { useMemo } from 'react';

// Rozważ przeniesienie tego interfejsu do pliku types.ts
interface FactCheckResult {
  id: string;
  claim: string;
  status: 'pending' | 'true' | 'false' | 'uncertain';
  explanation: string;
  source?: string | null;
}

interface SessionSummaryProps {
  results: FactCheckResult[];
}

export default function SessionSummary({ results }: SessionSummaryProps) {
  // Używamy useMemo, aby obliczenia były wykonywane tylko, gdy `results` się zmienią
  const summary = useMemo(() => {
    const completed = results.filter(r => r.status !== 'pending');
    const total = completed.length;

    // Nie pokazuj podsumowania, jeśli nic nie zostało jeszcze sprawdzone
    if (total === 0) {
      return null;
    }

    const falseCount = completed.filter(r => r.status === 'false').length;
    const trueCount = completed.filter(r => r.status === 'true').length;
    const uncertainCount = completed.filter(r => r.status === 'uncertain').length;
    // Oblicz procent fałszywych, unikając dzielenia przez zero
    const falsePercentage = total > 0 ? ((falseCount / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      falseCount,
      trueCount,
      uncertainCount,
      falsePercentage,
    };
  }, [results]); // Zależność od `results`

  // Jeśli nie ma ukończonych wyników, nic nie renderuj
  if (!summary) {
    return null;
  }

  return (
    <div className="w-full max-w-md mt-6 p-4 border rounded-lg shadow-md bg-gray-50 dark:bg-gray-800">
      <h2 className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-white">Session Summary</h2>
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <p>Total Claims Checked: <span className="font-medium text-gray-900 dark:text-white">{summary.total}</span></p>
        <div className="flex justify-between items-center flex-wrap">
          <span className="mr-2 whitespace-nowrap">✔️ True: <span className="font-medium text-gray-900 dark:text-white">{summary.trueCount}</span></span>
          <span className="mr-2 whitespace-nowrap">❌ False: <span className="font-medium text-gray-900 dark:text-white">{summary.falseCount}</span> ({summary.falsePercentage}%)</span>
          <span className="whitespace-nowrap">❓ Uncertain: <span className="font-medium text-gray-900 dark:text-white">{summary.uncertainCount}</span></span>
        </div>
        {/* Można dodać opcjonalną listę sprawdzonych faktów */}
        {
        /*
        <details className="pt-2 mt-2 border-t">
          <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">Show Checked Facts</summary>
          <ul className="mt-1 text-xs list-disc list-inside">
            {results.filter(r => r.status !== 'pending').map(r => (
              <li key={r.id} className="mt-1">
                <span className={`font-bold ${r.status === 'true' ? 'text-green-600' : r.status === 'false' ? 'text-red-600' : 'text-yellow-600'}`}>
                  [{r.status.toUpperCase()}]
                </span> {r.claim}
              </li>
            ))}
          </ul>
        </details>
        */
        }
      </div>
    </div>
  );
} 