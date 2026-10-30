# Arquivos de marca do Preview

Origem: cinco pranchas fornecidas pelo usuário em 30/10/2026. Referência 3 para logo e referência 2 para personagem. **Os arquivos são recriações raster preparadas com geração/edição guiada pelas referências; não são extrações exatas nem arquivos vetoriais oficiais.** Estão integrados ao Preview para avaliação visual. Nenhuma prancha completa é distribuída ao navegador.

- `logo-horizontal.webp`: lettering ilustrado e tatu, com transparência. A tipografia de títulos não substitui a logo.
- Aplicação em fundo escuro: `Brand dark` apresenta a mesma logo sobre placa creme, preservando cores e legibilidade. Não é uma falsa versão negativa/monocromática.
- `app-icon.webp`, `app-icon.png` e `favicon.png`: ícone compacto, com cantos transparentes verificados.
- `atento`, `feliz`, `pensativo`, `cuidadoso`, `explicando`, `comemorando`, `surpreso`, `confiante`: oito imagens individuais WebP com transparência verificada. Não são recortes retangulares das pranchas.
- Origem por arquivo, dimensões, formato, transparência, peso e estado em `inventory.json`.

O preparo das ilustrações/expressões usou imagegen. Sharp foi usado somente para otimização de formato, dimensões, margem transparente e verificação de metadados. Os PNGs intermediários permanecem em `/workspace/generated_images`, fora dos assets do navegador; o inventário registra seus nomes. Todos os arquivos necessários ao build estão versionados aqui.

Pendente: originais oficiais da logo em vetor e variante negativa/monocromática. Nenhum PNG foi embutido em SVG para alegar vetorização. Substitua as recriações pelos originais aprovados quando forem fornecidos, mantendo os contratos do componente `src/components/brand/tato.tsx`.
