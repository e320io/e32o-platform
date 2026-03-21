# e.32o Platform v2

## Estructura
```
src/
  app/
    page.js          → Login (redirige según rol)
    dashboard/       → Founder: KPIs, métricas, Pepe PM
    pipeline/        → Founder: Kanban por cliente
    portal/          → Cliente: revisión ideas, calendario, ads
    team/            → Equipo: solo sus tareas activas
    campaigns/       → Campaign Builder Meta Ads
    settings/        → Config planes, equipo, pools
    api/             → Server routes (AI, Meta)
  lib/
    supabase.js      → Cliente Supabase
    auth.js          → Login, sesión
    tokens.js        → Colores, flujos, constantes
  components/        → Componentes compartidos
```

## Deploy
1. Push a GitHub
2. Vercel → Import → Environment Variables
3. Deploy automático
