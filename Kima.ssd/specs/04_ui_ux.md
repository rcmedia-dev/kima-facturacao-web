# KIMA UI — Sistema de Design & Especificação de Estilos

> **Documento Oficial de Estilos do Ecossistema KIMA**  
> Diretrizes para padronização visual, componentes, tokens cromáticos e layout para a plataforma KIMA e sub-aplicativos integrados.

---

## 1. Visão Geral do Sistema de Design

O **KIMA UI** foi desenvolvido sobre o princípio de interfaces limpas, modernas, funcionais e consistentes. A linguagem visual utiliza cantos arredondados suaves (`rounded-xl`, `rounded-2xl`), elevações subtis através de sombras macias, tipografia legível (`Inter`), contraste otimizado e suporte nativo a **Light Mode** e **Dark Mode**.

---

## 2. Paleta de Cores & Tokens Cromáticos

### 2.1 Cores Primárias e Marca

| Nome Token | Hex | Tailwind Class | Aplicação no Sistema |
| :--- | :--- | :--- | :--- |
| **Kima Blue** | `#2563EB` | `bg-blue-600` / `text-blue-600` | Cor primária da marca, botões principais, links e foco |
| **Kima Indigo** | `#6366F1` | `bg-indigo-600` / `text-indigo-600` | Gradientes primários, estatísticas e indicadores |
| **Kima Teal** | `#14B8A6` | `bg-teal-500` / `text-teal-500` | Destaques secundários e módulos de Inventário |
| **Kima Green** | `#10B981` | `bg-emerald-500` / `text-emerald-500` | Sucesso, confirmações, status ativo e Vendas |
| **Kima Purple** | `#7C3AED` | `bg-purple-600` / `text-purple-600` | Recursos Humanos, modais especiais e destaques |
| **Kima Orange** | `#F97316` | `bg-orange-500` / `text-orange-500` | Contratos e avisos importantes |
| **Kima Amber** | `#F59E0B` | `bg-amber-500` / `text-amber-500` | Alertas, estados pendentes e Help Desk |
| **Kima Red** | `#EF4444` | `bg-red-600` / `text-red-600` | Ações perigosas, erros, cancelamentos e exclusão |

### 2.2 Identidade Cromática por Módulo (Sub-Apps)

Cada sub-aplicativo do ecossistema KIMA adota uma cor temática de acentuação:

| Módulo Sub-App | Cor Hex | Tailwind Base | Exemplo de Aplicação |
| :--- | :--- | :--- | :--- |
| **Kima Faturas** | `#2563EB` | `blue-600` | Badges, cabeçalhos de tabela e botões de emissão |
| **Kima RH** | `#7C3AED` | `purple-600` | Cartões de colaboradores e indicadores de pessoal |
| **Kima Inventário** | `#14B8A6` | `teal-500` | Status de stock e movimentações de armazém |
| **Kima Contratos** | `#F97316` | `orange-500` | Alertas de vencimento e estados de minuta |
| **Kima Projetos** | `#3B82F6` | `blue-500` | Quadros Kanban e barras de progresso |
| **Kima Vendas** | `#10B981` | `emerald-500` | Indicadores de receita e funil CRM |
| **Kima Help Desk** | `#F59E0B` | `amber-500` | Prioridade de tickets e tempos de SLA |

### 2.3 Cores Neutras, Superfícies & Modos de Cor

#### Light Mode
- **Fundo Principal (Body)**: `#F3F4F6` (`bg-slate-100` / `bg-gray-100`)
- **Superfície de Cartão / Container**: `#FFFFFF` (`bg-white`)
- **Bordas**: `#E2E8F0` (`border-slate-200`) ou `#F1F5F9` (`border-slate-100` em divisores internos)
- **Texto Principal**: `#111827` (`text-slate-900` / `text-gray-900`)
- **Texto Secundário**: `#64748B` (`text-slate-500`)
- **Texto Desativado**: `#94A3B8` (`text-slate-400`)

