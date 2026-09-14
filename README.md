<p align="center">
  <img src="docs/img/banner.png" alt="Athenet Org Banner" width="100%">
</p>

<p align="center">
Athenet es una plataforma orientada a la articulación, regulación y difusión del deporte estudiantil y universitario a nivel nacional. Centraliza tanto la fiscalización de torneos y competencias oficiales como las actividades deportivas independientes promovidas por las distintas casas de estudio adscritas.
</p>

<h4 align="center"><strong>
<a href="#athenet-org">Athenet ORG</a> - <a href="https://github.com/fabetabilo/web-athenet">Athenet Público</a>
</br>
<a href="#desarrollo-local">Desarrollo Local</a>
</strong></h4>

### Stack

<div align="center">

[![Angular](https://img.shields.io/badge/Angular_22-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular Material](https://img.shields.io/badge/Angular_Material-%23FFA000.svg?style=for-the-badge&logo=angular&logoColor=white)](https://material.angular.io/)
[![Microsoft Azure](https://img.shields.io/badge/Microsoft_Entra_ID-%230078D4.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://learn.microsoft.com/entra/identity/)
[![Vitest](https://img.shields.io/badge/vitest-%23646CFF.svg?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

</div>

* **Framework frontend:** [Angular 22](https://angular.dev/) (Arquitectura basada en Standalone Components, Signals y Router funcional).
* **Componentes UI & Accesibilidad:** [Angular Material](https://material.angular.io/) y Angular CDK 22.1.x, vinculados al sistema de diseño por tokens (`src/styles/_tokens.scss`).
* **Autenticación:** `@azure/msal-browser` y `@azure/msal-angular` para flujos interactivos de redirección con Microsoft Entra ID.
* **Lenguaje:** TypeScript (~6.0).
* **Reactividad:** RxJS (~7.8).
* **Entorno de pruebas unitarias:** Vitest con soporte nativo mediante `@angular/build`.
* **Estilos:** SCSS modular estructurado con variables CSS nativas para aislamiento temático.

### Athenet ORG

Esta aplicación contempla el portal web institucional para funcionarios, administradores y entidades reguladoras de la organización. Centraliza las operaciones de administración, supervisión de torneos, eventos y gestión de instituciones adscritas a la plataforma.

### Control de Acceso y Roles

El acceso a la plataforma está protegido mediante autenticación federada con **Microsoft Entra ID** (OAuth 2.0 / OpenID Connect). La autorización interna se determina a partir del claim de roles (`roles`) emitido en el token de autenticación del usuario, que es evaluado por `RoleGuard` para permitir o restringir el ingreso a cada módulo.

La plataforma contempla los siguientes perfiles y atribuciones operativas:

* **`admin` — Administrador de la Plataforma:**
  * Gestión y administración global del sistema Athenet.
  * Registro, validación y administración de instituciones y universidades adscritas.
  * Configuración del catálogo oficial de deportes, disciplinas y equipos.
  * Supervisión transversal de usuarios, reportería de actividad y auditoría técnica de servicios integrados.

* **`director` — Director de Eventos / Regulador:**
  * Creación, programación, edición y administración de eventos deportivos institucionales.
  * Fiscalización del cumplimiento normativo y regulatorio de las competencias organizadas por Athenet.
  * Control del ciclo de vida de cada evento (`DRAFT`, `PUBLISHED`, `CANCELLED`) y coordinación de recintos y fechas de calendario.

* **Usuario no asignado (`/unauthorized`):**
  * Usuarios autenticados mediante Entra ID que no disponen de un rol institucional asignado en el registro de la aplicación. El sistema deniega el acceso a las funciones operativas y redirige a una vista informativa.

### Desarrollo Local


**NOTA**: Para detalle de la capa de componentes compartidos y directrices de diseño, ve la [Documentación de Desarrollo](docs/dev/README.md).


#### 1. Verificación de dependencias del entorno

Asegúrate de contar con el entorno de ejecución adecuado antes de iniciar:

* **Node.js:** Versión 20 o superior (versión LTS recomendada).
* **npm:** Versión 10 o superior (compatible con `npm@11.16.0`).

Verifica las versiones instaladas en tu terminal:

```bash
node -v
npm -v
```

> **Nota:** Puedes utilizar Angular CLI de forma global (`npm i -g @angular/cli`) o ejecutar los comandos locales mediante los scripts de npm definidos en `package.json`.

<a id="installation"></a>
#### 2. Instalación de dependencias

Instala los paquetes requeridos por el proyecto:

```bash
npm install
```

#### 3. Configuración del entorno (`environment.ts`)

La aplicación requiere la configuración de parámetros de autenticación y URLs de servicios backend. Copia el archivo de plantilla:

```bash
# En Linux / macOS / PowerShell:
cp src/environments/environment.example.ts src/environments/environment.ts

# En Windows CMD:
copy src\environments\environment.example.ts src\environments\environment.ts
```

#### Parámetros disponibles en `src/environments/environment.ts`:

| Parámetro | Tipo | Descripción | Valor por defecto |
| :--- | :--- | :--- | :--- |
| `clientId` | `string` | Application (Client) ID del App Registration en Microsoft Entra ID. | `'REEMPLAZAR_CON_APPLICATION_CLIENT_ID'` |
| `tenantId` | `string` | Directory (Tenant) ID del inquilino institucional en Microsoft Entra ID. | `'REEMPLAZAR_CON_DIRECTORY_TENANT_ID'` |
| `redirectUri` | `string` | URI de redirección registrada para el retorno post-login. | `'http://localhost:4200'` |
| `eventsApiUrl` | `string` | URL base para el microservicio de gestión de eventos (`ms-events`). | `'http://localhost:8080'` |

> **Modo desacoplado de desarrollo:** Si los valores de `clientId` o `tenantId` conservan el prefijo `REEMPLAZAR_`, la aplicación detecta automáticamente la ausencia de credenciales de Entra ID (`isAuthConfigured = false`). Esto previene excepciones durante la inicialización de MSAL y emite una advertencia informativa en consola, permitiendo levantar la interfaz sin credenciales en la nube.

#### 4. Servidor de desarrollo

Inicia el servidor local de desarrollo:

```bash
npm start
# o alternativamente:
ng serve
```

Una vez compilado, ingresa a `http://localhost:4200/`. El entorno cuenta con recarga automática ante cambios en el código fuente.

#### 5. Compilación para producción

Para compilar el proyecto y generar los artefactos optimizados:

```bash
npm run build
# o alternativamente:
ng build
```

La salida generada se almacena en el directorio `dist/`.

#### 6. Ejecución de pruebas unitarias

Ejecuta las pruebas automatizadas del proyecto con Vitest:

```bash
npm test
# o alternativamente:
ng test
```

### Estructura del Proyecto

```text
src/
├── api/                  # Clientes y servicios HTTP para APIs backend
├── app/
│   ├── features/
│   │   ├── admin/        # Vistas y lógica del panel de administración
│   │   └── director/     # Vistas y lógica de directores y gestión de eventos
│   ├── login/            # Flujo y presentación de inicio de sesión
│   ├── shared/           # Componentes transversales (<app-table>, <app-pill>, <app-sidebar>)
│   ├── app.config.ts     # Configuración de proveedores, interceptores y rutas
│   └── app.routes.ts     # Definición de rutas protegidas y asignación de roles
├── auth/                 # Configuración de MSAL, loginRequest y RoleGuard
├── environments/         # Configuraciones de entorno (local, pruebas, producción)
└── styles/               # Tokens de diseño (_tokens.scss), layout y estilos globales
```