# Incompatibilidades e lacunas entre frontend e backend

O frontend **não modifica o backend** (decisão do projeto). Tudo abaixo está tratado no frontend de forma honesta
(estado "indisponível", recurso oculto ou limitação documentada) e depende de autorização/decisão para ser resolvido no backend.

## 1. Sessão após recarregar a página (CSRF × path do cookie) — **RESOLVIDO em 20/10/2026**

O cookie `csrf` era emitido com `Path=/api/v1/auth` e o SPA não conseguia lê-lo (`document.cookie`) em páginas como `/dashboard`, então o
`/auth/refresh` respondia 403 e o F5 derrubava a sessão. O backend agora emite o `csrf` com `Path=/` (o refresh token continua HttpOnly e
restrito a `/api/v1/auth`) e o logout limpa o cookie nos dois paths. Cobertura: teste de integração do backend (atributos dos cookies) e E2E
real do frontend (login → Front → F5 → continua logado).

**Atenção em produção:** o SPA só enxerga o cookie se estiver no mesmo *site* da API. Use o mesmo domínio-pai (ex.: `app.exemplo.com` +
`api.exemplo.com` com `COOKIE_DOMAIN=.exemplo.com`, `COOKIE_SECURE=true`). Em sites diferentes, a alternativa é o refresh devolver o token CSRF no corpo.

## 2. Funcionalidades que o frontend não oferece por falta de suporte no backend

| Item | Situação | Tratamento no frontend |
|---|---|---|
| Recorrência **semestral** de custos | Backend aceita UNICO/SEMANAL/MENSAL/TRIMESTRAL/ANUAL | Opção não exibida (não simulamos recorrência) |
| Filtro `tipo` em custos fixos | Listagem de custos não filtra por tipo/categoria no servidor | Filtro por tipo omitido na tabela de custos |
| Custos do Call Center **por regra** (breakdown) | Sem endpoint que detalhe custo por regra/atendente | Mostra apenas total e custos lançados |
| Origem de leads por **categoria** | Endpoint de leads não retorna categorias | Bloco mostra o que a API entrega; sem inventar categorias |
| Campanhas: **payout** / gasto com anúncio | Cobertura RedTrack não traz payout nem gasto | Exibe cobertura/receita; payout "indisponível" |
| Comissão **perdida** | Não há campo dedicado | Não exibida como métrica |
| Filtro por **atendente** em relatórios | Só relevante onde a API aceita; ignorado nas demais | Enviado apenas aos endpoints que o suportam |
| Upload de anexos | Backend limita a 5 MB (PDF/PNG/JPEG) | Validado no cliente com a mesma regra |

## 3. Comportamentos da API que merecem atenção

- **Receita negativa** em linhas de Recuperações/Origem no critério `MOVIMENTACAO` (perdas lançadas no dia do estorno). É semântica da API; o frontend exibe o valor e o critério ativo, sem recalcular.
- **Dados desatualizados**: com `SYNC_ENABLED=false` o backend não sincroniza sozinho; o frontend mostra "Desatualizado · há X" com base em `ultimaSincronizacao`.
- **Sobra / Margem do Call Center** aparecem como "Dados indisponíveis" enquanto não houver custos cadastrados (não é zero).

## 4. Endpoints usados / ausentes

`scripts/contract-check.mjs` autentica na API real e valida o formato de **48 endpoints** consumidos.
Último resultado: todos compatíveis. Rodar: `API_URL=… API_EMAIL=… API_PASSWORD=… node scripts/contract-check.mjs`.
Nenhum endpoint necessário ficou sem rota; as lacunas acima são de **campos/filtros**, não de rotas.
