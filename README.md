# Financeiro Impera — Dashboard (Web)

Dashboard financeiro em React + TypeScript + Vite + Tailwind (tema escuro, destaque dourado) que consome a API Express
`financeiro-impera-api`. **Nenhum cálculo financeiro é feito no frontend**: valores vêm da API em centavos e só são formatados.

## Requisitos
- Node 20+ e a API rodando (padrão `http://localhost:3000/api/v1`) com `CORS_ORIGINS` incluindo `http://localhost:5173`.

## Variáveis de ambiente
Copie `.env.example` para `.env`. Todas são públicas (vão ao navegador): **nunca** coloque segredos.

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | URL base da API |
| `VITE_API_TIMEOUT_MS` | `30000` | Timeout das requisições |
| `VITE_REFRESH_KPI_MS` | `60000` | Atualização automática dos KPIs (0 desliga) |
| `VITE_REFRESH_STATUS_MS` | `30000` | Atualização do status de sincronização |
| `VITE_DEFAULT_CRITERIO` | `MOVIMENTACAO` | `MOVIMENTACAO` ou `APROVADAS` |
| `VITE_STALE_AFTER_SECONDS` | `300` | Após quanto tempo os dados são marcados como desatualizados |

## Executar
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção (dist/)
```

## Verificações
```bash
npm run typecheck
npm run lint
npm run test       # Vitest: unitários, componentes e integração HTTP (MSW, sem dados reais)
npm run test:all   # typecheck + lint + test + build
```
Layout e interações (Playwright com **API falsa**, sem backend e sem credenciais; 5 larguras de 360 a 1640 px × 12 rotas,
incluindo valores 10× maiores para testar números longos):
```bash
npm run test:layout                       # = playwright test responsive interactions --workers=4
SHOTS=1 SHOTS_DIR=./capturas npx playwright test responsive -g "front"   # grava capturas fatiadas por largura (o Playwright limpa test-results/ a cada execução)
SHOT_VP=celular SHOT_ROUTE=front,dashboard npx playwright test responsive # filtra larguras e rotas
```
E2E (Playwright) contra a API **real** (opcional, exige credenciais próprias):
```bash
E2E_LIVE=1 E2E_EMAIL=... E2E_PASSWORD=... npx playwright test live --project=desktop
```
Checagem de contrato (48 endpoints): `API_URL=... API_EMAIL=... API_PASSWORD=... node scripts/contract-check.mjs`.

## Segurança
- Access token **só em memória**; refresh via cookie HttpOnly; nada em localStorage/sessionStorage.
- Refresh single-flight com retry único em 401; CSRF por double-submit (header `X-CSRF-Token`).
- Sem `dangerouslySetInnerHTML`; uploads validados (PDF/PNG/JPEG ≤ 5 MB); o backend é a autoridade final de permissões.

## Estrutura
`src/services` (cliente HTTP) · `src/hooks` (filtros na URL, relatórios) · `src/components` (ui, cards, charts, tables, filters, forms, layout, feedback) ·
`src/features` (uma pasta por página) · `src/lib` (moeda, datas SP, permissões) · `tests/{unit,components,integration,e2e}` (`e2e/support`: API falsa e verificador de layout).

## Interface e responsividade
Tema escuro com destaque dourado; tokens de cor em `src/styles/globals.css` (único lugar com cores). Pontos de quebra do Tailwind:
- **< 768 px (celular)**: cabeçalho compacto e fixo (seção atual + estado dos dados), **barra de navegação inferior** (4 seções + "Mais"),
  filtros recolhidos num resumo ("Mês atual · 01/10 a 20/10"), tabelas viram **cartões**, diálogos viram **folhas** na base, campos com 16 px
  (sem zoom do iPhone) e alvos de toque de 44 px (`pointer-coarse`).
- **≥ 768 px**: abas fixas no topo, filtros em grade alinhada (3 colunas; 4 a partir de 1024 px) e tabelas completas com a 1ª coluna fixa.
- **≥ 1536 px**: grades de 5–6 indicadores numa linha só.

O app também pode ser adicionado à tela inicial do celular (ícone, abertura em tela cheia e barra de status escura): `public/manifest.webmanifest` e ícones em `public/`.

Convenções (existem testes que travam cada uma):
- **Números de KPI** (`KpiCard`) dimensionam-se pela largura **do card** (container query + nº de caracteres — ver `.kpi-value`), nunca por `vw` ou
  fonte fixa: `R$ 2.113.199,32` não pode vazar em nenhuma grade. Agrupe com `KpiGroup` e distribua com `KpiGrid` (a última linha incompleta se estica).
- **Grades de página**: use `PageGrid` (coluna base `minmax(0, 1fr)`). Um `grid` sem `grid-cols-1` abaixo do ponto de quebra cresce até a
  largura do conteúdo e faz a página inteira rolar na horizontal no celular. Tabelas lado a lado só a partir de `xl`.
- **Tabelas**: `DataTable` mostra tabela no desktop e lista de cartões no celular. Indique o papel de cada coluna com `Column.mobile`
  (`title` · `value` · `actions` · `full` · `hidden`) ou passe `mobileCard`/`mobileFooter` para um cartão sob medida.
- **Avisos**: `Notice` (info · warning · danger · success) e `NoticeList` (vários avisos viram um cartão recolhido no celular).
- **Gráficos**: `ChartFrame` define altura mínima, cresce com a linha da grade e oferece a tabela alternativa dos dados.

## Estados de dado
Zero real (`R$ 0,00`) ≠ não informado ≠ carregando ≠ indisponível ≠ estimado. Filtros (período, comparação, critério, extras) ficam na URL em America/Sao_Paulo.
PDF: botão "Exportar PDF" usa o CSS de impressão do navegador.

## Limitações conhecidas
Ver [docs/BACKEND-GAPS.md](docs/BACKEND-GAPS.md). A sessão sobrevive ao F5 (cookie `csrf` com `Path=/`); em produção, frontend e API precisam estar no mesmo domínio-pai.
