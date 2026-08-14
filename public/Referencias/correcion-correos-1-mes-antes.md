Quiero que implementes/adaptes una **plantilla de correo electrónico para la alerta “1 mes antes de la fecha límite”** tomando como referencia visual la imagen que te proporcioné.

La plantilla debe conservar el mismo lenguaje gráfico institucional del diseño anterior: limpia, profesional, moderna, con jerarquía visual clara y pensada para **correo HTML compatible con Gmail, Outlook y móvil**.

Además, debes integrarla con la estructura actual del proyecto y usar **los parámetros, variables y datos dinámicos que ya existen en el sistema**.

## 1. Antes de modificar código

Primero revisa el proyecto e identifica:

* dónde se genera actualmente este correo;
* qué archivo, componente, template o servicio lo construye;
* qué variables recibe actualmente;
* cómo se llaman realmente esos parámetros;
* qué helpers o utilidades ya existen para formatear fechas, nombres o textos;
* qué estilos institucionales pueden reutilizarse.

**No inventes variables nuevas si ya existe un equivalente en el sistema.**

Si algún texto o dato de esta plantilla no cuenta aún con una variable en el proyecto, indícamelo antes de dejarlo hardcodeado.

---

# 2. Objetivo de esta plantilla

Esta plantilla corresponde a la **alerta enviada un mes antes de la fecha límite de entrega**.

Debe comunicar que:

* queda un mes para la entrega;
* el programa está en la etapa final de preparación;
* debe revisar, completar y entregar la documentación dentro del plazo establecido.

Visualmente debe parecer una variante del diseño base de alertas, pero con el contenido ajustado al escenario de **“1 mes antes”**.

---

# 3. Diseño general

La plantilla debe verse como una **tarjeta institucional vertical**, centrada en el correo, con estas características:

* ancho máximo aproximado de `650–700px`;
* fondo general blanco;
* borde exterior sutil;
* esquinas redondeadas amplias, aproximadamente `20px`;
* estructura vertical limpia;
* tipografía sans-serif moderna, preferiblemente la que ya use el proyecto;
* buena separación entre secciones;
* diseño liviano, elegante y fácil de leer;
* responsive para móviles.

Mantén bastante espacio en blanco y una lectura cómoda.

---

# 4. Encabezado principal

El encabezado superior debe ser un bloque destacado con un **degradado naranja intenso**, similar al de la imagen de referencia.

Sugerencia visual aproximada:

`#F57C00 → #FFB300`

No tiene que ser exacto si el sistema ya tiene una paleta institucional equivalente.

Debe ocupar aproximadamente `190–220px` de alto en escritorio, con padding interno amplio.

Las esquinas superiores deben seguir el mismo redondeado de la tarjeta.

## 4.1 Etiqueta superior de alerta

En la parte superior izquierda debe aparecer una etiqueta tipo pill con:

* fondo naranja más oscuro;
* bordes redondeados;
* icono de alerta;
* texto blanco en mayúsculas.

Texto esperado visualmente:

**ALERTA | 1 MES PARA LA FECHA LÍMITE**

Este texto debe ser dinámico si el sistema ya maneja un nombre/tipo de alerta configurable.

## 4.2 Título principal

Debajo de la etiqueta debe aparecer, en blanco, negrita y gran tamaño, el texto principal:

**Queda un mes para la entrega de la documentación
para la renovación de la Acreditación en Alta Calidad**

Debe respetar saltos visuales armónicos y ocupar máximo 2–3 líneas en escritorio.

Este texto puede construirse dinámicamente a partir de la etapa o del tipo de alerta, si el sistema ya contempla eso.

Tamaño aproximado:

`28–34px`

Peso:

`700`

## 4.3 Subtítulo

Debajo debe aparecer el nombre del programa, por ejemplo:

**Licenciatura en Educación Física, Recreación y Deportes**

Este dato debe provenir de la variable correspondiente al nombre del programa.

Color blanco con un poco menos de peso visual que el título.

