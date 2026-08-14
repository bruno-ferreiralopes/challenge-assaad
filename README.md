# Challenge Assaad - Sessao Supabase sem deslogamento aleatorio

Testável em `https://challenge-assaad-sigma.vercel.app/`

App Next.js 16 (App Router) + Supabase Auth com sessao em cookies `httpOnly` (SSR).

Este repositorio implementa a solucao para o problema de **deslogamento aleatorio** causado por condicao de corrida no refresh de tokens entre abas e requisicoes simultaneas.

## Causa-raiz (otica frontend)

O Supabase GoTrue usa **refresh tokens de uso unico**: cada renovacao invalida o token anterior e emite um novo par access/refresh.

Quando varias abas ou requests tentam renovar ao mesmo tempo:

1. Aba A e aba B leem o mesmo refresh token dos cookies.
2. Aba A renova com sucesso; o servidor grava novos cookies.
3. Aba B ainda usa o refresh token antigo e recebe `refresh_token_not_found` ou erro de rede.
4. O app interpretava isso como falha de autenticacao e **deslogava o usuario**.

Fatores que pioravam o problema neste projeto após a implementação mínima:

- Nao havia coordenacao entre abas (cada uma podia disparar refresh sozinha).
- Em `401`, o client fazia logout imediato sem tentar recuperar a sessao.
- Cookies invalidos (`refresh_token_not_found`) nao eram limpos de forma uniforme.



## Solucao implementada



### 1. Fluxo correto `@supabase/ssr`


| Camada      | Arquivo                                                     | Papel                                                                                                        |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Proxy       | `src/proxy.ts` + `lib/auth/proxy-handler.ts`                | Intercepta requests, chama `getUser()` via `refreshSessionWithUser`, reescreve cookies na request e response |
| Servidor    | `lib/supabase/server.ts`                                    | Server Actions (logout) e RSC                                                                                |
| Request/API | `lib/supabase/request-client.ts`                            | Route handlers e proxy                                                                                       |
| Browser     | `lib/supabase/client.ts` + `providers/session-provider.tsx` | Cliente browser e sync ao focar/trocar aba                                                                   |


O refresh real acontece em `**getUser()**`, que renova tokens expirados e dispara `setAll()` para gravar cookies.

**Refresh condicional:** `lib/auth/session-cookie.ts` le o `exp` do JWT nos cookies e so chama `getUser()` quando o token expira em menos de 2 minutos. Em `401`, `authenticatedFetch` forca refresh com `{ force: true }`.

**Sessao invalida:** `lib/auth/invalid-session.ts` centraliza a deteccao por status HTTP e `error.code` do GoTrue, evitando heuristica em mensagens de erro.

### 2. Coordenacao multi-aba / multi-request

**Client-side (**`lib/auth/session-coordinator.client.ts`**):**

- `navigator.locks.request('supabase-session-refresh')` garante **uma unica aba** executando refresh por vez.
- `BroadcastChannel('supabase-session-sync')` notifica as outras abas quando o refresh termina.
- `SessionProvider` dispara refresh ao montar, ao focar a janela e ao voltar a aba (`visibilitychange`).

**Server-side (**`lib/auth/refresh-session-server.ts`**):**

- Mapa de promises in-flight deduplica refreshs concorrentes **no mesmo processo Node** (mesmo refresh token = mesma promise).

**Endpoints de auth:**


| Metodo | Rota                | Papel                                                                |
| ------ | ------------------- | -------------------------------------------------------------------- |
| `POST` | `/api/auth/login`   | Login com status HTTP semanticos (`400`, `401`, `403`, `429`, `503`) |
| `POST` | `/api/auth/refresh` | Unico ponto de refresh iniciado pelo browser                         |
| `POST` | `/api/auth/logout`  | Limpa cookies e revoga sessao em background                          |


O proxy ignora refresh em `/api/auth/login`, `/api/auth/logout` e `/api/auth/refresh` para evitar corrida de cookies nesses fluxos.

### 3. UX resiliente em 401

`lib/api/authenticated-fetch.ts`:

1. Recebe `401`.
2. Chama `coordinatedRefresh({ force: true })` (tenta recuperar sessao).
3. Repete a request original **uma vez**.
4. Se ainda falhar: `POST /api/auth/logout` e `window.location.href = "/login"` (sem lancar erro para o caller).



### 4. Login e logout

**Login (**`POST /api/auth/login`**):**

- Credenciais invalidas retornam `401` (nao mais HTTP 200 com erro no corpo).
- Cookies `sb-*` sao removidos do header antes de `signInWithPassword` para evitar refresh tokens invalidos envenenando o login.
- O formulario em `login-form.tsx` usa `fetch`; em sucesso redireciona com `window.location.href = "/dashboard"`.

**Logout (**`logoutAction` **+** `POST /api/auth/logout`**):**

- `signOut()` roda em background (`lib/auth/logout-server.ts`) enquanto os cookies sao limpos imediatamente.
- O botao de logout redireciona com `window.location.assign("/login")`.



### 5. Demonstracao multi-aba

Pagina: `**/demo/multi-tab**` (link no dashboard)

Como testar:

1. Faca login.
2. Abra `/demo/multi-tab` em 2 ou mais abas.
3. Clique em "Forcar refresh coordenado" em todas quase ao mesmo tempo.
4. Observe no log: uma aba executa o POST; as demais recebem evento via BroadcastChannel.
5. Troque de aba apos inatividade: o `SessionProvider` renova ao focar.



## Estrutura do projeto

```
src/
  proxy.ts                              # Entry point do proxy Next.js 16
  app/
    api/auth/login/route.ts             # Login com status HTTP semanticos
    api/auth/refresh/route.ts           # Refresh centralizado
    api/auth/logout/route.ts            # Logout (limpa cookies)
    api/health/route.ts                 # Health check autenticado
    demo/multi-tab/page.tsx             # Demo multi-aba
    dashboard/page.tsx                  # Area autenticada
    login/page.tsx                      # Login
  lib/
    api/authenticated-fetch.ts          # Fetch com retry em 401 + redirect
    auth/
      proxy-handler.ts                  # Logica do proxy
      refresh-session-server.ts         # getUser + deduplicacao
      session-cookie.ts                 # Le exp e decide se refresh e necessario
      session-coordinator.client.ts     # Web Lock + BroadcastChannel
      invalid-session.ts                # Deteccao centralizada de sessao invalida
      logout-server.ts                  # signOut() em background
      errors.ts                         # Mensagens e status HTTP de erros de auth
      session-cookies.ts                # Limpeza de cookies sb-*
      actions.ts                        # logoutAction (Server Action)
    supabase/
      server.ts                         # Cliente Supabase (RSC / actions)
      request-client.ts                 # Cliente Supabase (route handlers / proxy)
      client.ts                         # Cliente Supabase (browser)
  providers/session-provider.tsx        # Sync ao focar/trocar aba
  components/
    auth/login-form.tsx                 # Formulario de login (fetch)
    auth/logout-button.tsx              # Botao de logout
    dashboard/health-check-panel.tsx    # Demo de authenticatedFetch
```

## Limitacoes conhecidas

- A deduplicacao server-side funciona **por instancia Node**. Em serverless com muitas instancias, a coordenacao client-side (Web Lock + BroadcastChannel) e o mecanismo principal anti-corrida.