#### Dark Mode
- **Fundo Principal (Body)**: `#0F172A` (`dark:bg-slate-950` ou `dark:bg-[#0F172A]`)
- **Superfície de Cartão / Container**: `#1E293B` ou `#0F172A` com transparência (`dark:bg-slate-900`)
- **Bordas**: `#334155` (`dark:border-slate-800`) ou `dark:border-slate-800/80`
- **Texto Principal**: `#F9FAFB` (`dark:text-white` / `dark:text-slate-100`)
- **Texto Secundário**: `#94A3B8` (`dark:text-slate-400`)
- **Texto Desativado**: `#64748B` (`dark:text-slate-500`)

### 2.4 Fundo de Status / Badges (Light & Dark)

```css
/* Custom CSS Variables para fundos de badges e estados */
:root {
  --primary-light: #EFF6FF;
  --success-light: #ECFDF5;
  --warning-light: #FFFBEB;
  --danger-light:  #FEF2F2;
  --info-light:    #EEF2FF;
  --purple-light:  #F5F3FF;
  --teal-light:    #F0FDFA;
  --orange-light:  #FFF7ED;
}

.dark {
  --primary-light: rgba(37, 99, 235, 0.15);
  --success-light: rgba(16, 185, 129, 0.15);
  --warning-light: rgba(245, 158, 11, 0.15);
  --danger-light:  rgba(239, 68, 68, 0.15);
  --info-light:    rgba(99, 102, 241, 0.15);
  --purple-light:  rgba(124, 58, 237, 0.15);
  --teal-light:    rgba(20, 184, 166, 0.15);
  --orange-light:  rgba(249, 115, 22, 0.15);
}
```

---

## 3. Border Radius (Rounded / Cantos Arredondados)

O sistema KIMA adota uma hierarquia estrita para cantos arredondados:

| Tamanho | Valor Pixel | Tailwind Class | Casos de Uso Recomendados |
| :--- | :--- | :--- | :--- |
| **Pequeno** | `6px` / `8px` | `rounded-lg` | Tags internas, inputs de pesquisa compactos, tooltips e botões de ícone simples |
| **Médio (Padrão Componente)**| `12px` | `rounded-xl` | **Botões**, Inputs de formulários, Dropdowns, Badges grandes e Menus de contexto |
| **Grande (Containers)** | `16px` | `rounded-2xl` | **Cards**, Modais, Tabelas contidas, Painéis de estatísticas |
| **Extra Grande** | `24px` | `rounded-3xl` | Modais expansivos, banners de destaque, caixas de atalho principal |
| **Totalmente Arredondado** | `9999px` | `rounded-full` | Avatares de utilizador, pílulas de filtro (`pill badges`), dots de status e barras de rolagem |

---

## 4. Escala de Tamanhos & Dimensões dos Componentes

### 4.1 Altura Padrão dos Elementos Interativos (Inputs, Buttons, Selects)

| Tamanho | Altura (px) | Tailwind Height | Padding Horizontal | Tamanho da Fonte | Uso Típico |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **sm (Small)** | `32px` / `36px` | `h-8` / `h-9` | `px-3` | `text-xs` (12px) | Modais densos, filtros secundários, tabelas compactas |
| **md (Medium - Padrão)**| `44px` | `h-11` ou `py-2.5` | `px-4` | `text-sm` (14px) | Formulários principais, botões normais, inputs de pesquisa |
| **lg (Large)** | `52px` | `h-13` ou `py-3` | `px-6` | `text-base` (16px) | Páginas de login, hero actions, botões de ação principal em landing pages |

### 4.2 Spacings e Paddings Internos

- **Inner Card Padding**: `p-5` (20px) em cartões normais; `p-6` (24px) em cartões principais.
- **Card Header Padding**: `pb-4 mb-4` com divisor inferior.
- **Drawer Body Padding**: `px-5 py-5`.
- **Gap Padrão**: `gap-2` (8px) para ícones+textos; `gap-4` (16px) entre cartões; `gap-6` (24px) entre seções de grid.

