# OrdenaLink Backend: análisis del estado actual

> Fecha del análisis: 2026-09-22 · Rama: `docker` · Stack: NestJS 12 + MongoDB (Mongoose 9) + JWT + Google Sign-In

## 1. ¿Qué es el proyecto?

API REST (prefijo `/api`) para que un negocio de comida (cafetería, restaurante, etc.) publique su **menú digital** y reciba **pedidos** de sus clientes. Es multi-negocio: cada negocio tiene un `slug` público (p. ej. `/api/businesses/cafe-luna`), su propio catálogo, sus pedidos y sus trabajadores.

Hay **dos tipos de cuenta**, separados por completo:

| Tipo | Colección | Cómo entra | Para qué |
|---|---|---|---|
| **Cliente (comensal)** | `users` | Google Sign-In (`POST /api/auth/customers/google`) | Hacer pedidos ligados a su cuenta (base de la futura tarjeta de fidelidad) |
| **Trabajador (staff)** | `staff_users` | Usuario + contraseña + slug del negocio (`POST /api/auth/staff/login`) | Administrar el negocio. Roles: `OWNER`, `MANAGER`, `EMPLOYEE` |

Ambos logins devuelven un JWT (válido 7 días) que se envía como `Authorization: Bearer <token>`.

## 2. Módulos existentes

| Módulo | Estado | Qué hace |
|---|---|---|
| `auth` | ✅ Funcional | Login con Google para clientes, login con credenciales para staff, guards de JWT y de roles, guard opcional para clientes (permite pedir como invitado). |
| `users` | ✅ Funcional (interno) | Crea o busca al cliente a partir del token de Google. No expone endpoints propios. |
| `business-registration` | ✅ Funcional | `POST /api/business-registration` crea **negocio + usuario OWNER** en una transacción y devuelve el token. Es el “alta” de un negocio nuevo. |
| `businesses` | ✅ Funcional | `GET /api/businesses/:slug` (público) y `PATCH /api/businesses/me` (solo OWNER): nombre, logo, WhatsApp, tema visual, configuración de pedidos y **configuración de fidelidad**. |
| `categories` | ✅ CRUD completo | Categorías del menú. Lectura pública; crear/editar/borrar (baja lógica) para OWNER y MANAGER. |
| `products` | ✅ CRUD completo | Productos con precio, precio promocional, imágenes, **variantes** (tamaño), **grupos de opciones** (extras, leche, etc.), `available`, `trackStock` y `stock`. Lectura pública (solo activos y disponibles); escritura para OWNER y MANAGER. |
| `orders` | ✅ Funcional (con diferencias vs. requerimiento) | Crear pedido (público, como invitado o cliente Google), listar pedidos del negocio, ver detalle, cambiar estado con historial y quién lo cambió. Recalcula precios en el servidor, valida stock y opciones, genera número consecutivo por negocio y un enlace de WhatsApp con el resumen. |
| `staff-users` | ⚠️ Solo servicio interno | Existe el esquema y el `create` (lo usa el registro de negocio), pero el **controller está vacío**: no hay endpoints para gestionar trabajadores. |
| `onboarding` | ⛔ Vacío | Módulo declarado sin contenido. |

### Endpoints disponibles hoy

```
POST   /api/business-registration            público: alta de negocio + owner
POST   /api/auth/staff/login                 público: { businessSlug, username, password }
POST   /api/auth/customers/google            público: { credential }  (ID token de Google)

GET    /api/businesses/:slug                 público
PATCH  /api/businesses/me                    OWNER

GET    /api/categories/business/:businessId  público
GET    /api/categories/:id                   público
POST   /api/categories                       OWNER, MANAGER
PATCH  /api/categories/:id                   OWNER, MANAGER
DELETE /api/categories/:id                   OWNER, MANAGER (baja lógica)

GET    /api/products/business/:businessId    público (activos y disponibles)
GET    /api/products/category/:categoryId    público
GET    /api/products/:id                     público
POST   /api/products                         OWNER, MANAGER
PATCH  /api/products/:id                     OWNER, MANAGER
DELETE /api/products/:id                     OWNER, MANAGER (baja lógica)

POST   /api/orders                           público (JWT de cliente opcional)
GET    /api/orders/business                  staff (todos los roles)
GET    /api/orders/:id                       staff
PATCH  /api/orders/:id/status                staff: { status }
```

