# Sesión activa

La sesión de Athenet es una **ventana fija**: dura `environment.inactivityMinutes` desde el login y solo la extienden dos actos deliberados, el botón de renovar del temporizador y el "Continuar sesión" del aviso. Ningún evento del DOM cuenta. Nada de esto toca la vida del token: esa la fija Entra ID, no es configurable desde el cliente y MSAL la administra solo.

El modelo es así a propósito. Un click perdido o una tecla accidental no son prueba de que alguien esté trabajando, y con el modelo anterior —basado en actividad— cualquiera de los dos extendía la ventana completa en silencio. Con la ventana fija el contador significa exactamente lo que dice y renovar es una decisión de la persona.

---

## Piezas

Rutas relativas a `src/app/`.

| Archivo | Rol |
| :--- | :--- |
| `shared/services/session.service.ts` | Dueño único del reloj: `start()`, `stop()`, `renew()`, `logout()` y los signals `secondsLeft`, `isWarning`, `isCritical`. |
| `shared/components/topbar/topbar.ts` | Llama a `start()` al montar: la barra solo existe en el shell autenticado, así que montarla es la señal de que hay sesión que contar. |
| `shared/components/session-timer/` | Contador visible y botón de renovar, que es el mecanismo central del modelo. Presentacional: no tiene reloj propio. |
| `shared/components/confirm-dialog/` | El aviso previo "¿Sigues ahí?", abierto con `disableClose`. |
| `features/admin/admin.ts`, `features/director/director.ts` | Su botón de salir delega en `logout()`, único punto de cierre de la app. |

---

## El ciclo

1. **Siembra.** `start()` guarda el inicio de la ventana en `localStorage` bajo `athenet:sessionStart`, y **solo si no hay una vigente**: si recargar sembrara una nueva, la recarga sería una renovación encubierta.
2. **Tick de 1 s.** `tick()` recalcula desde el reloj de pared, nunca decrementa:

   ```ts
   const deadline = this.leerInicioVentana() + this.limitMs;
   const restantes = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
   ```

   Así el número sigue siendo cierto con la pestaña de fondo, donde el navegador estrangula el intervalo, o tras una suspensión del equipo.
3. **Umbrales proporcionales a la ventana**, no constantes: advertencia a 1/3 y aviso a 1/6. Con los 30 min de producción, el contador se pone naranja a los 10 minutos restantes y el aviso aparece a los 5.
4. **Renovación.** Solo `renew()` extiende, y lo llaman el botón del temporizador y el "Continuar sesión". Quien mira el contador renueva con un click y nunca ve el modal.
5. **Cierre.** A cero, `logout()` cierra el aviso, detiene el reloj, borra la ventana y llama a `logoutRedirect`.
6. **Multi-pestaña.** Renovar en una extiende las dos, porque la ventana es compartida y un listener de `storage` recalcula al instante. Si otra pestaña cerró, esta hace cierre pasivo —detiene el reloj y recarga en `redirectUri`— sin un segundo viaje a Microsoft.

**Alcance del aviso:** aparece siempre que la pestaña esté viva y al frente. Si el equipo se suspende o la pestaña queda en segundo plano más allá del vencimiento, el tick de despertar (`visibilitychange`, `focus`) encuentra la ventana vencida y cierra sin mostrarlo, que es lo correcto porque ahí no había nadie.

Ya cubierto por pruebas: un inicio con fecha futura (reloj movido hacia atrás) se reancla en vez de inflar el contador, y un `inactivityMinutes` no numérico cae al defecto de 30 min en vez de desarmar el reloj en silencio.

---

## Por qué el aviso lo abre el servicio y no un componente

El diálogo no es una vista más: es parte del ciclo de la ventana, y sacarlo del servicio partiría en dos una regla que necesita un solo dueño.

* **La condición de apertura solo existe aquí.** El umbral lo evalúa `tick()` (`restantes <= criticalSeconds`) y `avisoMostrado` asegura una sola apertura por ventana. Un componente tendría que reconstruir ese estado con un `effect()` sobre `isCritical`.
* **Cerrarlo nace de cuatro caminos del servicio**, ninguno de un componente: `renew()`, una renovación en otra pestaña (`tick()` por el evento de `storage`), `logout()` —para no dejar un modal huérfano sobre la pantalla de login— y el cierre pasivo.
* **Un solo reloj, un solo aviso.** El servicio es `providedIn: 'root'`, mientras los componentes se montan y se destruyen al cambiar de shell. Y lo que devuelve el diálogo son acciones de sesión: `true` → `renew()`, `false` → `logout()`.

El acoplamiento se mantiene barato: `MatDialog` se inyecta con `{ optional: true }` —el servicio corre y se prueba sin Material— y `ConfirmDialogComponent` se consume con `data`, como en el resto de la app.

---

## A futuro

* **El reflejo de pulsar "Continuar".** Es la falla conocida de la renovación obligatoria: con el tiempo la gente pulsa sin leer y la ventana fija deja de aportar seguridad real, con el costo de interrupción intacto. Si eso ocurre, la salida no es volver a los eventos crudos del DOM sino contar **trabajo real** —navegación del router, envíos de formulario, cambios de filtro—, que distingue mejor a quien trabaja de quien se fue.
* **El muro de 24 h de Entra ID.** Es el refresh token de la SPA y no es configurable. Al caducar, `acquireTokenSilent` falla con `interaction_required` y la UI sigue contando sobre una sesión muerta hasta el próximo request. Se detecta en el helper de token de cada `*-api.service.ts` —la app no tiene interceptor MSAL, cada servicio pide el suyo— y desde ahí conviene llamar a `logout()`.
* **El límite es valor de build:** cambiarlo exige recompilar. Si llega a depender de la institución o del rol, traerlo de la API y mover el límite a un token de DI; hoy el spec lo fija mutando `environment`.
* **`stop()` solo lo llama el cierre.** El reloj es único y vive mientras viva la app. Si aparecen rutas autenticadas fuera del shell con topbar, revisar quién lo arranca y quién lo detiene.
* **Línea transitoria:** `borrarVentana()` también elimina `athenet:lastActivity`, la clave del modelo anterior, para no dejarla huérfana en los navegadores que venían de él. Se puede quitar en unas semanas.
* **Las pruebas usan temporizadores falsos y `StorageEvent` sintéticos** (`session.service.spec.ts`): el comportamiento real entre pestañas y ante cambios de hora del sistema hay que verificarlo a mano, con `inactivityMinutes` bajo.
