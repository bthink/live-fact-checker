'use client';

import React from 'react';
import AlertBox from './AlertBox'; // Import AlertBox

// Rozważ przeniesienie tego interfejsu do pliku types.ts
interface FactCheckResult {
  id: string;
  claim: string;
  status: 'pending' | 'true' | 'false' | 'uncertain';
  explanation: string;
  source?: string | null;
}

interface SessionLogProps {
  results: FactCheckResult[];
}

export default function SessionLog({ results }: SessionLogProps) {
  // Filtrujemy, aby pokazać tylko te, które zostały już sprawdzone
  const completedResults = results.filter(result => result.status !== 'pending');

  return (
    <div className="w-full max-w-md mt-6">
      <h2 className="text-lg font-semibold mb-3 text-center">Fact-Check Log</h2>
      {completedResults.length === 0 ? (
        <p className="text-center text-gray-500 text-sm">No fact-checks completed yet.</p>
      ) : (
        <div className="space-y-3">
          {/* Mapujemy tylko zakończone wyniki */}
          {completedResults.map(result => (
            <AlertBox key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
} 