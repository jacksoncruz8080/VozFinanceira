import React from 'react';
import { TransactionData } from '../services/gemini';
import { Save, X, Calendar, Tag, CreditCard, Type as TextIcon, DollarSign, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface TransactionFormProps {
  data: TransactionData;
  onChange: (data: TransactionData) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ data, onChange, onSave, onCancel, isSaving }) => {
  const handleChange = (field: keyof TransactionData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-8 border border-line shadow-sm w-full max-w-lg"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-lg font-bold text-ink">Confirmar Lançamento</h2>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${data.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          Pendente
        </span>
      </div>

      <div className="space-y-6">
        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Transcrição (IA)
          </label>
          <textarea
            value={data.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-ink h-20 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Valor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
              <input
                type="text"
                value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(data.valor || 0)}
                onChange={(e) => {
                  // Limpar caracteres não numéricos exceto vírgula e ponto
                  let value = e.target.value.replace(/[^\d]/g, '');
                  if (value === '') value = '0';
                  const numericValue = parseFloat(value) / 100;
                  handleChange('valor', isNaN(numericValue) ? 0 : numericValue);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-black text-ink"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Tipo
            </label>
            <select
              value={data.tipo}
              onChange={(e) => handleChange('tipo', e.target.value as 'Entrada' | 'Saída')}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-ink"
            >
              <option value="Entrada">Entrada</option>
              <option value="Saída">Saída</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Categoria
            </label>
            <select
              value={data.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-ink"
            >
              <option value="Serviços">Serviços</option>
              <option value="Vendas">Vendas</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Transporte">Transporte</option>
              <option value="Combustível">Combustível</option>
              <option value="Equipamento">Equipamento</option>
              <option value="Material">Material</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Data
            </label>
            <input
              type="date"
              value={data.data}
              onChange={(e) => handleChange('data', e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-ink"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-3 text-muted hover:text-ink text-sm font-bold transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-2 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
             <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Confirmar e Salvar no Sheets
        </button>
      </div>
    </motion.div>
  );
};