# Legua Wings — pedidos web + panel en tiempo real

Sitio estático HTML/CSS/JavaScript preparado para Vercel, con Supabase como base de datos, autenticación del personal y sincronización Realtime.

## 1. Configurar Supabase
1. En Supabase SQL Editor se ejecutó el esquema de pedidos y se habilitó `public.orders` en `supabase_realtime`.
2. `public.staff_roles` relaciona los usuarios de Authentication con su rol (`admin` o `kitchen`). La cuenta del administrador y la de cocina deben existir en **Authentication → Users** y tener una fila correspondiente en `staff_roles`.
3. En `config.js`, el Project URL ya está definido. Pega únicamente la **publishable key** o la clave pública **anon** del proyecto en `SUPABASE_ANON_KEY`. No añadas claves `service_role`, secret API keys ni contraseñas al repositorio.
4. En Authentication, desactiva el registro público de usuarios si no lo necesitas. Crea cuentas individuales para el personal.
5. La función `public.has_staff_role(text)` y las políticas de lectura/actualización deben estar creadas en Supabase. Las consultas anónimas no deben leer ni modificar pedidos.

## 2. Desplegar en Vercel
- Sube el contenido a la raíz del repositorio.
- Importa `leuis381/LEGUA-WINGS-PAGINA-WEB` en Vercel.
- Framework Preset: **Other**; Build Command vacío; Output Directory `.`.
- Cada commit nuevo a `main` generará un nuevo despliegue si Vercel está conectado al repositorio.

## 3. Uso
- Cliente: arma el pedido y lo envía. El pedido se guarda en `orders` antes de abrir WhatsApp. Si el guardado falla, se muestra un aviso y no se afirma que llegó a cocina.
- Cocina: entra a `/staff.html`; el panel valida que su cuenta tenga rol `kitchen`, muestra solo pedidos activos y permite cambiar estados de preparación.
- Administrador: entra a `/staff.html`; el panel valida el rol `admin`, muestra todos los pedidos y puede cambiar el estado.
- Realtime actualiza el panel cuando cambian los pedidos; el botón Actualizar permite recargar manualmente.

## 4. Verificación antes de operar
1. Pega la publishable/anon key correcta en `config.js`.
2. Inicia sesión en `/staff.html` con ambas cuentas para verificar que cada una muestre su vista.
3. Envía un pedido de prueba desde un teléfono y confirma que aparece en otro dispositivo en el panel.
4. Cambia el estado, recarga la página y comprueba que persiste.
5. Revisa con especial cuidado precios y promociones. La interfaz calcula el precio en cliente; para ventas reales conviene validar importes y promociones en un backend seguro.
