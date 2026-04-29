<<<<<<< HEAD
# �️ Sistema de Reservas - Comedor Estudiantil

Sistema de reservas de comedor estudiantil con menú semanal (Lunes-Viernes) y 2 turnos diarios (Mañana/Tarde). Los estudiantes deben reservar 1 hora antes del receso.

## 📋 Características Principales

✅ **Menú Semanal Dinámico** (Lunes a Viernes)  
✅ **2 Turnos Diarios**:
- Mañana: Receso 10:00 AM → Reserva hasta 9:00 AM
- Tarde: Receso 5:30 PM → Reserva hasta 4:30 PM

✅ **Platos Típicos**: Arroz con pollo, tallarines verdes, lomo saltado, etc.  
✅ **Gestión desde Google Sheets** (sin necesidad de base de datos)  
✅ **Diseño Mobile-First** tipo Burger King  
✅ **Modo Dark/Light** con persistencia automática  
✅ **Desplegable en GitHub Pages** (gratis, sin hosting)

## 📁 Estructura del Proyecto

```
mystore/
├── index.html              # Frontend principal
├── code.gs                 # Backend Google Apps Script
├── css/
│   └── styles.css          # Estilos (diseño tipo Burger King)
├── js/
│   ├── config.js           # Configuración (URL API y turnos)
│   ├── api.js              # Capa de abstracción API
│   ├── utils.js            # Utilidades y helpers
│   └── app.js              # Lógica principal
└── README.md               # Este archivo
```

## 🏗️ Stack Tecnológico

### Backend
- **Google Apps Script** (JavaScript)
- **Google Sheets** como base de datos
- Expuesto como **Web App** (API REST)
- Endpoints: `doGet` y `doPost`

### Frontend
- **HTML5** semántico
- **CSS3** puro (sin frameworks)
- **JavaScript Vanilla** (sin dependencias)
- **Mobile-first responsive**
- Diseño inspirado en Burger King

## 🚀 Configuración e Instalación

### Paso 1: Configurar Backend (Google Apps Script)

