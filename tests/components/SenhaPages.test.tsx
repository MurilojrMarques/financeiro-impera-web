import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import { PasswordRequirements } from '@/features/auth/PasswordFields';
import { SetPasswordPage } from '@/features/auth/SetPasswordPage';
import { ApiError } from '@/types/api.types';

const svc = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  validarLink: vi.fn(),
  resetPassword: vi.fn(),
  activateAccount: vi.fn(),
}));
vi.mock('@/services/auth.service', () => svc);

const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF12';

function EstadoDoLogin() {
  const l = useLocation();
  return <p data-testid="login">login:{(l.state as { aviso?: string } | null)?.aviso ?? ''}</p>;
}

function montar(ui: React.ReactNode, rota: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/login" element={<EstadoDoLogin />} />
          <Route path="/esqueci-senha" element={<p>página esqueci</p>} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() }));
});

describe('Esqueci minha senha', () => {
  it('valida o e-mail antes de enviar', async () => {
    montar(<ForgotPasswordPage />, '/esqueci-senha-x');
    await userEvent.type(screen.getByLabelText('E-mail'), 'isto-nao-e-email');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(svc.forgotPassword).not.toHaveBeenCalled();
  });

  it('confirma o envio sem dizer se a conta existe', async () => {
    svc.forgotPassword.mockResolvedValue({});
    montar(<ForgotPasswordPage />, '/x');
    await userEvent.type(screen.getByLabelText('E-mail'), 'alguem@empresa.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(svc.forgotPassword).toHaveBeenCalledWith('alguem@empresa.com');
    expect(await screen.findByText(/estiver cadastrado, você receberá/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao login/ })).toBeInTheDocument();
  });

  it('mostra aviso claro quando o limite de pedidos é atingido', async () => {
    svc.forgotPassword.mockRejectedValue(new ApiError('limite', 'http', 429, 'RATE_LIMITED'));
    montar(<ForgotPasswordPage />, '/x');
    await userEvent.type(screen.getByLabelText('E-mail'), 'alguem@empresa.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Muitas solicitações/);
  });
});

describe('Definir senha pelo link do e-mail', () => {
  const nova = 'Cobalto-Pivo-Tinta-47';
  const abrir = (modo: 'redefinir' | 'ativar', hash = `#token=${TOKEN}`) => {
    window.history.replaceState(null, '', `/redefinir-senha${hash}`);
    return montar(<SetPasswordPage modo={modo} />, '/redefinir-senha');
  };

  it('lê o token do fragmento, apaga-o do endereço e mostra o formulário se o link é válido', async () => {
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'RESET_SENHA' });
    abrir('redefinir');
    expect(await screen.findByLabelText('Nova senha')).toBeInTheDocument();
    expect(svc.validarLink).toHaveBeenCalledWith(TOKEN);
    expect(window.location.hash).toBe(''); // o token não fica na barra de endereço nem no histórico
    expect(window.location.href).not.toContain(TOKEN);
  });

  it('sem token, com link inválido ou de outro tipo: mensagem genérica e nenhuma chamada de redefinição', async () => {
    abrir('redefinir', '');
    expect(await screen.findByText('Link inválido ou expirado')).toBeInTheDocument();
    expect(svc.validarLink).not.toHaveBeenCalled();

    vi.clearAllMocks();
    svc.validarLink.mockResolvedValue({ valido: false, tipo: null });
    abrir('redefinir');
    expect(await screen.findByText('Link inválido ou expirado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute('href', '/esqueci-senha');

    vi.clearAllMocks();
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'CONVITE' }); // convite não serve na tela de redefinição
    abrir('redefinir');
    expect(await screen.findByText('Link inválido ou expirado')).toBeInTheDocument();
  });

  it('valida a senha no cliente e mostra os requisitos', async () => {
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'RESET_SENHA' });
    abrir('redefinir');
    const campo = await screen.findByLabelText('Nova senha');
    await userEvent.type(campo, 'curta1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'outra');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText(/ao menos 12 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
    expect(svc.resetPassword).not.toHaveBeenCalled();
  });

  it('conclui, vai ao login com aviso de sucesso e nunca guarda a senha', async () => {
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'RESET_SENHA' });
    svc.resetPassword.mockResolvedValue(undefined);
    abrir('redefinir');
    await userEvent.type(await screen.findByLabelText('Nova senha'), nova);
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), nova);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(svc.resetPassword).toHaveBeenCalledWith(TOKEN, nova));
    expect(await screen.findByTestId('login')).toHaveTextContent('login:senha-redefinida');
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(nova);
  });

  it('mostra a regra violada que o servidor devolve (senha comum, histórico, dados pessoais) sem queimar a tela', async () => {
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'RESET_SENHA' });
    svc.resetPassword.mockRejectedValue(new ApiError('Parâmetros inválidos', 'http', 422, 'VALIDATION_ERROR', [{ path: 'novaSenha', message: 'Essa senha é muito comum. Escolha outra' }]));
    abrir('redefinir');
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'Impera2026-ABCD');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Impera2026-ABCD');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Essa senha é muito comum. Escolha outra');
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument(); // o usuário pode tentar de novo
  });

  it('ativação de conta: texto próprio e envia para a rota de convite', async () => {
    svc.validarLink.mockResolvedValue({ valido: true, tipo: 'CONVITE' });
    svc.activateAccount.mockResolvedValue(undefined);
    abrir('ativar');
    await userEvent.type(await screen.findByLabelText('Nova senha'), nova);
    expect(screen.getByRole('heading', { name: 'Ative sua conta' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), nova);
    await userEvent.click(screen.getByRole('button', { name: 'Ativar conta' }));
    await waitFor(() => expect(svc.activateAccount).toHaveBeenCalledWith(TOKEN, nova));
    expect(await screen.findByTestId('login')).toHaveTextContent('login:conta-ativada');
    expect(svc.resetPassword).not.toHaveBeenCalled();
  });
});

describe('requisitos e força da senha', () => {
  it('marca cada requisito atendido e informa a força', () => {
    const { rerender } = render(<PasswordRequirements senha="abc" id="r" />);
    expect(screen.getByText(/Pelo menos 12 caracteres/).closest('li')).toHaveTextContent('(pendente)');
    expect(screen.getByText('Muito fraca')).toBeInTheDocument();
    rerender(<PasswordRequirements senha="Cobalto-Pivo-Tinta-47" id="r" />);
    expect(screen.getByText(/Pelo menos 12 caracteres/).closest('li')).toHaveTextContent('(atendido)');
    expect(screen.getByText(/Pelo menos um número/).closest('li')).toHaveTextContent('(atendido)');
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });
});
