/* Configuración pública de Supabase.
   La URL corresponde al proyecto Legua Wings. Sustituye la clave por la publishable/anon
   de Project Settings → API Keys. NUNCA pongas service_role ni claves secretas aquí. */
window.LEGUA_CONFIG = {
  SUPABASE_URL: "https://wyjiyyloyiuhxzebmvxf.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_RkrCbAYie8JgmgVwRZdGeQ_vePlKtDk",
  WHATSAPP_NUMBER: "51923883240"
};
window.leguaBackendReady = () => Boolean(
  window.LEGUA_CONFIG &&
  /^https:\/\/.+\.supabase\.co$/.test(window.LEGUA_CONFIG.SUPABASE_URL) &&
  window.LEGUA_CONFIG.SUPABASE_ANON_KEY &&
  !window.LEGUA_CONFIG.SUPABASE_ANON_KEY.includes("PEGA_AQUI") &&
  !window.LEGUA_CONFIG.SUPABASE_URL.includes("TU-PROYECTO")
);
