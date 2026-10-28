# Estado e decisões — 27/10/2026

A raiz do repositório tinha apenas `README.md`; a implementação foi iniciada nessa mesma raiz, sem outro repositório ou subpasta de aplicativo. Nenhum trabalho anterior foi removido. Não foram usados subagentes, nem houve publicação em produção.

## Entregue em código

Next.js 16/App Router, React 19, TypeScript estrito, Tailwind 4, Supabase JS 2 e SSR 0.12; versões resolvidas no lockfile. Interface em pt-BR com identidade provisória apenas em texto, sem mascote/logotipo definitivo ou imagens de terceiros. Webpack foi escolhido porque o processo auxiliar do Turbopack falhou ao abrir porta neste ambiente.

Fluxos implementados: Auth (cadastro/login/logout/recuperação/redefinição), onboarding retomável, contas manuais, categorias por usuário, lançamentos realizados, compromissos e painel. Serviços e cálculos separados da interface. Sem integrações, sincronização, transferências, cartões, parcelamentos, empréstimos detalhados ou recorrências.

## Decisões financeiras e de autorização

- Valores individuais em centavos inteiros limitados a 99.999.999.999; cálculo e formatação usam BigInt, sem floats monetários.
- Datas civis preservadas como strings/SQL `date`; hoje financeiro usa America/Sao_Paulo.
- O saldo inicial antecede as movimentações da data de referência. Datas anteriores são bloqueadas. Saldo inicial e referência só podem mudar se não houver lançamentos na conta.
- Arquivar mantém conta/histórico e saldo no consolidado. Exclusão de contas, categorias e compromissos não é oferecida nem concedida ao papel autenticado.
- Compromissos são previsões e não afetam o saldo realizado. Atrasos continuam pendentes; cancelamentos e liquidações saem da previsão.
- Liquidação e estorno em RPCs SQL invoker com trava de linha; vínculo único e integridade diferida também protegem pedidos REST diretos. Editar lançamento vinculado é proibido; corrigir exige estorno/reabertura atômicos.
- RLS em todas as tabelas, grants explícitos e FKs compostas por proprietário/tipo. Nenhuma chave administrativa em operações do app. Repetições de criação usam UUID estável, configuração usa trava por usuário e categorias têm unicidade.
- Saldo não depende do filtro de mês. Folga cobre o fim do mês atual e atrasados de meses anteriores. A leitura usa uma única RPC invoker com snapshot MVCC e agregação JSON, evitando mistura de estados durante uma quitação concorrente e truncamento pelo limite de linhas da Data API.
- Auth SSR segue a documentação atual: cookies getAll/setAll, Proxy do Next 16, getClaims para renovar/verificar e getUser antes das operações. Redirecionamento de e-mail usa origem configurada e destinos internos limitados. Confirmação de e-mail preservada.

## Validação e limites de evidência

- Dependências instaladas com lockfile. Lint, tipos e build Webpack passaram.
- **40 testes passaram**. Testes de cálculos, validação e SQL executam a migração em PostgreSQL isolado (PGlite), incluindo RLS com usuários A/B, grants anônimos, relações cruzadas, rollback de quitação inválida, idempotência e estorno. Não usam dados remotos.
- O cenário R$2.350 de saldo / R$2.450 de folga e R$2.050 / R$2.450 após quitação é verificado em funções puras e na migração executada.
- Chromium: quatro testes públicos passaram; capturas de login em 390×844 e 1440×1000 foram abertas e inspecionadas, sem rolagem horizontal. Foram verificadas rotas protegidas, foco/validação e rejeição de credenciais inválidas pelo Supabase real.
- O E2E financeiro foi **skipped**: falta usuário confirmado e vazio em banco de testes migrado. Não se alega inspeção visual do painel autenticado, cadastro confirmado, entrega de e-mail, recuperação completa ou persistência de um fluxo financeiro via navegador.
- `npm run test:db` informou **NÃO EXECUTADO**: faltam as variáveis dos usuários A/B em Supabase isolado. Esse script cobre PostgREST real e quitação concorrente entre pedidos HTTP; PGlite cobre SQL/RLS, mas não substitui essas verificações.

## Supabase remoto e pendências externas exatas

As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY foram confirmadas presentes sem imprimir valores. Rede do domínio permitida; Auth respondeu, e confirmação de e-mail não estava desativada. A Data API retornou PGRST205 para as tabelas profiles/accounts em consulta sem linhas: não estão disponíveis no cache público exposto.

**Nenhuma migração foi aplicada remotamente.** Não havia CLI autenticada, token/senha de banco/conexão administrativa ou MCP Supabase. Faltam:

1. Responsável com acesso ao projeto de desenvolvimento existente para aplicar o arquivo versionado pelo fluxo de `link`/`migration list`/`db push --dry-run`/`db push`, conforme README. Sem reset ou recriação.
2. Verificar Data API ativa e schema `public` exposto; os grants/RLS da migração devem permanecer.
3. Configurar Site URL e redirects para http://localhost:3000 ou para a origem HTTPS efetiva do preview; configurar/validar envio de e-mail a uma caixa exclusiva de testes. Nenhum domínio de produção foi criado.
4. Confirmar usuários de testes isolados; executar os testes HTTP A/B, concorrência e o E2E financeiro, além do ciclo completo de e-mail e recuperação. Não usar contas financeiras reais.

## Próxima etapa técnica

