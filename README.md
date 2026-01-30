# OrderWise: Gestión de Pedidos y Optimización de Rutas

OrderWise es una aplicación web construida con Next.js, diseñada para la gestión eficiente de pedidos y la optimización inteligente de rutas de entrega. Proporciona una solución completa desde la creación del pedido hasta la asignación de rutas logísticas, todo dentro de una interfaz de usuario limpia e intuitiva.

## Tabla de Contenidos
- [Características Principales](#características-principales)
- [Arquitectura Técnica](#arquitectura-técnica)
- [Estructura de Archivos Clave](#estructura-de-archivos-clave)
- [Guía de Configuración y Ejecución](#guía-de-configuración-y-ejecución)
- [Credenciales de Acceso](#credenciales-de-acceso)
- [Explicación de la Lógica Central](#explicación-de-la-lógica-central)
  - [Geocodificación de Direcciones](#1-geocodificación-de-direcciones-dirección---coordenadas)
  - [Optimización de Rutas en Dos Pasos](#2-optimización-de-rutas-en-dos-pasos)

---

## Características Principales

-   **Autenticación Simple**: Inicio de sesión seguro (simulado) con correo y contraseña.
-   **Dashboard de Pedidos**: Una tabla interactiva para visualizar, crear, editar y eliminar pedidos.
-   **Gestión de Personal**: Funcionalidad para añadir, editar y eliminar miembros del personal.
-   **Optimización de Rutas**: Una vista dedicada para agrupar pedidos por horarios y optimizar las rutas de entrega.
-   **Asignación de Conductores**: Permite asignar las rutas optimizadas a los miembros del personal disponibles.
-   **Interfaz Moderna**: Construida con Next.js App Router, TailwindCSS и shadcn/ui.

---

## Arquitectura Técnica

-   **Frontend**: Next.js 15 (App Router), React 19, TypeScript.
-   **Estilos**: TailwindCSS y componentes `shadcn/ui` para una interfaz moderna y personalizable.
-   **Backend**: Next.js Server Actions para manejar toda la lógica del lado del servidor (mutaciones de datos y llamadas a APIs externas).
-   **Datos**: La aplicación utiliza un almacén de datos **en memoria** (`src/lib/data.ts`) para simular una base de datos. Los datos se reinician cada vez que el servidor se recarga.
-   **Servicios Externos**:
    -   **Google Geocoding API**: Para convertir direcciones físicas en coordenadas de latitud y longitud.
    -   **Google Routes API**: Para calcular el orden óptimo de visita dentro de un grupo de pedidos.
-   **Algoritmo de Clustering**: La agrupación de pedidos se realiza internamente utilizando el algoritmo **DBSCAN**.

---

## Estructura de Archivos Clave

-   `src/app/dashboard/`: Contiene las páginas principales de la aplicación (pedidos, rutas, personal).
    -   `page.tsx`: Dashboard principal de pedidos.
    -   `routes/page.tsx`: Página para la optimización y asignación de rutas.
    -   `staff/page.tsx`: Página para la gestión de personal.
-   `src/components/`: Componentes reutilizables de React.
    -   `dashboard/`: Componentes específicos del panel de control (tablas de datos, formularios, etc.).
    -   `ui/`: Componentes base de la interfaz de usuario de `shadcn/ui`.
-   `src/lib/actions.ts`: **(¡Archivo muy importante!)** Contiene las Server Actions que ejecutan la lógica del backend. Aquí se procesan los formularios, se llama a las APIs de Google y se realiza el clustering.
-   `src/lib/data.ts`: Define y exporta los datos de prueba (mock data) que la aplicación utiliza. Actúa como una base de datos simulada en memoria.
-   `src/lib/definitions.ts`: Contiene las definiciones de tipos de TypeScript y los esquemas de validación de Zod para los formularios.
-   `.env`: Archivo para almacenar variables de entorno, como la clave de la API de Google Maps.

---

## Guía de Configuración y Ejecución

### 1. Requisitos Previos

-   Node.js (v18 o superior)
-   npm o un gestor de paquetes similar

### 2. Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
npm install
```

### 3. Configuración de la API de Google Maps

La optimización de rutas requiere una clave de API de Google Maps Platform.

1.  **Obtén una Clave de API**:
    -   Ve a la [Consola de Google Cloud](https://console.cloud.google.com/).
    -   Crea un nuevo proyecto y habilita una cuenta de facturación (Google ofrece un generoso nivel gratuito).
    -   Habilita las siguientes APIs: **Geocoding API** y **Routes API**.
    -   Ve a "Credenciales", crea una "Clave de API" y cópiala.
    -   **Importante**: Restringe tu clave para que solo pueda usarse con las APIs que habilitaste.

2.  **Agrega la Clave al Proyecto**:
    -   En la raíz del proyecto, encontrarás un archivo llamado `.env`.
    -   Abre el archivo y pega tu clave de API dentro de las comillas:

    ```env
    GOOGLE_MAPS_API_KEY="AQUI_VA_TU_CLAVE_DE_API"
    ```

### 4. Ejecutar la Aplicación

Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:9002`.

---

## Credenciales de Acceso

La aplicación utiliza un sistema de inicio de sesión simulado. Usa las siguientes credenciales:

-   **Usuario:** `admin@orderwise.com`
-   **Contraseña:** `password`

---

## Explicación de la Lógica Central

El núcleo de la funcionalidad de optimización se encuentra en el archivo `src/lib/actions.ts`, específicamente en las funciones `saveOrder` y `getClusteredRoutesAction`.

### 1. Geocodificación de Direcciones (Dirección -> Coordenadas)

-   **Cuándo ocurre**: Cuando se crea o edita un pedido a través del formulario.
-   **Función**: `saveOrder` -> `geocodeAddress`
-   **Proceso**:
    1.  La acción `saveOrder` recibe los datos del formulario.
    2.  Llama a la función `geocodeAddress`, pasándole la dirección del pedido.
    3.  `geocodeAddress` hace una petición `fetch` a la **Google Geocoding API**.
    4.  La API devuelve la latitud y longitud, que se guardan en la base de datos (en nuestro caso, en el array de `orders` en memoria) junto con el resto de la información del pedido.
    5.  Este paso es crucial y se hace solo una vez por pedido para minimizar costos.

### 2. Optimización de Rutas en Dos Pasos

Este proceso se activa en la página `/dashboard/routes` al seleccionar un horario.

-   **Función**: `getClusteredRoutesAction`
-   **Proceso**:
    1.  **Filtrado de Pedidos**: Se obtienen todos los pedidos de la base de datos que son del tipo "entrega", están "pendientes de pago" y coinciden con el horario seleccionado (mañana, tarde, noche).
    2.  **Paso 1: Clustering con DBSCAN**:
        -   Se extraen las coordenadas de los pedidos filtrados.
        -   Se utiliza el algoritmo **DBSCAN** para agrupar las coordenadas que están geográficamente cerca. Esto crea "clústeres" o zonas de entrega. DBSCAN es ideal porque no necesita saber cuántas rutas habrá de antemano.
    3.  **Paso 2: Optimización de cada Clúster**:
        -   Para cada clúster (grupo de pedidos) creado, se llama a la función `optimizeRoute`.
        -   `optimizeRoute` envía los puntos de ese clúster a la **Google Routes API**, con el parámetro `optimizeWaypointOrder=true`.
        -   La API resuelve el "Problema del Vendedor Viajero" para ese pequeño grupo y devuelve el orden de visita más eficiente.
    4.  **Resultado Final**: La acción devuelve al frontend una lista de rutas, cada una con una lista de pedidos ya ordenados de manera óptima para la entrega.

Este enfoque de dos pasos (agrupar primero, luego optimizar cada grupo) es mucho más eficiente y escalable que intentar optimizar todos los pedidos a la vez.