## 3. Requerimientos vs. lo que existe

Leyenda: ✅ cubierto · 🟡 parcial · ❌ falta

| # | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 1 | Gestionar el menú del negocio | ✅ | Categorías y productos con variantes, extras, imágenes, orden y destacados. |
| 2 | Comensal escanea QR en la mesa y ordena desde su lugar | 🟡 | El pedido acepta `fulfillmentType: DINE_IN` + `serviceReference` (número de mesa, texto libre). **No hay** entidad de mesas, ni generación de QR, ni un endpoint que resuelva “QR → negocio + mesa”. Se puede resolver en el frontend con un QR que apunte a `https://front/<slug>?mesa=5`. |
| 3 | El negocio gestiona la orden con estados **atendiendo, procesada, pagada, cancelada** | 🟡 | Hoy los estados son `PENDING → CONFIRMED → PREPARING → READY → COMPLETED` (+ `CANCELLED`). **No coinciden** con los pedidos y **no existe el estado “pagada”**. |
| 4 | Modo “solo menú digital” (sin pedidos) | 🟡 | No hay una bandera explícita tipo `orderingEnabled`. Como parche, apagar `dineInEnabled`, `pickupEnabled` y `deliveryByAgreementEnabled` hace que se rechace cualquier pedido. Aun así, conviene un interruptor claro que el frontend pueda leer para ocultar el carrito. |
| 5a | Ver **todas las órdenes del día** | 🟡 | `GET /orders/business` devuelve **todas** las órdenes históricas, sin filtro por fecha ni estado ni paginación. Falta filtrar por día usando `orderSettings.timezone`. |
| 5b | Habilitar/deshabilitar platillos según stock | 🟡 | Se puede con `PATCH /products/:id { "available": false }` y existe `trackStock/stock`. Pero **el stock no se descuenta** al crear o completar un pedido, ni el producto se deshabilita solo al llegar a 0. Tampoco hay un endpoint rápido tipo “toggle” para EMPLOYEE. |
| 6 | Programa de recompensas activable y configurable (ej. 10 sellos = 1 gratis) | 🟡 | Solo la **configuración** existe (`loyaltySettings.enabled`, `stampsRequired`, `rewardDescription`, `minimumOrderAmountInCents`) y el campo `order.loyaltyStampAwarded`. **No hay lógica**: no se otorgan sellos, no hay tarjeta, no hay canje. |
| 7 | Tarjeta de fidelidad para clientes con cuenta Google | 🟡 | El login con Google y el vínculo pedido→cliente (`order.userId`) ya funcionan. Falta la colección de tarjetas y los endpoints del cliente (`GET /me/loyalty-cards`, `GET /me/orders`). |
| 8 | El negocio gestiona sus usuarios (crear, editar, desactivar) con credenciales | 🟡 | Esquema, roles, hash de contraseña y login listos; el campo `active` ya bloquea el login. **Faltan los endpoints** CRUD en `staff-users.controller.ts`. |

## 4. ¿En qué fase está el backend?

**Fase: MVP funcional del núcleo (≈ 55-60 % de los requerimientos).**

- La base está sólida: arquitectura modular, multi-negocio, autenticación doble, roles, validaciones (DTOs con `class-validator`), cálculo de precios del lado del servidor, transacciones y Docker listo.
- Lo que falta es sobre todo **lógica de negocio encima de lo que ya está modelado** (fidelidad, stock, estados, modo menú), además de CRUD de trabajadores y endpoints del cliente.
- **No hay pruebas reales**: el único e2e (`test/app.e2e-spec.ts`) espera `GET /` → `Hello World!`, pero `AppController` no está registrado en `AppModule`, así que esa prueba falla.

## 5. Qué falta (backlog sugerido, por prioridad)

### Prioridad alta (bloquean requerimientos)

