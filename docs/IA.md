# Conversar com o Tato — 28/10/2026

## Escopo e fluxo

A rota autenticada `/conversar` permite consultar saldo acumulado, receitas/despesas realizadas por período e categoria e folga consolidada até o fim do mês atual. Os cards vêm de cálculos determinísticos em centavos/BigInt, com as mesmas regras do painel. Atrasados pendentes entram na folga; cancelados e liquidados não são contados novamente. Folga é **estimativa do que foi cadastrado**, sem garantia bancária. Contas arquivadas continuam no saldo e geram aviso.

Para uma receita/despesa já realizada: mensagem → interpretação → validação → proposta com todos os campos → correção opcional em nova versão → botão **Confirmar lançamento** → gravação atômica → leitura de conferência → atalho para a lista. “Sim” não confirma. Com várias contas, a pessoa precisa identificar a conta; uma única conta ativa pode ser pré-selecionada. Categoria sugerida sempre é visível. Valores/data ausentes ou ambíguos geram perguntas curtas. Datas relativas aceitas nesta versão: hoje e ontem; outras exigem data completa. Pedidos futuros vão para a tela manual de compromissos.

A IA não edita, exclui, estorna, quita, cria conta nem faz transferência. WhatsApp, áudio, anexos, imagens, banco, cartões e assinatura continuam fora do escopo. As telas manuais foram preservadas.

## Configuração e arquitetura

SDK oficial `openai` **7.45.1**, Responses API, endpoint fixo `https://api.openai.com/v1`, sem gateway/framework de agentes/provedor alternativo. Variáveis exclusivamente de servidor:

| Variável          | Valor/configuração                                        |
| ----------------- | --------------------------------------------------------- |
| `OPENAI_API_KEY`  | Secret existente somente em Preview; nunca `NEXT_PUBLIC_` |
| `OPENAI_MODEL`    | Opcional; padrão `gpt-5.4-mini`                           |
| `TATO_AI_ENABLED` | `false` pausa novas chamadas; padrão habilitado           |

Ausência da chave não quebra login, painel ou formulários manuais. Não existe fallback de modelo. Erros distinguem cota local, timeout, indisponibilidade, modelo sem acesso, chave inválida, rate limit OpenAI e faturamento/crédito. Não há sucesso simulado. Nesta tarefa a presença do Secret foi conferida por **metadados com decrypt=false**; seu conteúdo não foi recuperado nem copiado para o ambiente local.

Separação em `src/lib/ai`: configuração/cliente; interpretação; ferramentas de leitura; preparação/validação; tokens; propostas/execução. `/api/tato` é o adaptador HTTP. Confirmação chama `mutateFinance('ai-confirm')`, que delega a transação para a RPC invoker; a criação manual continua com `transaction-create`/`insertOnce`. Ambas preservam as mesmas validações financeiras e os guards do banco.

## Autorização e dados enviados

Cada POST valida `getUser()` no servidor, exige Origin exatamente igual a `siteURL()` e JSON, com corpo limitado a 20.000 bytes. O proprietário vem da sessão; não há parâmetro de proprietário em RPC financeira. O comando é um objeto estrito: histórico, papéis de assistente/sistema, instruções, resultados de ferramentas, modelo, chave e URL de provedor vindos do navegador são recusados. SELECT/CRUD/RPC usam cliente Supabase publicável autenticado + RLS.

Apenas até três mensagens de usuário (2.000 caracteres cada, 6.000 no total, com redução de mensagens antigas para manter o token assinado em até 12.000 caracteres), data/fuso e opções de até 20 contas ativas e 40 categorias (nomes limitados a 80 caracteres) são enviados. O envelope de instruções, schemas, mensagens e opções tem teto de **24.000 caracteres** antes da reserva. Não enviamos snapshot, perfil/e-mail, tokens de Auth, descrições do histórico ou lista de movimentações. Agregados são calculados no servidor e renderizados diretamente; o modelo não calcula nem redige valores financeiros livres. Nomes/descrições/mensagens são dados não confiáveis. Não há ferramenta de SQL, shell, código, HTTP arbitrário ou MCP.

