import { z } from 'zod';
import { isValidYmd } from '@/lib/dates';

/**
 * "Semestral" não existe no backend (SEMANAL/MENSAL/TRIMESTRAL/ANUAL): não é oferecido para não simular
 * no frontend uma recorrência que o backend não processa (ver docs/BACKEND-GAPS.md).
 */
export const RECORRENCIAS = ['UNICO', 'SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL'] as const;
export type Recorrencia = (typeof RECORRENCIAS)[number];

export const STATUS_PAGAMENTO = ['PENDENTE', 'PAGO', 'CANCELADO'] as const;
export const STATUS_LABEL: Record<(typeof STATUS_PAGAMENTO)[number], string> = { PENDENTE: 'Pendente', PAGO: 'Pago', CANCELADO: 'Cancelado' };

export const costSchema = z.object({
  descricao: z.string().trim().min(2, 'Informe a descrição do custo').max(200, 'Máximo de 200 caracteres'),
  categoriaId: z.string().min(1, 'Selecione o tipo do custo'),
  recorrencia: z.enum(RECORRENCIAS),
  valorCentavos: z
    .number({ error: 'Informe o valor' })
    .int()
    .positive('O valor deve ser maior que zero')
    .max(2_000_000_000, 'Valor acima do permitido')
    .nullable()
    .refine((v) => v !== null, 'Informe o valor')
    .transform((v) => v as number),
  vencimento: z.string().refine(isValidYmd, 'Informe uma data válida'),
  statusPagamento: z.enum(STATUS_PAGAMENTO),
  observacao: z.string().trim().max(1000, 'Máximo de 1000 caracteres').optional(),
});

/** entrada do formulário (valor pode estar vazio) e saída validada (valor sempre presente) */
export type CostFormInput = z.input<typeof costSchema>;
export type CostFormValues = z.output<typeof costSchema>;
