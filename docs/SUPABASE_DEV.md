# Supabase de desenvolvimento — verificação em 28/10/2026

Projeto **tato-dev**, referência `mpwmwmbxawbhcngfysko`, região `sa-east-1`, PostgreSQL 17.11. A aplicação permanece no Preview protegido da Vercel. Não foram criados usuários, enviadas mensagens de e-mail, gravados dados financeiros de teste no remoto, executados resets ou recriados projetos.

## Migração aplicada e histórico

Foi revisado o SQL existente de `supabase/migrations/20261027140000_tato_initial.sql`, com o banco ainda sem tabelas da aplicação e sem histórico de migrações. Os 43 testes locais passaram antes da aplicação. A integração Supabase aplicou esse SQL como `tato_initial` e atribuiu a versão **20261028130845**.

O arquivo foi renomeado para [`../supabase/migrations/20261028130845_tato_initial.sql`](../supabase/migrations/20261028130845_tato_initial.sql), preservando integralmente seu conteúdo. O registro remoto contém uma instrução com exatamente o mesmo SHA-256:

```text
5f023a7063387dc286e2121d71bcae57769d90ad86f241521a1fe4fec0d997b0
```

Há **uma migração**, `20261028130845 / tato_initial`. Não foi mantida uma cópia da versão antiga que pudesse ser reaplicada. Não houve edição manual do histórico remoto. As próximas alterações devem usar novas migrações; não edite o SQL já aplicado.

## Estrutura e autorização verificadas

As cinco tabelas `public.profiles`, `accounts`, `categories`, `transactions` e `commitments` foram criadas e estavam vazias após a aplicação. Todas têm RLS habilitada. Foram conferidas **20 políticas**, incluindo proprietário via `auth.uid()` e `USING`/`WITH CHECK` nas atualizações.

| Papel           | SELECT / INSERT / UPDATE                     | DELETE                                           |
| --------------- | -------------------------------------------- | ------------------------------------------------ |
| `authenticated` | Permitidos nas cinco tabelas, sujeitos a RLS | Apenas `transactions`, sujeito a RLS/integridade |
| `anon`          | Negados nas cinco tabelas                    | Negado                                           |

Foram conferidas as FKs compostas de proprietário/conta/categoria/tipo e os dois triggers de integridade diferidos que protegem o vínculo de liquidação. As quatro RPCs de negócio e `tato_today` usam `SECURITY INVOKER`, `search_path` fixo e execução restrita a `authenticated`. Funções de trigger da aplicação não têm execução concedida a `anon` ou `authenticated`.

O script [`../scripts/verify-remote-permissions.sql`](../scripts/verify-remote-permissions.sql) foi executado no remoto em transação **read only**, com rollback. Validou grants, RLS, políticas e leitura das tabelas/snapshot sob o papel `authenticated` com uma identidade não atribuída a usuário algum. Não inseriu essa identidade no Auth. **Isso valida o contexto SQL; não é login nem sessão Auth real.**

## Data API e Auth

O comando `npm run check:supabase` verificou por HTTP, com a chave publicável:

- As cinco rotas de tabelas e `get_tato_snapshot` responderam **401 / 42501** para acesso anônimo. Os recursos existem na Data API e os grants impedem leitura anônima; não houve retorno de dados privados.
- O endpoint público `/auth/v1/settings` respondeu **200**: autenticação por e-mail habilitada, cadastro habilitado e confirmação de e-mail exigida.
- O teste com sessão real ficou **NÃO EXECUTADO**: não há `TATO_TEST_ACCESS_TOKEN` nem credenciais de teste disponíveis. Nenhum token de usuário, senha, chave administrativa ou sessão foi extraído das tabelas do Auth.

Para concluir essa verificação sem criar usuário ou enviar e-mail, configure um token de sessão válido de um usuário **já existente e autorizado**, pela variável segura `TATO_TEST_ACCESS_TOKEN`, e execute:

```bash
npm run check:supabase
```

O script chama `getUser`, lê as cinco tabelas e o snapshot com o token, confere o proprietário e imprime somente status, sem dados financeiros ou credenciais. Não executa signup, signin, refresh ou operações de escrita. Em ambiente Node 24 com proxy obrigatório, use `NODE_USE_ENV_PROXY=1 npm run check:supabase`. Não cole o token em chat, terminal compartilhado, argumentos de comando ou Git.

## Configuração de autenticação para o Preview