Executar o aceite hospedado depois dessas configurações. Para volumes maiores, migrar o snapshot completo para agregações e paginação de relatórios no banco, mantendo a mesma política financeira e RLS. As demais funcionalidades financeiras permanecem fora do escopo desta versão.

## Correção de acesso ao teste

O link localhost informado na entrega anterior só alcança o servidor dentro do ambiente cloud. Não é um endereço externo acessível pelo navegador do usuário. O servidor estava ativo; a conexão recusada no PC se deve a esse endereço apontar para o próprio PC. O ambiente não oferece uma URL de preview ou ferramenta de encaminhamento de porta. Não houve implantação externa. O README foi corrigido para distinguir execução local de cloud. Para acesso remoto por navegador, ainda é necessário um provedor de preview compatível com Next.js com servidor; não é suficiente exportar páginas estáticas.

## Preparação de Preview externo

O usuário escolheu testar pelo navegador sem instalar Node.js. O Sites foi avaliado e descartado para esta entrega: a documentação do conector classifica todas as suas URLs implantadas como produção, inclusive privadas, e a instrução de não publicar em produção permanece. A integração Vercel foi localizada e passou a estar conectada durante a tarefa. O acesso ao espaço de projetos retornou 403 por falta de autorização de escopo; foi gerado um link de consentimento da própria Vercel, de uso único e validade de 10 minutos, para o usuário liberar esse acesso. Nenhum projeto ou deployment externo foi criado. Lint, tipos, formatação e build passaram após a preparação; 43 testes passaram. A tentativa de disponibilizar a implementação no repositório GitHub público foi rejeitada pela revisão automática por falta de autorização explícita para esse envio. Ela não foi repetida; a alternativa escolhida é Preview direto na Vercel, sem publicação do código no GitHub. A origem dos links de e-mail agora aceita VERCEL_URL injetada pela plataforma apenas em VERCEL_ENV=preview, com testes, preservando prioridade da configuração explícita. A stack Next.js e o Supabase existente foram mantidos.

## Vercel: acesso liberado e aprovação de envio pendente

O escopo da conta foi autorizado. Projeto de teste criado: `tato-preview`, ID `prj_8aFMUCjXY0X7Q40lDLCYrzFSn2Rc`, organização `team_pg2zq72POzyTInjUC1SoySJi`. Configuração local ignorada no Git: `.vercel/project.json`. Proteção de acesso ativada; o código-fonte não foi tornado público. As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY foram copiadas para o ambiente Preview, sem exibir os valores.

A chamada inicial de deployment omitiu o destino seguindo a documentação, mas a resposta marcou `target=production`. A implantação `dpl_HGZzd5dpjxRhraMTmwKduB3exXLL` foi cancelada antes de concluir; a resposta confirmou CANCELED. Não promover, reativar ou usar essa implantação como Preview. A API usa `target=staging` para Preview; usar esse destino explícito e conferir o resultado.

A tentativa com `target=preview` explícito foi rejeitada pela revisão automática por falta de autorização específica para transferir o código à Vercel. Foi solicitado ao usuário consentimento explícito para enviar o código a sua conta e criar um Preview protegido. Não repetir a ação até receber essa autorização. Nenhum Preview pronto ou migração remota foi declarado como validado.

## Preview autorizado e em preparação

O usuário autorizou explicitamente enviar o código à sua conta na Vercel e criar um Preview protegido. A API rejeitou a string `preview`: aceita `production`, `staging` ou um identificador de ambiente personalizado. Foi usada então a string `staging` para o ambiente de teste, sem promoção. A solicitação aceita retornou ID `dpl_6yRvAw7mAvBww1xH5iQXsGQ3FfaF`, `target=staging` e estado inicial INITIALIZING. Aguardar resultado terminal antes de afirmar que o endereço está acessível. O endereço retornado foi `https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app`; ainda não é prova de build pronto. Nenhum envio ao GitHub público foi realizado.

## Preview pronto e verificado

Implantação de teste `dpl_6yRvAw7mAvBww1xH5iQXsGQ3FfaF` concluída com READY e `target=staging`. URL: https://tato-preview-3x9t8duec-matheuscamilocontato-2621s-projects.vercel.app/entrar. A proteção Vercel Authentication permanece ativa. `/entrar` retornou HTTP 200 pela ferramenta de acesso autenticado da Vercel, com o título e formulário corretos, sem erro de configuração. O usuário pode precisar entrar na mesma conta Vercel para acessar pelo navegador. Não houve publicação concluída em produção nem envio ao GitHub público. A primeira implantação marcada como produção foi cancelada antes de concluir e não foi reativada.

A autorização de envio do código à Vercel foi recebida explicitamente. As variáveis públicas do Supabase foram verificadas no projeto como criptografadas e destinadas apenas a Preview, sem exibir valores. As migrações remotas e a configuração dos redirects/e-mails ainda estão pendentes; não se alega validação de um fluxo financeiro remoto autenticado. O README contém as três URLs exatas de callback do Preview.

## Versionamento autorizado — 28/10/2026

O usuário solicitou explicitamente salvar a implementação em uma branch e enviá-la ao GitHub. A branch desta entrega é `codex/tato-v1-20261028`, no repositório `matheuslucascontato/tato`, preservando a `main`. O código, testes, migrações, lockfile, `.env.example` e documentação integram o commit. Arquivos de credenciais locais, `.vercel/`, dependências, build e resultados de testes ficam fora do versionamento. Os registros anteriores sobre envio não autorizado descrevem o histórico antes desta autorização. O estado de Preview e as pendências do banco remoto continuam descritos acima.
