const WHATSAPP_NUMBER = window.LEGUA_CONFIG?.WHATSAPP_NUMBER || "51923883240";
const supabaseClient = (window.leguaBackendReady?.() && window.supabase?.createClient) ? window.supabase.createClient(window.LEGUA_CONFIG.SUPABASE_URL, window.LEGUA_CONFIG.SUPABASE_ANON_KEY) : null;
const creams = ["Mayonesa vinagreta","Ají de la casa","Chimichurri","Mostaza","Ketchup"];
const sauces = ["BBQ","BBQ picante","Brava","Acevichada","Broaster extra crocante","Lemon pepper"];
const products = {
  combos: [
    {id:"combo1",category:"Combo 1",name:"6 alitas",description:"6 alitas + 1 papa regular + 1 crema. Elige el sabor de tus alitas.",price:18.90,type:"wings",potatoes:1,creamCount:1},
    {id:"combo2",category:"Combo 2",name:"12 alitas",description:"12 alitas + 2 papas regulares + 2 cremas. Elige los sabores.",price:27.90,type:"wings",potatoes:2,creamCount:2},
    {id:"combo3",category:"Combo 3",name:"18 alitas",description:"18 alitas + 3 papas regulares + 3 cremas. Elige los sabores.",price:36.90,type:"wings",potatoes:3,creamCount:3}
  ],
  salchis: [
    {id:"salchikids",category:"Salchis & bites",name:"Salchikids",description:"2 alitas, salchipapa pequeña y 2 cremas a elección.",price:5.90,type:"salchi",creamCount:2},
    {id:"salchipapa",category:"Salchis & bites",name:"Salchipapa",description:"Papas crocantes y salchicha doradita, con 2 cremas a elección.",price:11.90,type:"salchi",creamCount:2},
    {id:"salchiwings",category:"Salchis & bites",name:"Salchiwings",description:"Salchipapa regular, 4 alitas y 2 cremas a elección.",price:16.90,type:"salchi",creamCount:2},
    {id:"bites",category:"Salchis & bites",name:"Bites",description:"Trozos de pechuga de pollo crocantes, acompañados de papas y 2 cremas a elección.",price:8.90,type:"salchi",creamCount:2}
  ]
};
const extras = [{id:"salchicha",name:"Salchicha",price:2},{id:"huevo",name:"Huevo",price:2},{id:"queso",name:"Queso",price:2},{id:"chorizo",name:"Chorizo",price:3}];
let activeCategory = "combos";
let cart = [];
const $ = (sel) => document.querySelector(sel);
const money = n => `S/${n.toFixed(2)}`;
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function optionsHtml(items, label, count, id) {
  let html = `<label class="field">${label}<select data-opt="${id}" aria-label="${label}">`;
  if(count > 1) html += `<option value="">Elige ${count} cremas</option>`;
  else html += `<option value="">Elige una crema</option>`;
  items.forEach(x => html += `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`);
  return html + `</select></label>`;
}
function renderProducts(){
  const grid = $("#productGrid");
  grid.innerHTML = products[activeCategory].map(p => {
    let opts = "";
    if(p.type === "wings"){
      opts += optionsHtml(sauces,"Sabor de alitas",1,`${p.id}-sauce`);
      opts += `<label class="field">Mejora de 1 papa<select data-opt="${p.id}-potato"><option value="Regular">Papas regulares (incluidas)</option><option value="Grande">Una papa grande (+S/3)</option></select></label>`;
      opts += optionsHtml(creams,"Crema 1",1,`${p.id}-cream1`);
      if(p.creamCount > 1) opts += optionsHtml(creams,"Crema 2",1,`${p.id}-cream2`);
      if(p.creamCount > 2) opts += optionsHtml(creams,"Crema 3",1,`${p.id}-cream3`);
    } else {
      opts += optionsHtml(creams,"Crema 1",1,`${p.id}-cream1`);
      opts += optionsHtml(creams,"Crema 2",1,`${p.id}-cream2`);
      opts += `<label class="field">Extras<select data-opt="${p.id}-extras"><option value="">Sin extras</option>${extras.map(e=>`<option value="${e.id}">${e.name} (+${money(e.price)})</option>`).join("")}</select></label>`;
    }
    return `<article class="product-card" data-product="${p.id}">
      <div class="product-top"><div><span class="product-category">${p.category}</span><h3>${p.name}</h3></div><span class="price">${money(p.price)}</span></div>
      <p class="product-desc">${p.description}</p>
      <div class="product-options">${opts}</div>
      <div class="product-footer"><div class="qty-control"><button type="button" data-qty="-1" aria-label="Quitar una unidad">−</button><span data-qty-value>1</span><button type="button" data-qty="1" aria-label="Agregar una unidad">+</button></div><button class="add-button" type="button" data-add="${p.id}">Agregar al pedido +</button></div>
    </article>`;
  }).join("");
}
function showToast(message){
  const toast=$("#toast"); toast.textContent=message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove("show"),2200);
}
function readConfig(card,p){
  const get = key => card.querySelector(`[data-opt="${p.id}-${key}"]`)?.value || "";
  const config={};
  if(p.type==="wings"){
    config.sauce=get("sauce"); config.potato=get("potato"); config.creams=[get("cream1")];
    if(p.creamCount>1) config.creams.push(get("cream2"));
    if(p.creamCount>2) config.creams.push(get("cream3"));
    config.extraPrice=config.potato==="Grande"?3:0;
    if(!config.sauce || config.creams.some(x=>!x)) return {error:"Elige el sabor de alitas y todas las cremas."};
  } else {
    config.creams=[get("cream1"),get("cream2")]; config.extraId=get("extras");
    if(config.creams.some(x=>!x)) return {error:"Elige las dos cremas de tu producto."};
    const extra=extras.find(x=>x.id===config.extraId);
    config.extra=extra||null; config.extraPrice=extra?extra.price:0;
  }
  return {config};
}
function addProduct(id,card){
  const p=Object.values(products).flat().find(x=>x.id===id);
  if(!p)return;
  const result=readConfig(card,p);
  if(result.error){showToast(result.error);return;}
  const qty=Number(card.querySelector("[data-qty-value]").textContent)||1;
  const unit=p.price+result.config.extraPrice;
  cart.push({key:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),id:p.id,name:p.name,qty,unit,config:result.config});
  updateCart(); showToast(`${p.name} agregado al pedido`);
}
function isPromoSaturday(){return new Date().getDay()===6}
function itemDiscount(item){
  if(!isPromoSaturday() || !["salchikids","salchipapa","salchiwings"].includes(item.id)) return 0;
  // La promo 2x1 se calcula por unidades del mismo producto; se descuenta la unidad de menor precio.
  return Math.floor(item.qty/2)*item.unit;
}
function cartDiscount(){
  if(!isPromoSaturday()) return 0;
  const eligible = new Set(["salchikids","salchipapa","salchiwings"]);
  const unitPricesByProduct = new Map();
  for(const item of cart){
    if(!eligible.has(item.id)) continue;
    if(!unitPricesByProduct.has(item.id)) unitPricesByProduct.set(item.id,[]);
    const prices = unitPricesByProduct.get(item.id);
    for(let i=0;i<item.qty;i++) prices.push(item.unit);
  }
  let discount = 0;
  for(const prices of unitPricesByProduct.values()){
    prices.sort((a,b)=>a-b);
    discount += prices.slice(0,Math.floor(prices.length/2)).reduce((sum,price)=>sum+price,0);
  }
  return Number(discount.toFixed(2));
}
function cartTotal(){return Math.max(0,cart.reduce((sum,item)=>sum+item.qty*item.unit,0)-cartDiscount())}
function configText(item){
 const c=item.config, bits=[];
 if(c.sauce)bits.push(`Sabor: ${c.sauce}`);
 if(c.potato)bits.push(c.potato==="Grande"?"Mejora: 1 papa grande (+S/3)":"Papas regulares");
 if(c.creams?.length)bits.push(`Cremas: ${c.creams.join(", ")}`);
 if(c.extra)bits.push(`Extra: ${c.extra.name} (+${money(c.extra.price)})`);
 return bits.join(" · ");
}
function updateCart(){
 $("#cartCount").textContent=cart.reduce((n,i)=>n+i.qty,0);
 $("#cartTotal").textContent=money(cartTotal());
 const area=$("#cartItems");
 if(!cart.length){area.innerHTML=`<div class="empty-cart"><span>✳</span><h3>Tu carrito está esperando</h3><p>Agrega algo rico de la carta.</p></div>`;return}
 area.innerHTML=cart.map(item=>`<article class="cart-item"><div class="cart-item-top"><div><h4>${escapeHtml(item.name)}</h4><p class="item-sub">${escapeHtml(configText(item))}</p><div class="cart-item-actions"><button data-cart-qty="-1" data-key="${item.key}" aria-label="Quitar unidad">−</button><b>${item.qty}</b><button data-cart-qty="1" data-key="${item.key}" aria-label="Sumar unidad">+</button><button class="remove" data-remove="${item.key}">Eliminar</button></div></div><span class="cart-item-price">${money(item.qty*item.unit)}</span></div></article>`).join("");
}
function openCart(){ $("#cartDrawer").classList.add("open");$("#cartBackdrop").classList.add("show");$("#cartDrawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("#closeCart").focus() }
function closeCart(){ $("#cartDrawer").classList.remove("open");$("#cartBackdrop").classList.remove("show");$("#cartDrawer").setAttribute("aria-hidden","true");document.body.style.overflow="" }
function sendWhatsApp(message){window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer")}
async function checkout(){
 const error=$("#formError");error.textContent="";
 if(!cart.length){error.textContent="Agrega al menos un producto antes de enviar el pedido.";return}
 const name=$("#customerName").value.trim();
 const type=$("#orderType").value;
 const address=$("#customerAddress").value.trim();
 const phone=$("#customerPhone").value.trim();
 if(!name){error.textContent="Escribe tu nombre para que podamos identificar el pedido.";$("#customerName").focus();return}
 if(type==="Delivery"&&!address){error.textContent="Escribe tu dirección o una referencia para el delivery.";$("#customerAddress").focus();return}
 const lines=cart.map(i=>`• ${i.qty} × ${i.name} — ${money(i.qty*i.unit)}\n  ${configText(i)}`).join("\n");
 const notes=$("#orderNotes").value.trim();
 const waWindow = window.open("about:blank", "_blank");
 const orderNumber = `LW-${new Date().toISOString().slice(2,10).replaceAll("-","")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
 const orderPayload = {
   order_number: orderNumber, customer_name: name, customer_phone: phone || null,
   order_type: type, delivery_address: type === "Delivery" ? address : null,
   notes: notes || null, items: cart.map(i=>({id:i.id,name:i.name,quantity:i.qty,unit_price:i.unit,subtotal:i.qty*i.unit,options:i.config})),
   subtotal: cart.reduce((sum,i)=>sum+i.qty*i.unit,0), discount: cartDiscount(), total: cartTotal(), status: "received"
 };
 let saved = false;
 if(supabaseClient){
   try {
     const { error } = await supabaseClient.from("orders").insert(orderPayload);
     if(error) throw error;
     saved = true;
   } catch(err) {
     console.error("No se pudo guardar el pedido en la base de datos:", err);
     error.textContent = "No se pudo registrar el pedido en cocina. Puedes continuar por WhatsApp, pero el local no lo verá en el panel hasta corregir la conexión. Reintenta o escríbenos.";
     const proceed = window.confirm("No se pudo guardar el pedido en el sistema de cocina. ¿Quieres abrir WhatsApp de todas formas? El pedido NO aparecerá en el panel de cocina.");
     if(!proceed) { if(waWindow) waWindow.close(); return; }
   }
 } else {
   const proceed = window.confirm("La base de datos aún no está configurada. El pedido NO llegará al panel de cocina. ¿Quieres abrir WhatsApp de todas formas?");
   if(!proceed) { if(waWindow) waWindow.close(); return; }
 }
 const message=`¡Hola, Legua Wings! Quiero hacer este pedido.\nCódigo: ${orderNumber}${saved?" (registrado en el sistema)":" (pendiente de registro en sistema)"}\n\n${lines}\n\nTotal estimado: ${money(cartTotal())}\nNombre: ${name}${phone?`\nCelular: ${phone}`:""}\nEntrega: ${type}${type==="Delivery"?`\nDirección: ${address}`:""}${notes?`\nIndicaciones: ${notes}`:""}\n\nPor favor, confirmen disponibilidad, precio final y tiempo estimado.`;
 if(waWindow) waWindow.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
 else { error.textContent = "El navegador bloqueó la ventana de WhatsApp. Permite ventanas emergentes y vuelve a enviar el pedido."; }
 if(saved){cart=[];updateCart();closeCart();showToast(`Pedido ${orderNumber} registrado. Confírmalo por WhatsApp.`);}

}
document.addEventListener("click",e=>{
 const tab=e.target.closest("[data-category]");
 if(tab){activeCategory=tab.dataset.category;document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));renderProducts();return}
 const qty=e.target.closest("[data-qty]");
 if(qty){const card=qty.closest(".product-card"),value=card.querySelector("[data-qty-value]");value.textContent=Math.max(1,Math.min(20,Number(value.textContent)+Number(qty.dataset.qty)));return}
 const add=e.target.closest("[data-add]");
 if(add){addProduct(add.dataset.add,add.closest(".product-card"));return}
 const cartQty=e.target.closest("[data-cart-qty]");
 if(cartQty){const item=cart.find(i=>i.key===cartQty.dataset.key);if(item){item.qty+=Number(cartQty.dataset.cartQty);if(item.qty<1)cart=cart.filter(i=>i.key!==item.key);updateCart()}return}
 const remove=e.target.closest("[data-remove]");
 if(remove){cart=cart.filter(i=>i.key!==remove.dataset.remove);updateCart()}
});
$("#openCart").addEventListener("click",openCart);
$("#closeCart").addEventListener("click",closeCart);
$("#cartBackdrop").addEventListener("click",closeCart);
$("#checkout").addEventListener("click",checkout);
$("#contactWhatsApp").addEventListener("click",()=>sendWhatsApp("¡Hola, Legua Wings! Quisiera consultar la carta, disponibilidad y delivery."));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart()});
$("#orderType").addEventListener("change",e=>{$("#customerAddress").disabled=e.target.value!=="Delivery";if(e.target.value!=="Delivery")$("#customerAddress").value=""});
$("#year").textContent=new Date().getFullYear();
renderProducts();updateCart();
const backendNotice = document.querySelector("#backendNotice");
if(backendNotice) backendNotice.textContent = supabaseClient ? "Sistema conectado: el pedido se registra antes de abrir WhatsApp." : "Pendiente de configuración: falta conectar Supabase para que cocina reciba pedidos en tiempo real.";
