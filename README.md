# Hierbas del Oasis - Módulo Logístico

**Generador de reportes en Excel con datos reales de Tango Tiendas.**

---

## 🎯 Quick Start (Nueva Sesión)

Si inicias Claude en web, ejecuta esto en la terminal del proyecto:

```bash
# Terminal 1 - Backend
cd logistic-module/backend
npm run dev

# Terminal 2 - Frontend (nueva terminal)
cd logistic-module/frontend
npm run dev
```

Luego abre: **http://localhost:5173**

**Funcionalidad**: Click en "GENERAR ENVÍO MAÑANA" → Trae clientes reales de Tango → Descarga Excel.

---

## 📋 Proyecto

**Stack**: React 18 + TypeScript + Vite (frontend) | Express + TypeScript (backend) | Tango API

**Objetivo**: Generar excels con datos de entregas automáticamente para el próximo día hábil.

### Estructura

```
logistic-module/
├── backend/
│   ├── src/
│   │   ├── config.ts           # Variables de entorno (Tango)
│   │   ├── server.ts           # Express app
│   │   ├── controllers/
│   │   │   └── excelController.ts
│   │   ├── routes/
│   │   │   └── excel.ts
│   │   └── services/
│   │       └── apiClient.ts    # Conexión a Tango
│   ├── .env                    # Tu token de Tango aquí
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExcelGenerator.tsx
│   │   │   └── ExcelGenerator.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
└── README.md (este archivo)
```

---

## ✅ Estado Actual

✅ **Frontend** - Vista profesional lista (React + Vite)  
✅ **Backend** - Conectado a Tango API (Express)  
✅ **Integración Tango** - Trae clientes en paralelo, cachea 5 min  
✅ **Excel** - Genera con todos los campos necesarios  
✅ **Días Hábiles** - Calcula automáticamente próximo día laboral  

## 🔧 Configuración Necesaria

**Backend**: Edita `backend/.env`
```
PORT=3000
NODE_ENV=development
TANGO_API_BASE_URL=https://tiendas.axoft.com
TANGO_ACCESS_TOKEN=<tu-token-aqui>
TANGO_PAGE_SIZE=500
```

---

## 📡 API Endpoints

```
POST /excel/preview
  → { clientCount: number }

POST /excel/generate
  → Descarga .xlsx
```

---

## 📝 Notas para Próximas Sesiones

- El proyecto es **funcional y limpio**
- La lentitud fue resuelta con paginación paralela
- Tango trae ~100+ clientes (cachea 5 min)
- Todas las variables van en `backend/.env`
- Ver `CLAUDE.md` en raíz para más detalles técnicos