---

# 5. Saludo / destinatario

Luego del encabezado inicia el cuerpo blanco de la plantilla.

Usar padding aproximado de:

`28px 30px`

Primero mostrar el nombre del destinatario en negrita, color azul institucional oscuro.

Ejemplo:

**Universitario Robinson Meneses Llanos:**

El nombre debe ser dinámico.

Debajo debe aparecer el texto introductorio:

“Esta alerta se genera en el marco del seguimiento que realiza el Centro de Gestión de la Calidad y la Acreditación Institucional al proceso de renovación de la Acreditación en Alta Calidad de los programas académicos de la Universidad.”

Este texto puede ser reutilizable entre plantillas si ya existe como bloque común.

Características:

* tamaño `14–16px`;
* color azul/gris oscuro;
* line-height cómodo.

---

# 6. Sección: Información del proceso

Agregar una sección con icono y título.

Estructura visual:

* icono de portapapeles dentro de un círculo color durazno / naranja claro;
* a la derecha el título en naranja:

**Información del proceso**

El título debe ser:

* color naranja institucional;
* negrita;
* aproximadamente `16–18px`.

## 6.1 Tabla de información

Debajo, colocar una tabla con bordes finos y esquinas redondeadas.

Debe mostrar dos columnas:

* izquierda: nombre del campo;
* derecha: valor dinámico.

Campos:

* Programa
* Proceso
* Etapa
* Fecha de vencimiento de la acreditación
* Fecha límite de entrega al CGCAI
* Coordinador

Los valores deben mapearse a las variables reales existentes del proyecto.

### Importante para esta plantilla

En esta alerta, la etapa mostrada puede corresponder conceptualmente a algo como:

**Etapa final de preparación y entrega**

Pero **no hardcodees esto si el sistema ya lo recibe como variable**.

Características visuales:

* columna izquierda en color naranja y peso semibold;
* columna derecha en color azul/gris oscuro;
* bordes suaves;
* ancho 100%;
* legible también en móvil.

Las fechas deben formatearse con las utilidades actuales del sistema, si ya existen.

---

# 7. Sección: ¿Qué debe hacer el programa?

Crear una sección con el mismo patrón visual:

* icono de usuario/tarea o usuario con check, dentro de círculo naranja claro;
* título en naranja.

Título:

**¿Qué debe hacer el programa?**

El contenido debe ser específico para la alerta de **1 mes antes**.

Texto esperado:

“Queda un mes para la fecha límite de entrega de la documentación. En este momento, el programa debe finalizar la preparación de la información, verificar que la documentación requerida esté completa y realizar su entrega al Centro de Gestión de la Calidad y la Acreditación Institucional dentro del plazo establecido.

La documentación deberá ser entregada por el programa al Centro de Gestión de la Calidad y la Acreditación Institucional dentro del plazo establecido, para su correspondiente revisión y posterior trámite ante la plataforma del Ministerio de Educación Nacional.”

Si el sistema ya maneja instrucciones dinámicas por etapa o por tipo de alerta, usa esa fuente de datos en lugar de dejar este contenido fijo.

Esta sección debe mantener:

* cuerpo en color azul oscuro/gris;
* tamaño `14–15px`;
* buena separación entre párrafos;
* lectura cómoda.

---

# 8. Sección: Información importante

Crear una nueva sección con el mismo lenguaje gráfico.

Encabezado con:

* icono de información dentro de círculo rosado / naranja muy claro;
* título en naranja:

**Información importante**

Texto:

“Si el programa se encuentra acreditado y cumple con los tiempos establecidos para la renovación de la Acreditación en Alta Calidad, no tendrá que realizar el trámite de renovación del Registro Calificado del programa.”

Si ya existe una variable o bloque de contenido institucional para esta observación, reutilízalo.

---

# 9. Bloque de contacto

Al final del cuerpo principal, incluir un bloque destacado con:

