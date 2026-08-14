# Challenge Assaad - Sessao Supabase sem deslogamento aleatorio

App Next.js 16 (App Router) + Supabase Auth com sessao em cookies `httpOnly` (SSR).

Este repositorio implementa a solucao para o problema de **deslogamento aleatorio** causado por condicao de corrida no refresh de tokens entre abas e requisicoes simultaneas.

## Causa-raiz (otica frontend)

O Supabase GoTrue usa **refresh tokens de uso unico**: cada renovacao invalida o token anterior e emite um novo par access/refresh.

Quando varias abas ou requests tentam renovar ao mesmo tempo:

1. Aba A e aba B leem o mesmo refresh token dos cookies.
2. Aba A renova com sucesso; o servidor grava novos cookies.
3. Aba B ainda usa o refresh token antigo e recebe `refresh_token_not_found` ou erro de rede.
4. O app interpretava isso como falha de autenticacao e **deslogava o usuario**.

Fatores que pioravam o problema neste projeto:

- Proxy usava apenas `getClaims()` (validacao local) sem renovacao consistente de cookies.
- Nao havia coordenacao entre abas (cada uma podia disparar refresh sozinha).
- Em `401`, o client fazia logout imediato sem tentar recuperar a sessao.
- Cookies invalidos (`refresh_token_not_found`) nao eram limpos de forma uniforme.

## Solucao implementada

### 1. Fluxo correto `@supabase/ssr`

| Camada | Arquivo | Papel |
|--------|---------|-------|
| Proxy (edge) | `src/proxy.ts` + `lib/auth/proxy-handler.ts` | Intercepta requests, chama `getUser()` via `refreshSessionWithUser`, reescreve cookies na request e response |
| Servidor | `lib/supabase/server.ts` | Server Actions e RSC |
| Request/API | `lib/supabase/request-client.ts` | Route handlers e proxy |
| Browser | `lib/supabase/client.ts` + `providers/session-provider.tsx` | Cliente browser e sync ao focar/trocar aba |

O refresh real acontece em **`getUser()`**, que renova tokens expirados e dispara `setAll()` para gravar cookies.

### 2. Coordenacao multi-aba / multi-request

**Client-side (`lib/auth/session-coordinator.client.ts`):**

- `navigator.locks.request('supabase-session-refresh')` garante **uma unica aba** executando refresh por vez.
- `BroadcastChannel('supabase-session-sync')` notifica as outras abas quando o refresh termina.
- `SessionProvider` dispara refresh ao montar, ao focar a janela e ao voltar a aba (`visibilitychange`).

**Server-side (`lib/auth/refresh-session-server.ts`):**

- Mapa de promises in-flight deduplica refreshs concorrentes **no mesmo processo Node** (mesmo refresh token = mesma promise).

**Endpoint centralizado:**

- `POST /api/auth/refresh` e o unico ponto de refresh iniciado pelo browser.

### 3. UX resiliente em 401

`lib/api/authenticated-fetch.ts`:

1. Recebe `401` ou `403`.
2. Chama `coordinatedRefresh()` (tenta recuperar sessao).
3. Repete a request original **uma vez**.
4. So entao faz logout e redirect para `/login`.

### 4. Demonstracao multi-aba

Pagina: **`/demo/multi-tab`** (link no dashboard)

Como testar:

1. Faca login.
2. Abra `/demo/multi-tab` em 3 abas.
3. Clique em "Forcar refresh coordenado" em todas quase ao mesmo tempo.
4. Observe no log: uma aba executa o POST; as demais recebem evento via BroadcastChannel.
5. Troque de aba apos inatividade: o `SessionProvider` renova ao focar.

## Estrutura do projeto

```
src/
  proxy.ts                         # Entry point do proxy Next.js 16
  app/
    api/auth/refresh/route.ts      # Refresh centralizado
    api/auth/logout/route.ts       # Logout (limpa cookies)
    api/health/route.ts            # Health check autenticado
    demo/multi-tab/page.tsx        # Demo multi-aba
    dashboard/page.tsx             # Area autenticada
    login/page.tsx                 # Login
  lib/auth/
    proxy-handler.ts               # Logica do proxy
    refresh-session-server.ts      # getUser + deduplicacao
    session-coordinator.client.ts  # Web Lock + BroadcastChannel
    session-constants.ts           # Nomes de lock/canal
  providers/session-provider.tsx   # Sync ao focar/trocar aba
```

## Variaveis de ambiente

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

## Scripts

```bash
npm run dev    # Desenvolvimento
npm run build  # Build de producao
npm run start  # Servidor de producao
```

## Limitacoes conhecidas

- A deduplicacao server-side funciona **por instancia Node**. Em serverless com muitas instancias, a coordenacao client-side (Web Lock + BroadcastChannel) e o mecanismo principal anti-corrida.
- Cookies sao `httpOnly`: o browser nao le o JWT diretamente; refresh sempre passa pelo servidor (`/api/auth/refresh` ou proxy).

## Referencias

- [Supabase SSR - Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