1. **Ajustar estados del pedido** a los que pide el negocio (`src/modules/orders/enums/order-status.enum.ts` y `allowedTransitions` en `orders.service.ts`). Propuesta:
   - `PENDIENTE` (recién creada), `ATENDIENDO`, `PROCESADA`, `PAGADA`, `CANCELADA`.
   - Transiciones: `PENDIENTE → ATENDIENDO → PROCESADA → PAGADA`; cancelar desde cualquiera salvo `PAGADA`.
   - Agregar `paidAt` al esquema. Confirmar con quien pidió el requerimiento si “pendiente” existe o la orden nace ya como “atendiendo”.
2. **CRUD de trabajadores** (`staff-users.controller.ts`), solo OWNER (y quizá MANAGER para EMPLOYEE):
   - `GET /staff-users`, `POST /staff-users`, `PATCH /staff-users/:id` (nombre, rol, reset de contraseña), `PATCH /staff-users/:id/deactivate`.
   - Reglas: no desactivarse a sí mismo, no dejar el negocio sin OWNER activo, siempre filtrar por `businessId` del JWT.
3. **Modo solo menú**: agregar `orderSettings.orderingEnabled` (o `mode: 'MENU_ONLY' | 'ORDERING'`) y rechazar `POST /orders` cuando esté apagado. El frontend lo lee desde `GET /businesses/:slug`.
4. **Programa de fidelidad**:
   - Nueva colección `loyalty_cards`: `{ businessId, userId, stamps, rewardsAvailable, rewardsRedeemed, history[] }`, índice único `(businessId, userId)`.
   - Otorgar sello cuando la orden pasa a **PAGADA**, tenga `userId`, el programa esté activo y el total ≥ `minimumOrderAmountInCents`; marcar `loyaltyStampAwarded = true` para no duplicar.
   - Al llegar a `stampsRequired`: sumar recompensa y reiniciar sellos.
   - Endpoints: `GET /me/loyalty-cards` (cliente), `GET /loyalty-cards/business` y `POST /loyalty-cards/:id/redeem` (staff).
   - Definir si “un sello por **visita**” = un sello por orden pagada o máximo uno por día.
5. **Órdenes del día**: `GET /orders/business?date=YYYY-MM-DD&status=...`, calculando el rango del día con `orderSettings.timezone` (por defecto hoy). Agregar paginación.

### Prioridad media

6. **Stock**: descontar `stock` de forma atómica (`$inc` con condición `stock >= qty`) al crear la orden (o al pasar a PROCESADA) y devolverlo si se cancela. Marcar `available=false` automáticamente al llegar a 0. Endpoint rápido `PATCH /products/:id/availability` accesible también para EMPLOYEE.
7. **Mesas y QR**: colección `tables` (`businessId`, `label`, `code`) y `GET /tables/:code` que devuelva negocio + mesa; el QR se genera en el frontend o con la librería `qrcode`. Opcional: con `?mesa=` en la URL basta para el MVP.
8. **Endpoints del cliente**: `GET /me` y `GET /me/orders` (historial y estado de su pedido actual).
9. **Pedidos en tiempo real**: hoy el negocio tendría que refrescar. Agregar WebSocket (`@nestjs/websockets` + socket.io) o SSE para avisar de pedidos nuevos y cambios de estado.
10. **Respetar `allowGuestCheckout`**: el campo existe pero `orders.service.ts` no lo valida. Si está en `false`, exigir cliente Google.

### Deuda técnica / detalles encontrados

- `BusinessRegistrationController` y su service están declarados **dos veces** (en `AppModule` y en `BusinessRegistrationModule`): quitar los de `AppModule`.
- **CORS** apunta a `http://localhost:3000`, el mismo puerto de la API. El frontend correrá en otro puerto (p. ej. `5173` con Vite): mover el origen a una variable `CORS_ORIGIN` en `.env`.
- Los endpoints públicos del menú piden `businessId`; al frontend le conviene más un solo `GET /businesses/:slug/menu` que devuelva negocio + categorías + productos en una llamada.
- `onboarding` está vacío: eliminarlo o darle uso.
- `README.md` aún tiene el texto genérico de NestJS en la parte superior.
- Faltan pruebas unitarias (orders, auth) y e2e reales. Arreglar o reemplazar el e2e actual.
- No hay subida de imágenes (solo URLs). Para logos y fotos de platillos se necesitará almacenamiento (S3, Cloudinary, etc.).

