import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Notice, NoticeList } from '@/components/feedback/Notice';

describe('Notice', () => {
  it('avisos comuns são "status" (polido) e erros são "alert"', () => {
    const { rerender } = render(<Notice tone="warning">Dados desatualizados</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Dados desatualizados');
    rerender(<Notice tone="danger">Falhou</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });

  it('mostra título e ação opcionais', () => {
    render(
      <Notice tone="info" title="Atenção" action={<a href="#x">Ver lista</a>}>
        corpo
      </Notice>,
    );
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver lista' })).toBeInTheDocument();
  });
});

describe('NoticeList', () => {
  it('com um único aviso é só um Notice (sem botão de recolher)', () => {
    render(<NoticeList items={[{ key: 'a', content: 'Único aviso' }]} />);
    expect(screen.getByText('Único aviso')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('vários avisos viram UM cartão que no celular começa recolhido e abre ao toque', async () => {
    const user = userEvent.setup();
    render(
      <NoticeList
        items={[
          { key: 'a', content: 'Primeiro aviso' },
          { key: 'b', tone: 'info', content: 'Segundo aviso' },
          { key: 'c', content: 'Terceiro aviso' },
        ]}
      />,
    );
    const toggle = screen.getByRole('button', { name: /3 avisos sobre este cálculo/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const list = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(list.className).toMatch(/\bhidden\b/); // recolhido (a partir de md a lista é sempre visível: `md:block`)
    expect(list.className).toContain('md:block');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(list.className).not.toMatch(/\bhidden\b/);
    expect(list).toHaveTextContent('Primeiro aviso');
    expect(list).toHaveTextContent('Terceiro aviso');
  });

  it('sem avisos não renderiza nada', () => {
    const { container } = render(<NoticeList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