* fondo azul muy claro;
* bordes redondeados;
* padding interno generoso;
* icono de sobre azul dentro de un pequeño círculo claro.

Texto:

“Para resolver inquietudes o realizar la entrega de la información correspondiente al proceso, puede escribir al correo electrónico **[acredigral@unicauca.edu.co](mailto:acredigral@unicauca.edu.co)**.”

El correo debe ir en negrita, color azul y como enlace `mailto:`.

Si en el proyecto el correo de contacto ya existe como variable o configuración, úsalo de forma dinámica.

---

# 10. Footer

Agregar un footer inferior separado del contenido principal por una línea o cambio leve de fondo.

Debe tener un fondo crema muy suave y mantener el redondeado inferior de la tarjeta.

Texto:

**Este es un mensaje automático. Por favor, no responda a este correo.**

Acompañarlo con un pequeño icono de candado.

Características:

* tamaño `11–12px`;
* color naranja oscuro / terracota;
* padding cómodo;
* visual discreto pero claro.

---

# 11. Responsive

La plantilla debe verse bien en escritorio y móvil.

En pantallas pequeñas:

* reducir el padding lateral;
* disminuir ligeramente el tamaño del título principal;
* garantizar que la tabla no desborde horizontalmente;
* permitir que los bloques con icono se ajusten verticalmente si hace falta;
* mantener la legibilidad en clientes móviles.

---

# 12. Compatibilidad con correo HTML

Esto es una **plantilla de email**, no una página web convencional.

Por lo tanto:

* prioriza compatibilidad con Gmail y Outlook;
* usa HTML y estilos compatibles con clientes de correo;
* aplica estilos inline cuando sea necesario;
* si hace falta, usa tablas para asegurar rendering consistente;
* no dependas de JavaScript;
* no uses componentes interactivos;
* evita dependencias externas innecesarias.

Si el proyecto usa React Email, MJML, Handlebars, Blade, Thymeleaf, EJS u otro sistema, **respeta la tecnología actual del repositorio** y adáptate a ella.

---

# 13. Variables dinámicas

La plantilla debe quedar conectada a los parámetros reales del sistema.

A nivel conceptual, esta plantilla requiere información equivalente a:

* destinatario;
* nombre del programa;
* tipo de alerta;
* título o descripción de la alerta;
* nombre del proceso;
* etapa;
* fecha de vencimiento de acreditación;
* fecha límite de entrega;
* coordinador;
* instrucciones;
* observación importante;
* correo de contacto.

Pero estos son solo nombres conceptuales.

**No crees nombres nuevos si ya existen equivalentes en el proyecto.**
Primero identifica cómo se llaman realmente y usa esas variables.

---

# 14. Reutilización con la plantilla anterior

Como esta es una variante del diseño institucional anterior, intenta que la implementación sea mantenible y reutilizable.

Idealmente:

* reutiliza estilos base;
* reutiliza componentes comunes si ya existen;
* cambia únicamente los bloques de contenido, el texto del encabezado y la lógica específica de esta alerta;
* evita duplicación innecesaria.

Si detectas que ambas plantillas pueden compartir una misma estructura con variantes por etapa/alerta, organiza el código de forma clara.

---

# 15. Resultado esperado

Quiero que implementes esta plantilla directamente dentro del proyecto.

Prioridades, en este orden:

1. Usar correctamente las variables reales existentes.
2. Mantener compatibilidad con correo HTML.
3. Reproducir fielmente el diseño de la referencia.
4. Mantener código claro y reutilizable.
5. Preservar responsividad.
6. Evitar hardcodear lo que deba venir desde parámetros.

Al finalizar, explícame brevemente:

* qué archivo(s) modificaste;
* qué variables encontraste y cómo las mapeaste;
* qué textos quedaron dinámicos;
* qué partes reutilizaste del diseño base;
* si detectaste datos faltantes;
* y cualquier limitación relevante de compatibilidad con Gmail u Outlook.

No modifiques funcionalidades ajenas a esta plantilla.
