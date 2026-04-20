import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API following the platform-provided pattern
// process.env.GEMINI_API_KEY is handled by the platform's build system
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Função de retry com backoff exponencial para lidar com erro 503 (High Demand)
 * Mantida para estabilidade em ambientes locais onde a cota pode ser atingida.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand'))) {
      console.warn(`Gemini está sob alta carga. Tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export interface TransactionData {
  data: string;
  descricao: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  valor: number;
}

// Revertendo para o modelo solicitado pelo usuário
const PRIMARY_MODEL = "gemini-3-flash-preview";

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer);
    const audioBase64 = await blobToBase64(wavBlob);
    await audioCtx.close();

    const response = await withRetry(() => ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: "audio/wav",
            data: audioBase64,
          },
        },
        { text: "Transcreva o áudio acima." },
      ],
      config: {
        systemInstruction: "Você é um transcritor fiel. Transcreva o que é dito no áudio de forma literal, palavra por palavra, em português brasileiro. NÃO adicione explicações, NÃO corrija a fala e NÃO invente palavras se houver ruído ou silêncio. Se não houver fala humana clara, retorne apenas uma string vazia.",
        temperature: 0.1, // Reduz drasticamente a 'criatividade' e evita alucinações
      }
    }));

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw new Error("Falha ao processar o áudio. Tente falar novamente.");
  }
}

export async function structureTransaction(transcription: string): Promise<TransactionData> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Interprete o seguinte texto de lançamento financeiro: "${transcription}".
      
      Regras:
      - Se indicar recebimento, venda, serviço prestado, pagamento recebido, honorário, considere "Entrada".
      - Se indicar gasto, pagamento, compra, despesa, combustível, considerar "Saída".
      - Extraia o valor numérico em reais.
      - Infira uma categoria: Serviços, Clientes, Material, Combustível, Alimentação, Transporte, Impostos ou Outros.
      - A data de hoje é ${dateStr}. Se o texto mencionar outra data, use-a.
      
      Retorne os dados no formato JSON especificado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            data: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
            descricao: { type: Type.STRING, description: "Descrição resumida" },
            tipo: { type: Type.STRING, enum: ["Entrada", "Saída"] },
            categoria: { type: Type.STRING },
            valor: { type: Type.NUMBER, description: "Valor em reais (float)" },
          },
          required: ["data", "descricao", "tipo", "categoria", "valor"],
        },
      },
    }));

    const parsed = JSON.parse(response.text || "{}");
    return parsed as TransactionData;
  } catch (error) {
    console.error("Erro na estruturação:", error);
    throw new Error("Falha ao interpretar os dados da transação.");
  }
}
