'use client'; // Needs to be a client component to use state and effects

import { useState, useCallback } from 'react';
import AudioCapture from "@/components/AudioCapture";
import TranscriptDisplay from "@/components/TranscriptDisplay"; // Import the new component

// Definicja interfejsu dla wyników fact-checkingu
interface FactCheckResult {
  id: string; // Unikalne ID dla każdego wyniku (np. timestamp + index)
  claim: string;
  status: 'pending' | 'true' | 'false' | 'uncertain';
  explanation: string;
  source?: string | null;
}

// Typ dla odpowiedzi z API /api/fact-check
type FactCheckApiResponse = Omit<FactCheckResult, 'id' | 'claim' | 'status'> & {
    status: 'true' | 'false' | 'uncertain';
};

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState<FactCheckResult[]>([]);
  const [isDetectingClaims, setIsDetectingClaims] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false); // Stan dla fact-checkingu

  // Funkcja do sprawdzania pojedynczego twierdzenia
  const factCheckClaim = useCallback(async (claimResult: FactCheckResult) => {
    console.log(`Requesting fact-check for: "${claimResult.claim}" (ID: ${claimResult.id})`);
    // Nie ustawiamy tu isFactChecking na true globalnie, bo mamy Promise.all
    try {
      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimResult.claim }),
      });

      const result: FactCheckApiResponse = await response.json();

      if (!response.ok) {
        console.error('Fact-Check API Error:', result);
         setFactCheckResults(prev => prev.map(item =>
           item.id === claimResult.id
             ? { ...item, status: 'uncertain', explanation: `API Error: ${response.statusText}` }
             : item
         ));
      } else {
        console.log(`Fact-check result for "${claimResult.claim}" (ID: ${claimResult.id}):`, result);
        setFactCheckResults(prev => prev.map(item =>
          item.id === claimResult.id
            ? { ...item, status: result.status, explanation: result.explanation, source: result.source }
            : item
        ));
      }
    } catch (error) {
      console.error('Error calling fact-check API:', error);
       setFactCheckResults(prev => prev.map(item =>
         item.id === claimResult.id
           ? { ...item, status: 'uncertain', explanation: `Fetch Error: ${(error as Error).message}` }
           : item
       ));
    }
     // Finally block nie jest potrzebny do globalnego stanu tutaj
  }, []); // Pusta tablica zależności

  // Funkcja do wykrywania twierdzeń (zmodyfikowana)
  const detectClaimsInSegment = useCallback(async (textSegment: string) => {
    if (!textSegment.trim()) return;
    setIsDetectingClaims(true);
    console.log(`Requesting claim detection for: "${textSegment}"`);
    let detectedClaims: string[] = [];

    try {
      const response = await fetch('/api/detect-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textSegment }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Claim Detection API Error:', result);
      } else {
        if (result.claims && result.claims.length > 0) {
          detectedClaims = result.claims;
          console.log('New claims detected:', detectedClaims);

          const newResults: FactCheckResult[] = detectedClaims.map((claim, index) => ({
             id: `${Date.now()}-${index}`,
             claim,
             status: 'pending',
             explanation: '',
             source: null
          }));
          setFactCheckResults(prevResults => [...prevResults, ...newResults]);

          // Rozpocznij fact-checking dla każdego nowego twierdzenia
          if (newResults.length > 0) {
            setIsFactChecking(true); // Ustaw stan przed rozpoczęciem Promise.all
            const factCheckPromises = newResults.map(factCheckClaim);
            await Promise.allSettled(factCheckPromises);
            console.log("All fact-checks for this batch settled.");
            setIsFactChecking(false); // Resetuj stan po zakończeniu wszystkich
          }

        } else {
          console.log('No claims detected in this segment.');
        }
      }
    } catch (error) {
      console.error('Error calling claim detection API:', error);
    }
    finally {
      setIsDetectingClaims(false);
      // Upewnij się, że stan fact-checkingu jest false, jeśli nic nie zostało wysłane do sprawdzenia
      if(detectedClaims.length === 0) {
          setIsFactChecking(false);
      }
    }
  }, [factCheckClaim]); // Dodano factCheckClaim jako zależność

  // Callback z AudioCapture - bez zmian
  const handleNewTranscriptSegment = useCallback((segment: string) => {
    const cleanedSegment = segment.trim();
    if (cleanedSegment) {
      setTranscript(prev => prev + cleanedSegment + ' ');
      detectClaimsInSegment(cleanedSegment);
    }
  }, [detectClaimsInSegment]);

  // Callback dla stanu przetwarzania audio - bez zmian
  const handleProcessingAudioChange = (processing: boolean) => {
    setIsProcessingAudio(processing);
  };

  // Ogólny stan zajętości - teraz uwzględnia wszystkie 3 operacje
  const isBusy = isProcessingAudio || isDetectingClaims || isFactChecking;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold text-center">Live Fact-Checker</h1>
      <AudioCapture
        isProcessing={isBusy}
        onProcessingChange={handleProcessingAudioChange}
        onTranscriptionReceived={handleNewTranscriptSegment}
      />
      <TranscriptDisplay transcript={transcript} />
      {/* Wskaźniki stanu */} 
      {isDetectingClaims && <p className="text-sm text-blue-500">Detecting claims...</p>}
      {isFactChecking && <p className="text-sm text-purple-500">Fact-checking claims...</p>}

      {/* TODO: Wyświetlanie factCheckResults w Kroku 6 (AlertBox) */}
      {/* Tymczasowy log stanu factCheckResults */}
      <pre className="w-full max-w-md text-xs bg-gray-100 text-gray-800 p-2 rounded overflow-x-auto">
        FactCheck Results: {JSON.stringify(factCheckResults, null, 2)}
      </pre>
    </main>
  );
}