Quatro funções estritas estão disponíveis: preparar lançamento, consultar resumo, pedir esclarecimento e orientar para tela manual. Todas usam `additionalProperties:false`, campos obrigatórios/nullable e validação Zod no retorno. Nesta versão cada mensagem usa **uma chamada OpenAI e no máximo uma ferramenta**, abaixo dos tetos de duas/três solicitados. Não existe loop automático. Saída incompleta, função inesperada ou múltiplas funções são recusadas.

## Confirmação, concorrência e retenção

O conteúdo validado é devolvido em token autenticado por HMAC-SHA-256. A chave de assinatura é derivada em memória da `OPENAI_API_KEY`, com separação de propósito entre conversa e proposta. Ela não sai do servidor. Não é necessário outro Secret para esta prévia. Rotacionar/remover a chave invalida tokens abertos; iniciar nova conversa nesse caso. Uma confirmação já gravada pode ser recuperada pelo ID, mesmo após expiração ou rotação, sempre verificando usuário e existência do lançamento.

O banco guarda em `ai_proposals` somente usuário, ID, versão, fingerprint SHA-256 do JSON canônico, estado e datas. Não guarda mensagem nem conteúdo da proposta. Tokens e conversa ficam apenas na memória da aba, sem localStorage/sessionStorage; fechar/recarregar limpa os cards. Tokens de contexto expiram em 15 minutos; cada proposta tem validade imutável de 15 minutos desde a preparação. O servidor verifica assinatura, usuário, versão e expiração. Corrigir precisa do token anterior e gera nova versão; confirmar só aceita o conteúdo assinado daquela versão, conferido também pelo fingerprint no banco.

A RPC `confirm_tato_ai_proposal` bloqueia a linha, revalida conta ativa/categoria/tipo/data e insere o lançamento com **o UUID da proposta**, atualizando o estado na mesma transação. Repetições/double click/duas abas retornam o lançamento existente. Falha reverte tudo. Cancelar não grava. Proposta expirada não grava. Estados encerrados não reabrem. Se a pessoa editar/excluir depois pelo formulário manual, a proposta não recria o lançamento: uma exclusão posterior é informada como tal. Metadados sem conteúdo permanecem como tombstones para evitar reutilização de IDs/replay; não há histórico permanente de conversa no servidor.

## Cotas persistentes e exceção privilegiada

- 5 mensagens por 60 segundos móveis e 20 por dia por usuário.
- 100 mensagens por dia para toda a prévia; dia em America/Sao_Paulo.
- Reserva atômica **antes** da chamada paga; um lock transacional serializa a verificação/inserção global e por usuário.
- `(user_id,request_id)` é único; repetir retorna `false` e nunca inicia outra chamada, mesmo em timeout/estado incerto. Falha consome a reserva; finalizar não a devolve.
- SDK `maxRetries:0`, timeout 35 s e AbortSignal de 38 s; função Vercel até 45 s, retorno esperado em aproximadamente 40 s. Cliente aguarda até 43 s e oferece recuperação, sem reexecutar automaticamente.
- Até **1.200 tokens de saída** por chamada, `reasoning.effort=none`, compatível com gpt-5.4-mini; sem armazenamento de respostas na OpenAI (`store:false`). Isso não equivale a zero retenção de segurança pelo provedor.

`tato_private.ai_usage` contém apenas usuário, dia/timestamp, modelo, status, request ID e tokens quando disponíveis. Não é exposta na Data API, não tem grants de tabela para anon/authenticated e usa RLS. Retém metadados mínimos de idempotência sem prompts, descrições ou segredos; não existe limpeza/reset por usuários comuns. As cotas são de mensagens e **não garantem um teto financeiro exato**; acompanhe consumo/crédito no projeto OpenAI, sem alteração automática de faturamento.

