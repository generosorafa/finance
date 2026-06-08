import { useState } from 'react';
import { CircleDollarSign, Settings } from 'lucide-react';
import { loginWithGoogle } from '../firebase/client.js';

export function SetupScreen() {
  return (
    <main className="center-screen">
      <section className="setup-box">
        <div className="brand-mark large"><Settings size={28} /></div>
        <h1>Configure o Firebase</h1>
        <p>Crie um `.env.local` baseado no `.env.example`, preencha as chaves do app Web e rode o projeto novamente.</p>
        <code>VITE_FIREBASE_PROJECT_ID=seu-projeto</code>
      </section>
    </main>
  );
}

export function SplashScreen() {
  return <main className="center-screen"><div className="loader" /></main>;
}

export function LoginScreen() {
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleLogin() {
    setAuthError('');
    setIsSigningIn(true);

    try {
      await loginWithGoogle();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="center-screen login-screen">
      <section className="login-panel">
        <div className="brand-mark large"><CircleDollarSign size={30} /></div>
        <h1>Finance</h1>
        <p>Entre com sua conta Google para acessar seu controle financeiro.</p>
        {authError && <div className="notice error compact" role="alert">{authError}</div>}
        <button className="primary-button wide" disabled={isSigningIn} onClick={handleLogin} type="button">
          {isSigningIn ? 'Conectando...' : 'Entrar com Google'}
        </button>
      </section>
    </main>
  );
}

function getAuthErrorMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/unauthorized-domain') {
    return 'Este dominio ainda nao esta autorizado no Firebase Authentication. Adicione localhost, 127.0.0.1 ou o dominio publicado em Authorized domains.';
  }

  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Login cancelado antes de concluir.';
  }

  return error?.message || 'Nao foi possivel entrar com Google agora.';
}

