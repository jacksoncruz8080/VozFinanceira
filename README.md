# Voz Financeira 🎙️💰

Sistema inteligente para registro de lançamentos financeiros via áudio, utilizando **Gemini AI** para transcrição/interpretação e **Google Sheets** como banco de dados.

## 🚀 Funcionalidades

- **Registro por Voz:** Capture seus gastos e ganhos falando naturalmente.
- **IA Generativa:** O Gemini Flash Preview transcreve o áudio e estrutura os dados (Descrição, Valor, Tipo, Categoria, Data).
- **Integração Google Sheets:** Salva automaticamente em uma planilha organizada.
- **Edição Manual:** Corrija os dados interpretados pela IA antes de salvar.
- **Modo Manual:** Digite seus lançamentos se preferir não gravar áudio.
- **Histórico de Sessão:** Acompanhe os últimos itens lançados durante o uso.

## 🛠️ Tecnologias

- **Frontend:** React + Tailwind CSS + Framer Motion + Lucide React.
- **Backend:** Node.js + Express.
- **IA:** Google Gemini API (@google/genai).
- **Dados:** Google Sheets API (v4).

## 📋 Pré-requisitos

Antes de rodar o projeto, você precisará configurar as credenciais no arquivo `.env`.

### 1. Gemini API Key
Obtenha sua chave no [Google AI Studio](https://aistudio.google.com/).

### 2. Google Sheets API (Service Account)

1. Vá para o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ou use um existente).
3. Ative a **Google Sheets API**.
4. Vá em **Credentials** > **Create Credentials** > **Service Account**.
5. Crie a conta e, na aba **Keys**, gere uma nova chave **JSON**.
6. Abra o JSON baixado e pegue o `client_email` e a `private_key`.
7. **Importante:** Crie uma planilha no Google Sheets e **compartilhe-a** com o e-mail da Service Account (`client_email`), dando permissão de "Editor".
8. Pegue o ID da planilha na URL: `https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit`.

## ⚙️ Configuração do Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base):

```env
GEMINI_API_KEY="SUA_CHAVE_GEMINI"
GOOGLE_SHEETS_ID="ID_DA_SUA_PLANILHA"
GOOGLE_CLIENT_EMAIL="seu-email@projeto.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

*Nota: Certifique-se de que a `private_key` contenha os caracteres `\n` literais para as quebras de linha.*

## 🏃 Como Rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. O projeto estará disponível em `http://localhost:3000`.

## 📊 Estrutura da Planilha

Crie uma aba chamada `Lançamentos` com o seguinte cabeçalho na primeira linha:
| Data | Descrição | Tipo | Categoria | Valor |
| :--- | :--- | :--- | :--- | :--- |

## 🛡️ Segurança

As chamadas à API do Gemini são feitas no **Frontend**, seguindo as melhores práticas deste ambiente. Já a gravação no Google Sheets ocorre no **Backend** para proteger suas chaves privadas do Google Cloud.