Somente `tato_private.reserve_ai`/`finish_ai` são SECURITY DEFINER. Seu proprietário é um papel dedicado NOLOGIN, sem superuser, bypassrls, criação de roles/banco nem grants financeiros. `auth.uid()` é obrigatório, `search_path` é vazio, statements são fixos e só acessam uso/cotas. Funções públicas são wrappers invoker. Membership/CREATE temporários usados para atribuição de ownership durante a migração foram revogados. Não há chave administrativa no app. A exceção foi testada em PGlite e nos catálogos remotos. Usuários podem consumir a própria cota via reserva direta, mas não consultar/resetar a cota global ou liberar reservas; abuso autenticado ainda pode esgotar a capacidade pequena desta prévia.

## Migração e verificações

Nova migração aplicada em **tato-dev** (`mpwmwmbxawbhcngfysko`): `20261028143816_tato_ai_preview.sql`. Gerada inicialmente pela CLI e renomeada para a versão atribuída pela integração. SHA-256 local/remoto: `c33bb5835ccf3339270e1ca457e5a8c32244653f9918e2d5ae302ca7cdac8796`. A primeira tentativa foi revertida por falta de SET ROLE ao atribuir ownership; não deixou tabela/role/histórico. A versão final atribui membership temporário ao papel de migração e o revoga. A migração inicial `20261028130845` continua intacta e não foi reaplicada. Não houve reset, recriação, cadastro ou e-mail.

Resultados locais desta etapa: **106 testes**; lint, tipos, formatação e build passaram. O primeiro build no sandbox falhou ao iniciar o subprocesso TypeScript; o mesmo build com permissão de subprocessos passou. UI/HTTP isolados passaram em duas larguras. HTTP A/B integrado e OpenAI real não foram executados.

