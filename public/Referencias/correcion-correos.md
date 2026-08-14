Quiero que implementes/rediseñes la **plantilla de correo electrónico para las alertas del proceso de acreditación** tomando como referencia visual la imagen que te proporcioné.

La plantilla debe mantener el estilo institucional, limpio, moderno y profesional de la referencia, pero debe integrarse con la arquitectura actual de mi proyecto y utilizar **los parámetros, variables y datos dinámicos que ya existen en el sistema**.

## 1. Antes de modificar código

Primero revisa el proyecto e identifica:

* Dónde se genera actualmente el correo.
* Qué componente, archivo HTML, template o servicio se utiliza.
* Qué variables/parámetros recibe actualmente.
* Qué nombres tienen esos parámetros.
* Qué framework o motor de plantillas estamos utilizando.
* Qué estilos o componentes institucionales existentes se pueden reutilizar.

**No inventes nuevos nombres de variables si ya existen equivalentes en el proyecto.**

Adapta el diseño a las variables actuales.

Si algún dato de la referencia visual no tiene todavía una variable equivalente, indícame cuál falta antes de reemplazarlo por un valor hardcodeado.

---

# 2. Diseño general

Quiero reproducir aproximadamente el diseño de la referencia.

La plantilla debe verse como una **tarjeta vertical institucional**, centrada dentro del correo, con:

* ancho máximo aproximado de `650–700px`;
* fondo general blanco;
* borde exterior muy sutil;
* esquinas redondeadas de aproximadamente `18–22px`;
* contenido organizado verticalmente;
* tipografía sans-serif moderna, similar a Arial, Inter, Helvetica o la fuente institucional que ya tenga configurada la aplicación;
* buena separación entre bloques;
* diseño limpio, sin sombras excesivas;
* adaptación correcta a dispositivos móviles.

Debe conservarse bastante espacio en blanco para que la información sea fácil de leer.

---

# 3. Encabezado principal

La parte superior debe ser un bloque destacado con un **degradado horizontal naranja**, similar a:

`#F15A3C → #F5A623`

No tiene que ser exactamente ese color si el proyecto ya posee colores institucionales equivalentes.

El bloque debe tener aproximadamente `150–160px` de altura en escritorio y padding interno generoso.

Las esquinas superiores deben seguir el redondeado general de la tarjeta.

### Primera línea del encabezado

En la parte superior izquierda debe aparecer una pequeña etiqueta/pill de alerta.

Debe tener:

* fondo naranja oscuro/translúcido;
* esquinas redondeadas;
* icono triangular de advertencia;
* texto blanco;
* texto en mayúsculas.

Ejemplo visual:

`⚠ ALERTA | INICIO DE RENOVACIÓN`

Este texto debe ser dinámico si ya contamos con variables para el tipo de alerta o etapa.

### Título principal

Debajo debe aparecer en blanco y negrita:

**Inicio del proceso de renovación de la
Acreditación en Alta Calidad**

El título debe ser dinámico y construirse con los datos correspondientes al proceso/etapa.

Tamaño aproximado:

`25–30px`

Peso:

`700`

### Subtítulo

Debajo debe aparecer el nombre del programa, por ejemplo:

`Licenciatura en Educación Física, Recreación y Deportes`

Este dato debe provenir de la variable correspondiente al nombre del programa.

Color blanco con una opacidad ligeramente menor que el título.

---

# 4. Saludo / destinatario

Al terminar el encabezado debe comenzar el cuerpo blanco.

Usar aproximadamente:

`padding: 24px 28px`

Primero mostrar el nombre del destinatario en negrita y color azul institucional oscuro.

Ejemplo:

**Universitario Robinson Meneses Llanos:**

El nombre debe ser completamente dinámico.

Debajo incluir el siguiente texto:

“Esta alerta se genera en el marco del seguimiento que realiza el Centro de Gestión de la Calidad y la Acreditación Institucional al proceso de renovación de la Acreditación en Alta Calidad de los programas académicos de la Universidad.”

