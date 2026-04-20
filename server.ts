import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API endpoint to save to Google Sheets
  app.post('/api/save-to-sheets', async (req, res) => {
    try {
      const { data, descricao, tipo, categoria, valor } = req.body;

      if (!descricao || !tipo || !categoria || valor === undefined) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      if (!clientEmail || !privateKey || !spreadsheetId) {
        let missing = [];
        if (!clientEmail) missing.push('GOOGLE_CLIENT_EMAIL');
        if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
        if (!spreadsheetId) missing.push('GOOGLE_SHEETS_ID');
        
        return res.status(500).json({ 
          error: 'Configuração do Google Sheets incompleta', 
          details: `Variáveis ausentes: ${missing.join(', ')}. Certifique-se de configurar os segredos no painel do AI Studio.` 
        });
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Verificação de existência da aba 'Lançamentos'
      try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === 'Lançamentos');

        if (!sheetExists) {
          console.log("Aba 'Lançamentos' não encontrada. Criando...");
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: 'Lançamentos'
                    }
                  }
                }
              ]
            }
          });
          
          // Adicionar cabeçalhos
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Lançamentos!A1:E1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor']]
            }
          });
        }
      } catch (err: any) {
        console.error('Erro ao verificar/criar aba:', err.message);
        // Se for erro de permissão aqui, já tratamos no catch principal
      }

      // Inserir linha na planilha
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Lançamentos!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [data, descricao, tipo, categoria, valor]
          ],
        },
      });

      console.log('Lançamento salvo com sucesso no Google Sheets:', { data, descricao, tipo, categoria, valor });
      res.json({ success: true, message: 'Lançamento salvo com sucesso!' });
    } catch (error: any) {
      console.error('Erro detalhado ao salvar no Google Sheets:', error.response?.data || error);
      
      const details = error.response?.data?.error?.message || error.message;
      const isPermissionError = details.includes('permission') || error.code === 403;
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

      res.status(500).json({ 
        error: isPermissionError 
          ? `Acesso Negado. Certifique-se de que a planilha está compartilhada com o e-mail: ${clientEmail}`
          : details.includes('Unable to parse range')
          ? 'Erro: A aba "Lançamentos" não existe e não pôde ser criada automaticamente. Verifique as permissões de Editor.'
          : 'Erro ao salvar na planilha', 
        details
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