Comandos:

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:ai-ui
npm run test:ai-http
npm run check:supabase
```

Os testes automáticos usam OpenAI simulada, incluindo fetch do SDK oficial, sem chave real. Cobrem parsing/datas, ambiguidade, campos/papéis forjados, origem, sessão ausente/expirada, assinatura/proprietário/expiração, prompt injection, função proibida, falhas do provedor, cards canônicos, propostas, rollback, revisão, cancelamento e replays. A migração real é executada em PostgreSQL isolado/PGlite. Promise.all verifica concorrência na fila desse banco, **sem equivaler a conexões Postgres independentes**. O teste HTTP fornece essa verificação quando houver ambiente isolado com sessões reais.

`test:ai-ui` abre Chromium 390×844 e 1440×1000 com o componente real, fixtures explicitamente fictícias e API simulada. Testa revisão/correção, clique repetido, resposta perdida após commit simulado, recuperação, refresh do router, atalho, teclado e overflow. Capturas locais em `test-results/conversa-*.png` foram inspecionadas. Não é teste integrado de Auth/banco/OpenAI. O harness não é rota Next.js nem backdoor no app.

`test:ai-http` requer as seis variáveis de usuários A/B existentes descritas em `.env.example`, em Supabase local/isolado com as duas migrações. Nunca cria usuário/envia e-mail. Recusa `tato-dev`, pois contém dados existentes. Verifica PostgREST A/B direto, relações cruzadas, confirmação e reserva concorrentes, replays e persistência no snapshot. Usa fixtures e cotas apenas no projeto isolado. Precisa de usuários com cota disponível; não reseta contadores. Nesta entrega faltam essas credenciais e o resultado é **NÃO EXECUTADO**.

`scripts/verify-ai-permissions.sql` passou remotamente em transação read only: tabelas/RLS, políticas, grants, assinaturas invoker/definer, search_path e papel sem poder financeiro. `check:supabase` confirmou HTTP 401 anônimo para as seis tabelas; confirmação de e-mail segue obrigatória. Isso não comprova HTTP A/B autenticado. Advisors: sem novos alertas de segurança; continuam os avisos preexistentes sobre `rls_auto_enable` e senhas vazadas, descritos em SUPABASE_DEV.md. Índices novos ainda sem uso são esperados antes de tráfego; não foram removidos.

## Preview publicado para testes

- Projeto existente `tato-preview` / `prj_8aFMUCjXY0X7Q40lDLCYrzFSn2Rc`.
- Deployment `dpl_EktewJJpmn4U3T2a8hDE8iWzVZsv`, **READY**, `target=staging` (Preview), fonte `adc662f` na mesma branch.
- [Abrir conversa](https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app/conversar).
- Proteção Vercel SSO continua habilitada para previews. `/entrar`, `/conversar`, callbacks sem token e redefinição foram consultados pelo acesso autorizado da Vercel. Página de entrada respondeu 200; conversa/redefinição exigiram sessão Tato. Nenhuma sessão financeira foi extraída ou criada. O Secret foi preservado e não foi lido.
- Depois da implantação, alterações de documentação registram a nova URL; o código executável continua o do commit acima. `main` sem merge/promoção.
- Quatro E2E públicos passaram; um E2E financeiro skipped. `test:ai-http` e `test:db`: NÃO EXECUTADO por falta de credenciais isoladas. Nenhuma chamada paga OpenAI; não foi validado crédito/acesso ao modelo. Há dados existentes no desenvolvimento; não inserimos fixtures lá.

Em [Auth → URL Configuration](https://supabase.com/dashboard/project/mpwmwmbxawbhcngfysko/auth/url-configuration), confira **Site URL** com `https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app`. Mantenha os Redirect URLs existentes e acrescente somente os ausentes:

```text
https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app/auth/callback
https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app/auth/callback?next=/redefinir-senha
https://tato-preview-886bz969w-matheuscamilocontato-2621s-projects.vercel.app/auth/confirm
```

A integração não dispõe de leitura/edição dessa configuração; nenhuma entrada foi removida ou alterada. Não foi possível confirmar a allowlist atual. `NEXT_PUBLIC_SITE_URL` não aparece nos metadados Vercel: o código usa o fallback de `VERCEL_URL` em Preview, portanto a origem enviada pelo app deve ser a nova acima. Não há domínio de produção inventado. Mantenha confirmação de e-mail habilitada.

## Aceite manual ainda necessário no Preview

Consulte o endereço **atual** e os callbacks exatos no README. Entre na proteção Vercel com sua conta e depois no Tato. Sem usuários novos/e-mails automáticos nesta tarefa. Com uma sessão de teste autorizada, faça **no máximo cinco mensagens pagas**:

1. “Quanto sobra depois das contas cadastradas?” → comparar card com painel; folga marcada como estimativa.
2. “Quanto gastei com alimentação este mês?” → comparar com lançamentos filtrados.
3. “Gastei R$1,00 no mercado hoje na conta [nome de teste]” → revisar, corrigir um campo, confirmar uma vez, abrir lista e painel; recarregar e conferir persistência. Repetir confirmação HTTP com mesmo ID deve manter um lançamento.
4. “Vou pagar R$2,00 amanhã” → direcionar para compromissos, sem lançamento.
5. Uma mensagem ambígua sem conta/data → esclarecimento; cancelar proposta caso preparada.

Use somente dados fictícios em conta de testes, sem movimentações bancárias reais. Confirmação/correção/cancelamento/recuperação não são novas chamadas pagas. Se modelo/chave/crédito falhar, conferir o erro e configuração no painel; não trocar de modelo/faturamento automaticamente. Nesta tarefa **nenhuma chamada OpenAI real foi feita** e não foi validado o fluxo autenticado remoto da IA: não há sessão de testes disponível no ambiente. Os relatos do usuário sobre o app manual estão registrados como relatos, sem substituir autorização HTTP A/B técnica.

## Referências oficiais consultadas

- https://developers.openai.com/api/docs/quickstart
- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/api/securing-your-api
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