Mantener un tamaño aproximado de `14–15px`, color gris oscuro/azul muy oscuro y line-height cómodo.

---

# 5. Bloque: Información del proceso

Agregar un título de sección acompañado de un icono dentro de un pequeño círculo claro.

Referencia:

📋 **Información del proceso**

El icono debe ser naranja y el fondo del círculo naranja muy claro.

El título debe estar en:

* color naranja institucional;
* negrita;
* aproximadamente `16–18px`.

Debajo colocar una tabla de información con bordes muy sutiles y esquinas redondeadas.

Debe ocupar el `100%` del ancho disponible.

La tabla debe mostrar dos columnas:

**Columna izquierda:** nombre del campo.
**Columna derecha:** valor dinámico.

Campos:

| Campo                                   | Valor                   |
| --------------------------------------- | ----------------------- |
| Programa                                | Nombre del programa     |
| Proceso                                 | Nombre/tipo del proceso |
| Etapa                                   | Etapa actual            |
| Fecha de vencimiento de la acreditación | Fecha                   |
| Fecha límite de entrega al CGCAI        | Fecha                   |
| Coordinador                             | Nombre del coordinador  |

La columna izquierda debe:

* tener aproximadamente `40%` del ancho;
* usar color naranja;
* texto semibold/bold.

La derecha:

* aproximadamente `60%`;
* color azul/gris oscuro.

No escribas estos valores directamente. **Conecta cada valor con las variables reales que ya utiliza el sistema.**

Las fechas deben respetar el formato que actualmente maneja la aplicación. Si tenemos un helper o formatter de fechas, reutilízalo.

---

# 6. Bloque: ¿Qué debe hacer el programa?

Debajo de la tabla dejar un margen aproximado de `24–28px`.

Agregar un encabezado con icono relacionado con usuario/tareas:

👤✓ **¿Qué debe hacer el programa?**

Mantener el mismo lenguaje visual:

* icono naranja;
* círculo naranja muy claro;
* título naranja;
* negrita.

Texto:

“A partir de esta notificación, se debe iniciar el proceso de autoevaluación y la preparación de la documentación requerida para la renovación de la Acreditación en Alta Calidad.

La documentación deberá ser entregada al Centro de Gestión de la Calidad y la Acreditación Institucional dentro del plazo establecido, para su correspondiente revisión y posterior trámite ante la plataforma del Ministerio de Educación Nacional.”

El contenido debe poder ajustarse dinámicamente si actualmente tenemos variables para mensajes/instrucciones de cada etapa.

Si existe una variable de descripción, instrucciones, mensaje de etapa o similar, úsala en lugar de hardcodear todo el contenido.

---

# 7. Bloque: Información importante

Crear una nueva sección:

ⓘ **Información importante**

Icono circular con:

* fondo rojo/naranja extremadamente claro;
* icono naranja/rojo institucional.

Texto:

“Si el programa se encuentra acreditado y cumple con los tiempos establecidos para la renovación de la Acreditación en Alta Calidad, no tendrá que realizar el trámite de renovación del Registro Calificado del programa.”

Este contenido debe seguir la misma lógica: utilizar una variable existente si el sistema ya permite configurar esta información.

---

# 8. Bloque de contacto

Al final del contenido principal colocar un bloque destacado con fondo azul muy claro/gris azulado.

Ejemplo aproximado:

`#F1F6FC`

Debe tener:

* border-radius de `10–12px`;
* padding aproximado de `14px 18px`;
* icono de sobre azul dentro de un pequeño círculo;
* texto alineado horizontalmente en escritorio.

Contenido:

✉️

“Para resolver inquietudes o realizar el envío de la información correspondiente al proceso, puede escribir al correo electrónico **[acredigral@unicauca.edu.co](mailto:acredigral@unicauca.edu.co)**.”

El correo debe aparecer:

* azul institucional;
* en negrita;
* como enlace `mailto:`.

Si el correo de contacto ya existe como parámetro/configuración del sistema, utilizarlo dinámicamente.