1. **Abrir Google Sheets**
   - Ve a [Google Sheets](https://sheets.google.com)
   - Crea una nueva hoja de cálculo
   - Copia el ID de la hoja desde la URL:
     ```
     https://docs.google.com/spreadsheets/d/[ESTE_ES_TU_ID]/edit
     ```

2. **Abrir Apps Script**
   - En tu hoja, ve a: **Extensiones > Apps Script**
   - Borra el código por defecto
   - Pega el contenido completo de `code.gs`

3. **Configurar el ID de la hoja**
   - En `code.gs`, línea 8, reemplaza con tu ID:
   ```javascript
   SPREADSHEET_ID: 'TU_ID_DE_GOOGLE_SHEETS_AQUI'
   ```

4. **Desplegar como Web App**
   - Haz clic en **Implementar > Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo** (tu cuenta)
   - Acceso: **Cualquier usuario**
   - Haz clic en **Implementar**
   - **IMPORTANTE**: Copia la URL que te dan (la necesitarás en el frontend)

5. **Probar el backend**
   - En Apps Script, ejecuta la función `test()` desde el editor
   - Revisa los logs (Ver > Registros)
   - Deberías ver datos de menú y reservas

### Paso 2: Configurar Frontend

1. **Actualizar configuración**
   - Abre `js/config.js`
   - En la línea 8, reemplaza con tu URL de Google Apps Script:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec'
   ```

2. **Probar localmente**
   - Abre `index.html` en tu navegador
   - O usa un servidor local:
   ```bash
   # Con Python 3
   python -m http.server 8000
   
   # Con Node.js (http-server)
   npx http-server -p 8000
   
   # Con PHP
   php -S localhost:8000
   ```
   - Accede a: `http://localhost:8000`

### Paso 3: Desplegar en GitHub Pages

1. **Crear repositorio en GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Sistema de reservas"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

2. **Activar GitHub Pages**
   - Ve a tu repositorio en GitHub
   - Settings > Pages
   - Source: **main branch** / root
   - Guarda y espera unos minutos
   - Tu sitio estará en: `https://TU_USUARIO.github.io/TU_REPO/`

## 📡 API Endpoints

### Backend (Google Apps Script)

#### GET Endpoints

**1. Obtener Menú del Día por Turno**
```
GET ?action=getMenuDelDia&turno=MANANA
```
Respuesta:
```json
{
  "success": true,
  "menu": [
    {
      "id": 1,
      "dia": "Lunes",
      "turno": "MANANA",
      "nombre": "Arroz con Pollo",
      "descripcion": "Arroz, pollo al horno, ensalada",
      "precio": 8.50,
      "disponible": "SI",
      "imagen": "URL"
    }
  ],
  "dia": "Lunes",
  "turno": "MANANA",
  "nombreTurno": "Mañana",
  "horaReceso": "10:00",
  "fecha": "2026-01-03"
}
```

**2. Verificar Disponibilidad por Turno**
```
GET ?action=checkDisponibilidad&turno=MANANA
```
Respuesta:
```json
{
  "success": true,
  "puedeReservar": true,
  "turno": "MANANA",
  "nombreTurno": "Mañana",
  "horaActual": "08:30",
  "horaLimite": "09:00",
  "horaReceso": "10:00",
  "mensaje": "Puedes reservar para el receso de 10:00",
  "dia": "Lunes"
}
```

**3. Obtener Menú Semanal Completo (Admin)**
```
GET ?action=getMenuSemanal
```

**4. Obtener Reservas**
```
GET ?action=getReservas&fecha=2026-01-03&turno=MANANA
```

#### POST Endpoints

**1. Crear Reserva**
```
POST ?action=crearReserva
Body:
{
  "turno": "MANANA",
  "nombreEstudiante": "Juan Pérez García",
  "codigo": "2024001",
  "email": "juan@estudiante.edu",
  "items": [
    {
      "id": 1,
      "nombre": "Arroz con Pollo",
      "precio": 8.50,
      "cantidad": 1
    }
  ],
  "notas": "Sin ají"
}
```

## � Modo Dark/Light

El sistema incluye un **botón de cambio de tema** en el header que permite alternar entre modo claro y oscuro.

### Características

- **Persistencia automática**: La preferencia se guarda en `localStorage` y se mantiene entre sesiones
- **Detección automática**: Si es la primera vez, detecta la preferencia del sistema operativo
- **Transiciones suaves**: Cambio animado entre temas sin parpadeo
- **Iconos dinámicos**: 🌙 para modo claro / ☀️ para modo oscuro

### Variables CSS personalizables

En [css/styles.css](css/styles.css) líneas 53-62:

```css
[data-theme="dark"] {
  --text-color: #e0e0e0;
  --text-light: #b0b0b0;
  --background-color: #1a1a1a;
  --card-background: #2d2d2d;
  --secondary-color: #3a3a3a;
  --border-color: #444;
  /* Puedes personalizar estos colores según tu preferencia */
}
```

## �🎨 Personalizrios de turnos

Edita `js/config.js` (líneas 10-21) y `code.gs` (líneas 11-22):

**JavaScript (config.js):**
```javascript
TURNOS: {
  MANANA: {
    nombre: 'Mañana',
    horaReceso: '10:00 AM',  // Cambiar aquí
    horaLimite: '09:00 AM',   // Cambiar aquí
    descripcion: 'Receso de mañana'
  },
  TARDE: {
    nombre: 'Tarde',
    horaReceso: '5:30 PM',    // Cambiar aquí
    horaLimite: '4:30 PM',    // Cambiar aquí
    descripcion: 'Receso de tarde'
  }
}
```

**Apps Script (code.gs):**
```javascript
TURNOS: {
  MANANA: {
    nombre: 'Mañana',
    horaReceso: '10:00',
    horaLimite: 9,           // Hora en formato 24h
    horaLimiteCompleta: '09:00'
  },
  TARDE: {
    nombre: 'Tarde',
    horaReceso: '17:30',
    horaLimite: 16.5,        // 16:30 en decimal
    horaLimiteCompleta: '16:30'
  }
}rk: #a01c00;       /* Rojo oscuro */
  --accent-color: #ff9500;       /* Naranja acento */
  --secondary-color: #f5ebdc;    /* Beige */
}
```

### Cambiar hora límite

Edita `js/config.js` (línea 11):
```javascript
HORA_LIMITE: 9, // Cambia a la hora que necesites
```

También actualiza en `code.gs` (línea 11):
```javascript
HORA_LIMITE: 9
```

### Cambiar moneda

Edita `js/config.js` (línea 14):
```javascript
MONEDA: 'S/', // Cambia por $, €, etc.
```

## ✅ Buenas Prácticas Implementadas

### 1. **Separación de responsabilidades**
- HTML (estructura)
- CSS (presentación)
- JavaScript (comportamiento)

### 2. **Arquitectura modular**
```
config.js  →  Configuración centralizada
api.js     →  Capa de abstracción (fácil cambio de backend)
utils.js   →  Funciones reutilizables
app.js     →  Lógica de negocio
```

### 3. **Mobile-first responsive**
- Diseño pensado primero para móviles
- Media queries para tablets y desktop
- Carrito lateral en desktop, overlay en móvil

### 4. **Optimizaciones**
- LocalStorage para persistir carrito
- Caché de datos del menú
- Validaciones client-side y server-side
- Sanitización de HTML (prevención XSS)

### 5. **UX mejorada**
- Feedback visual inmediato (toasts)
- Loading states
- Estados vacíos informativos
- Confirmación de reserva clara

### 6. **Seguridad**
- Validación de hora límite en backend
- Sanitización de inputs
- Límites de caracteres
- Validación de formatos (email, teléfono)

## 🔧 Funcionalidades

- ✅ Mostrar menú dinámico desde Google Sheets
- ✅ Filtrar productos por categoría
- ✅ Agregar/eliminar productos del carrito
- ✅ Ajustar cantidades en tiempo real
- ✅ Persistir carrito en localStorage
- ✅ Validar hora límite (9:00 AM)
- ✅ Formulario de reserva con validaciones
- ✅ Confirmación visual de pedido
- ✅ Responsive design (móvil, tablet, desktop)
- ✅ Diseño atractivo tipo Burger King

## 📱 Responsive Breakpoints

```css
Mobile:    < 4Semanal"
| ID | Dia | Turno | Nombre | Descripcion | Precio | Disponible | Imagen |
|----|-----|-------|--------|-------------|--------|------------|--------|
| 1 | Lunes | MANANA | Arroz con Pollo | Arroz, pollo al horno, ensalada | 8.50 | SI | URL |
| 2 | Lunes | TARDE | Tallarines Verdes | Tallarines con albahaca, bistec | 9.00 | SI | URL |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Días válidos**: Lunes, Martes, Miércoles, Jueves, Viernes  
**Turnos válidos**: MANANA, TARDE  
**Disponible**: SI o NO

### Hoja "Reservas"
| ID | Fecha | Hora Reserva | Dia | Turno | Hora Receso | Estudiante | Codigo | Email | Menu | Total | Estado | Notas |
|----|-------|--------------|-----|-------|-------------|------------|--------|-------|------|-------|--------|-------|

## 🔧 Gestionar el Menú Semanal

Para cambiar el menú de la semana:

1. Abre tu Google Sheet
2. Ve a la pestaña **"MenuSemanal"**
3. Edita los platos directamente:
   - **ID**: Número único
   - **Dia**: Lunes, Martes, Miércoles, Jueves, Viernes
   - **Turno**: MANANA o TARDE
   - **Nombre**: Nombre del plato
   - **Descripcion**: Descripción corta
   - **Precio**: Precio en soles (ej: 8.50)
   - **Disponible**: SI o NO
   - **Imagen**: URL de la imagen (opcional)

### Ejemplo de menú semanal:

**Lunes:**
- Mañana: Arroz con Pollo
- Tarde: Tallarines Verdes

**Martes:**
- Mañana: Lomo Saltadoweb para gestionar menú
- [ ] Notificaciones email/WhatsApp de confirmación
- [ ] Historial de reservas por estudiante
- [ ] Estadísticas de platos más pedidos
- [ ] Sistema de calificación de platos
- [ ] Exportar reportes en Excel
- [ ] Modo oscuro
- [ ] Agregar más turnos (desayuno, cena)

## 📞 Notas Importantes

### Para Estudiantes:
- Solo se puede hacer **1 reserva por turno**
- Debes reservar **1 hora antes** del receso
- El sistema solo funciona **Lunes a Viernes**
- Recuerda tu **número de pedido** para recoger tu comida

### Para Administradores:
- Actualiza el menú cada domingo para la siguiente semana
- Revisa las reservas del día para preparar las cantidades
- Puedes deshabilitar platos poniendo "NO" en "Disponible"
- Los datos se guardan automáticamente en Google Sheets

### Límites de Google Apps Script:
- **20,000 peticiones/día** (más que suficiente)
- **6 minutos** máximo por ejecución
- **50 MB** de datos en Scripts

---

**Desarrollado para facilitar la gestión del comedor estudiantil** 🎓🍽️
### Error de CORS
- Google Apps Script automáticamente maneja CORS
- Si persiste, verifica que la URL sea exactamente la de la implementación

### El carrito no se guarda
- Verifica que localStorage esté habilitado en tu navegador
- Algunos navegadores en modo privado bloquean localStorage

## 📄 Estructura de Google Sheets

El script creará automáticamente estas hojas:

### Hoja "Menu"
| ID | Nombre | Descripcion | Precio | Categoria | Imagen | Disponible | Fecha |
|----|--------|-------------|--------|-----------|--------|------------|-------|

### Hoja "Reservas"
| ID | Fecha | Hora | Cliente | Telefono | Email | Items | Total | Estado | Notas |
|----|-------|------|---------|----------|-------|-------|-------|--------|-------|

## 🚀 Próximas mejoras sugeridas

- [ ] Panel de administración para gestionar menú
- [ ] Notificaciones push/email de confirmación
- [ ] Historial de pedidos por cliente
- [ ] Sistema de puntos/descuentos
- [ ] Integración con WhatsApp Business API
- [ ] Dashboard de métricas y reportes
- [ ] Modo oscuro
- [ ] Multiidioma

## � Seguridad - Acceso a Estadísticas

El panel de estadísticas está protegido con autenticación PIN de 4 dígitos.

### Configuración del PIN

El PIN por defecto es: **2026**

Para cambiarlo, edita la línea 724 en `stats/index.html`:
```javascript
const PIN_CORRECTO = '2026'; // Cambiar aquí
```

### Características de Seguridad

- ✅ **PIN de 4 dígitos** numéricos
- ✅ **Sesión de 1 hora** (se mantiene autenticado durante 60 minutos)
- ✅ **Solo números permitidos** (otras teclas son ignoradas)
- ✅ **Navegación con teclado** (Enter para validar, Tab para avanzar, Backspace para retroceder)
- ✅ **Feedback visual** (animación de error si PIN incorrecto)
- ✅ **Sin botón visible** - Solo accesible mediante URL directa: `/stats`

### Acceso al Panel

1. Navega a: `https://tu-dominio.github.io/repo/stats`
2. Ingresa el PIN de 4 dígitos
3. Click en "Desbloquear" o presiona Enter
4. La sesión se mantendrá activa por 1 hora

### Cambiar Duración de Sesión

Edita la línea 725 en `stats/index.html`:
```javascript
const SESSION_DURATION = 3600000; // 1 hora en ms (3600000)
// Para 30 min: 1800000
// Para 2 horas: 7200000
```

### Cerrar Sesión

Para cerrar la sesión manualmente:
1. Abre la consola del navegador (F12)
2. Ejecuta: `localStorage.removeItem('stats_authenticated')`
3. Recarga la página

## �📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en Apps Script (Ver > Registros)
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que todas las URLs estén correctamente configuradas

## 📝 Licencia

Proyecto de código abierto. Libre para usar y modificar.

---

**Desarrollado por Frank M. para Fast Flavors**