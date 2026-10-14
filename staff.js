const $ = s => document.querySelector(s);
let db = null, allOrders = [], channel = null, staffRole = null;
const labels = {received:"Recibido", accepted:"Aceptado", preparing:"En preparación", ready:"Listo", delivered:"Entregado", cancelled:"Cancelado"};
const cash = n => `S/${Number(n || 0).toFixed(2)}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function setLoginMessage(message) {
  $("#loginError").textContent = message || "";
  $("#loginPanel").classList.remove("hidden");
  $("#dashboard").classList.add("hidden");
  $("#logoutBtn").classList.add("hidden");
}

async function init() {
  if (!window.leguaBackendReady?.() || !window.supabase?.createClient) {
    $("#setupWarning").classList.remove("hidden");
    $("#loginPanel").classList.add("hidden");
    return;
  }
  db = window.supabase.createClient(window.LEGUA_CONFIG.SUPABASE_URL, window.LEGUA_CONFIG.SUPABASE_ANON_KEY);
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (data.session) await showDashboard();
  } catch (error) {
    console.error("No se pudo comprobar la sesión:", error);
    setLoginMessage("No se pudo verificar la sesión. Recarga la página e inténtalo de nuevo.");
  }
}

async function login(e) {
  e.preventDefault();
  $("#loginError").textContent = "";
  if (!db) {
    setLoginMessage("Supabase no está configurado. Revisa config.js.");
    return;
  }
  const { error } = await db.auth.signInWithPassword({
    email: $("#staffEmail").value.trim(),
    password: $("#staffPassword").value
  });
  if (error) {
    setLoginMessage("No se pudo iniciar sesión. Revisa el correo y contraseña.");
    return;
  }
  await showDashboard();
}

async function showDashboard() {
  if (!db) return;
  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData?.user) {
    setLoginMessage("Tu sesión no está disponible. Vuelve a iniciar sesión.");
    return;
  }

  // El rol se consulta a Supabase: el selector de la interfaz no concede permisos.
  const { data: roleRow, error: roleError } = await db
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError) {
    console.error("No se pudo consultar el rol:", roleError);
    setLoginMessage("No se pudo comprobar tu rol. Verifica que staff_roles y su política estén configuradas en Supabase.");
    return;
  }
  if (!roleRow || !["admin", "kitchen"].includes(roleRow.role)) {
    setLoginMessage("Esta cuenta no tiene un rol autorizado para el panel. Pide al administrador que la registre como admin o kitchen.");
    return;
  }

  staffRole = roleRow.role;
  const roleLabel = $("#roleView").closest("label");
  const adminOption = $("#roleView").querySelector('option[value="all"]');
  if (adminOption) adminOption.hidden = staffRole !== "admin";
  $("#roleView").disabled = staffRole !== "admin";
  if (roleLabel) roleLabel.classList.toggle("hidden", staffRole === "kitchen");
  $("#roleView").value = staffRole === "admin" ? "all" : "kitchen";

  $("#loginPanel").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  await loadOrders();

  if (channel) await db.removeChannel(channel);
  channel = db.channel("legua-orders-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
    .subscribe(status => {
      $("#connectionState").textContent = status === "SUBSCRIBED"
        ? "Conectado · sincronización en tiempo real"
        : "Conexión: " + status;
    });
}

async function loadOrders() {
  if (!db || !staffRole) return;
  $("#connectionState").textContent = "Actualizando pedidos…";
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(250);
  if (error) {
    console.error("Error cargando pedidos:", error);
    $("#connectionState").textContent = "Error cargando pedidos: " + error.message;
    return;
  }
  allOrders = data || [];
  render();
}

function render() {
  const today = new Date().toLocaleDateString("en-CA");
  $("#countReceived").textContent = allOrders.filter(o => o.status === "received").length;
  $("#countPreparing").textContent = allOrders.filter(o => o.status === "preparing" || o.status === "accepted").length;
  $("#countReady").textContent = allOrders.filter(o => o.status === "ready").length;
  $("#countToday").textContent = allOrders.filter(o => new Date(o.created_at).toLocaleDateString("en-CA") === today).length;
  const view = staffRole === "admin" ? $("#roleView").value : "kitchen";
  const filter = $("#statusFilter").value;
  const q = $("#searchOrders").value.trim().toLowerCase();
  const rows = allOrders.filter(o => {
    if (filter === "active" && ["delivered", "cancelled"].includes(o.status)) return false;
    if (filter !== "all" && filter !== "active" && o.status !== filter) return false;
    if (view === "kitchen" && ["delivered", "cancelled"].includes(o.status)) return false;
    return !q || [o.order_number, o.customer_name, o.customer_phone].some(v => String(v || "").toLowerCase().includes(q));
  });
  $("#ordersList").innerHTML = rows.length ? rows.map(card).join("") : '<p class="empty-orders">No hay pedidos para estos filtros.</p>';
}

function card(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const date = new Date(o.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  const opts = items.map(i => `<div class="order-line"><strong>${Number(i.quantity) || 1} × ${esc(i.name)} — ${cash(i.subtotal)}</strong><small>${esc(optionText(i.options))}</small></div>`).join("");
  const terminalKitchen = staffRole === "kitchen" ? "" : "";
  const allowedStatuses = staffRole === "kitchen"
    ? Object.entries(labels).filter(([value]) => !["delivered", "cancelled"].includes(value))
    : Object.entries(labels);
  return `<article class="order-card status-${esc(o.status)}">
    <div class="order-card-head"><div><h2>${esc(o.order_number)}</h2><div class="order-meta">${esc(date)} · ${esc(o.order_type)}</div></div><span class="status-pill">${esc(labels[o.status] || o.status)}</span></div>
    <div class="order-lines">${opts}</div>
    <div class="order-customer"><b>${esc(o.customer_name)}</b>${o.customer_phone ? ` · ${esc(o.customer_phone)}` : ""}<br>${o.delivery_address ? `Dirección: ${esc(o.delivery_address)}<br>` : ""}${o.notes ? `Indicaciones: ${esc(o.notes)}` : ""}</div>
    <div class="order-total"><span>Total</span><span>${cash(o.total)}</span></div>
    <div class="order-actions">
      <select data-status-for="${esc(o.id)}" aria-label="Cambiar estado de ${esc(o.order_number)}">${allowedStatuses.map(([v, l]) => `<option value="${v}" ${v === o.status ? "selected" : ""}>${l}</option>`).join("")}</select>
      <button data-update="${esc(o.id)}">Guardar estado</button>
      ${o.customer_phone ? `<button data-whatsapp="${esc(o.customer_phone)}" data-code="${esc(o.order_number)}">WhatsApp</button>` : ""}
    </div>
  </article>`;
}

function optionText(o) {
  if (!o) return "";
  const a = [];
  if (o.sauce) a.push("Sabor: " + o.sauce);
  if (o.potato) a.push("Papa: " + o.potato);
  if (o.creams?.length) a.push("Cremas: " + o.creams.join(", "));
  if (o.extra?.name) a.push("Extra: " + o.extra.name);
  return a.join(" · ");
}

async function updateStatus(id) {
  const select = document.querySelector(`[data-status-for="${CSS.escape(id)}"]`);
  if (!select) return;
  const status = select.value;
  const { error } = await db.from("orders").update({ status }).eq("id", id);
  if (error) {
    alert("No se pudo actualizar el estado: " + error.message);
    return;
  }
  await loadOrders();
}

document.addEventListener("submit", e => {
  if (e.target.id === "loginForm") login(e);
});

document.addEventListener("click", e => {
  const b = e.target.closest("[data-update]");
  if (b) updateStatus(b.dataset.update);
  const w = e.target.closest("[data-whatsapp]");
  if (w) window.open(`https://wa.me/${String(w.dataset.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent("Hola, te escribimos de Legua Wings por tu pedido " + w.dataset.code + ".")}`, "_blank", "noopener,noreferrer");
});

["#roleView", "#statusFilter"].forEach(s => $(s).addEventListener("change", render));
$("#searchOrders").addEventListener("input", render);
$("#refreshBtn").addEventListener("click", loadOrders);
$("#logoutBtn").addEventListener("click", async () => {
  if (channel) await db.removeChannel(channel);
  await db.auth.signOut();
  channel = null;
  staffRole = null;
  allOrders = [];
  $("#dashboard").classList.add("hidden");
  $("#logoutBtn").classList.add("hidden");
  $("#loginPanel").classList.remove("hidden");
  $("#loginError").textContent = "";
});
init();
