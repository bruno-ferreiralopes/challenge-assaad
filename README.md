# Challenge Assaad - Sessão Supabase sem deslogamento aleatório

Testável em `https://challenge-assaad-sigma.vercel.app/`

App Next.js 16 (App Router) + Supabase Auth com sessão em cookies `httpOnly` (SSR).

Este repositório implementa a solução para o problema de **deslogamento aleatório**, causado por condição de corrida no refresh de tokens entre abas e requisições simultâneas.

## Causa-raiz (ótica frontend)

O Supabase GoTrue usa **refresh tokens de uso único**: cada renovação invalida o token anterior e emite um novo par access/refresh.

Quando várias abas ou requests tentam renovar ao mesmo tempo:

1. Aba A e aba B leem o mesmo refresh token dos cookies.
2. Aba A renova com sucesso; o servidor grava novos cookies.
3. Aba B ainda usa o refresh token antigo e recebe `refresh_token_not_found` ou erro de rede.
4. O app interpretava isso como falha de autenticação e **deslogava o usuário**.

Fatores que pioravam o problema neste projeto após a implementação mínima:

- Não havia coordenação entre abas (cada uma podia disparar refresh sozinha).
- Em `401`, o client fazia logout imediato sem tentar recuperar a sessão.
- Cookies inválidos (`refresh_token_not_found`) não eram limpos de forma uniforme.

## Solução implementada

### Overview

O deslogamento aleatório não vinha de credenciais erradas, e sim de **várias partes do app tentando renovar a sessão ao mesmo tempo**. O Supabase invalida o refresh token antigo a cada renovação; se duas abas (ou duas requisições) disputam o mesmo token, uma ganha e a outra falha. O código tratava essa falha como “sessão morta” e mandava o usuário para o login.

A linha de pensamento foi dividir o problema em três frentes:

1. **Renovar do jeito certo** — Garantir que o servidor use o fluxo recomendado pelo `@supabase/ssr`, gravando cookies de forma consistente em cada camada (proxy, rotas de API e Server Components), sem refresh duplicado nos fluxos de login e logout.
2. **Coordenar quem renova** — No browser, apenas uma aba executa o refresh por vez (Web Lock) e avisa as demais (BroadcastChannel). No servidor, requisições simultâneas com o mesmo cookie compartilham uma única chamada em andamento. O refresh também é **condicional**: se o token ainda vale por mais de 2 minutos, não há chamada desnecessária ao Supabase.
3. **Não deslogar no primeiro erro** — Um `401` pode ser transitório (a outra aba acabou de renovar e esta requisição usou o cookie antigo). Antes de encerrar a sessão, o app tenta recuperá-la uma vez; só depois faz logout e redireciona para `/login`.

Em resumo: **menos refreshes, um refresh por vez, recuperação antes do logout e limpeza de cookies inválidos**. Os tópicos abaixo detalham como cada parte foi implementada.

### 1. Fluxo correto `@supabase/ssr`


| Camada      | Arquivo                                                     | Papel                                                                                                        |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Proxy       | `src/proxy.ts` + `lib/auth/proxy-handler.ts`                | Intercepta requests, chama `getUser()` via `refreshSessionWithUser`, reescreve cookies na request e response |
| Servidor    | `lib/supabase/server.ts`                                    | Server Actions (logout) e RSC                                                                                |
| Request/API | `lib/supabase/request-client.ts`                            | Route handlers e proxy                                                                                       |
| Browser     | `lib/supabase/client.ts` + `providers/session-provider.tsx` | Cliente browser e sync ao focar/trocar aba                                                                   |


O refresh real acontece em `getUser()`, que renova tokens expirados e dispara `setAll()` para gravar cookies.

**Refresh condicional:** `lib/auth/session-cookie.ts` lê o `exp` do JWT nos cookies e só chama `getUser()` quando o token expira em menos de 2 minutos. Em `401`, `authenticatedFetch` força refresh com `{ force: true }`.

**Sessão inválida:** `lib/auth/invalid-session.ts` centraliza a detecção por status HTTP e `error.code` do GoTrue, evitando heurística em mensagens de erro.

### 2. Coordenação multi-aba / multi-request

**Client-side (**`lib/auth/session-coordinator.client.ts`**):**

- `navigator.locks.request('supabase-session-refresh')` garante **uma única aba** executando refresh por vez.
- `BroadcastChannel('supabase-session-sync')` notifica as outras abas quando o refresh termina.
- `SessionProvider` dispara refresh ao montar, ao focar a janela e ao voltar à aba (`visibilitychange`).

**Server-side (**`lib/auth/refresh-session-server.ts`**):**

- Mapa de promises in-flight deduplica refreshs concorrentes **no mesmo processo Node** (mesmo refresh token = mesma promise).

**Endpoints de auth:**