---

# 9. Footer

Crear un footer separado visualmente del cuerpo mediante una línea superior muy tenue.

Debe tener un fondo ligeramente crema/gris:

aproximadamente `#FCF7F3`.

Contenido centrado o ligeramente alineado a la izquierda:

🔒 `Este es un mensaje automático.`

Características:

* icono de candado pequeño;
* texto en color naranja oscuro o gris rojizo;
* tamaño aproximado `11–12px`;
* padding vertical generoso.

Las esquinas inferiores deben respetar el border-radius general de la tarjeta.

---

# 10. Responsive

La plantilla debe funcionar correctamente en:

* Gmail;
* Outlook;
* Apple Mail;
* navegadores móviles;
* clientes de correo en Android/iPhone.

En pantallas pequeñas:

* reducir padding lateral;
* reducir ligeramente el tamaño del título;
* permitir que la tabla mantenga una lectura correcta;
* evitar cualquier overflow horizontal;
* permitir que bloques horizontales pasen a disposición vertical cuando sea necesario.

---

# 11. Compatibilidad con correo HTML

IMPORTANTE: esto es una **plantilla de email**, no una página web normal.

Por lo tanto:

* prioriza estilos compatibles con clientes de correo;
* utiliza estilos inline cuando sea necesario;
* evita CSS que Gmail/Outlook no soporte adecuadamente;
* si es necesario, utiliza tablas para garantizar compatibilidad;
* no dependas de JavaScript;
* no uses componentes que requieran ejecución del lado del cliente;
* evita dependencias externas innecesarias;
* conserva accesibilidad y legibilidad.

Si el sistema actual usa React Email, MJML, Handlebars, EJS, Blade, Thymeleaf u otro sistema especializado, **respeta la tecnología existente en el proyecto** en lugar de sustituirla.

---

# 12. Variables dinámicas

No quiero una plantilla con valores quemados.

Debes mapear los contenidos a los parámetros existentes del sistema.

Conceptualmente necesitamos información equivalente a:

* destinatario;
* nombre del programa;
* tipo de alerta;
* nombre del proceso;
* etapa;
* fecha de vencimiento de acreditación;
* fecha límite de entrega;
* coordinador;
* instrucciones de la etapa;
* información importante;
* correo de contacto.

Pero **estos son nombres conceptuales, no nombres de variables que debas crear obligatoriamente**.

Primero identifica cómo se llaman actualmente en el proyecto y utiliza esos nombres.

Por ejemplo, si el sistema actualmente recibe algo equivalente a:

`programa.nombre`

no debes crear innecesariamente:

`programName`.

---

# 13. Iconografía

Los iconos deben parecerse visualmente a los de la referencia:

* alerta;
* portapapeles;
* usuario con check;
* información;
* correo;
* candado.

Preferiblemente reutiliza la librería de iconos que ya tenga instalada el proyecto.

No agregues una nueva dependencia solamente por estos iconos.

Si las limitaciones del correo HTML hacen poco confiable el uso de SVG externos, utiliza la solución más compatible con correo electrónico.

---

# 14. Resultado esperado

Quiero que implementes la plantilla directamente dentro de la estructura actual del proyecto.

Prioridades, en este orden:

1. Utilizar correctamente las variables reales existentes.
2. Mantener compatibilidad con clientes de correo.
3. Reproducir fielmente la estructura visual de la referencia.
4. Mantener el código claro y reutilizable.
5. Mantener el diseño responsive.
6. Evitar valores hardcodeados cuando deban ser dinámicos.

Antes de hacer cambios innecesariamente grandes, analiza el código existente.

Al terminar, explícame brevemente:

* qué archivo(s) modificaste;
* qué variables encontraste y cómo las mapeaste;
* cuáles contenidos quedaron dinámicos;
* si detectaste algún dato para el que actualmente no existe una variable;
* y cualquier limitación importante de compatibilidad con Gmail u Outlook.

No modifiques otras funcionalidades que no estén relacionadas con esta plantilla.
