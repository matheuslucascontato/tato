# Redesign do Tato — 30/10/2026

Reformulação integrada à base existente na branch `codex/tato-v1-20261028`, a partir de `abb615c`. O fast-forward inicial incorporou `d4fcbb4` e a migração `20261028152627_tato_ai_quota_session_fix.sql`, que foi preservada. Sem subagentes, merge em main, mudanças de schema/migrações/dados remotos ou chamadas à API OpenAI do app. O briefing e cinco referências foram usados como direção visual; funções representadas apenas nos mockups não foram ativadas.

## Identidade e tokens

Promessa: **“Saiba o que cabe hoje, sem apertar o amanhã.”** Assinatura: **“Seu dinheiro, com mais jeito.”** Paleta semântica em `src/app/redesign.css`; componentes estruturais existentes continuam em `globals.css`.

| Token            | Valor   | Uso                             |
| ---------------- | ------- | ------------------------------- |
| Azul Tato        | #173B42 | Navegação, ações e folga        |
| Terracota        | #C66B4E | Ilustração e detalhe decorativo |
| Creme            | #F7F3EB | Fundo                           |
| Verde névoa      | #DDE9DF | Apoio/confirmado                |
| Grafite          | #20353A | Texto e dados                   |
| Terracota escuro | #A94E37 | Ênfase textual e foco           |
| Texto secundário | #58696B | Ajuda e rótulos                 |
| Borda de campos  | #7F9088 | Identificação dos controles     |

Manrope variável para títulos, Inter variável para interface/dados; pacotes fontsource servidos pelo próprio app, `font-display:swap`, sem Google Fonts/CDN. A logo é imagem própria e não uma palavra escrita com Manrope. Valores tabulares, sem animação de contadores. Raios de 12–27px, transições de 180–250ms, curvas discretas inspiradas na carapaça, superfícies legíveis e fallback opaco para blur. `prefers-reduced-motion` remove animações/transições.

Contrastes medidos: texto/creme **11,63:1**; secundário/creme **5,20:1**; principal claro/azul **11,87:1**; terracota escuro/creme **4,95:1**; sucesso **7,09:1**, aviso **6,94:1**, erro **6,82:1**; borda de campo/fundo **3,22:1**. Terracota claro é decorativo. Tipos selecionados incluem check, estados têm texto e navegação usa aria-current.

## Arquivos de marca e fidelidade

Assets individuais em [`public/brand/tato`](../public/brand/tato). **São recriações raster preparadas com geração/edição guiada pelas pranchas, não os arquivos oficiais originais nem extrações exatas.** O inventário identifica essa origem. Logo horizontal, ícone/favicon e oito poses estão utilizáveis, com transparência verificada por canal alfa e inspeção em fundo creme. PNGs intermediários não são distribuídos ao navegador. Otimização final em WebP (aproximadamente 32–40KB por pose).

Inventário completo com origem por arquivo, dimensões, formato, transparência e estado: [`inventory.json`](../public/brand/tato/inventory.json). Aplicação para fundo escuro: a mesma logo sobre placa creme pelo componente `Brand dark`, mantendo as cores. **Pendente material original:** logo vetorial oficial e variante negativa/monocromática. Não foi fabricado SVG com PNG embutido nem uma falsa versão monocromática.

O componente único `src/components/brand/tato.tsx` centraliza arquivos, tamanhos, finalidade decorativa/informativa e fallback atento. `reactionForOperation` mapeia respostas reais dos serviços; demais pontos usam os estados abaixo.

| Expressão   | Evento implementado                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Atento      | Saudação do painel, boas-vindas/auth e início da conversa                                                                       |
| Feliz       | Conta/lançamento manual criado e confirmação IA conferida no banco                                                              |
| Pensativo   | Loading real da página e requisição real da conversa; termina com a requisição                                                  |
| Cuidadoso   | Folga negativa; compromissos pendentes vencendo até hoje; falha ao carregar                                                     |
| Explicando  | Duas etapas da configuração e explicação expansível da folga                                                                    |
| Comemorando | Configuração inicial concluída e quitação confirmada                                                                            |
| Surpreso    | Erro real de conta/categoria indisponível retornado pelo serviço; sem reação ao tamanho de gasto                                |
| Confiante   | Configuração/edit salvo e orientação de privacidade; solicitação Auth aceita mantém o texto exato, sem alegar entrega de e-mail |

Reação de sucesso dura 5,5s, uma vez por resposta confirmada; não atrasa a operação. Não usa query string como prova de sucesso. Não existe personagem em cada linha/campo, animação facial ou comemoração baseada em valor gasto.

## Telas e interação

| Rotas                                                          | Alteração                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/painel`                                                      | Composição própria desktop, folga como destaque, saldo secundário, registro rápido, período, vencimentos e contas. Ocultar valores pelo botão acessível, sem persistência de preferência/dados financeiros no navegador. Fórmula/atrasados/cancelados/arquivadas preservados.                 |
| `/lancamentos`                                                 | Filtros compartilhados com labels explícitos, leitura e ações na nova identidade. GET e parâmetros preservados.                                                                                                                                                                               |
| `/[section]/novo`, `/[section]/[id]/editar`                    | Formulários padronizados; lançamento com valor em destaque e seleção receita/despesa por rádio. Conta única pode ser selecionada; categoria exige revisão. Referência/futuro continuam bloqueados pelo serviço/banco.                                                                         |
| `/contas`, `/categorias`                                       | Cartões, listas, campos e ações no sistema visual; criação/edição/arquivamento preservados.                                                                                                                                                                                                   |
| `/compromissos` e ações `/liquidar`, `/estornar`               | Estados/avisos claros, filtros existentes, formulário e feedback. Mesmas RPCs atômicas/idempotentes.                                                                                                                                                                                          |
| `/conversar`                                                   | Identidade, privacidade em disclosure, proposta em destaque, estado de loading real, sucesso conferido, erro útil e registro manual rápido. Erros conhecidos de configuração/faturamento não são apresentados como resposta financeira incerta. Confirmação/cancelamento e cotas preservados. |
| `/mais`                                                        | Destino mobile para contas, categorias, planejamento, conversa, privacidade e logout existentes. Sem preferências ou funções falsas.                                                                                                                                                          |
| `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | Composição de marca desktop/mobile, fontes e campos; fluxo Auth/SSR e confirmação de e-mail preservados. Callbacks de API não foram alterados.                                                                                                                                                |
| `/configuracao`                                                | Duas etapas reais, nome e primeira conta, preservadas entre avançar/voltar; gravação atômica ao concluir. Campos não salvos continuam apenas nesta página, sem fingir persistência após fechar/recarregar.                                                                                    |
| Loading/erro/404                                               | Skeletons correspondentes ao conteúdo e orientação curta, sem análise artificial.                                                                                                                                                                                                             |