---

## 5. Botões (Buttons)

Os botões utilizam `font-semibold`, transição de cor suave (`transition-all duration-200`), raio de canto `rounded-xl` (12px) e estado de foco visível.

### 5.1 Variantes de Botão

#### Primary (Ação Principal)
- **Visual**: Gradiente azul para índigo.
- **Classes**: `bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`

#### Secondary (Ação Neutra/Secundária)
- **Visual**: Fundo cinza suave.
- **Classes**: `bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-slate-400`

#### Outline (Contornado)
- **Visual**: Fundo transparente com borda Slate.
- **Classes**: `border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 bg-transparent focus:ring-2 focus:ring-blue-500`

#### Ghost (Transparente / Ação Discreta)
- **Visual**: Sem fundo ou borda inicial, realce no hover.
- **Classes**: `text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-slate-400`

#### Danger (Perigo / Exclusão)
- **Visual**: Vermelho vibrante.
- **Classes**: `bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-2 focus:ring-red-500`

#### Success (Sucesso / Aprovação)
- **Visual**: Verde Esmeralda.
- **Classes**: `bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-2 focus:ring-emerald-500`

### 5.2 Estados Especiais dos Botões
- **Disabled**: `disabled:opacity-60 disabled:cursor-not-allowed`
- **Loading**: Mostra spinner animado e desativa clique (`isLoading={true}`).

---

## 6. Cards (Cartões de Informação)

Os cartões utilizam cantos `rounded-2xl` (16px), borda fina Slate e sombra subtil (`shadow-sm`).

### 6.1 Especificação de Código (React / Tailwind)

```tsx
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-200">
  {/* Header */}
  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
    <h3 className="font-bold text-slate-900 dark:text-white text-base">Título do Card</h3>
    <Badge variant="primary">Ativo</Badge>
  </div>
  {/* Conteúdo */}
  <div className="text-sm text-slate-600 dark:text-slate-400">
    Conteúdo principal...
  </div>
</div>
```

### 6.2 Cartões Interativos (Hover Effect)
Quando um cartão for clicável ou interativo, adicione:
`hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer`

---

## 7. Drawers & Modais (Painéis Deslizantes & Diálogos)

### 7.1 Drawers (Painel Lateral de Detalhes / Edição)
- **Posicionamento**: Desliza da direita para a esquerda (`top-0 right-0 h-full`).
- **Largura Standard**: `w-full sm:w-[480px]` (ou `max-w-md` / `max-w-lg` conforme necessidade).
- **Backdrop (Fundo de Sobreposição)**: `fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm z-50 animate-fade-in`.
- **Painel Lateral**: `bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right`.
- **Estrutura Interna**:
  - **Header Fix**: `px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center`.
  - **Body Rolável**: `flex-1 overflow-y-auto px-5 py-5`.
  - **Footer Fix**: `px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0`.

### 7.2 Modais (Diálogos Centrais)
- **Backdrop**: Classe CSS `.modal-backdrop` (`position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); z-index: 200`).
- **Container do Modal**: `bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-lg w-full animate-scale-in`.

---

## 8. Ícones (Sistema de Iconografia)

### 8.1 Regra Estrita
- **NENHUM EMOJI** deve ser utilizado na interface dos sub-aplicativos.
- Todos os ícones utilizam a biblioteca **FontAwesome SVG** através do componente unificado `<FontIcon name="..." />`.

### 8.2 Tamanhos de Ícones Standard

| Tamanho | Classe CSS | Dimensão Renderizada | Aplicação |
| :--- | :--- | :--- | :--- |
| **xs** | `text-xs` | `12px` | Badges, indicadores pequenos e legendas |
| **sm** | `text-sm` | `14px` | Dentro de botões, itens de menu e tabelas |
| **base / md** | `text-base` | `16px` | Cabeçalhos de card e botões de ação média |
| **lg** | `text-lg` | `18px` / `20px` | Ícones de destaque de seção e headers de modal |
| **xl / 2xl** | `text-2xl` | `24px` + | Empty states, ícones principais de cards de estatística |

