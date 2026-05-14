-- Sprint P: useful tools additions — Unipile + Playwright shortlisted + 6 novos

UPDATE system.useful_tools SET status = 'shortlisted', verticals = '{*}'
WHERE slug IN ('unipile', 'playwright');

INSERT INTO system.useful_tools (slug, name, description, category, url, domain, brand_color, verticals, status, source, display_order) VALUES
('browserbase', 'Browserbase', 'Cloud browsers para Playwright em produção · proxies residenciais · CAPTCHA solving.', 'automacao-scraping', 'https://browserbase.com', 'browserbase.com', '#0A0A0A', '{*}', 'discover', 'Jarvis recommendation', 73),
('calcom', 'Cal.com', 'Calendly open-source · self-hosted · URL própria por agent · webhook on booking.', 'produtividade-mcp', 'https://cal.com', 'cal.com', '#292929', '{*}', 'discover', 'Jarvis recommendation', 74),
('openphone', 'OpenPhone', 'Número virtual PT (+351) · transcrição automática · integra Vapi para AI atendimento.', 'comunicacao', 'https://openphone.com', 'openphone.com', '#5B5BD6', '{v2,v5,v10}', 'discover', 'Jarvis recommendation', 75),
('triggerdev', 'Trigger.dev', 'Background jobs serverless · long-running >150s · retries built-in · scheduled jobs visuais.', 'backend-deploy', 'https://trigger.dev', 'trigger.dev', '#A8FF53', '{*}', 'discover', 'Jarvis recommendation', 76),
('cloudflare-r2', 'Cloudflare R2', 'S3-compatible storage · 10× mais barato que Supabase Storage · zero egress fees.', 'backend-deploy', 'https://cloudflare.com/products/r2/', 'cloudflare.com', '#F38020', '{*}', 'discover', 'Jarvis recommendation', 77),
('replicate', 'Replicate', 'Hosted AI models · Whisper, FLUX, Llama 3 · pay-per-use sem hospedar.', 'ia-modelos', 'https://replicate.com', 'replicate.com', '#000000', '{*}', 'discover', 'Jarvis recommendation', 78)
ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status, description = EXCLUDED.description;
