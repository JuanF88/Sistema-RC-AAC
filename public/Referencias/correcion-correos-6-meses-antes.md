Quiero que implementes/adaptes una **plantilla de correo electrónico para la alerta “6 meses antes de la fecha límite”**, tomando como referencia visual la imagen que te proporcioné.

Debe conservar exactamente el mismo lenguaje visual y estructura institucional de las demás alertas del sistema, pero con los textos y lógica correspondientes al escenario de **seis meses antes de la entrega de la documentación**.

La plantilla debe integrarse con la arquitectura actual del proyecto y utilizar **las variables, parámetros y datos dinámicos que ya existen**.

## 1. Antes de modificar código

Primero revisa el proyecto e identifica:

* dónde se genera actualmente este correo;
* qué archivo, componente, template o servicio lo construye;
* qué variables recibe;
* cómo se llaman realmente los parámetros;
* qué helpers existen para fechas, textos, nombres y formato;
* qué componentes o estilos pueden compartirse con las demás plantillas de alertas.

**No inventes variables nuevas si ya existe un equivalente.**

Si algún dato requerido no existe actualmente en el sistema, indícamelo antes de dejar valores hardcodeados.

---

# 2. Objetivo de esta alerta

Esta plantilla corresponde al recordatorio enviado cuando **faltan seis meses para la fecha límite de entrega de la documentación**.

El mensaje debe transmitir que todavía existe un margen considerable de tiempo, pero que el programa debe revisar el avance del proceso, completar información pendiente y organizar la documentación necesaria.

El tono debe ser:

* preventivo;
* informativo;
* institucional;
* no alarmista;
* orientado a la planificación.

---

# 3. Diseño general

Mantén exactamente la misma familia visual de las otras plantillas.

Características:

* tarjeta vertical centrada;
* ancho máximo aproximado de `650–700px`;
* fondo blanco;
* borde exterior naranja muy sutil;
* esquinas redondeadas de aproximadamente `20px`;
* tipografía sans-serif institucional;
* espacios amplios entre secciones;
* buena jerarquía visual;
* responsive;
* compatible con clientes de correo.

---

# 4. Encabezado

Crear un encabezado destacado con degradado naranja institucional.

Referencia aproximada:

`#FF6A00 → #FFA800`

Debe tener:

* padding amplio;
* esquinas superiores redondeadas;
* texto blanco;
* altura suficiente para contener la etiqueta, título y programa.

## 4.1 Etiqueta de alerta

En la parte superior izquierda debe aparecer una etiqueta oscura semitransparente con:

* icono de alerta;
* texto blanco;
* mayúsculas;
* border-radius.

Texto:

**ALERTA | 6 MESES PARA LA FECHA LÍMITE**

Si el sistema maneja el nombre de la alerta dinámicamente, utiliza esa variable.

---

# 5. Título principal

Debajo debe aparecer:

**Quedan seis meses para la entrega de la documentación
para la renovación de la Acreditación en Alta Calidad**

Características:

* blanco;
* bold;
* aproximadamente `28–34px`;
* máximo 2–3 líneas en escritorio;
* buena separación respecto a la etiqueta.

El texto debe poder configurarse dinámicamente si el sistema ya maneja títulos según tipo de alerta.

---

# 6. Nombre del programa

Debajo del título mostrar dinámicamente el programa.

Ejemplo:

**Licenciatura en Educación Física, Recreación y Deportes**

Debe ir:

* en blanco;
* tamaño aproximado `17–20px`;
* con menor peso que el título.

---

# 7. Saludo y contexto

En el cuerpo blanco, comenzar con el destinatario:

**Universitario Robinson Meneses Llanos:**

Este nombre debe ser dinámico.

Debajo incluir:

“Esta alerta se genera en el marco del seguimiento que realiza el Centro de Gestión de la Calidad y la Acreditación Institucional al proceso de renovación de la Acreditación en Alta Calidad de los programas académicos de la Universidad.”

Este bloque puede reutilizarse de las demás plantillas si ya existe como componente o contenido común.

---

# 8. Información del proceso

Agregar sección con icono de portapapeles dentro de un círculo naranja claro.

Título:

**Información del proceso**

Debajo debe aparecer una tabla de dos columnas.

Campos:

* Programa
* Proceso
* Etapa
* Fecha de vencimiento de la acreditación
* Fecha límite de entrega al CGCAI
* Coordinador

La columna izquierda debe usar:

* naranja institucional;
* semibold/bold.

La derecha:

* azul institucional oscuro;
* peso normal.

Todos los valores deben provenir de las variables existentes.

## Etapa para esta alerta

Conceptualmente, la etapa debe corresponder a:

**Seis meses para la entrega de la documentación**

Pero utiliza el valor dinámico del sistema si ya existe.

No lo dupliques ni lo hardcodees innecesariamente.

---

# 9. Sección: ¿Qué debe hacer el programa?

Agregar icono de usuario con check dentro de un círculo amarillo/naranja muy claro.

Título:

**¿Qué debe hacer el programa?**

Texto específico para esta alerta:

“Quedan seis meses para la fecha límite de entrega de la documentación. En este momento, el programa debe verificar el avance del proceso de autoevaluación, completar la información requerida y asegurar que la documentación se encuentre organizada para su entrega dentro del plazo establecido.

La documentación deberá ser entregada por el programa al Centro de Gestión de la Calidad y la Acreditación Institucional dentro del plazo establecido, para su correspondiente revisión y posterior trámite ante la plataforma del Ministerio de Educación Nacional.”