---

## 9. Sombras (Shadows) & Efeitos de Elevação

| Token de Sombra | Tailwind Class | Efeito e Uso |
| :--- | :--- | :--- |
| **Subtil** | `shadow-xs` / `shadow-sm` | Cartões estáticos, inputs em descanso, badges |
| **Média** | `shadow-md` | Cartões em hover, dropdowns abertos, popovers |
| **Alta** | `shadow-lg` | Mensagens Toast, menus suspensos de grande relevância |
| **Máxima** | `shadow-2xl` | Modais e Drawers laterais deslizantes |
| **Glassmorphism** | `.glass` | `backdrop-filter: blur(16px) saturate(180%); background-color: rgba(255, 255, 255, 0.88)` (ou `rgba(15, 23, 42, 0.88)` no Dark Mode) |
| **Foco** | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` | Destaque acessível para navegação via teclado |

---

## 10. Bordas & Divisores (Borders & Dividers)

- **Espessura Padrão**: `1px` (`border`).
- **Cor de Borda em Light Mode**: `border-slate-200` (`#E2E8F0`).
- **Cor de Borda em Dark Mode**: `dark:border-slate-800` (`#1E293B`).
- **Divisores Internos (Headers e Footers)**:
  - Light: `border-slate-100`
  - Dark: `dark:border-slate-800/80`
- **Linha de Destaque Ativo (Tab / Sidebar Item)**: `border-l-4 border-blue-600`.

---

## 11. Especificação da Sidebar (Navegação Shell)

A Sidebar é a espinha dorsal de navegação do KIMA e dos sub-apps.

### 11.1 Dimensões e Posição
- **Largura Fixa**: `280px` (`w-72` / `--sidebar-width: 280px`).
- **Estrutura**: `fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 sidebar-transition`.
- **Transição Móvel**: `transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)` com backdrop escuro (`bg-black/50`).

### 11.2 Seções da Sidebar
1. **Topo (Header)**: Logo Kima com switcher de empresa (`p-5 border-b border-slate-100 dark:border-slate-800/80`).
2. **Corpo Navegável**: `flex-1 overflow-y-auto px-4 py-4 space-y-6`.
   - **Títulos de Seção**: `text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2`.
   - **Item Navegação Normal**: `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`.
   - **Item Navegação Ativo**: `bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold shadow-xs`.
3. **Rodapé (Footer)**: Perfil do Utilizador ativo + botão de comutação de tema (Dark/Light) + logout.

---

## 12. Padrão de Inputs e Formulários

### 12.1 Campo de Texto (Input)
```tsx
<div className="space-y-1.5">
  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
    Nome do Documento
  </label>
  <input
    type="text"
    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    placeholder="Ex: Fatura FA 2026/001"
  />
</div>
```

---

## 13. Guia de Integração e Replicação em Sub-Apps

Para que qualquer sub-aplicativo (ex: `faturas.kima.ao`, `rh.kima.ao`) tenha a mesma aparência do KIMA Core, siga estes passos:

1. **Copiar ou Importar o `globals.css`**: Garantir que as variáveis do `@theme`, animações e regras `.dark` estejam presentes no CSS global do sub-app.
2. **Adicionar a fonte `Inter`**: No `<head>` do HTML ou no `layout.tsx`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
   ```
3. **Utilizar as variantes de `rounded`**:
   - Botões & Inputs: `rounded-xl`
   - Cartões: `rounded-2xl`
   - Badges e Avatares: `rounded-full`
4. **Respeitar os Modos de Cor**: Sempre utilize pares de classes Tailwind Light/Dark (ex: `bg-white dark:bg-slate-900`, `text-slate-900 dark:text-white`, `border-slate-200 dark:border-slate-800`).
5. **Usar FontIcon**: Importe o componente `<FontIcon />` mantendo o padrão SVG para todos os elementos visuais.

---
*© 2026 KIMA SaaS — RC Media. Todos os direitos reservados.*
