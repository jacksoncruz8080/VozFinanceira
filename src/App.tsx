import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { TransactionForm } from './components/TransactionForm';
import { transcribeAudio, structureTransaction, TransactionData } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, CheckCircle2, AlertCircle, History, PlusCircle, Mic2, Keyboard } from 'lucide-react';

type AppState = 'idle' | 'processing' | 'editing' | 'saving' | 'success' | 'error';

interface HistoryItem extends TransactionData {
  id: string;
}

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [mode, setMode] = useState<'voice' | 'manual'>('voice');
  const [currentTransaction, setCurrentTransaction] = useState<TransactionData | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Carregar histórico inicial do localStorage
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('voz_financeira_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Salvar no localStorage sempre que o histórico mudar
  useEffect(() => {
    localStorage.setItem('voz_financeira_history', JSON.stringify(history));
  }, [history]);

  const handleAudioComplete = async (blob: Blob) => {
    setState('processing');
    try {
      // Converter Blob para Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const audioBase64 = await base64Promise;

      // Transcrever
      const text = await transcribeAudio(audioBase64, blob.type);
      setTranscription(text);

      if (!text) {
        throw new Error("Não consegui ouvir nada no áudio.");
      }

      // Estruturar
      const structured = await structureTransaction(text);
      setCurrentTransaction(structured);
      setState('editing');
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar áudio");
      setState('error');
    }
  };

  const handleSaveToSheets = async () => {
    if (!currentTransaction) return;
    setState('saving');
    try {
      const response = await fetch('/api/save-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTransaction),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar");
      }

      setHistory([{ ...currentTransaction, id: Math.random().toString(36).substr(2, 9) }, ...history]);
      setState('success');
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar na planilha");
      setState('error');
    }
  };

  const startManual = () => {
    const now = new Date();
    setCurrentTransaction({
      data: now.toISOString().split('T')[0],
      descricao: '',
      tipo: 'Saída',
      categoria: 'Outros',
      valor: 0
    });
    setTranscription('Lançamento manual');
    setState('editing');
  };

  const reset = () => {
    setState('idle');
    setCurrentTransaction(null);
    setTranscription('');
    setErrorMessage('');
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) return 'Hoje';
      if (date.getTime() === yesterday.getTime()) return 'Ontem';

      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink font-sans p-4 md:p-6 lg:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center bg-surface p-5 rounded-2xl border border-line shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink flex items-center gap-1.5 leading-none">
            Voz <span className="text-primary italic">Financeira</span>
          </h1>
          <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-70">Inteligência Artificial & Google Sheets</p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Planilha Ativa</span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Column: Quick Actions (Always Visible) */}
        <div className="flex flex-col gap-4">
          {/* Voice Action */}
          <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Mic2 className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Lançamento por Voz</h3>
            </div>
            <AudioRecorder onRecordingComplete={handleAudioComplete} isProcessing={state === 'processing'} />
          </div>

          {/* Manual Action */}
          <button 
            onClick={startManual}
            disabled={state === 'processing' || state === 'saving'}
            className="group bg-surface border border-line rounded-2xl p-6 shadow-sm hover:border-primary transition-all flex items-center justify-between text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-primary/10 transition-colors">
                <Keyboard className="w-6 h-6 text-slate-500 group-hover:text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-ink">Digitar Manual</h3>
                <p className="text-muted text-xs">Preencher campos</p>
              </div>
            </div>
            <PlusCircle className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
          </button>

          {/* Guidelines/Tips (Optional but nice for Professional Polish) */}
          <div className="hidden lg:block bg-slate-50 border border-line rounded-xl p-4">
            <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Exemplos de voz:</h4>
            <ul className="text-[11px] text-slate-500 space-y-1.5 italic">
              <li>• "Gastei 50 reais com almoço hoje"</li>
              <li>• "Recebi 1200 de um projeto de design"</li>
              <li>• "Paguei 200 reais de internet"</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Processing & Review */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {state === 'processing' && (
               <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-surface border border-line rounded-2xl p-12 text-center shadow-sm flex flex-col items-center"
              >
                <div className="relative w-20 h-20 mb-6">
                   <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                   <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                   <Mic2 className="absolute inset-0 m-auto w-8 h-8 text-primary opacity-50" />
                </div>
                <h2 className="text-xl font-bold text-ink mb-1">Analisando Áudio...</h2>
                <p className="text-muted text-sm italic">"O Gemini está extraindo os dados..."</p>
              </motion.div>
            )}

            {(state === 'editing' || state === 'saving') && currentTransaction && (
              <TransactionForm 
                key="edit-form"
                data={currentTransaction}
                onChange={setCurrentTransaction}
                onSave={handleSaveToSheets}
                onCancel={reset}
                isSaving={state === 'saving'}
              />
            )}

            {state === 'success' && (
              <motion.div 
                key="success"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center shadow-sm"
              >
                <div className="bg-emerald-500 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-emerald-900 mb-1">Lançamento Concluído!</h2>
                <p className="text-emerald-700/70 text-sm mb-6">Sua planilha já está atualizada.</p>
                <button onClick={reset} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all">
                  Ótimo, obrigado!
                </button>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div 
                key="error"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center shadow-sm"
              >
                <div className="bg-red-500 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-red-900 mb-2">Erro Detectado</h2>
                <p className="text-red-700/70 text-xs mb-8">{errorMessage}</p>
                <button onClick={reset} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all">
                  Tentar Novamente
                </button>
              </motion.div>
            )}

            {state === 'idle' && (
              <motion.div 
                key="idle-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 transition-colors"
              >
                <div className="bg-slate-200/50 p-4 rounded-full mb-6 relative">
                  <PlusCircle className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-500 font-bold text-lg uppercase tracking-wider mb-2">Painel de Revisão</p>
                <p className="text-slate-400 text-sm max-w-[280px]">Escolha um método de lançamento na lateral para começar.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Section - Full Width & Responsive */}
        {history.length > 0 && (
          <div className="col-span-1 lg:col-span-2 bg-surface rounded-2xl border border-line p-5 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <History className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="text-[11px] font-black text-muted uppercase tracking-[0.2em]">Últimos Lançamentos</h3>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-background">
                    <th className="py-4 px-4 text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Data</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Descrição</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Tipo</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Categoria</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-muted uppercase tracking-[0.1em] text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={item.id}
                      className="border-b border-background group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-5 px-4 text-xs font-bold text-slate-500">{formatDate(item.data)}</td>
                      <td className="py-5 px-4 text-sm font-bold text-ink">{item.descricao}</td>
                      <td className="py-5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${item.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded tracking-tight text-nowrap">{item.categoria}</span>
                      </td>
                      <td className="py-5 px-4 text-sm font-mono font-black text-ink text-right">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Always Vertical, No Scrolling) */}
            <div className="md:hidden space-y-4">
              {history.map((item) => (
                 <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`mobile-${item.id}`}
                  className="p-5 border border-line rounded-xl bg-slate-50/50"
                 >
                   <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{formatDate(item.data)}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.tipo}
                      </span>
                   </div>
                   <h4 className="text-sm font-bold text-ink mb-1">{item.descricao}</h4>
                   <div className="flex justify-between items-end mt-4">
                      <span className="text-[10px] font-bold text-slate-500 bg-white border border-line px-2 py-1 rounded">{item.categoria}</span>
                      <p className="text-base font-mono font-black text-ink">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                 </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto py-10 text-center">
        <p className="text-muted text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">© 2026 Voz Financeira • Power by JS Software e Tecnologia</p>
      </footer>
    </div>
  );
}
