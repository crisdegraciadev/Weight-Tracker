# Weight tracker

Página estática (`index.html`) que usa tu Google Sheet como base de datos. Lee y escribe directamente en la hoja: lo que cambies en la app aparece en el Sheet y viceversa (la app recarga al volver a la pestaña o con ↻).

Estructura de la hoja que espera (fila 1 = cabeceras):

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Fecha | Pasos | Media (fórmula) | Peso | Media (fórmula) | Min (fórmula) | Notas (una por semana, en la fila del lunes) |

La app solo escribe en A, B, D y G. Las fórmulas de C, E y F no se tocan.

## 1. Crear el OAuth Client ID (una vez)

1. Ve a <https://console.cloud.google.com/>, crea un proyecto.
2. **APIs y servicios → Biblioteca** → habilita **Google Sheets API**.
3. **Pantalla de consentimiento OAuth** → tipo *Externo*, déjala en modo *Testing* y añade tu email en *Usuarios de prueba*.
4. **Credenciales → Crear credenciales → ID de cliente OAuth** → tipo *Aplicación web*.
   En *Orígenes de JavaScript autorizados* añade:
   - `https://<tu-usuario>.github.io`
   - `http://localhost:8000` (para probar en local)
5. Copia el Client ID y pégalo en `CLIENT_ID` dentro de `index.html`. No es un secreto, puede ir en el repo.

Al entrar, Google mostrará el aviso de "app no verificada": es normal para una app personal en modo Testing.

## 2. Probar en local

```sh
python3 -m http.server 8000
```

Abre <http://localhost:8000>, entra con Google, pega la URL del Sheet, elige la pestaña y listo.

## 3. Publicar en GitHub Pages

```sh
git init && git add . && git commit -m "Weight tracker"
git branch -M main
git remote add origin git@github.com:<tu-usuario>/weight-tracker.git
git push -u origin main
```

En GitHub: **Settings → Pages → Deploy from a branch → main / (root)**. Quedará en `https://<tu-usuario>.github.io/weight-tracker/`.

## Notas

- La sesión de Google dura 1 hora; después pide entrar de nuevo.
- Si guardas una fecha que no existe en la hoja, se añade una fila al final.
