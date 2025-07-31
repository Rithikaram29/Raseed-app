/* SpeechQueryInterface.tsx */
import React, { useState, useRef, useEffect, useCallback, useMemo, use } from 'react';
import { Mic, MicOff, Send, Copy, Volume2, Settings, Trash2, AlertCircle } from 'lucide-react';
import { useCreateQuery } from '@/hooks/userPrompts';

interface Query {
  id: number;
  text: string;
  timestamp: string;
  confidence?: number;
  origin: 'voice' | 'text';
}

type ApiResponse = {
  transcription?: string; // user’s words
  response?: string; // assistant’s full answer
  audioBase64?: string; // TTS of the answer
  error?: string;
  chatId?: string; // optional chat history ID
};

interface CreateQueryResponse {
  message: string;
  queryId: string;
}

/* ---------- Utility: typewriter hook ---------- */
function useTypewriter(
  text: string,
  speed = 18 // ms per char
): string {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!text) return setDisplay('');
    setDisplay('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return display;
}
/* --------------------------------------------- */

export default function SpeechQueryInterface() {
  /* ---------- state ---------- */
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [assistantFullAnswer, setAssistantFullAnswer] = useState('');
  const assistantTyping = useTypewriter(assistantFullAnswer);
  const [typedQuery, setTypedQuery] = useState('');
  const [queries, setQueries] = useState<Query[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('http://localhost:5001/api');
  const [latestApiResponse, setLatestApiResponse] = useState<CreateQueryResponse | null>(null);
  const [replyAudio, setReplyAudio] = useState<string | null>(null);
  const [chatEnd, setChatEnd] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  /* ---------- refs ---------- */
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  /* ---------- helper: safe fetch w/ retry ---------- */
  const safeFetch = useCallback(
    async (body: object) => {
      const attempt = async () => {
        const res = await fetch(`${apiUrl}/user-queries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, chatId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ApiResponse;
      };
      try {
        return await attempt();
      } catch (e) {
        // one retry
        return await attempt();
      }
    },
    [apiUrl]
  );

  /* ---------- core: talk to backend ---------- */
  const runQuery = useCallback(
    async (payload: { audioContent?: string; textContent?: string; isChatEnd?: boolean }) => {
      setIsProcessing(true);
      setAssistantFullAnswer('');
      setReplyAudio(null);
      try {
        const data = await safeFetch(payload);

        if (data.error) throw new Error(data.error);

        /*chat history - chatId */
        if (data.chatId) {
          setChatId(data.chatId);
        }

        /* transcription (for voice) */
        if (data.transcription?.trim()) setTranscribedText(data.transcription.trim());

        /* assistant answer (typewriter) */
        if (data.response) setAssistantFullAnswer(data.response);

        /* optional TTS */
        if (data.audioBase64) {
          setReplyAudio(data.audioBase64);
          new Audio(`data:audio/mp3;base64,${data.audioBase64}`).play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setIsProcessing(false);
      }
    },
    [safeFetch]
  );

  //   /* ---------- mutation hook (your original) ---------- */
  //   const {
  //     mutate: createQuery,
  //     data: mutationData,
  //     isSuccess,
  //   } = useCreateQuery();

  //   useEffect(() => {
  //     if (isSuccess && mutationData) setLatestApiResponse(mutationData);
  //   }, [isSuccess, mutationData]);

  /* ---------- localStorage sync ---------- */
  useEffect(() => {
    const saved = localStorage.getItem('voiceQueries');
    if (saved) {
      try {
        setQueries(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  console.log('queries:', chatId, chatEnd);
  useEffect(() => {
    localStorage.setItem('voiceQueries', JSON.stringify(queries));
  }, [queries]);

  // /* ---------- detect tab inactive ---------- */
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'hidden') {
  //       setChatEnd(true);
  //     }
  //   };
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, []);

  useEffect(() => {
    if (chatEnd) {
      runQuery({ isChatEnd: true });
      setTimeout(() => {
        setChatEnd(false);
        setChatId(null);
      }, 2000);
    }
  }, [chatEnd, runQuery]);

  console.log('chatended:', chatEnd);
  /* ---------- helper: copy ---------- */
  const copy = useCallback(async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const t = document.createElement('textarea');
      t.value = txt;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
    }
  }, []);

  useEffect(() => {
    if (chatEnd) {
      runQuery({ isChatEnd: true });
      setTimeout(() => {
        setChatEnd(false);
        setChatId(null);
      }, 2000);
    }
  }, [chatEnd, runQuery]);

  /* ---------- voice flow ---------- */
  const handleStartRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      if (mediaRecorder.current) {
        mediaRecorder.current.ondataavailable = null;
        mediaRecorder.current.onstop = null;
      }
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

      mediaRecorder.current.ondataavailable = ev => {
        if (ev.data.size) audioChunks.current.push(ev.data);
      };
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        stream.getTracks().forEach(t => t.stop());

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          await runQuery({ audioContent: base64 });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.current.start(1000);
      setTimeout(() => setIsRecording(true), 50);
    } catch {
      setError('Mic permission denied.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  /* ---------- typed query ---------- */
  const handleTextSubmit = async () => {
    const q = typedQuery.trim();
    if (!q) return;
    const newQuery: Query = {
      id: Date.now(),
      text: q,
      timestamp: new Date().toLocaleTimeString(),
      confidence: 1,
      origin: 'text',
    };
    setQueries(prev => [newQuery, ...prev]);
    setTypedQuery('');
    setLatestApiResponse(null);
    // createQuery({
    //   text: newQuery.text,
    //   timestamp: newQuery.timestamp,
    //   confidence: newQuery.confidence,
    // });
    await runQuery({ textContent: q });
  };

  /* ---------- memoised UI strings ---------- */
  const recorderLabel = useMemo(() => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Listening...';
    return 'Tap to speak';
  }, [isProcessing, isRecording]);

  /* ---------- JSX ---------- */
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-foreground">
            Voice & Text Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ask by speaking or typing • Get answers in text & speech
          </p>
        </header>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-6 mx-auto max-w-2xl bg-destructive/20 border border-destructive/50 rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-3">
              <AlertCircle className="text-destructive" size={24} />
              <span className="text-destructive-foreground">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-destructive hover:text-destructive-foreground"
            >
              ×
            </button>
          </div>
        )}

        {/* RECORDING CONTROLS */}
        <section className="flex flex-col items-center mb-10 animate-slide-up">
          <div className="relative mb-6">
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse-ring-delayed" />
              </>
            )}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                isProcessing
                  ? 'bg-yellow-500 cursor-not-allowed'
                  : isRecording
                    ? 'bg-destructive hover:bg-destructive/80'
                    : 'bg-primary hover:bg-primary/80'
              }`}
            >
              {isProcessing ? (
                <div className="animate-spin w-8 h-8 border-4 border-primary-foreground border-t-transparent rounded-full" />
              ) : isRecording ? (
                <MicOff size={48} />
              ) : (
                <Mic size={48} />
              )}
            </button>
          </div>
          <p
            className={`text-2xl font-semibold text-foreground mb-4 ${isRecording && 'animate-pulse'}`}
          >
            {recorderLabel}
          </p>
          {isRecording && (
            <div className="flex space-x-1 mb-4 animate-fade-in">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-audio-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* TYPED QUERY BAR */}
        <section className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <input
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-lg"
              placeholder="Type your question…"
              value={typedQuery}
              onChange={e => setTypedQuery(e.target.value)}
              onKeyDown={e => (e.key === 'Enter' ? handleTextSubmit() : null)}
              disabled={isProcessing}
            />
            <button
              onClick={handleTextSubmit}
              disabled={isProcessing || !typedQuery.trim()}
              className="p-2 rounded-lg bg-primary hover:bg-primary/80 disabled:bg-primary/40 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </section>

        {/* TRANSCRIPTION + ASSISTANT ANSWER */}
        {(transcribedText || assistantTyping) && (
          <section className="bg-card backdrop-blur-sm rounded-2xl p-6 mb-8 mx-auto max-w-2xl border border-border animate-slide-up">
            {transcribedText && (
              <>
                <h3 className="text-lg font-semibold text-primary mb-2">You said:</h3>
                <p className="text-foreground text-lg mb-4">{transcribedText}</p>
              </>
            )}
            {assistantTyping && (
              <>
                <h3 className="text-lg font-semibold text-primary mb-2">Assistant:</h3>
                <p className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                  {assistantTyping}
                  {assistantTyping.length < assistantFullAnswer.length && (
                    <span className="animate-pulse">▍</span>
                  )}
                </p>
                {replyAudio && (
                  <button
                    onClick={() => new Audio(`data:audio/mp3;base64,${replyAudio}`).play()}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                  >
                    <Volume2 size={18} />
                    Replay answer
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {latestApiResponse && (
          <section className="bg-card border border-border rounded-2xl p-6 my-8 mx-auto max-w-2xl animate-fade-in">
            <h3 className="text-lg font-semibold text-primary mb-3">DB Acknowledgement</h3>
            <pre className="text-foreground text-sm whitespace-pre-wrap">
              {JSON.stringify(latestApiResponse, null, 2)}
            </pre>
          </section>
        )}

        {/* HISTORY LIST */}
        <section className="bg-card backdrop-blur-sm rounded-2xl p-6 border border-border animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recent Queries</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-muted hover:bg-muted-foreground text-foreground"
              >
                <Settings size={20} />
              </button>
              {queries.length > 0 && (
                <button
                  onClick={() => setQueries([])}
                  className="p-2 rounded-lg bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {queries.map((q, i) => (
              <div
                key={q.id}
                className="bg-card rounded-xl p-4 border border-border hover:bg-muted transition-all duration-200 animate-slide-in"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-muted-foreground">{q.timestamp}</span>
                  <div className="flex gap-2">
                    {q.origin === 'voice' && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        voice
                      </span>
                    )}
                    {q.origin === 'text' && (
                      <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full">
                        text
                      </span>
                    )}
                    <button
                      onClick={() => copy(q.text)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{q.text}</p>
              </div>
            ))}
            {queries.length === 0 && (
              <div className="text-center py-12 animate-fade-in">
                <Mic size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">No queries yet</p>
                <p className="text-muted-foreground">Speak or type to begin</p>
              </div>
            )}
          </div>
        </section>

        {/* SETTINGS (unchanged except autoSubmit removed) */}
        {showSettings && (
          <section className="bg-card backdrop-blur-sm rounded-2xl p-6 mt-6 border border-border animate-slide-up">
            <h3 className="text-xl font-bold text-foreground mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <label className="text-foreground">API URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  className="bg-background text-foreground rounded px-3 py-1 text-sm w-48"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Languages etc. (keep your previous controls) */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-foreground">Sound Feedback</span>
                  <input type="checkbox" defaultChecked readOnly className="w-4 h-4" />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* utility animations (unchanged) */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes pulse-ring-delayed {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes audio-bar {
          0%,
          100% {
            height: 4px;
          }
          50% {
            height: 20px;
          }
        }
        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-in {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }

        .animate-pulse-ring-delayed {
          animation: pulse-ring 2s infinite 1s;
        }

        .animate-audio-bar {
          animation: audio-bar 0.5s infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
