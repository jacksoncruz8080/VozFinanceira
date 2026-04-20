import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface TransactionData {
  data: string;
  descricao: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  valor: number;
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
        { text: "Transcreva exatamente o que foi dito neste áudio financeiro em português do Brasil. Retorne apenas o texto transcrito, sem comentários." },
      ],
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw new Error("Falha ao transcrever o áudio.");
  }
}

export async function structureTransaction(transcription: string): Promise<TransactionData> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed as TransactionData;
  } catch (error) {
    console.error("Erro na estruturação:", error);
    throw new Error("Falha ao interpretar os dados da transação.");
  }
}