Origem efetiva:

```text
https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app
```

A integração disponível não oferece leitura/alteração de **Auth URL Configuration** ou dos templates de e-mail. Portanto, não foi possível confirmar a allowlist atual nem alterá-la automaticamente. Os redirects existentes foram preservados, sem nenhuma gravação nessa configuração.

No [painel de URL Configuration](https://supabase.com/dashboard/project/mpwmwmbxawbhcngfysko/auth/url-configuration), confira:

**Site URL** — use a origem acima para que os links padrão dos templates do ambiente de desenvolvimento apontem para o Preview.

**Redirect URLs** — mantenha todas as entradas atuais e **acrescente apenas as que estiverem faltando**:

```text
https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app/auth/callback
https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app/auth/callback?next=/redefinir-senha
https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app/auth/confirm
```

Não remova localhost ou outros redirects autorizados e não adicione um curinga amplo. **Confirm email** deve continuar habilitado. Não altere templates ou SMTP sem verificar os valores existentes. Se usar os templates padrão, o app já envia `emailRedirectTo` para `/auth/callback` e `redirectTo` de recuperação para `/auth/callback?next=/redefinir-senha`; o navegador que iniciou o fluxo precisa concluir a troca PKCE. O callback `/auth/confirm` com token hash está preparado para templates explicitamente configurados, conforme README.

A Vercel confirmou o deployment `dpl_6yRvAw7mAvBww1xH5iQXsGQ3FfaF` em **READY / staging (Preview)**. Pela integração de acesso autenticado da Vercel, `/entrar` respondeu 200, `/auth/callback` e `/auth/confirm` sem tokens retornaram à tela de entrada com erro de link, e `/redefinir-senha` exigiu sessão. Nenhum código/token real de confirmação ou recuperação foi consumido. Isso verifica as rotas e a origem dos retornos, **não comprova entrega de e-mail ou allowlist do Supabase**. Não houve novo deploy nem promoção para produção.

## Advisors

Os avisos de segurança já existiam antes da migração:

- `public.rls_auto_enable()` é uma função preexistente `SECURITY DEFINER` que retorna `event_trigger`, com grants de execução para `anon`/`authenticated`. Sua definição e seu `search_path=pg_catalog` foram inspecionados. Ela não pertence à migração do Tato e não foi alterada. O advisor pede revisão desses grants: [aviso para anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) e [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Proteção contra senhas vazadas desabilitada no Auth: [configuração e requisitos](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

O advisor de performance informou um índice composto ausente para a FK `transactions(user_id, commitment_id)` e quatro índices ainda não utilizados. Há índice único em `commitment_id`, que limita o lookup a um registro; o banco está vazio e não há evidência de gargalo. Nenhum índice foi removido ou adicionado fora da migração: [FKs sem índice composto](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Comandos e resultados desta configuração

- `npm test`: **43 testes passaram**, incluindo a migração renomeada, regras financeiras, RLS A/B e liquidação idempotente em PostgreSQL isolado/PGlite. Identidades de teste existem apenas nesse banco em memória, sem criação de usuários no Supabase remoto.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `git diff --check` e `npm run build`: passaram.
- `NODE_USE_ENV_PROXY=1 npm run check:supabase`: checagens anônimas/configuração pública passaram; sessão real marcada como não executada.
- `scripts/verify-remote-permissions.sql` via integração: passou em read only com rollback; não equivale a sessão Auth.
- Histórico e hash conferidos após as verificações; as cinco tabelas permaneceram com zero registros.
- Nenhum cadastro, envio de e-mail ou E2E financeiro remoto foi executado. Os testes visuais anteriores não foram repetidos como se fossem evidência de um fluxo autenticado remoto.

## Falta para o aceite no navegador

1. Conferir Site URL e acrescentar os três redirects exatos no painel, preservando os existentes; validar o serviço de entrega/SMTP com uma caixa de testes em uma tarefa que autorize envio.
2. Entrar com um usuário já existente e confirmado, ou autorizar cadastro/confirmação em uma próxima tarefa. Nesta tarefa não foi criado usuário nem enviado e-mail.
3. Concluir a validação HTTP com uma sessão real autorizada. Depois testar onboarding, receita, despesa, compromisso, liquidação e persistência no Preview.
4. Recuperação de senha e confirmação por e-mail permanecem sem teste de entrega/consumo. Não desabilitar confirmação para contornar essa etapa.
