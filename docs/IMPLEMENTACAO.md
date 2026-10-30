# Estado e decisões — 28/10/2026

A implementação está na branch `codex/tato-v1-20261028`. O repositório começou apenas com README; o projeto continua na mesma raiz, sem app adicional ou subagentes. A `main` foi preservada. O Preview protegido está pronto na Vercel, sem promoção para produção.

## Implementação

Next.js 16/App Router, React 19, TypeScript estrito, Tailwind 4, Supabase JS 2/SSR 0.12, com lockfile. Auth, onboarding retomável, contas manuais, categorias próprias, lançamentos realizados, compromissos e painel estão implementados. Interface em pt-BR, identidade provisória em texto, sem mascote definitivo. Conversa com IA implementada: ver [IA.md](IA.md) para limites, segurança, migração e testes. Sem WhatsApp, integração bancária, transferências, cartões, parcelamentos, empréstimos detalhados ou recorrências.

## Decisões financeiras e de autorização

- Centavos inteiros até 99.999.999.999 por valor; conversão, cálculo e formatação monetários com BigInt.
- Datas civis como strings/SQL date; hoje financeiro usa America/Sao_Paulo. Auditoria usa timestamptz.
- Saldo inicial antecede as movimentações da referência; lançamentos anteriores são bloqueados. Inicial/referência ficam fixos enquanto houver lançamentos. Arquivar preserva saldo e histórico.
- Previsões não alteram saldo realizado. Folga cobre o fim do mês atual, incluindo atrasados e excluindo cancelados/liquidados. O filtro mensal altera somente o relatório.
- Liquidação/estorno em RPCs invoker com trava de linha, vínculo único e integridade diferida. Lançamento vinculado é corrigido por estorno/reabertura atômicos.
- RLS em todas as tabelas, grants explícitos, FKs compostas por proprietário/tipo. Funções invoker com search_path fixo. Somente transações têm grant de DELETE.
- Snapshot único MVCC por RPC mantém saldo/previsão consistentes e evita truncamento pela Data API. UUID estável impede duplicação em reenvios de criação.
- Auth SSR usa cookies getAll/setAll, Proxy do Next 16, getClaims para renovar/verificar e getUser nas operações. Redirects usam origem confiável, com VERCEL_URL apenas em Preview. Confirmação de e-mail preservada.

## Banco remoto

A integração Supabase aplicou o SQL existente em `tato-dev` (`mpwmwmbxawbhcngfysko`). O MCP atribuiu a versão **20261028130845**. O arquivo inicial foi renomeado para `supabase/migrations/20261028130845_tato_initial.sql`; o SHA-256 confirma conteúdo SQL idêntico entre arquivo e histórico remoto. Não há cópia da versão antiga, edição manual do histórico, reset ou recriação.

Cinco tabelas com RLS, 20 políticas, grants, FKs, funções e triggers foram verificados. A Data API recusa anônimos. A simulação read only do papel authenticated passou. A validação HTTP com sessão real não foi executada: não há token de usuário existente no ambiente. Nenhum usuário foi criado, e-mail enviado ou dado financeiro de teste gravado no remoto.

## Preview e evidências

[Preview do Tato](https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app/entrar), deployment `dpl_EktewJJpmn4U3T2a8hDE8iWzVZsv`, READY / staging (Preview), com proteção Vercel. Entrada e callbacks sem tokens foram conferidos; redefinição exige sessão. A origem dos callbacks retorna ao Preview. Novo Preview da etapa de IA em READY/staging, fonte adc662f, com proteção Vercel preservada.

Os testes locais cobrem finanças, validação, migração em PGlite, RLS A/B e liquidação idempotente. Isso não substitui sessão real, envio de e-mail nem concorrência por HTTP. A inspeção visual anterior cobriu login em celular e desktop; não se alega inspeção visual do painel autenticado remoto.

## Pendências externas

A integração não oferece Auth URL Configuration/templates: manter redirects existentes e acrescentar os três callbacks exatos do Preview, conferindo Site URL e confirmação de e-mail. Falta uma sessão existente autorizada para testar HTTP autenticado e o fluxo financeiro no navegador. Confirmação e recuperação por e-mail exigem tarefa com envio autorizado. Os advisors preexistentes e os detalhes de verificação estão em [SUPABASE_DEV.md](SUPABASE_DEV.md).

## Etapa da conversa com IA

Migração adicional `20261028143816_tato_ai_preview.sql` aplicada em tato-dev, alinhada por hash ao histórico remoto. Migração inicial intacta. RLS em propostas e cotas; tabelas financeiras preservadas. Cotas atômicas com papel privado sem privilégios financeiros. Confirmação invoker atômica via mutateFinance com ID/versionamento, assinatura e recuperação após resposta perdida. SDK oficial/Responses API, gpt-5.4-mini, sem fallback, sem retries automáticos. O Secret Vercel de Preview foi conferido por metadados e preservado.

OpenAI simulada nos testes; Chromium com UI/HTTP isolados em 390/1440px e capturas inspecionadas. RLS/grants remotos conferidos por catálogo/read only e HTTP anônimo negado. Falta sessão de testes para chamada paga no runtime e teste técnico HTTP A/B em banco isolado; scripts preparados, sem criar usuários/enviar e-mails. Relatos manuais do usuário não substituem esses testes. Consulte [IA.md](IA.md).

## Validação final e implantação

106 testes automáticos passaram; instalação, lint, tipos, formatação, diff check e build passaram. Quatro E2E públicos passaram, incluindo proteção de /conversar; financeiro skipped por falta de usuário de testes. UI isolada em 390/1440px passou; não equivale ao fluxo autenticado remoto. Preview dpl_EktewJJpmn4U3T2a8hDE8iWzVZsv READY/staging verificado via integração de acesso protegido da Vercel. Fonte adc662f; alterações seguintes apenas documentam o endereço. Secret OPENAI_API_KEY e variáveis Supabase continuam só em Preview, sem leitura de valores. Nenhuma chamada OpenAI real. Configuração de redirects para a nova origem está no README; a integração não pode inspecionar/alterar Auth URL Configuration.

## Redesign — 30/10/2026

Reformulação integrada a partir de abb615c, preservando a correção de cotas 20261028152627. Painel, navegação, registro rápido, onboarding, Auth e componentes comuns na nova identidade. Novo adaptador saveFinanceAction reutiliza serviço autenticado existente; confirmação/sucesso só após retorno do serviço. Sem alterações nas regras/migrações/dados remotos ou chamadas OpenAI reais. Assets raster derivados das referências, oito poses e origem documentada. [REDESIGN_TATO.md](REDESIGN_TATO.md) reúne decisões, contraste, capturas com fixtures, testes e limites de evidência.
