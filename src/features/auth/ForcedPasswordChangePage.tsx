import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ChangePasswordForm } from './ChangePasswordForm';
import { AuthHeading, AuthShell } from './AuthShell';

/** Conta com senha temporária: nada mais é acessível até a troca. */
export default function ForcedPasswordChangePage() {
  const { status, user, markPasswordChanged, logout } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') return null;
  if (status === 'unauthenticated' || !user) return <Navigate to="/login" replace />;
  if (!user.trocaSenhaObrigatoria) return <Navigate to="/" replace />;

  return (
    <AuthShell>
      <AuthHeading title="Defina uma nova senha" subtitle="Sua conta usa uma senha temporária. Escolha uma senha pessoal para continuar." />
      <ChangePasswordForm
        onDone={() => {
          markPasswordChanged();
          navigate('/', { replace: true }); // a raiz leva cada perfil à sua tela inicial (financeiro ou RH)
        }}
      />
      <Button
        variant="link"
        className="mt-4 w-full"
        onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
      >
        Sair
      </Button>
    </AuthShell>
  );
}