Navegação: lateral no desktop; barra flutuante com Início, Lançamentos, Planejar, Tato e Mais no celular. Safe area, teclado, rotas ativas e alvos de toque. Registro rápido no cabeçalho, painel e conversa abre dialog nativo: foco inicial no valor, ciclo de Tab, Escape/backdrop, retorno ao acionador e confirmação antes de descartar alteração. Durante envio, não fecha nem duplica. Erro preserva campos; reenvio reutiliza UUID. Sucesso fecha e atualiza dados.

`saveFinanceAction` é um adaptador de apresentação autenticado que reutiliza `mutateFinance` e retorna somente após o serviço concluir. O adaptador de redirect anterior permanece. Next Server Actions preserva proteção de origem; a sessão continua validada no servidor. Não aceita ai-confirm por esse caminho. Cálculos, serviços, RLS, migrações, cookies e validação financeira não foram modificados. Nenhum fallback financeiro em localStorage/sessionStorage foi adicionado ao produto.

## Capturas e verificações

Capturas abaixo usam **dados fictícios e ações de servidor simuladas**, com faixa explícita na interface. Os componentes são os reais do app; fixtures, alias de Auth/actions/router e persistência simulada ficam exclusivamente em `tests/ui`. Não há rota demo/backdoor em Next.js. Screenshots não comprovam sessão Supabase real nem fluxo financeiro remoto.

| Tela                  | Celular 390px                                   | Desktop 1440px                                   |
| --------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Painel                | [Abrir](screenshots/redesign/painel-390.webp)   | [Abrir](screenshots/redesign/painel-1440.webp)   |
| Registro rápido       | [Abrir](screenshots/redesign/registro-390.webp) | [Abrir](screenshots/redesign/registro-1440.webp) |
| Conversa indisponível | [Abrir](screenshots/redesign/conversa-390.webp) | [Abrir](screenshots/redesign/conversa-1440.webp) |

Também verificado em **360×800**, além de 390×844 e 1440×1000: sem overflow horizontal, vazio, folga negativa, nomes longos/números grandes, ocultar valores, rádio entrada/despesa, foco modal, Escape/descartar, bloqueio ao fechar durante envio, erro sem limpar campos, mesmo UUID/requisição repetida, atualização/reload simulados, controles de filtro, campos preservados entre etapas e redução de movimento. A primeira rodada expôs problemas de labels e foco; foram corrigidos antes das capturas finais.

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:redesign-ui
npm run test:ai-ui
# Com o app compilado rodando em uma porta local:
TATO_E2E_BASE_URL=http://127.0.0.1:3005 npm run test:e2e
```

Resultados: **109 testes** financeiros/validação/SQL/IA simulada/adaptador de registro rápido passaram; lint, tipos e build passaram. UI isolada passou nas três larguras; conversa anterior passou em 390/1440. Testes públicos do Next compilado verificam telas Auth, validação, credencial inválida e rotas protegidas; o E2E financeiro requer usuário confirmado e isolado, portanto fica skipped sem credenciais. Não há aprovação HTTP A/B real nem teste financeiro privado remoto nesta etapa. Não criamos usuários, enviamos e-mails ou acessamos registros financeiros reais.

## Preview e limites externos

O projeto existente `tato-preview` / `prj_8aFMUCjXY0X7Q40lDLCYrzFSn2Rc` mantém proteção Vercel e variáveis. A nova implantação será registrada aqui após Ready e acesso autorizado da plataforma. Nenhuma promoção para produção. A integração não permite editar Auth URL Configuration; os novos callbacks exatos serão registrados junto à URL, sem remover redirects existentes.

A IA continua dependendo da resolução externa de faturamento/acesso OpenAI. Nenhuma chave foi consultada, copiada ou impressa e nenhuma chamada à API OpenAI do app foi realizada. O registro manual funciona independentemente da IA. Sessões reais de teste não estão disponíveis para validar dados privados no Preview ou HTTP A/B; roteiros existentes permanecem no README/IA.md.

## Roteiro curto de aceite

1. Entrar no Preview com sua conta Vercel e depois no Tato. Conferir folga, período e explicação; alternar ocultar/mostrar valores.
2. “Registrar gasto”: preencher, fechar com Escape e recusar descarte; conferir dados. Salvar uma vez e verificar painel/lista após recarregar. Repetir com entrada em uma conta de testes.
3. Alterar mês/filtros, abrir Planejar e Mais, conferir contas/categorias e operações existentes. Não registrar dados fictícios em uma conta financeira real.
4. Abrir Tato; se indisponível, usar “Registrar gasto sem IA”. Não é necessário consumir API paga para testar esta reformulação.