Si el sistema ya recibe un texto de instrucciones según el tipo de alerta o etapa, utilizar ese valor dinámico.

El primer párrafo es el que debe diferenciar principalmente esta alerta de las demás.

---

# 10. Información importante

Agregar una sección con icono de información dentro de un círculo rosado/naranja claro.

Título:

**Información importante**

Texto:

“Si el programa se encuentra acreditado y cumple con los tiempos establecidos para la renovación de la Acreditación en Alta Calidad, no tendrá que realizar el trámite de renovación del Registro Calificado del programa.”

Este bloque puede reutilizarse del template base porque es información institucional común.

---

# 11. Bloque de contacto

Al final del cuerpo colocar un bloque de fondo azul muy claro con esquinas redondeadas.

Agregar un icono de correo azul dentro de un pequeño círculo.

Texto:

“Para resolver inquietudes o realizar la entrega de la información correspondiente al proceso, puede escribir al correo electrónico **[acredigral@unicauca.edu.co](mailto:acredigral@unicauca.edu.co)**.”

El correo debe:

* mostrarse en azul;
* estar en negrita;
* funcionar mediante `mailto:`.

Si existe una configuración o variable para el correo institucional, utilizarla en lugar de hardcodearlo.

---

# 12. Footer

Crear un footer con fondo crema muy suave.

Agregar un icono pequeño de candado.

Texto:

**Este es un mensaje automático. Por favor, no responda a este correo.**

Características:

* color naranja/terracota;
* tamaño pequeño;
* padding cómodo;
* esquinas inferiores redondeadas.

---

# 13. Diferencia respecto a la alerta de 1 mes

IMPORTANTE:

Esta alerta no debe comunicar la misma urgencia que la alerta de 1 mes.

La diferencia principal está en el contenido de orientación.

### Alerta 6 meses

Debe enfatizar:

* revisión del avance del proceso;
* organización;
* completar información;
* planificación de la documentación;
* seguimiento preventivo.

### Alerta 1 mes

Está enfocada en:

* finalizar;
* verificar que todo esté completo;
* realizar la entrega.

Por lo tanto, **no reutilices exactamente el mismo texto de instrucciones para ambas alertas**.

La estructura visual sí debe ser prácticamente idéntica.

---

# 14. Reutilización del sistema de plantillas

Como ya existen otras alertas con esta misma estructura, quiero evitar duplicación de código.

Antes de crear una plantilla totalmente independiente, analiza si podemos tener una estructura base común.

Idealmente debería existir algo conceptualmente equivalente a:

* Header de alerta
* Información del programa
* Tabla del proceso
* Instrucciones
* Información importante
* Contacto
* Footer

Y que cada tipo de alerta solo cambie información como:

* nombre de alerta;
* título;
* etapa;
* instrucciones;
* eventualmente colores o nivel de urgencia.

No es obligatorio crear exactamente estos componentes si la arquitectura actual no lo requiere.

**Respeta primero la estructura que ya tenga el proyecto.**

---

# 15. Variables dinámicas

Conceptualmente necesitamos datos equivalentes a:

* destinatario;
* programa;
* proceso;
* etapa;
* tipo de alerta;
* título de alerta;
* fecha de vencimiento;
* fecha límite de entrega;
* coordinador;
* instrucciones;
* información importante;
* correo de contacto.

Estos nombres son únicamente conceptuales.

Antes de implementar, identifica las variables reales del proyecto.

Por ejemplo, si ya existe:

`alert.stage`

no crees:

`alertStage`

únicamente para esta plantilla.

---

# 16. Compatibilidad con correo electrónico

Recuerda que esto es **HTML Email**.

Prioriza:

* Gmail;
* Outlook;
* Apple Mail;
* clientes móviles.

Por lo tanto:

* no uses JavaScript;
* usa estilos inline donde sea necesario;
* evita CSS experimental;
* evita layouts que Outlook no interprete correctamente;
* utiliza tablas cuando sean necesarias para asegurar compatibilidad;
* no agregues dependencias innecesarias.

Si el proyecto utiliza MJML, React Email, Handlebars, EJS, Blade, Thymeleaf u otra tecnología específica, utiliza la solución existente.

---

# 17. Responsive

En móvil:

* reducir padding;
* reducir el tamaño del título;
* evitar overflow horizontal;
* garantizar que la tabla siga siendo legible;
* mantener los iconos alineados correctamente;
* conservar la jerarquía de la información.

---

# 18. Resultado esperado

Implementa esta variante de **6 meses antes de la fecha límite** dentro del sistema existente.

Prioridades:

1. Reutilizar la estructura existente de correos.
2. Conectar correctamente las variables reales.
3. Mantener la misma identidad visual de las demás alertas.
4. Diferenciar correctamente el contenido de la alerta de 6 meses.
5. Mantener compatibilidad con clientes de correo.
6. Evitar duplicación innecesaria de código.
7. Evitar hardcodear datos que ya sean dinámicos.

Al finalizar, explícame brevemente:

* qué archivo(s) modificaste;
* qué componentes reutilizaste;
* qué variables encontraste;
* cómo se determina que esta es la alerta de 6 meses;
* qué contenido cambia respecto a la alerta de 1 mes;
* qué información permanece compartida;
* y si encontraste algún dato que todavía no exista como variable.

No modifiques funcionalidades que no estén relacionadas con el sistema de alertas de acreditación.
