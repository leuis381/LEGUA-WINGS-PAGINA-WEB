/* Configuración pública de Supabase. Reemplaza ambos valores por los de tu proyecto.
   La anon/publishable key es pública por diseño; la seguridad está en RLS. Nunca pongas service_role aquí. */
window.LEGUA_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "PEGA_AQUI_TU_PUBLISHABLE_O_ANON_KEY",
  WHATSAPP_NUMBER: "51923883240"
};
window.leguaBackendReady = () => Boolean(window.LEGUA_CONFIG && /^https:\/\/.+\.supabase\.co$/.test(window.LEGUA_CONFIG.SUPABASE_URL) && window.LEGUA_CONFIG.SUPABASE_ANON_KEY && !window.LEGUA_CONFIG.SUPABASE_ANON_KEY.includes("PEGA_AQUI") && !window.LEGUA_CONFIG.SUPABASE_URL.includes("TU-PROYECTO"));
