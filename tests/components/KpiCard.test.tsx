import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';

describe('KpiCard — estados distintos', () => {
  it('carregando mostra skeleton, sem valor', () => {
    render(<KpiCard label="Receita" value={1000} loading />);
    expect(screen.queryByText(/R\$/)).toBeNull();
  });
  it('zero real aparece como R$ 0,00', () => {
    render(<KpiCard label="Receita" value={0} />);
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
  it('null = não informado; undefined = indisponível (com motivo)', () => {
    const { rerender } = render(<KpiCard label="Custos" value={null} />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    rerender(<KpiCard label="Custos" value={undefined} unavailableReason="Sem custos cadastrados" />);
    expect(screen.getByText(/Dados indisponíveis/)).toBeInTheDocument();
    expect(screen.getAllByText('Sem custos cadastrados').length).toBeGreaterThan(0);
  });
  it('estimado e parcial exibem selo', () => {
    const { rerender } = render(<KpiCard label="Comissão" value={500} estimated />);
    expect(screen.getByText('Estimado')).toBeInTheDocument();
    rerender(<KpiCard label="Sobra" value={500} partial />);
    expect(screen.getByText('Parcial')).toBeInTheDocument();
  });
  it('formato inteiro', () => {
    render(<KpiCard label="Pedidos" value={1234} format="integer" />);
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });
  it('valor monetário não quebra linha', () => {
    render(<KpiCard label="Receita" value={123456} />);
    expect(screen.getByText('R$ 1.234,56').className).toContain('whitespace-nowrap');
  });
});

describe('CurrencyValue', () => {
  it('estados', () => {
    const { rerender } = render(<CurrencyValue centavos={0} />);
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    rerender(<CurrencyValue centavos={undefined} />);
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    rerender(<CurrencyValue centavos={null} />);
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    rerender(<CurrencyValue centavos={100} estimated />);
    expect(screen.getByLabelText('estimado')).toBeInTheDocument();
  });
});

describe('KpiCard — o número cabe no card (container query)', () => {
  it('informa o nº de caracteres ao CSS, que calcula o tamanho da fonte pela largura do card', () => {
    render(<KpiCard label="Faturamento" value={211319932} />);
    const valor = screen.getByText('R$ 2.113.199,32');
    expect(valor).toHaveAttribute('data-kpi-value');
    expect(valor.style.getPropertyValue('--kpi-chars')).toBe('15');
    expect(valor.className).toContain('kpi-value');
    expect(screen.getByRole('group', { name: 'Faturamento' })).toHaveAttribute('data-kpi-card');
  });

  it('valores curtos e longos declaram tamanhos diferentes (não há tamanho fixo na janela)', () => {
    const { rerender } = render(<KpiCard label="ROAS" value={1.67} format="ratio" />);
    expect(screen.getByText('1,67').style.getPropertyValue('--kpi-chars')).toBe('4');
    rerender(<KpiCard label="Investimento" value={126549556} />);
    expect(screen.getByText('R$ 1.265.495,56').style.getPropertyValue('--kpi-chars')).toBe('15');
  });

  it('indicador principal fica marcado e valores indisponíveis não ganham fonte fluida', () => {
    const { rerender } = render(<KpiCard label="Receita" value={100} hero />);
    expect(screen.getByRole('group', { name: 'Receita' })).toHaveAttribute('data-hero');
    rerender(<KpiCard label="Receita" value={undefined} />);
    expect(document.querySelector('[data-kpi-value]')).toBeNull();
  });
});

describe('KpiGrid / KpiGroup', () => {
  it('a grade distribui por variável CSS e esconde nada: todos os filhos são renderizados', () => {
    const { container } = render(
      <KpiGrid cols={7}>
        {Array.from({ length: 7 }, (_, i) => (
          <KpiCard key={i} label={`Indicador ${i + 1}`} value={i} format="integer" />
        ))}
      </KpiGrid>,
    );
    const grade = container.firstElementChild!;
    expect(grade.className).toContain('kpi-grid');
    expect(grade.className).toContain('[--kpi-cols:2]'); // celular: 2 colunas
    expect(grade.className).toContain('md:[--kpi-cols:4]'); // 7 indicadores viram 4 + 3 (a última linha se estica)
    expect(screen.getAllByRole('group')).toHaveLength(7);
  });

  it('grupo tem região nomeada e título', () => {
    render(
      <KpiGroup title="Custos e resultado">
        <KpiGrid cols={4}>
          <KpiCard label="Custos" value={1} />
        </KpiGrid>
      </KpiGroup>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Custos e resultado' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Custos' })).toBeInTheDocument(); // o card é um grupo nomeado (o rótulo não é um título)
    expect(screen.queryByRole('heading', { name: 'Custos' })).toBeNull();
  });
});
