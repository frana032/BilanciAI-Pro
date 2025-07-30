# BilanciAI Pro

BilanciAI Pro es una aplicación web para analizar estados financieros. Permite cargar archivos en formato **PDF**, **CSV**, **TXT** o **Excel** y genera métricas e indicadores clave.

## Funcionalidades principales

- Extracción de datos desde archivos de diferentes formatos.
- Cálculo de métricas como ingresos totales, EBITDA y margen neto.
- Visualización de gráficos con histórico de ingresos, costos y liquidez.
- Exportación de resultados a PDF, Excel o JSON.
- Funcionamiento offline mediante *Service Worker* (cuando se utiliza `sw.js`).

## Uso

1. Clona este repositorio o descarga los archivos.
2. Abre `webapp.html` en tu navegador web.
3. Arrastra el archivo de tu balance o selecciónalo manualmente.
4. Revisa las métricas y las recomendaciones generadas.

No se requieren dependencias ni compilación adicional: todo el código está en los archivos `webapp.js` y `webapp.css` incluidos.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo [`LICENSE`](LICENSE) para más información.