| Método | Rota                | Papel                                                                |
| ------ | ------------------- | -------------------------------------------------------------------- |
| `POST` | `/api/auth/login`   | Login com status HTTP semânticos (`400`, `401`, `403`, `429`, `503`) |
| `POST` | `/api/auth/refresh` | Único ponto de refresh iniciado pelo browser                         |
| `POST` | `/api/auth/logout`  | Limpa cookies e revoga sessão em background                          |


O proxy ignora refresh em `/api/auth/login`, `/api/auth/logout` e `/api/auth/refresh`, para evitar corrida de cookies nesses fluxos.

### 3. UX resiliente em 401

`lib/api/authenticated-fetch.ts`:

1. Recebe `401`.
2. Chama `coordinatedRefresh({ force: true })` (tenta recuperar sessão).
3. Repete a request original **uma vez**.
4. Se ainda falhar: `POST /api/auth/logout` e `window.location.href = "/login"` (sem lançar erro para o caller).

### 4. Login e logout

**Login (**`POST /api/auth/login`**):**

- Cookies `sb-*` são removidos do header antes de `signInWithPassword`, para evitar refresh tokens inválidos envenenando o login.
- O formulário em `login-form.tsx` usa `fetch`; em sucesso, redireciona com `window.location.href = "/dashboard"`.

**Logout (**`logoutAction` **+** `POST /api/auth/logout`**):**

- `signOut()` roda em background (`lib/auth/logout-server.ts`), enquanto os cookies são limpos imediatamente.
- O botão de logout redireciona com `window.location.assign("/login")`.

### 5. Demonstração multi-aba

Página: `/demo/multi-tab` (link no dashboard).

Como testar:

1. Faça login.
2. Abra `/demo/multi-tab` em 2 ou mais abas.
3. Clique em "Forçar refresh coordenado" em todas, quase ao mesmo tempo.
4. Observe no log: uma aba executa o POST; as demais recebem evento via BroadcastChannel.
5. Troque de aba após inatividade: o `SessionProvider` renova ao focar.

## Estrutura do projeto

```
src/
  proxy.ts                                    # Entry point do proxy Next.js 16
  app/
    layout.tsx                                # Layout raiz (providers)
    page.tsx                                  # Redirect para /dashboard
    globals.css
    login/
      page.tsx                                # Pagina de login
    dashboard/
      page.tsx                                # Area autenticada
    demo/
      multi-tab/
        page.tsx                              # Demo multi-aba
    api/
      auth/
        login/route.ts                        # POST login (status HTTP semanticos)
        logout/route.ts                       # POST logout (limpa cookies)
        refresh/route.ts                      # POST refresh centralizado
      health/route.ts                         # GET health check autenticado
  components/
    auth/
      login-form.tsx                          # Formulario de login (fetch)
      logout-button.tsx                       # Botao de logout
    dashboard/
      health-check-panel.tsx                  # Demo de authenticatedFetch
      user-profile-card.tsx                   # Card com dados do usuario
    demo/
      multi-tab-demo-panel.tsx                # Painel da demo multi-aba
    ui/
      form-tooltip.tsx                        # Tooltip animado para erros de form
      formatted-date.tsx                      # Data formatada (pt-BR)
      spinner.tsx                             # Spinner reutilizavel
  hooks/
    use-health-check.ts                       # Mutation TanStack Query (health)
  lib/
    api/
      authenticated-fetch.ts                  # Fetch com retry em 401 + redirect
    auth/
      actions.ts                              # logoutAction (Server Action)
      api-auth.ts                             # requireClaims + attachSessionCookies
      errors.ts                               # Mensagens e status HTTP de auth
      invalid-session.ts                      # Deteccao centralizada de sessao invalida
      logout-server.ts                        # signOut() em background
      proxy-handler.ts                        # Logica do proxy
      refresh-session-server.ts               # getUser + deduplicacao in-flight
      routes.ts                               # Rotas protegidas / auth
      session-constants.ts                    # Nomes de lock e canal de sync
      session-cookie.ts                       # Le exp do JWT e decide refresh
      session-coordinator.client.ts           # Web Lock + BroadcastChannel
      session-cookies.ts                      # Limpeza de cookies sb-*
    supabase/
      client.ts                               # Cliente Supabase (browser)
      cookie-options.ts                       # Opcoes httpOnly dos cookies
      fetch-with-timeout.ts                   # Fetch com timeout (10s)
      login-client.ts                         # Cliente isolado para login (sem ler cookies)
      request-client.ts                       # Cliente Supabase (route handlers / proxy)
      server.ts                               # Cliente Supabase (RSC / actions)
    user/
      profile.ts                              # getUserProfile (RSC)
  providers/
    query-provider.tsx                        # TanStack Query
    session-provider.tsx                      # Refresh ao focar/trocar aba
```

## Limitações conhecidas

- A deduplicação server-side funciona **por instância Node**. Em serverless com muitas instâncias, a coordenação client-side (Web Lock + BroadcastChannel) é o mecanismo principal anti-corrida.

