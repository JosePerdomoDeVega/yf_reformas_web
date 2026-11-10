# Publicar un post nuevo en el blog

## La primera vez (una sola vez)

1. **Si todavía no tienes la carpeta del proyecto en tu ordenador**, instala Git (un único
   instalador, Siguiente → Siguiente → Finalizar): https://git-scm.com/download/win
   Luego abre PowerShell y escribe (cambiando la URL por la que te han dado):
   ```
   git clone https://github.com/<usuario-propietario>/<nombre-del-repo>.git
   ```
   La primera vez que subas algo te pedirá tu usuario de GitHub y, como contraseña, el token que
   te han dado (no tu contraseña normal de GitHub). Lo recordará después.

   Si en cambio ya te han entregado la carpeta del proyecto directamente, salta este paso.

2. Entra en la carpeta `scripts` y haz **doble clic en `instalar.cmd`**.
   Esto instala automáticamente lo que falte (Git, Python) y te pide pegar una clave gratuita de
   OpenRouter (te dice en pantalla cómo conseguirla) para que la IA pueda escribir los posts.
3. Cuando termine, cierra esa ventana y abre una ventana nueva de PowerShell.

A partir de aquí no hace falta instalar nada más.

## Cada vez que quieras publicar un post

1. Abre PowerShell (en cualquier carpeta) y escribe:
   ```
   blog
   ```
   (Si por lo que sea el comando `blog` no funciona, entra en la carpeta `scripts` del proyecto y
   haz doble clic en `blog.cmd` — hace exactamente lo mismo.)
2. El script te preguntará de qué quieres que trate el post, qué quieres conseguir con él, y a qué
   página de servicio quieres enlazar.
3. Te abrirá el post en el navegador para que lo veas tal cual quedará en la web.
4. En la ventana que se ha abierto, puedes:
   - Escribir **`s`** para publicarlo tal cual.
   - Escribir cualquier otra cosa (por ejemplo "hazlo mas corto" o "quita el segundo parrafo") para
     que la IA lo corrija — vuelve a abrir el resultado y te pregunta otra vez.
   - Escribir **`c`** para cancelar sin publicar nada.
5. Al confirmar con `s`, sube el post automáticamente. En unos minutos estará visible en
   https://yf-reformas.com/blog/

Si algo falla (sin conexión, clave incorrecta, etc.) el script lo explica en pantalla y no sube nada
a medias — puedes simplemente volver a escribir `blog`.