## 6. Cómo probarlo tú mismo

### Requisitos

- Docker con Compose y `make` (no necesitas Node instalado).
- Un **Google Client ID** (Google Cloud Console → APIs & Services → Credentials → OAuth client ID tipo *Web*). Solo hace falta para probar el login de clientes; el resto funciona sin él.
- Un cliente HTTP: Postman, Insomnia, Bruno o `curl`.

### Levantar

```bash
make setup      # crea .env desde .env.example → edita JWT_SECRET y GOOGLE_CLIENT_ID
make build
make up         # API en http://localhost:3000/api + MongoDB local (replica set)
```

### Flujo de prueba (curl)

```bash
API=http://localhost:3000/api

# 1) Registrar negocio + owner  → guarda accessToken y el _id del negocio
curl -s -X POST $API/business-registration -H 'Content-Type: application/json' -d '{
  "business": { "name": "Café Luna", "slug": "cafe-luna", "whatsappNumber": "5216641234567",
                "loyaltySettings": { "enabled": true, "stampsRequired": 10, "rewardDescription": "Café gratis" } },
  "owner":    { "name": "Ana", "username": "ana", "password": "password123" }
}'

# 2) (o) Login del staff
curl -s -X POST $API/auth/staff/login -H 'Content-Type: application/json' \
  -d '{ "businessSlug": "cafe-luna", "username": "ana", "password": "password123" }'

TOKEN=<accessToken>
BIZ=<businessId>

# 3) Crear categoría y producto (el DTO exige businessId en el body, aunque el servicio usa el del token)
curl -s -X POST $API/categories -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "businessId": "'$BIZ'", "name": "Cafés", "slug": "cafes" }'
curl -s -X POST $API/products -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "businessId": "'$BIZ'", "categoryId": "<categoryId>", "name": "Americano", "slug": "americano", "priceInCents": 4500 }'

# 4) Ver el menú público (lo que vería el comensal)
curl -s $API/businesses/cafe-luna
curl -s $API/products/business/$BIZ

# 5) Hacer un pedido como invitado desde la mesa 5
curl -s -X POST $API/orders -H 'Content-Type: application/json' -d '{
  "businessId": "'$BIZ'", "customerName": "Luis", "fulfillmentType": "DINE_IN",
  "serviceReference": "5", "items": [ { "productId": "<productId>", "quantity": 2 } ]
}'

# 6) El negocio ve y avanza el pedido
curl -s $API/orders/business -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH $API/orders/<orderId>/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{ "status": "CONFIRMED" }'

# 7) Deshabilitar un producto (sin stock)
curl -s -X PATCH $API/products/<productId> -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{ "available": false }'
```

> Revisa los DTOs en `src/modules/*/dto/` para ver todos los campos aceptados. La validación es estricta (`forbidNonWhitelisted`): un campo desconocido devuelve 400.

**Login de cliente con Google:** necesitas un *ID token* real. Lo más rápido es una página HTML mínima con el botón de Google Identity Services (`https://accounts.google.com/gsi/client`) usando tu `GOOGLE_CLIENT_ID`, que envíe `response.credential` a `POST /api/auth/customers/google`. Con ese token puedes crear pedidos que queden ligados al cliente.

Para inspeccionar la base: `make mongo-shell` y luego `use ordenalink; db.orders.find().pretty()`.

## 7. Qué necesitará el frontend (resumen)

1. **App pública del comensal** (móvil): `/:slug?mesa=N` → menú, carrito, checkout (invitado o Google), estado del pedido, tarjeta de fidelidad.
2. **Panel del negocio**: login staff, órdenes del día en tiempo real con cambio de estado, gestión de menú y disponibilidad, trabajadores, configuración del negocio (tema, modo solo menú, fidelidad) y generación e impresión de los QR por mesa.
