# Publicar: frontend na Vercel + API na sua máquina (Tailscale Funnel, sem domínio)

```
navegador ──https──> https://SEU-APP.vercel.app            (Vercel: arquivos do frontend)
                     └─ /api/*  ──rewrite──> https://SEU-HOST.SEU-TAILNET.ts.net/api/*   (Tailscale Funnel)
                                                └──> localhost:3000  (API na sua máquina)
```

O navegador só conversa com **uma origem** (`SEU-APP.vercel.app`): a Vercel repassa `/api/*` para o Funnel. Por isso o cookie de sessão
funciona (inclusive após F5) sem precisar de domínio próprio e sem CORS.

## 1. Tailscale + Funnel (na máquina da API)
1. Instale o Tailscale (tailscale.com/download) e entre com sua conta.
2. No painel admin (login.tailscale.com/admin/dns) ative **MagicDNS** e **HTTPS Certificates**.
3. Rode a API (item 2) e, no PowerShell:
   ```
   tailscale funnel --bg 3000
   ```
   Na primeira vez ele pede para habilitar o Funnel nesta máquina (abre um link do admin; aceite).
4. `tailscale funnel status` mostra a URL pública: `https://SEU-HOST.SEU-TAILNET.ts.net`. Teste no navegador:
   `https://SEU-HOST.SEU-TAILNET.ts.net/health/ready` → 200.
5. Para desligar: `tailscale funnel reset`.

Limites do Funnel: só portas 443/8443/10000 públicas, banda limitada (suficiente para um dashboard) e a máquina precisa estar ligada e online.

## 2. API (`financeiro-impera-api/.env`)
Use `.env.production.example` como modelo, com **estas diferenças para o Funnel** (sem domínio próprio):
```
NODE_ENV=production
TRUST_PROXY=2
CORS_ORIGINS=https://SEU-APP.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=            # vazio: o cookie fica preso ao endereço do frontend (que é quem a Vercel mostra ao navegador)
JWT_ACCESS_SECRET=<novo, 48+ bytes aleatórios>
```
Depois `npm run build && npm start` (ou `npx tsx src/server.ts`). Em produção a API **recusa** subir sem `COOKIE_SECURE=true` e sem `CORS_ORIGINS` explícito.

Atenção ao limite de logins: com a Vercel no meio, a API vê o IP da Vercel; `TRUST_PROXY=2` faz ela ler o IP real do usuário no cabeçalho
`X-Forwarded-For` (Vercel → Funnel). Se notar bloqueios de login de várias pessoas ao mesmo tempo, confirme em `/api/v1/auth/login` (429) e ajuste.

## 3. Frontend na Vercel
1. Suba o repositório `financeiro-impera-web` para o GitHub e importe na Vercel (framework Vite).
2. Edite o `vercel.json`: troque `SEU-HOST.SEU-TAILNET.ts.net` pela URL do passo 1.4 (sem `https://` duplicado) e faça commit.
3. Variável de ambiente do projeto na Vercel:
   ```
   VITE_API_BASE_URL=/api/v1
   ```
4. Deploy. Anote o endereço (`https://SEU-APP.vercel.app`) e coloque-o em `CORS_ORIGINS` da API (item 2); reinicie a API.

## 4. Conferência
- `https://SEU-APP.vercel.app` abre o login e entra normalmente.
- Navegue até **Front** e aperte **F5**: continua logado.
- O console do navegador não mostra erros de rede.

## Antes de abrir para a internet
- Troque a senha do admin de teste e crie usuários reais com o perfil mínimo necessário.
- Gere um `JWT_ACCESS_SECRET` novo (o de desenvolvimento não vai para produção).
- Use um PostgreSQL de verdade com backup (o banco embutido de `npm run dev:db` é só para desenvolvimento).
- Ligue a sincronização (`SYNC_ENABLED=true`) e confira em Integrações.
- A máquina precisa ficar ligada, com a API, o banco e o Tailscale rodando.

## Alternativa com domínio próprio
Com um domínio (`app.exemplo.com` + `api.exemplo.com`) o frontend chama a API direto (`VITE_API_BASE_URL=https://api.exemplo.com/api/v1`),
com `COOKIE_DOMAIN=.exemplo.com` e `CORS_ORIGINS=https://app.exemplo.com`, e um túnel Cloudflare no lugar do Funnel.
