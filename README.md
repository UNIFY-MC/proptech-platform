# PropTech Platform — Deploy Guide

## Estrutura do repositório

```
proptech-platform/
├── index.html          → Owners Club Portal (clientes)
├── admin/
│   └── index.html      → Staff Dashboard (equipa interna)
├── netlify.toml        → Configuração de deploy
└── README.md
```

## 1. Criar repositório no GitHub

1. Vai a [github.com/new](https://github.com/new)
2. Nome: `proptech-platform` (ou o que quiseres)
3. Visibilidade: **Private** (recomendado)
4. Clica **Create repository**

## 2. Fazer upload dos ficheiros

**Opção A — Interface web do GitHub (mais simples):**
1. No repositório, clica **Add file → Upload files**
2. Arrasta todos os ficheiros: `index.html`, `admin/index.html`, `netlify.toml`
3. Clica **Commit changes**

**Opção B — Terminal:**
```bash
git clone https://github.com/[teu-username]/proptech-platform.git
cd proptech-platform

# Copiar ficheiros para a pasta
# index.html, admin/index.html, netlify.toml

git add .
git commit -m "Initial deploy: Owners Club + Staff Dashboard"
git push origin main
```

## 3. Ligar ao Netlify

1. Vai a [app.netlify.com](https://app.netlify.com)
2. Clica **Add new site → Import an existing project**
3. Escolhe **GitHub**
4. Autoriza o Netlify a aceder ao GitHub
5. Selecciona o repositório `proptech-platform`
6. Configuração de build:
   - **Base directory:** (deixar vazio)
   - **Build command:** (deixar vazio)
   - **Publish directory:** `.` (ponto)
7. Clica **Deploy site**

## 4. Configurar domínio e Auth no Supabase

Após o deploy, o teu site fica em algo como `https://proptech-abc123.netlify.app`.

**No Supabase Dashboard → Authentication → URL Configuration:**
- **Site URL:** `https://proptech-abc123.netlify.app`
- **Redirect URLs:** `https://proptech-abc123.netlify.app/*`

## 5. Deploy automático

A partir daqui, cada vez que fizeres `git push` ou actualizares um ficheiro no GitHub, o Netlify faz deploy automaticamente em ~30 segundos.

---

## Adicionar nova vertical (ex: Seguros)

1. Cria o ficheiro `seguros/index.html`
2. Adiciona ao `netlify.toml`:
```toml
[[redirects]]
  from   = "/seguros"
  to     = "/seguros/index.html"
  status = 200
```
3. Faz commit e push — deploy automático!

---

## Supabase Projects

| Projecto | ID | URL |
|---|---|---|
| PropTech V1 Core Hub | `hkmvszkpxjbxmnixzqbl` | hkmvszkpxjbxmnixzqbl.supabase.co |
| PropTech V2 Condo Hub | `eozklslwfaqujaijvdnl` | eozklslwfaqujaijvdnl.supabase.co |

## Core API Base URL

```
https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/core-api
```
