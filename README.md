# Tato

Seu dinheiro, com mais jeito. Saiba o que cabe hoje, sem apertar o amanhã. Primeira versão de um organizador financeiro pessoal em português do Brasil, com contas **manuais**, lançamentos realizados e compromissos futuros. Inclui conversa com IA no servidor para consultar totais e preparar receitas/despesas com revisão e confirmação. Não há sincronização bancária, transferências, cartões, empréstimos detalhados, parcelamentos, recorrências, WhatsApp, pagamentos ou assinaturas.

## Reformulação visual — 30/10/2026

Nova identidade, painel com folga em destaque, registro rápido com revisão/validação, navegação flutuante, configuração em duas etapas e conversa com acesso manual. [Documentação e capturas verificadas](docs/REDESIGN_TATO.md). Os assets são recriações raster guiadas pelas referências fornecidas, com origem/transparência documentadas; vetores oficiais e variante negativa original permanecem pendentes. Nenhuma regra financeira, migração ou dado remoto foi alterado.

## Executar localmente

Requisitos: Node.js 22 ou superior (validado com Node 24), npm e um projeto Supabase existente. O aplicativo usa somente a URL e a chave **publicável**, incluindo nas operações de servidor; cada operação financeira exige a sessão do usuário e passa por RLS.

```bash
npm ci
cp .env.example .env.local
# Preencha as variáveis em .env.local sem adicionar esse arquivo ao Git.
npm run dev
```

Se o comando estiver rodando **no seu computador**, abra **http://localhost:3000/entrar** nesse mesmo computador. Se estiver rodando em um ambiente cloud, esse endereço aponta apenas para o próprio ambiente; não funciona no navegador do seu PC sem encaminhamento de porta ou uma URL de preview fornecida pela plataforma. Escutar em `0.0.0.0:3000` não cria uma URL externa. O ambiente cloud desta entrega não oferece uma URL de preview. Esta entrega não foi publicada em produção. Para testar a compilação otimizada: `npm run build` e `npm start`. Os scripts usam Webpack porque o processo auxiliar do Turbopack não conseguiu abrir uma porta neste ambiente.

As variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` podem vir do ambiente em vez do arquivo. `NEXT_PUBLIC_SITE_URL` define a **origem confiável** usada em links de e-mail; o padrão local é `http://localhost:3000`. Não são lidos cabeçalhos Host para gerar esses links. Em um preview HTTPS, configure a origem real do preview, reconstrua e ajuste o Supabase conforme abaixo. Não existe domínio de produção definido.

Em ambientes Node 24 com proxy de rede obrigatório, inicie com `NODE_USE_ENV_PROXY=1 npm run dev` (ou `npm start`). Isso foi usado na verificação local; mantenha o proxy e a CA injetados pelo ambiente. Não desabilite TLS. A interface não usa localStorage como substituto do banco e não inclui dados de demonstração na conta real.

## Preview pelo navegador, sem instalação local

O ambiente cloud de desenvolvimento não fornece um link externo para a porta 3000. Para testar pelo navegador em outro computador, o projeto precisa de uma implantação de **Preview**, separada da produção, em um provedor compatível com Next.js com servidor. O código não pode ser exportado como páginas estáticas: autenticação e operações financeiras dependem do servidor.

A preparação para Vercel usa a stack Next.js existente, sem mudar a aplicação nem criar outro Supabase. No provedor, selecione **Preview**, mantenha a proteção de acesso disponível e configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente **Preview**. Não envie `.env.local` nem configure chaves administrativas. Não use deploy de produção e não faça merge na branch principal para testar.

Sem `NEXT_PUBLIC_SITE_URL` explícita, o servidor usa a origem HTTPS de `VERCEL_URL` somente quando `VERCEL_ENV=preview`. Assim, links de confirmação/recuperação não apontam para localhost. A origem efetivamente retornada pelo provedor ainda deve ser permitida nos Redirect URLs do Supabase, com `/auth/callback`, `/auth/callback?next=/redefinir-senha` e `/auth/confirm`. Evite curingas amplos. Se preferir uma URL estável de teste, configure `NEXT_PUBLIC_SITE_URL` explicitamente com essa origem.

