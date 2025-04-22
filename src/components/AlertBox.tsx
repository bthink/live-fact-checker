'use client';

import React from 'react';

// Ponowne użycie definicji typu z page.tsx (można by wynieść do osobnego pliku types.ts)
interface FactCheckResult {
  id: string;
  claim: string;
  status: 'pending' | 'true' | 'false' | 'uncertain';
  explanation: string;
  source?: string | null;
}

interface AlertBoxProps {
  result: FactCheckResult;
}

// Funkcja pomocnicza do mapowania statusu na style i ikonę
const getStatusStyle = (status: FactCheckResult['status']) => {
  switch (status) {
    case 'true':
      return {
        bgColor: 'bg-green-100',
        borderColor: 'border-green-400',
        textColor: 'text-green-800',
        icon: '✔️',
      };
    case 'false':
      return {
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        textColor: 'text-red-800',
        icon: '❌',
      };
    case 'uncertain':
      return {
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-800',
        icon: '❓',
      };
    default: // pending - nie powinien być tu renderowany, ale jako fallback
      return {
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-400',
        textColor: 'text-gray-800',
        icon: '⏳',
      };
  }
};

export default function AlertBox({ result }: AlertBoxProps) {
  // Nie renderujemy nic, jeśli status jest 'pending' (obsługa w page.tsx)
  if (result.status === 'pending') {
    return null;
  }

  const styles = getStatusStyle(result.status);

  return (
    <div
      className={`w-full max-w-md p-4 border-l-4 rounded-md shadow-sm ${styles.bgColor} ${styles.borderColor} ${styles.textColor} mb-3`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 text-xl mr-3">{styles.icon}</div>
        <div className="flex-grow">
          <p className="font-medium text-gray-900">"{result.claim}"</p>
          <p className="mt-1 text-sm">{result.explanation}</p>
          {result.source && (
            <a
              href={result.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
} 