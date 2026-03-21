'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { C } from '@/lib/tokens';
import { getSession, isAdmin } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════
// CURVY — Asistente Virtual de Voz
// Botón flotante → graba voz → transcribe → Claude interpreta → ejecuta
// ═══════════════════════════════════════════════════════════════

const CURVY_COLOR = '#EF9F27'; // naranja Pepe family
const CURVY_DIM = 'rgba(239,159,39,0.12)';

export default function Curvy() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const recognitionRef = useRef(null);
  const panelRef = useRef(null);

  // Only show for founders
  useEffect(() => {
    const s = getSession();
    if (s?.user && isAdmin(s.user)) setSession(s);
  }, []);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Tu navegador no soporta reconocimiento de voz'); return; }

    const recognition = new SR();
    recognition.lang = 'es-MX';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let final = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript((final + interim).trim());
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setError(`Error de voz: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setResponse(null);
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      // Already started
      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current.start();
        setListening(true);
      }, 100);
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);

    if (!transcript.trim()) {
      setError('No escuché nada. Intenta de nuevo.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/curvy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      const data = await res.json();
      setResponse(data);
      setHistory(prev => [{
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        input: transcript.trim(),
        ...data,
      }, ...prev].slice(0, 20));
    } catch (e) {
      setError('Error conectando con Curvy. Verifica tu API key.');
    }

    setProcessing(false);
  }, [transcript]);

  const cancelListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
    setTranscript('');
  }, []);

  // Don't render for non-founders or no session
  if (!session) return null;

  const actionIcons = { update_status: '🔄', create_pieces: '✨', mark_published: '📢', report: '📊' };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? CURVY_COLOR : C.card,
          border: `2px solid ${open ? CURVY_COLOR : C.brd}`,
          color: open ? '#0A0A0A' : CURVY_COLOR,
          fontSize: 24, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? `0 4px 20px ${CURVY_COLOR}44` : '0 4px 16px rgba(0,0,0,.4)',
          transition: 'all .2s ease',
          fontFamily: "'DM Sans', sans-serif",
        }}
        title="Curvy — Asistente de voz"
      >
        {open ? '✕' : '🎙'}
      </button>

      {/* Panel */}
      {open && (
        <div ref={panelRef} style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 900,
          width: 380, maxHeight: 'calc(100vh - 120px)',
          background: '#111', border: `1px solid ${C.brdH}`,
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'DM Sans', sans-serif",
          animation: 'curvySlideIn .25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: `1px solid ${C.brd}`,
            background: `linear-gradient(135deg, ${CURVY_DIM}, transparent)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: CURVY_DIM, border: `1.5px solid ${CURVY_COLOR}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🎙</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.wh }}>Curvy</div>
                <div style={{ fontSize: 11, color: C.txtM }}>Asistente virtual de voz</div>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {/* Current state */}
            {!listening && !processing && !response && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: .6 }}>🎙</div>
                <div style={{ fontSize: 14, color: C.txtS, marginBottom: 4 }}>Háblame para actualizar tus piezas</div>
                <div style={{ fontSize: 12, color: C.txtM, lineHeight: 1.5 }}>
                  Ejemplo: "Los 4 reels de Brillo ya están en edición" o "Crea 3 reels nuevos para Cire"
                </div>
              </div>
            )}

            {/* Listening indicator */}
            {listening && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `${CURVY_COLOR}22`, border: `3px solid ${CURVY_COLOR}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: 28,
                  animation: 'curvyPulse 1.5s ease-in-out infinite',
                }}>🎙</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: CURVY_COLOR, marginBottom: 8 }}>Escuchando...</div>
                {transcript && (
                  <div style={{
                    background: C.bg, borderRadius: 10, padding: '12px 14px',
                    fontSize: 13, color: C.txt, lineHeight: 1.5, textAlign: 'left',
                    border: `1px solid ${C.brd}`, maxHeight: 120, overflowY: 'auto',
                  }}>
                    {transcript}
                  </div>
                )}
              </div>
            )}

            {/* Processing */}
            {processing && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: `3px solid ${C.brd}`, borderTopColor: CURVY_COLOR,
                  animation: 'spin .8s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 13, color: CURVY_COLOR, fontWeight: 600 }}>Curvy está procesando...</div>
                <div style={{ fontSize: 12, color: C.txtM, marginTop: 4 }}>"{transcript}"</div>
              </div>
            )}

            {/* Response */}
            {response && !processing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* What you said */}
                <div style={{
                  background: C.bg, borderRadius: 10, padding: '10px 14px',
                  borderLeft: `3px solid ${C.txtM}`,
                }}>
                  <div style={{ fontSize: 10, color: C.txtM, marginBottom: 4 }}>Tú dijiste:</div>
                  <div style={{ fontSize: 13, color: C.txtS }}>{transcript}</div>
                </div>

                {/* Curvy response */}
                <div style={{
                  background: CURVY_DIM, borderRadius: 10, padding: '12px 14px',
                  borderLeft: `3px solid ${CURVY_COLOR}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{actionIcons[response.action] || '🎙'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: CURVY_COLOR, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {response.action === 'update_status' ? 'Actualizando' :
                       response.action === 'create_pieces' ? 'Creando' :
                       response.action === 'mark_published' ? 'Publicando' : 'Reporte'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.5 }}>{response.message}</div>
                </div>

                {/* Results */}
                {response.results?.length > 0 && (
                  <div style={{
                    background: C.bg, borderRadius: 8, padding: '10px 12px',
                    border: `1px solid ${C.brd}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.txtM, textTransform: 'uppercase', marginBottom: 6 }}>Resultados</div>
                    {response.results.map((r, i) => (
                      <div key={i} style={{
                        fontSize: 12, color: r.startsWith('✓') ? C.teal : C.red,
                        padding: '3px 0', lineHeight: 1.4,
                      }}>{r}</div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {response.summary && (
                  <div style={{ fontSize: 12, color: C.txtM, lineHeight: 1.5, padding: '0 2px' }}>
                    {response.summary}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: C.redDim, borderRadius: 8, padding: '10px 14px',
                fontSize: 12, color: C.red, border: `1px solid ${C.red}33`,
              }}>{error}</div>
            )}

            {/* History */}
            {history.length > 0 && !listening && !processing && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.brd}`, paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.txtM, textTransform: 'uppercase', marginBottom: 8 }}>Historial</div>
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} style={{
                    padding: '8px 0', borderBottom: `1px solid ${C.brd}`,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{actionIcons[h.action] || '🎙'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.txtS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.input}</div>
                      <div style={{ fontSize: 10, color: C.txtM }}>{h.time} — {h.results?.length || 0} acciones</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${C.brd}`,
            display: 'flex', gap: 8,
          }}>
            {!listening ? (
              <button onClick={startListening} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: CURVY_COLOR, color: '#0A0A0A',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                transition: 'opacity .15s',
              }}>
                🎙 {response ? 'Hablar de nuevo' : 'Empezar a hablar'}
              </button>
            ) : (
              <>
                <button onClick={stopAndProcess} style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: CURVY_COLOR, color: '#0A0A0A',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  ✓ Enviar
                </button>
                <button onClick={cancelListening} style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: C.card, border: `1px solid ${C.brd}`,
                  color: C.txtM, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes curvySlideIn {
          from { opacity: 0; transform: translateY(12px) scale(.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes curvyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,159,39,.3); }
          50% { box-shadow: 0 0 0 16px rgba(239,159,39,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
