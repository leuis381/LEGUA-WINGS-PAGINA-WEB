# Legua Wings — web de pedidos + panel de cocina/administración

Web estática lista para GitHub + Vercel con HTML/CSS/JavaScript y Supabase como backend en tiempo real. Incluye carta, carrito, opciones, registro persistente de pedidos, login de personal y tablero compartido para cocina/administración.

## IMPORTANTE: para que cocina reciba pedidos en otros dispositivos
El sitio requiere configurar un proyecto Supabase. No existe forma honesta de garantizar sincronización entre dispositivos sin una base de datos/backend configurado. Los archivos vienen preparados; sigue estos pasos antes de publicar.

### 1) Crear backend
1. Crea un proyecto en https://supabase.com/.
2. En **SQL Editor**, ejecuta todo el archivo `supabase-schema.sql`.
3. En **Project Settings → API**, copia Project URL y la publishable/anon key.
4. Pega ambas en `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Usa solo la clave pública publishable/anon. NUNCA incluyas `service_role` ni secretos en el navegador.
5. En **Authentication → Users**, crea cuentas con correo y contraseña para las personas autorizadas. No publiques credenciales compartidas en el código.
6. En Authentication settings, desactiva el registro público de usuarios si no necesitas que cualquiera cree cuentas.
7. Confirma que `orders` aparece en la publicación `supabase_realtime`. El SQL intenta agregarla automáticamente; si no lo hace, ve a Database → Publications y activa `orders` en `supabase_realtime`.

### 2) Publicar en GitHub + Vercel
1. Sube el contenido de esta carpeta a la raíz del repositorio. Deben quedar `index.html`, `staff.html`, `app.js`, `staff.js`, `config.js`, `styles.css`, `staff.css`, `supabase-schema.sql` y `assets/` en la raíz.
2. Importa ese repositorio en Vercel. Framework Preset: **Other**; Build Command vacío; Output Directory `.`.
3. Publica y prueba en la URL HTTPS de Vercel desde dos dispositivos distintos.

### 3) Uso del negocio
- Cliente: entra a `/`, elige productos y opciones, completa sus datos y envía. El pedido se inserta en `orders` antes de abrir WhatsApp.
- Cocina: entra a `/staff.html`, inicia sesión y filtra por vista Cocina. Verá nuevos pedidos por suscripción Realtime y podrá cambiar estado a preparando/listo.
- Administrador: en el mismo panel elige “Administrador · todos”; ve pedidos, busca, filtra y actualiza estados.
- El tablero refresca también manualmente. Si Realtime se desconecta, pulsa Actualizar.

## Seguridad y límites
- RLS permite al público insertar pedidos, pero no leer ni modificar pedidos. Solo usuarios autenticados pueden leer/actualizar el tablero.
- Para un local real, crea solo cuentas de personal autorizado y usa contraseñas individuales. Este esquema da a todo usuario autenticado permisos de staff; por eso NO habilites el registro público. Si necesitas separar privilegios estrictos entre admin y cocina, se debe añadir una tabla de roles y políticas específicas.
- Un pedido se registra en base de datos; WhatsApp es un canal adicional para que el cliente confirme. Si falla el guardado, el sitio avisa y pregunta antes de abrir WhatsApp; no finge que cocina recibió el pedido.
- Verifica precios, cobertura, promociones y reglas antes de vender. La promo 2×1 configurada en el frontend se calcula por pares de la misma salchi elegible los sábados; es una estimación del cliente, no un motor antifraude del servidor.
- El total y los artículos recibidos desde el navegador deben tratarse como datos enviados por cliente; antes de operar comercialmente, añade validación de precios en backend/función segura para evitar manipulación deliberada.

## Pruebas recomendadas antes de abrir
1. Enviar un pedido de prueba desde móvil con Supabase configurado.
2. Confirmar que aparece en `/staff.html` en otro dispositivo y en estado “Recibido”.
3. Cambiarlo a “En preparación” y comprobar que el estado se guarda al recargar.
4. Probar delivery con dirección y recojo sin dirección.
5. Probar desconexión/clave incorrecta: el cliente debe recibir aviso y no afirmar que el pedido llegó a cocina.
6. Eliminar pedidos de prueba desde SQL Editor si procede; no se ofrece borrado desde el panel.

## Archivos
- `index.html`, `styles.css`, `app.js`: tienda, carta y carrito.
- `staff.html`, `staff.css`, `staff.js`: panel autenticado de cocina/administración.
- `config.js`: URL y clave pública de Supabase.
- `supabase-schema.sql`: tabla, políticas de seguridad e índices.
- `assets/`: imágenes de marca y cartas.