**Preview do redesign:** [https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app/entrar](https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app/entrar). Deployment `dpl_3irALtadPWNcXHYz5A9rwzi9GTke`, build **READY**, `target=staging` explícito na API (Preview), fonte `edd657c`. Projeto `tato-preview`, proteção Vercel Authentication ativa e preservada. Entre com a conta Vercel autorizada e depois com a conta Tato. Código na branch [`codex/tato-v1-20261028`](https://github.com/matheuslucascontato/tato/tree/codex/tato-v1-20261028), sem merge em main ou promoção para produção. O commit seguinte registra somente documentação/evidências.

**Acesso externo ainda não validado nesta nova origem.** A consulta por ID e por alias confirma READY e a proteção está ativa no projeto, mas `web_fetch_vercel_url` retornou `INVALID_ARGUMENT` (“deployment could not be found, or your Vercel connection may not have access”) tanto na URL atribuída quanto no alias confirmado. O CLI Vercel e credenciais locais não estão disponíveis. A tentativa HTTP local foi barrada pelo proxy de rede com CONNECT 403, antes de chegar à aplicação; isso não é um HTTP 403 do Tato nem prova de proteção. Não foi removida proteção nem criado bypass manual para contornar o bloqueio. Para completar a verificação automática, a conexão Vercel precisa conseguir consultar o novo deployment no projeto/time selecionados; pela rede cloud, o novo host também precisa ser permitido. O link acima pode ser conferido pelo proprietário no navegador, mas não está sendo apresentado como fluxo externo validado.

As duas variáveis públicas do Supabase e `OPENAI_API_KEY` (Secret) continuam configuradas somente para Preview. Presença/escopo foram conferidos por metadados `decrypt=false`, sem recuperar seus valores. `NEXT_PUBLIC_SITE_URL` está ausente; a origem esperada dos callbacks vem do fallback HTTPS de `VERCEL_URL` em Preview. Segredos, proteção e faturamento não foram alterados.

Foram executados **109 testes**, lint, tipos, formatação e build; Chromium isolado em 360/390/1440px, UI anterior da conversa e **quatro E2E públicos do Next compilado** passaram. O E2E financeiro ficou skipped. As capturas usam componentes reais com dados/ações simulados e estão em [docs/REDESIGN_TATO.md](docs/REDESIGN_TATO.md). E2E financeiro remoto, HTTP A/B e chamada paga continuam pendentes de sessões de teste. Nenhuma chamada real à OpenAI foi feita neste redesign.

No Supabase → Authentication → URL Configuration, confira **Site URL** com esta origem de desenvolvimento: `https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app`. Acrescente estes redirects exatos, **preservando todas as entradas existentes**:

- `https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app/auth/callback`
- `https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app/auth/callback?next=/redefinir-senha`
- `https://tato-preview-m98eonuco-matheuscamilocontato-2621s-projects.vercel.app/auth/confirm`

A integração disponível não permite consultar/editar essa configuração. Não foram enviados e-mails ou consumidos tokens de confirmação/recuperação; os callbacks desta nova origem ainda não foram verificados por HTTP devido ao bloqueio de acesso acima. O login por senha e os registros existentes foram relatados como testados pelo usuário na versão anterior, sem equivaler a validação técnica desta implantação.

## Banco de desenvolvimento: migração aplicada

A migração foi aplicada pela integração Supabase em **28/10/2026** no projeto existente **tato-dev** (`mpwmwmbxawbhcngfysko`). A integração atribuiu a versão **20261028130845**, por isso o arquivo original `20261027140000_tato_initial.sql` foi renomeado para `supabase/migrations/20261028130845_tato_initial.sql`, sem alterar seu SQL. O SHA-256 do arquivo é idêntico ao conteúdo registrado no histórico remoto: `5f023a7063387dc286e2121d71bcae57769d90ad86f241521a1fe4fec0d997b0`.

As cinco tabelas, suas políticas RLS, grants, funções e vínculos foram criados e verificados. A Data API recusa acesso anônimo às tabelas e ao snapshot com HTTP 401. A leitura sob o papel SQL `authenticated` passou. **Ainda não foi validado HTTP com uma sessão Auth real**, pois não há token de usuário existente disponível no ambiente. Não foram criados usuários nem enviados e-mails. Não houve reset ou recriação do projeto.

Os relatórios versionados registram `20261028130845 / tato_initial`, `20261028143816 / tato_ai_preview` e `20261028152627 / tato_ai_quota_session_fix` aplicadas em tato-dev (detalhes em [docs/IA.md](docs/IA.md)). Este redesign preservou as três e não fez consultas nem alterações no banco remoto. Não reaplique o SQL inicial, não mantenha uma cópia da versão antiga e não edite a migração já aplicada. Com CLI autenticada, a conferência reproduzível é:

```bash
npx supabase link --project-ref mpwmwmbxawbhcngfysko
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Os comandos acima são instruções de conferência; a aplicação desta entrega ocorreu via integração Supabase, com registro no histórico. Alterações futuras devem ser novas migrações versionadas. Não exponha todos os schemas, não conceda dados privados a `anon` e não desligue RLS para resolver erros de acesso.

Relatório completo, resultado dos advisors e campos exatos para configurar Auth: [`docs/SUPABASE_DEV.md`](docs/SUPABASE_DEV.md).

## Autenticação e e-mails

No painel Supabase, em Authentication → URL Configuration, para o endereço local efetivamente usado:

- Site URL: `http://localhost:3000`.
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback?next=/redefinir-senha` e `http://localhost:3000/auth/confirm`.
- Para preview, adicione essas mesmas rotas com a **origem HTTPS efetiva** do preview e defina `NEXT_PUBLIC_SITE_URL` com essa origem. Evite curingas amplos. Não invente um domínio de produção.

O fluxo padrão usa PKCE, com troca de `code` no servidor. Abra o e-mail no mesmo navegador/origem usado para solicitar o link. Cadastro respeita a confirmação configurada no Supabase; recuperação informa apenas que a solicitação foi aceita, sem afirmar entrega nem revelar se o e-mail existe. Links inválidos/expirados têm mensagem e podem ser solicitados novamente. Páginas e Server Actions verificam o usuário no servidor; o Proxy renova tokens com `getClaims`, preserva cookies e cabeçalhos de cache do `@supabase/ssr`. As consultas privadas não são armazenadas em cache compartilhado.

Para confirmação em outro dispositivo, o app também oferece `/auth/confirm` com token hash. Se optar por esse fluxo, configure os templates do Supabase com URLs explícitas e permitidas:

```html
<!-- Confirm signup (substitua a origem pela URL real do teste) -->
<a href="http://localhost:3000/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
  >Confirmar e-mail</a
>
<!-- Reset Password -->
<a href="http://localhost:3000/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Redefinir senha</a
>
```

Não altere os templates para uma origem de produção inexistente. O callback só permite destinos internos predefinidos; `/auth/confirm` escolhe o destino pelo tipo verificado.

**Limitação externa:** a migração está aplicada, mas a integração não expõe a configuração de URL do Auth. Confira **Site URL** com a origem do Preview e acrescente os três callbacks exatos listados acima, mantendo todos os redirects existentes. Cadastro com confirmação, entrega de e-mail, recuperação completa e login válido não foram exercitados contra uma caixa de testes. É necessário um e-mail de teste permitido pelo serviço de envio/SMTP do projeto, Site URL e redirects corretos, usuários de teste confirmados e uma sessão disponível para a validação HTTP. Não foi desativada a confirmação e não foi alegada entrega de e-mail. Com a stack Supabase local, use a caixa Mailpit fornecida pela CLI para completar os fluxos sem e-mails reais.

## O que o aplicativo implementa

- Cadastro, login, logout, solicitação de recuperação e redefinição autenticada de senha.
- Configuração inicial atômica e retomável: nome, primeira conta, saldo inicial inclusive negativo, referência e categorias idempotentes por usuário.
- Contas manuais: criação, edição, arquivamento e reativação. Não há exclusão de histórico. Nome de exibição editável e categorias próprias criáveis/editáveis.
- Receitas/despesas realizadas: criação, listagem, filtros de período/tipo/conta, edição e exclusão confirmada. Datas futuras são direcionadas para compromissos.
- Compromissos de entrada/saída: conta prevista opcional, edição, cancelamento, atrasos destacados, quitação com conta/data reais e estorno que reabre o compromisso.
- Painel: saldo por conta e consolidado, receitas/despesas do mês selecionado, próximos compromissos e previsão até o fim do mês **atual**, com explicação. Contas arquivadas continuam nos totais; há aviso se têm saldo.
- Interface responsiva, navegação inferior no celular/lateral no desktop, rótulos, foco visível, BRL, datas brasileiras, estados vazios/erro/sucesso/carregamento e prevenção de reenvio.

## Conversar com o Tato

Abra `/conversar` depois do login. A IA consulta saldo, receitas/despesas por período/categoria e folga estimada; prepara uma receita/despesa realizada e pede esclarecimento. O card mostra tipo, valor, descrição, data, conta e categoria. Correções geram nova versão; somente o botão **Confirmar lançamento** grava. Futuro, quitação e outras alterações seguem nas telas manuais. Um “sim” na conversa não grava.

Configure `OPENAI_API_KEY` como Secret de **Preview** no servidor. `OPENAI_MODEL` é opcional, padrão `gpt-5.4-mini`; `TATO_AI_ENABLED=false` pausa novas chamadas. Não use `NEXT_PUBLIC_` para a chave, nem copie o Secret para o Codex. A configuração ausente gera aviso na conversa sem interromper o app manual. O Secret existente foi preservado e sua presença conferida apenas por metadados.

Há cotas persistentes de 5 mensagens/minuto e 20/dia por pessoa, com 100/dia para toda a prévia; uma chamada e uma ferramenta por mensagem nesta versão, até 1.200 tokens de saída e aproximadamente 40 s. Reservas não são repetidas automaticamente. Propostas valem 15 minutos e usam UUID estável/estado no banco para impedir duplicação. Mensagens e conteúdo das propostas não são persistidos no servidor. Detalhes de autorização, dados enviados, retenção, variáveis e aceite manual: **[docs/IA.md](docs/IA.md)**.

Os testes locais usam OpenAI simulada. Sem sessão de testes disponível, **não houve chamada paga real nem validação HTTP A/B autenticada nesta etapa**. Os relatos do usuário de cadastro/login e operações manuais foram considerados, sem tratá-los como teste técnico de autorização. A integração da IA ainda exige o aceite com sessão de testes no runtime de Preview, conforme o roteiro de no máximo cinco mensagens.

## Regras e arquitetura

`src/components` e `src/app` contêm a interface e adaptadores HTTP/Server Actions; `src/lib/validation.ts` valida entradas; `src/lib/services` concentra operações e acesso ao banco; `src/lib/finance` contém funções puras. Um futuro adaptador de WhatsApp deve autenticar o usuário, reutilizar os serviços e usar o mesmo contexto RLS. O adaptador de IA usa esses mesmos serviços no servidor. WhatsApp e integrações bancárias não são chamados.

- Dinheiro em `bigint` PostgreSQL, em centavos inteiros, até **99.999.999.999 centavos** por valor. Conversão e somas usam `BigInt`; o valor individual volta a `number` apenas dentro do limite seguro para JSON. Não há aritmética monetária com floats.
- Datas financeiras são `date`/strings `AAAA-MM-DD`, sem converter para o fuso do navegador. “Hoje” vem de `America/Sao_Paulo`. Auditoria usa `timestamptz`.
- Saldo inicial representa o valor **antes dos lançamentos da data de referência**. Lançamentos anteriores à referência e posteriores a hoje são bloqueados também no banco. Depois do primeiro lançamento, saldo inicial/referência ficam fixos enquanto houver movimentações; o nome continua editável.
- Saldo = inicial + receitas realizadas − despesas realizadas, incluindo contas arquivadas. O filtro mensal afeta só o relatório do mês.
- Previsão = saldo atual + entradas pendentes até o fim do mês atual − saídas pendentes até essa data, incluindo atrasos de meses anteriores. Cancelados/liquidados são excluídos. É estimativa cadastrada, sem garantia de saldo bancário.
- `settle_commitment` bloqueia o compromisso, cria um único lançamento e atualiza o estado na mesma transação. Repetições retornam o mesmo lançamento. Um índice único e triggers de integridade diferidos impedem estado quitado sem lançamento ou vínculo com pendência/cancelamento, inclusive em REST direto.
- Lançamentos vinculados não podem ser editados diretamente. Exclusão direta falha por integridade; use `reverse_settlement`, que remove a movimentação e reabre a pendência atomicamente e de forma idempotente.
- As funções financeiras são `security invoker`, com `search_path` fixo e execução restrita. As duas funções privadas de cotas da IA são a exceção mínima, com papel dedicado sem grants financeiros, descrita em docs/IA.md. FKs compostas por proprietário e tipo impedem relações com conta/categoria de outro usuário ou categoria incompatível. RLS protege cada linha. Contas/categorias/compromissos não têm grant de DELETE.
- Formulários novos de conta/lançamento/compromisso reutilizam um UUID de requisição: a repetição idêntica não duplica registros. Onboarding e categorias têm suas próprias garantias idempotentes/únicas.
- A RPC `get_tato_snapshot` lê todas as tabelas em um único snapshot MVCC, com RLS e sem parâmetro de proprietário. Uma quitação concorrente não mistura estados de saldo e previsão; a agregação JSON evita truncamento pelo limite de linhas da Data API. Para volumes altos, uma próxima etapa pode substituir o snapshot completo por totais SQL e relatórios paginados.

## Verificações reproduzíveis

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` executa testes financeiros, de validação e da **migração SQL real em PGlite**, um PostgreSQL isolado em memória. Não acessa o projeto remoto nem usuários reais. Os testes SQL criam um schema Auth mínimo e alternam papéis `authenticated`/`anon`, verificando RLS, grants, FKs compostas, triggers e RPCs. Isso não substitui testes contra o serviço Auth/PostgREST hospedado ou testes de concorrência entre conexões.

O cenário obrigatório está nos testes de cálculo e de SQL: R$500 + R$2.000 − R$150 = R$2.350; pendência de R$300 e entrada de R$400 projetam R$2.450; quitada a saída, o saldo vira R$2.050 e a projeção continua R$2.450; repetir a RPC preserva tudo.

### Conferência remota sem criar usuário ou enviar e-mail

```bash
npm run check:supabase
```

Esse comando verifica acesso anônimo negado e a configuração pública de Auth. Opcionalmente, com `TATO_TEST_ACCESS_TOKEN` configurado de forma segura para um usuário **já existente**, verifica o acesso HTTP autenticado e o isolamento do proprietário. Não cria sessão/usuário, não envia e-mails e não grava dados. Sem o token, informa que essa parte não foi executada. O script SQL de conferência de permissões é `scripts/verify-remote-permissions.sql` e usa transação read only com rollback; ele simula um papel de banco, sem equivaler a uma sessão Auth.

### Supabase direto: usuários A e B e concorrência

Crie e confirme dois usuários **exclusivos de testes** em uma stack local/projeto separado. Use somente credenciais de teste; nunca contas ou registros financeiros reais. Configure as seis variáveis `TATO_TEST_*` listadas em `.env.example` no processo (Node também pode carregar um arquivo local ignorado usando `node --env-file=.env.test.local scripts/test-database.mjs`). Execute:

```bash
npm run test:db
```

Para projeto remoto exclusivo de testes, além das variáveis, defina `TATO_TEST_ALLOW_REMOTE=isolated-test-project`. O script usa apenas chave publicável e senhas dos usuários de teste, valida listagem/leitura/alteração/exclusão por ID de todos os recursos, relações cruzadas, autorização das RPCs, dois pedidos simultâneos de quitação, idempotência e estorno. As fixtures prefixadas `TESTE` ficam no projeto isolado, preservando as mesmas regras de arquivamento do app. O script **não cadastra usuários nem envia e-mails**. Sem variáveis ele informa `NÃO EXECUTADO`; isso não significa aprovação dos testes remotos.

### Navegador

Com o app aberto em uma segunda sessão (`npm start` depois do build, ou `npm run dev`):

```bash
npm run test:e2e
```

Usa Chromium em `/usr/bin/chromium` neste ambiente; em outro sistema, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` com o caminho do navegador instalado. `TATO_E2E_BASE_URL` altera a origem de teste (padrão `http://127.0.0.1:3000`). Os testes públicos cobrem celular 390×844, desktop 1440×1000, cadastro/recuperação, proteção de rotas, validação/foco e rejeição real de credenciais inválidas, sem cadastro ou envio de e-mails. Capturas e traces ficam em `test-results/` (ignorados no Git).

O teste financeiro do navegador requer um usuário **novo, confirmado e vazio**, exclusivamente de testes, e o app apontando para o mesmo banco isolado: defina `TATO_E2E_EMAIL`, `TATO_E2E_PASSWORD` e `TATO_E2E_ISOLATED=yes`. Ele faz onboarding, cria segunda conta, receita, despesa, compromissos, quitação, recarrega o painel e confere R$2.050/R$2.450. Sem essas condições, é marcado como **skipped**, sem fingir sucesso. Não rode novamente com o mesmo usuário já configurado sem preparar outro usuário de teste.

Para finalizar o aceite de Auth, execute manualmente na caixa de testes: cadastrar → confirmar e-mail → entrar → sair → recuperar senha → abrir link → salvar nova senha → entrar novamente. Confira também link expirado e retorno após expiração/renovação da sessão. Essa parte depende da configuração externa de envio.

Decisões e estado da entrega: [`docs/IMPLEMENTACAO.md`](docs/IMPLEMENTACAO.md).

## Documentação oficial consultada

- [Quickstart Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Auth SSR atual, cookies, Proxy e métodos de autenticação](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Chaves publicáveis](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrações versionadas](https://supabase.com/docs/guides/deployment/database-migrations)
- [Senhas e recuperação](https://supabase.com/docs/guides/auth/passwords)
