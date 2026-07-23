# Hierbas del Oasis - Módulo Logístico

## Objetivo
Generar reportes en Excel con datos de clientes desde la API de Tango Tiendas. El sistema trae automáticamente el próximo día hábil y descarga un Excel con información de entregas.

## Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + TypeScript + ExcelJS
- **API Externa**: Tango Tiendas (https://tiendas.axoft.com)

## Estructura del Proyecto

```
logistic-module/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExcelGenerator.tsx
│   │   │   └── ExcelGenerator.css
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .gitignore
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── excel.ts
│   │   ├── controllers/
│   │   │   └── excelController.ts
│   │   ├── services/
│   │   │   └── apiClient.ts
│   │   ├── config.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── tsconfig.json
│   ├── package.json
│   └── .gitignore
│
└── README.md
```

## Configuración Inicial

### 1. Clonar y preparar
```bash
cd logistic-module
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Completar .env con:
# PORT=3000
# NODE_ENV=development
# TANGO_API_BASE_URL=https://tiendas.axoft.com
# TANGO_ACCESS_TOKEN=<tu-token-aqui>
# TANGO_PAGE_SIZE=500

npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

## Funcionalidad Actual

✅ **Vista profesional** con paleta de colores (verde #203d35, dorado #ebd38e)
✅ **Cálculo automático** de próximo día hábil (salta sábados/domingos)
✅ **Conexión a Tango API** - Trae todos los clientes en paralelo (optimizado)
✅ **Generación de Excel** con datos reales:
   - Código Vendedor
   - Código Cliente
   - Razón Social
   - Dirección de Entrega
   - Localidad/Zona
   - Tipo de Comprobante
   - Número de Comprobante
   - Total a Cobrar
   - Cantidad de Bultos
   - Horario de Entrega

✅ **Cache de 5 minutos** - No consulta Tango cada vez
✅ **Paginación paralela** - Descarga rápida de clientes
✅ **Endpoint preview** - Muestra cantidad real de clientes antes de descargar

## Endpoints API

```
POST /excel/preview
  Body: { date: "DD/MM/YYYY" }
  Response: { clientCount: number, date: string }

POST /excel/generate
  Body: { date: "DD/MM/YYYY" }
  Response: archivo Excel descargable
```

## 🔄 PENDIENTE: API de Comprobantes

**Estado**: Investigación en curso

El objetivo final es traer números de comprobante reales desde:
```
GET https://clientes.axoft.com/api/comprobantes/getjsonfrom/{id_cliente}
Header: Token (diferente de TANGO_ACCESS_TOKEN)
```

**Bloqueador actual**: Necesita confirmación de:
1. ¿Es accesible la API de `clientes.axoft.com` desde el backend?
2. ¿Cuál es el token correcto para esa API?
3. ¿Headers correctos (Token vs accesstoken)?

Una vez confirmado, implementar:
- Traer comprobantes por cliente y fecha
- Expandir filas: 1 cliente con 2 comprobantes = 2 filas en Excel
- Extraer: `InformacionComprobante.NumeroDeComprobante`, `Totales.ImporteTotalFactura`

## Próximas Mejoras (si aplica)
- ✋ **BLOQUEADO**: Integración con API de Comprobantes (await info)
- Filtrar clientes por zona/vendedor
- Agregar más campos al Excel según necesidad
- Integración con base de datos local (cache persistente)