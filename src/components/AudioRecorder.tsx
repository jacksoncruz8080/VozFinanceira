import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        // Iniciar análise automaticamente
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Erro ao acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-xl border border-line shadow-sm min-h-[300px] justify-center">
      <div className="relative">
        <AnimatePresence mode="wait">
          {!isRecording && !isProcessing ? (
            <motion.button
              key="record"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-red-500 border-8 border-red-100 flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <Mic className="text-white w-10 h-10" />
            </motion.button>
          ) : isRecording ? (
            <motion.button
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-red-600 border-8 border-red-50 flex items-center justify-center transition-all shadow-md animate-pulse"
            >
              <Square className="text-white fill-white w-10 h-10" />
            </motion.button>
          ) : (
            <motion.div
              key="processing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center"
            >
              <RefreshCw className="text-primary w-10 h-10 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center h-12 flex flex-col justify-center">
        <p className="text-ink font-bold text-lg leading-tight">
          {isRecording ? "Ouvindo você..." : isProcessing ? "Analisando voz..." : "Toque no microfone"}
        </p>
        <p className="text-muted text-xs mt-1">
          {isRecording ? "Toque no quadrado para finalizar" : isProcessing ? "A I.A está extraindo os detalhes" : "Diga o que você gastou ou recebeu"}
        </p>
      </div>

      {isRecording && (
        <div className="flex items-center gap-1.5 h-10 mt-2">
          {[12, 18, 32, 24, 38, 28, 34, 16, 10, 22, 14].map((h, i) => (
            <motion.div 
              key={i} 
              animate={{ height: [h, h * 1.5, h] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
              className="w-1.5 rounded-full bg-primary" 
              style={{ height: `${h}px` }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};