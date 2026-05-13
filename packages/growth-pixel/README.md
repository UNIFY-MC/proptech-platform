# @proptech/growth-pixel

Tracking de eventos de marketing/growth cross-vertical. Envia eventos para `growth-track-event` edge function que cria leads + interacções em `growth.*`.

## Instalação

Workspace local (já incluído no monorepo):

```js
import { useGrowthPixel } from '@proptech/growth-pixel/hook'
```

Ou via CDN (HTML estático, landing pages):

```html
<script type="module">
  import { initGrowthPixel } from 'https://cdn.skypack.dev/@proptech/growth-pixel'
  initGrowthPixel({
    vertical: 'v4',
    endpoint: 'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/growth-track-event',
    anonKey: 'eyJhbGc...',
    autoPageview: true,
    autoForms: true,  // tracka todos os <form> submits
  })
</script>
```

## Uso React (V2, V4, dashboard)

```jsx
import { useGrowthPixel } from '@proptech/growth-pixel/hook'

function SimuladorEnergia() {
  const { track, identify } = useGrowthPixel({ vertical: 'v4' })

  function onSubmit(form) {
    identify({ email: form.email, nome: form.nome })
    track('simulador_completo', { consumo_kwh: form.consumo, tarifa: form.tarifa })
  }
  // ...
}
```

## API

### `initGrowthPixel(config)`
Inicializa o pixel. Lê UTM params do URL, persiste em localStorage para atribuição multi-touch.

- `vertical` (string, **required**) — `v2|v3|v4|v5|v10`
- `endpoint` (string, **required**) — URL da edge function
- `anonKey` (string, **required**) — Supabase anon key
- `autoPageview` (boolean, default `true`) — envia pageview no init
- `autoForms` (boolean, default `false`) — captura `<form>` submits automaticamente (excepto campos `password`)
- `defaults` (object) — campos extra para incluir em **todos** os eventos

### `track(tipo, dados)`
Envia evento custom.

Tipos comuns: `pageview` · `form_submit` · `simulador_completo` · `cta_click` · `demo_agendada` · `whatsapp_iniciado`.

### `identify(profile)`
Identifica o user. Persiste no localStorage. Chamar quando obtens email.

- `{ email, nome, telefone, ... }`

### `resetPixel()`
Limpa state (logout, GDPR delete).

## Atribuição multi-touch

Pixel persiste UTM params do **primeiro** landing no localStorage. Eventos subsequentes herdam os UTMs originais até o lead converter ou `resetPixel()`.

Útil para casos:
- User chega via Meta ad → fecha → volta directo → eventos retêm `utm_source=meta`
- User chega via email → simulador → cross-device login → identify() liga ao lead existente via email

## Backend

Tudo o que `track()` envia vai parar a:
- `growth.leads` (1 lead por email único)
- `growth.interacoes` (1 row por evento)
- `iam.activity_logs` (audit)

Análise: dashboard `/growth/funnel`, `/growth/leads`, `/growth/oportunidades`.
