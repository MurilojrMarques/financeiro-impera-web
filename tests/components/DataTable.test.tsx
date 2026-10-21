import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from '@/components/tables/DataTable';

interface Row {
  id: string;
  nome: string;
  valor: number;
  qtd: number;
  obs: string;
}

const rows: Row[] = [
  { id: '1', nome: 'Beta', valor: 200, qtd: 3, obs: 'obs-beta' },
  { id: '2', nome: 'Alfa', valor: 100, qtd: 5, obs: 'obs-alfa' },
];

const columns: Column<Row>[] = [
  { id: 'nome', header: 'Nome', mobile: 'title', sortable: true, sortValue: (r) => r.nome, cell: (r) => r.nome },
  { id: 'valor', header: 'Valor', align: 'right', mobile: 'value', sortable: true, sortValue: (r) => r.valor, cell: (r) => `R$ ${r.valor}` },
  { id: 'qtd', header: 'Qtd', cell: (r) => r.qtd },
  { id: 'obs', header: 'Obs', mobile: 'hidden', cell: (r) => r.obs },
  { id: 'acao', header: 'Ações', mobile: 'actions', cell: (r) => <button type="button">Editar {r.nome}</button> },
];

describe('DataTable — tabela no desktop, cartões no celular', () => {
  it('renderiza as duas apresentações (o CSS escolhe qual aparece)', () => {
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} />);
    expect(screen.getByRole('table', { name: 'Itens' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Itens' })).toBeInTheDocument();
  });

  it('o cartão usa título, valor em destaque, campos rótulo/valor e ações; colunas "hidden" ficam de fora', () => {
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} />);
    const [primeiro] = within(screen.getByRole('list', { name: 'Itens' })).getAllByRole('listitem');
    expect(within(primeiro).getByText('Beta')).toBeInTheDocument(); // título
    expect(within(primeiro).getByText('R$ 200')).toBeInTheDocument(); // valor em destaque
    expect(within(primeiro).getByText('Qtd')).toBeInTheDocument(); // rótulo do campo
    expect(within(primeiro).getByText('3')).toBeInTheDocument();
    expect(within(primeiro).getByRole('button', { name: 'Editar Beta' })).toBeInTheDocument(); // ação no rodapé
    expect(within(primeiro).queryByText('obs-beta')).toBeNull(); // mobile: 'hidden'
    // ...mas a coluna continua na tabela
    expect(screen.getByRole('columnheader', { name: 'Obs' })).toBeInTheDocument();
  });

  it('aceita um cartão sob medida', () => {
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} mobileCard={(r) => <p>cartão próprio de {r.nome}</p>} />);
    expect(screen.getByText('cartão próprio de Beta')).toBeInTheDocument();
  });

  it('ordena pelo cabeçalho (Z→A no 1º clique, A→Z no 2º)', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} />);
    const tabela = screen.getByRole('table', { name: 'Itens' });
    const botao = within(tabela).getByRole('button', { name: 'Ordenar por Nome' });

    await user.click(botao);
    expect(within(tabela).getAllByRole('row')[1]).toHaveTextContent('Beta');
    await user.click(botao);
    expect(within(tabela).getAllByRole('row')[1]).toHaveTextContent('Alfa');
    expect(within(tabela).getByRole('columnheader', { name: /Nome/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('a 1ª coluna fica fixa ao rolar a tabela na horizontal', () => {
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} />);
    const tabela = screen.getByRole('table', { name: 'Itens' });
    expect(within(tabela).getByRole('columnheader', { name: /Nome/ }).className).toContain('sticky');
  });

  it('linhas clicáveis funcionam por teclado nos dois formatos', async () => {
    const user = userEvent.setup();
    const aberto: string[] = [];
    render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} onRowClick={(r) => aberto.push(r.id)} />);
    const [linha] = within(screen.getByRole('table', { name: 'Itens' })).getAllByRole('row').slice(1);
    linha.focus();
    await user.keyboard('{Enter}');
    const [cartao] = within(screen.getByRole('list', { name: 'Itens' })).getAllByRole('listitem');
    cartao.focus();
    await user.keyboard(' ');
    expect(aberto).toEqual(['1', '1']);
  });

  it('carregando, erro e vazio têm estados próprios', () => {
    const { rerender } = render(<DataTable caption="Itens" columns={columns} data={undefined} rowKey={(r) => r.id} loading />);
    expect(screen.getByRole('status', { name: 'Carregando tabela' })).toBeInTheDocument();
    rerender(<DataTable caption="Itens" columns={columns} data={undefined} rowKey={(r) => r.id} error={new Error('x')} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<DataTable caption="Itens" columns={columns} data={[]} rowKey={(r) => r.id} empty={{ title: 'Nada por aqui' }} />);
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });

  it('rodapé: linhas na tabela e as mesmas linhas (ou um rodapé próprio) no celular', () => {
    const footer = (
      <tr>
        <td>Total geral</td>
      </tr>
    );
    const { rerender } = render(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} footer={footer} />);
    expect(screen.getAllByText('Total geral')).toHaveLength(2); // tabela + versão do celular
    rerender(<DataTable caption="Itens" columns={columns} data={rows} rowKey={(r) => r.id} footer={footer} mobileFooter={<p>Resumo do celular</p>} />);
    expect(screen.getAllByText('Total geral')).toHaveLength(1);
    expect(screen.getByText('Resumo do celular')).toBeInTheDocument();
  });
});
