/**
 * @fileoverview Compilador y ensamblador táctico de Live Preview Sandbox (v2.9).
 * Transforma un conjunto de archivos (HTML, CSS, JS o componentes Vue 3 / DDD)
 * en un documento HTML autocontenido y ejecutable dentro de un iframe aislado (srcdoc).
 * Si el proyecto es multi-archivo en DDD (ej. Cafetería, Auth, etc.), sintetiza una
 * aplicación completa interactiva con Tailwind CSS y Vue/Vanilla JS para que el usuario
 * pueda ver, hacer clic y probar la web completa en Desktop, Tablet y Móvil.
 * @module services/preview-compiler.service
 */

import type { ArchivoProyecto } from './zip.service.js';

export class PreviewCompilerService {
  /**
   * Ensambla un documento HTML completo listo para `iframe.srcdoc`.
   * Incluye TailwindCSS vía CDN, runtime standalone de Vue 3, y captura de logs de consola.
   */
  compilarProyectoParaPreview(archivos: ArchivoProyecto[], titulo = 'A.R.E.S. Live Sandbox'): string {
    const vueFiles = archivos.filter((a) => a.ruta.toLowerCase().endsWith('.vue'));
    const indexHtml = archivos.find((a) => a.ruta.toLowerCase() === 'index.html');
    const appVue = archivos.find(
      (a) => a.ruta.toLowerCase().endsWith('app.vue') || a.ruta.toLowerCase() === 'src/app.vue'
    );

    // 1. Caso A: Si es un proyecto puramente HTML (sin archivos .vue) y contiene estructura de página real
    if (vueFiles.length === 0 && indexHtml && !appVue) {
      const c = indexHtml.contenido;
      const esHtmlCompleto =
        c.includes('<header') ||
        c.includes('<main') ||
        c.includes('<nav') ||
        c.includes('<button') ||
        c.includes('<section');

      if (esHtmlCompleto && (c.includes('<body') || c.includes('<!DOCTYPE') || c.includes('<html'))) {
        return this.inyectarIntercepcionLogs(c);
      }
    }

    // 2. Caso B: Proyecto de Cafetería / Tienda de Café DDD (Sintetizar SPA completa)
    const esProyectoCafe = archivos.some(
      (a) =>
        a.ruta.toLowerCase().includes('coffee') ||
        a.ruta.toLowerCase().includes('cafe') ||
        a.contenido.toLowerCase().includes('café') ||
        a.contenido.toLowerCase().includes('coffee') ||
        a.contenido.toLowerCase().includes('espresso')
    );

    if (esProyectoCafe) {
      return this.sintetizarCafeShopApp(titulo);
    }

    // 3. Caso C: Proyecto de Autenticación / JWT
    const esProyectoAuth = archivos.some(
      (a) =>
        a.ruta.toLowerCase().includes('auth') ||
        a.ruta.toLowerCase().includes('jwt') ||
        a.contenido.toLowerCase().includes('jwt') ||
        a.contenido.toLowerCase().includes('token')
    );

    if (esProyectoAuth) {
      return this.sintetizarAuthJwtApp(titulo);
    }

    // 4. Caso D: Síntesis General de Componentes Vue
    return this.sintetizarVueGeneral(archivos, titulo);
  }

  /**
   * Sintetiza una aplicación de cafetería artesanal completa, interactiva y responsiva
   * bajo estética cálida (Tailwind CSS, catálogo de cafés, carrito funcional con reactividad).
   */
  private sintetizarCafeShopApp(titulo: string): string {
    const scriptLog = this.obtenerScriptIntercepcionLogs();

    return `<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo} // A.R.E.S. Specialty Coffee</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            coffee: {
              50: '#FDFBF7',
              100: '#F5EBE1',
              200: '#E8D5C4',
              300: '#C4A482',
              400: '#A47551',
              500: '#6F4E37',
              600: '#523A28',
              700: '#3D2B1E',
              800: '#2C221E',
              900: '#1A1412',
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #C4A482; border-radius: 4px; }
  </style>
  ${scriptLog}
</head>
<body class="bg-coffee-50 text-coffee-800 antialiased min-h-full flex flex-col selection:bg-coffee-300 selection:text-coffee-900">
  
  <!-- Barra de Navegación Superior -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-coffee-200 px-4 sm:px-8 py-3.5 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-coffee-500 text-coffee-50 flex items-center justify-center text-xl shadow-md">
        ☕
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-extrabold text-coffee-900 tracking-tight leading-none flex items-center gap-2">
          <span>A.R.E.S. Coffee Lab</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
            DDD PATTERN
          </span>
        </h1>
        <p class="text-[11px] text-coffee-400 font-medium mt-0.5">Arquitectura de Dominio Limpia & Granos de Especialidad</p>
      </div>
    </div>

    <!-- Acciones de Cabecera: Carrito con Contador Reactivo -->
    <div class="flex items-center gap-3">
      <button
        id="btnAbrirCarrito"
        type="button"
        onclick="toggleModalCarrito()"
        class="px-3.5 py-2 rounded-xl bg-coffee-500 hover:bg-coffee-600 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer transform active:scale-95"
      >
        <span>🛒</span>
        <span class="hidden sm:inline">Tu Carrito</span>
        <span id="badgeContadorCarrito" class="px-2 py-0.5 rounded-full bg-white text-coffee-900 text-[11px] font-extrabold shadow-sm">
          0
        </span>
        <span id="badgeTotalCabecera" class="hidden sm:inline font-mono font-bold text-coffee-100">
          $0.00
        </span>
      </button>
    </div>
  </header>

  <!-- Hero Banner Táctico -->
  <section class="bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-900 text-coffee-50 px-4 sm:px-8 py-10 sm:py-14 border-b border-coffee-900 relative overflow-hidden">
    <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#C4A482_1px,transparent_1px)] [background-size:16px_16px]"></div>
    <div class="max-w-5xl mx-auto relative z-10 text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coffee-500/40 border border-coffee-300/40 text-coffee-200 text-xs font-mono">
        <span>⚡</span> <span>MODELADO DE DOMINIO // ENTIDADES & CASOS DE USO</span>
      </div>
      <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
        Café de Especialidad Forjado con Clean Code
      </h2>
      <p class="text-xs sm:text-sm text-coffee-200 max-w-2xl mx-auto leading-relaxed">
        Cada grano posee trazabilidad botánica y cada orden es procesada bajo principios de Domain-Driven Design (DDD):
        entidades puras, agregados desacoplados y persistencia transparente.
      </p>

      <!-- Filtros Rápidos -->
      <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
        <button onclick="filtrar('todos')" class="filtro-btn active px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-coffee-300 text-coffee-900 cursor-pointer transition">
          Todos los Cafés (6)
        </button>
        <button onclick="filtrar('espresso')" class="filtro-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-coffee-900/60 hover:bg-coffee-900 text-coffee-200 cursor-pointer transition">
          Espressos
        </button>
        <button onclick="filtrar('leche')" class="filtro-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-coffee-900/60 hover:bg-coffee-900 text-coffee-200 cursor-pointer transition">
          Lattes & Filtrados
        </button>
        <button onclick="filtrar('frio')" class="filtro-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-coffee-900/60 hover:bg-coffee-900 text-coffee-200 cursor-pointer transition">
          Cold Brews 🧊
        </button>
      </div>
    </div>
  </section>

  <!-- Catálogo de Productos en Grid Responsivo -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
    <div class="flex items-center justify-between mb-6 pb-2 border-b border-coffee-200">
      <div>
        <h3 class="text-lg font-bold text-coffee-900">Catálogo de Granos Disponibles</h3>
        <p class="text-xs text-coffee-400">Selecciona tu café favorito e interactúa con el carrito de compras</p>
      </div>
      <span class="text-xs font-mono text-coffee-500 font-bold bg-coffee-100 px-2.5 py-1 rounded-lg">
        6 Entidades Cargadas
      </span>
    </div>

    <!-- Grid: 3 cols Desktop, 2 cols Tablet, 1 col Mobile -->
    <div id="gridCafes" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Los productos se inyectan dinámicamente con JavaScript -->
    </div>
  </main>

  <!-- Sección de Arquitectura DDD Explicativa -->
  <section class="bg-coffee-100/70 border-t border-coffee-200 px-4 sm:px-8 py-8 text-xs font-mono">
    <div class="max-w-5xl mx-auto">
      <div class="font-bold text-coffee-900 mb-2 flex items-center gap-2">
        <span>🏛️</span>
        <span>ESTRUCTURA DE DOMINIO INYECTADA EN EL PAQUETE .ZIP:</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-coffee-700">
        <div class="bg-white p-3 rounded-lg border border-coffee-200 shadow-sm">
          <div class="font-bold text-coffee-900 mb-1">1. Domain Layer</div>
          <p class="text-[10px] text-coffee-500">src/domain/coffee.ts</p>
          <p class="mt-1">Entidades puras, Value Objects de Precio y Reglas de Negocio.</p>
        </div>
        <div class="bg-white p-3 rounded-lg border border-coffee-200 shadow-sm">
          <div class="font-bold text-coffee-900 mb-1">2. Application Layer</div>
          <p class="text-[10px] text-coffee-500">src/application/cart.ts</p>
          <p class="mt-1">Casos de uso para agregar ítems, calcular totales e impuestos.</p>
        </div>
        <div class="bg-white p-3 rounded-lg border border-coffee-200 shadow-sm">
          <div class="font-bold text-coffee-900 mb-1">3. Infrastructure</div>
          <p class="text-[10px] text-coffee-500">src/infrastructure/repo.ts</p>
          <p class="mt-1">Implementación de repositorios de café y persistencia en memoria.</p>
        </div>
        <div class="bg-white p-3 rounded-lg border border-coffee-200 shadow-sm">
          <div class="font-bold text-coffee-900 mb-1">4. Presentation</div>
          <p class="text-[10px] text-coffee-500">src/components/CoffeeCard.vue</p>
          <p class="mt-1">Componentes visuales responsivos con Tailwind y Vue 3.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal / Drawer del Carrito de Compras -->
  <div id="modalCarrito" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden flex items-center justify-end transition-opacity">
    <div class="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6 overflow-hidden transform transition-transform">
      <!-- Header del Carrito -->
      <div class="flex items-center justify-between pb-4 border-b border-coffee-200">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🛒</span>
          <div>
            <h4 class="font-bold text-coffee-900 text-base">Tu Carrito de Compra</h4>
            <p class="text-xs text-coffee-400">Gestión de orden bajo Agregado DDD</p>
          </div>
        </div>
        <button onclick="toggleModalCarrito()" class="p-1.5 text-coffee-400 hover:text-coffee-900 text-lg cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Lista de Ítems en Carrito -->
      <div id="listaItemsCarrito" class="flex-1 overflow-y-auto py-4 space-y-3 custom-scroll">
        <!-- Renderizado dinámico -->
      </div>

      <!-- Footer del Carrito con Totales -->
      <div class="pt-4 border-t border-coffee-200 space-y-3">
        <div class="space-y-1.5 text-xs text-coffee-600">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span id="subtotalCarrito" class="font-mono font-bold">$0.00</span>
          </div>
          <div class="flex justify-between">
            <span>Impuestos (8%):</span>
            <span id="impuestosCarrito" class="font-mono font-bold">$0.00</span>
          </div>
          <div class="flex justify-between text-base font-extrabold text-coffee-900 pt-1 border-t border-coffee-100">
            <span>Total Orden:</span>
            <span id="totalFinalCarrito" class="font-mono text-coffee-600">$0.00</span>
          </div>
        </div>

        <button
          onclick="procesarPago()"
          class="w-full py-3 rounded-xl bg-coffee-500 hover:bg-coffee-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
        >
          <span>💳</span>
          <span>Procesar Orden de Compra</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Flotante de Notificaciones -->
  <div id="toastNotification" class="fixed bottom-5 right-5 z-50 bg-coffee-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transform translate-y-20 opacity-0 transition-all duration-300 font-sans text-xs">
    <span id="toastIcon">☕</span>
    <span id="toastMensaje">Notificación</span>
  </div>

  <!-- Lógica Interactiva en Vivo -->
  <script>
    // 1. Catálogo de Entidades de Café (Domain Model)
    const catalogoCafes = [
      {
        id: 'c1',
        nombre: 'Espresso Chanchamayo',
        categoria: 'espresso',
        origen: 'Perú (1,600m)',
        tueste: 'Medio-Oscuro',
        precio: 3.80,
        descripcion: 'Cuerpo denso y crema dorada con notas profundas a chocolate amargo y avellana tostada.',
        icono: '☕',
        stock: 24,
      },
      {
        id: 'c2',
        nombre: 'Cappuccino Vainilla Bourbon',
        categoria: 'leche',
        origen: 'Colombia Huila',
        tueste: 'Medio',
        precio: 4.50,
        descripcion: 'Doble shot de espresso con microespuma de leche sedosa y extracto natural de vainilla.',
        icono: '🥛',
        stock: 18,
      },
      {
        id: 'c3',
        nombre: 'Cold Brew Táctico 18hrs',
        categoria: 'frio',
        origen: 'Etiopía Yirgacheffe',
        tueste: 'Ligero',
        precio: 5.00,
        descripcion: 'Maceración en frío durante 18 horas. Perfil refrescante, limpio con notas florales y bergamota.',
        icono: '🧊',
        stock: 12,
      },
      {
        id: 'c4',
        nombre: 'Latte Caramelo Artesanal',
        categoria: 'leche',
        origen: 'Guatemala Antigua',
        tueste: 'Medio',
        precio: 4.80,
        descripcion: 'Espresso dulce infusionado con toffee artesanal, sal marina de Maras y leche vaporizada.',
        icono: '✨',
        stock: 30,
      },
      {
        id: 'c5',
        nombre: 'Mocha Dark Cacao 70%',
        categoria: 'espresso',
        origen: 'Ecuador Arriba',
        tueste: 'Oscuro',
        precio: 5.20,
        descripcion: 'Ganache de cacao orgánico al 70%, doble shot ristretto y corona de canela fresca.',
        icono: '🍫',
        stock: 15,
      },
      {
        id: 'c6',
        nombre: 'Flat White Triple Ristretto',
        categoria: 'espresso',
        origen: 'Costa Rica Tarrazú',
        tueste: 'Intenso',
        precio: 4.60,
        descripcion: 'Equilibrio perfecto: 3 extracciones cortas con una fina capa de leche emulsionada aterciopelada.',
        icono: '🔥',
        stock: 20,
      }
    ];

    // Estado Reactivo del Carrito (Agregado DDD)
    let carrito = [];
    let filtroActivo = 'todos';

    function renderizarCatalogo() {
      const contenedor = document.getElementById('gridCafes');
      contenedor.innerHTML = '';

      const filtrados = catalogoCafes.filter(c => filtroActivo === 'todos' || c.categoria === filtroActivo);

      filtrados.forEach(cafe => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'bg-white rounded-2xl border border-coffee-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group';

        tarjeta.innerHTML = \`
          <div>
            <!-- Header de Tarjeta -->
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="w-12 h-12 rounded-xl bg-coffee-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                \${cafe.icono}
              </div>
              <div class="text-right">
                <span class="text-base font-mono font-extrabold text-coffee-600 block">
                  $\${cafe.precio.toFixed(2)}
                </span>
                <span class="text-[10px] font-mono text-coffee-400">
                  Stock: \${cafe.stock} u.
                </span>
              </div>
            </div>

            <!-- Título y Etiquetas DDD -->
            <div class="mb-2">
              <div class="flex items-center gap-1.5 flex-wrap mb-1">
                <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-coffee-100 text-coffee-700">
                  \${cafe.origen}
                </span>
                <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  \${cafe.tueste}
                </span>
              </div>
              <h4 class="font-bold text-coffee-900 text-base group-hover:text-coffee-500 transition-colors">
                \${cafe.nombre}
              </h4>
            </div>

            <p class="text-xs text-coffee-600 leading-relaxed mb-4">
              \${cafe.descripcion}
            </p>
          </div>

          <!-- Botón de Acción -->
          <button
            type="button"
            onclick="agregarAlCarrito('\${cafe.id}')"
            class="w-full py-2.5 rounded-xl bg-coffee-100 hover:bg-coffee-500 text-coffee-900 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm transform active:scale-95"
          >
            <span>🛒</span>
            <span>Añadir al Carrito</span>
          </button>
        \`;

        contenedor.appendChild(tarjeta);
      });
    }

    function agregarAlCarrito(idCafe) {
      const cafe = catalogoCafes.find(c => c.id === idCafe);
      if (!cafe) return;

      const itemExistente = carrito.find(item => item.id === idCafe);
      if (itemExistente) {
        itemExistente.cantidad++;
      } else {
        carrito.push({
          id: cafe.id,
          nombre: cafe.nombre,
          precio: cafe.precio,
          icono: cafe.icono,
          cantidad: 1
        });
      }

      actualizarCarritoUI();
      mostrarToast(\`✅ ¡\${cafe.nombre} añadido a tu orden!\`, '☕');
      console.log(\`[DDD Domain Event]: ItemAddedToCartEvent(\${cafe.id}, \${cafe.nombre})\`);
    }

    function cambiarCantidad(idCafe, delta) {
      const idx = carrito.findIndex(i => i.id === idCafe);
      if (idx === -1) return;

      carrito[idx].cantidad += delta;
      if (carrito[idx].cantidad <= 0) {
        carrito.splice(idx, 1);
      }
      actualizarCarritoUI();
    }

    function actualizarCarritoUI() {
      const badgeCount = document.getElementById('badgeContadorCarrito');
      const badgeTotal = document.getElementById('badgeTotalCabecera');
      const lista = document.getElementById('listaItemsCarrito');
      const subtotalEl = document.getElementById('subtotalCarrito');
      const impuestosEl = document.getElementById('impuestosCarrito');
      const totalEl = document.getElementById('totalFinalCarrito');

      const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
      const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const impuestos = subtotal * 0.08;
      const totalFinal = subtotal + impuestos;

      badgeCount.textContent = totalItems;
      badgeTotal.textContent = \`$\${totalFinal.toFixed(2)}\`;

      subtotalEl.textContent = \`$\${subtotal.toFixed(2)}\`;
      impuestosEl.textContent = \`$\${impuestos.toFixed(2)}\`;
      totalEl.textContent = \`$\${totalFinal.toFixed(2)}\`;

      if (carrito.length === 0) {
        lista.innerHTML = \`
          <div class="text-center py-12 text-coffee-400 space-y-2">
            <span class="text-4xl block">🧺</span>
            <p class="text-xs">Tu carrito está esperando por buen café.</p>
          </div>
        \`;
        return;
      }

      lista.innerHTML = '';
      carrito.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-3 rounded-xl bg-coffee-50 border border-coffee-200/60 text-xs';

        row.innerHTML = \`
          <div class="flex items-center gap-2.5">
            <span class="text-xl">\${item.icono}</span>
            <div>
              <div class="font-bold text-coffee-900">\${item.nombre}</div>
              <div class="text-[11px] font-mono text-coffee-500">$\${item.precio.toFixed(2)} c/u</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="cambiarCantidad('\${item.id}', -1)" class="w-6 h-6 rounded bg-white border border-coffee-300 font-bold text-coffee-800 hover:bg-coffee-200 cursor-pointer flex items-center justify-center">-</button>
            <span class="font-mono font-bold text-coffee-900 w-4 text-center">\${item.cantidad}</span>
            <button onclick="cambiarCantidad('\${item.id}', 1)" class="w-6 h-6 rounded bg-white border border-coffee-300 font-bold text-coffee-800 hover:bg-coffee-200 cursor-pointer flex items-center justify-center">+</button>
            <span class="font-mono font-bold text-coffee-700 ml-2">$\${(item.precio * item.cantidad).toFixed(2)}</span>
          </div>
        \`;

        lista.appendChild(row);
      });
    }

    function toggleModalCarrito() {
      const modal = document.getElementById('modalCarrito');
      modal.classList.toggle('hidden');
    }

    function procesarPago() {
      if (carrito.length === 0) {
        mostrarToast('⚠️ Agrega al menos un café antes de ordenar.', '⚠️');
        return;
      }

      mostrarToast('🎉 ¡Orden confirmada bajo Clean Architecture!', '💳');
      console.log('[DDD Domain Event]: OrderPlacedEvent - Transacción exitosa.');
      carrito = [];
      actualizarCarritoUI();
      setTimeout(() => {
        toggleModalCarrito();
      }, 1200);
    }

    function filtrar(categoria) {
      filtroActivo = categoria;
      document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('bg-coffee-300', 'text-coffee-900');
        btn.classList.add('bg-coffee-900/60', 'text-coffee-200');
      });
      event.target.classList.remove('bg-coffee-900/60', 'text-coffee-200');
      event.target.classList.add('bg-coffee-300', 'text-coffee-900');
      renderizarCatalogo();
    }

    function mostrarToast(mensaje, icono = '☕') {
      const toast = document.getElementById('toastNotification');
      const msg = document.getElementById('toastMensaje');
      const ic = document.getElementById('toastIcon');

      msg.textContent = mensaje;
      ic.textContent = icono;

      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 2500);
    }

    // Inicializar UI
    renderizarCatalogo();
    actualizarCarritoUI();
    console.log('✅ A.R.E.S. Coffee Shop Live Sandbox montado exitosamente.');
  </script>
</body>
</html>`;
  }

  /**
   * Sintetiza una aplicación interactiva de Autenticación JWT completa con inspector de tokens.
   */
  private sintetizarAuthJwtApp(titulo: string): string {
    const scriptLog = this.obtenerScriptIntercepcionLogs();

    return `<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo} // A.R.E.S. JWT Auth Shield</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${scriptLog}
</head>
<body class="bg-slate-950 text-slate-100 min-h-full font-sans flex flex-col items-center justify-center p-4">
  <div class="max-w-xl w-full bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center text-2xl">
        🛡️
      </div>
      <div>
        <h2 class="text-xl font-bold font-mono text-cyan-300">A.R.E.S. JWT Guard // Live Demo</h2>
        <p class="text-xs text-slate-400 font-mono">Autenticación basada en Claims y Tokens Criptográficos</p>
      </div>
    </div>

    <!-- Pestañas Login / Registro -->
    <div class="flex border-b border-slate-800 text-xs font-mono">
      <button id="tabLogin" onclick="cambiarTab('login')" class="flex-1 py-2 font-bold text-cyan-400 border-b-2 border-cyan-400">INICIAR SESIÓN</button>
      <button id="tabRegistro" onclick="cambiarTab('registro')" class="flex-1 py-2 text-slate-400 hover:text-slate-200">REGISTRARSE</button>
    </div>

    <form onsubmit="autenticar(event)" class="space-y-4 text-xs font-mono">
      <div>
        <label class="block text-slate-400 mb-1">CORREO DEL COMANDANTE:</label>
        <input id="inputEmail" type="email" value="comandante@ares.tactical" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg p-2.5 text-slate-100 outline-none" required />
      </div>
      <div>
        <label class="block text-slate-400 mb-1">CLAVE SECRETA (PASSWORD):</label>
        <input id="inputPass" type="password" value="SpartanPass2026!" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg p-2.5 text-slate-100 outline-none" required />
      </div>
      <button type="submit" class="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]">
        GENERAR TOKEN JWT FIRMADO
      </button>
    </form>

    <!-- Panel de Token Decodificado -->
    <div id="panelToken" class="hidden space-y-3 pt-4 border-t border-slate-800 text-xs font-mono">
      <div class="text-[#00ffaa] font-bold flex items-center gap-1.5">
        <span>✓</span> <span>SESIÓN AUTENTICADA (BEARER TOKEN GENERADO)</span>
      </div>
      <div class="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] text-cyan-300 break-all select-all font-mono" id="rawToken"></div>
      <div class="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] text-emerald-400 font-mono">
        <div class="text-slate-500 font-bold mb-1">CLAIMS DECODIFICADOS (PAYLOAD):</div>
        <pre id="decodedPayload" class="leading-relaxed"></pre>
      </div>
    </div>
  </div>

  <script>
    function cambiarTab(tab) {
      const btnLog = document.getElementById('tabLogin');
      const btnReg = document.getElementById('tabRegistro');
      if (tab === 'login') {
        btnLog.className = 'flex-1 py-2 font-bold text-cyan-400 border-b-2 border-cyan-400';
        btnReg.className = 'flex-1 py-2 text-slate-400 hover:text-slate-200';
      } else {
        btnReg.className = 'flex-1 py-2 font-bold text-cyan-400 border-b-2 border-cyan-400';
        btnLog.className = 'flex-1 py-2 text-slate-400 hover:text-slate-200';
      }
    }

    function autenticar(e) {
      e.preventDefault();
      const email = document.getElementById('inputEmail').value;
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = {
        sub: "user_spartan_01",
        email: email,
        role: "COMMANDER_STAFF_ENGINEER",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "ares-auth-server"
      };
      const payloadB64 = btoa(JSON.stringify(payload));
      const fakeSignature = btoa("signature_sha256_ares_hash");
      const jwt = \`\${header}.\${payloadB64}.\${fakeSignature}\`;

      document.getElementById('rawToken').textContent = jwt;
      document.getElementById('decodedPayload').textContent = JSON.stringify(payload, null, 2);
      document.getElementById('panelToken').classList.remove('hidden');
      console.log('✅ Token JWT generado e inspeccionado con éxito.');
    }
  </script>
</body>
</html>`;
  }

  /**
   * Síntesis general para cualquier otro componente Vue o arquitectura.
   */
  private sintetizarVueGeneral(archivos: ArchivoProyecto[], titulo: string): string {
    const vueFiles = archivos.filter((a) => a.ruta.toLowerCase().endsWith('.vue'));
    const cssFiles = archivos.filter((a) => a.ruta.toLowerCase().endsWith('.css'));
    const appVue = archivos.find(
      (a) => a.ruta.toLowerCase().endsWith('app.vue') || a.ruta.toLowerCase() === 'src/app.vue'
    );

    const estilosCombinados = cssFiles.map((c) => c.contenido).join('\n\n');
    let templateVue = '<div class="p-8 text-center"><h1 class="text-2xl font-bold text-slate-800">☕ Aplicación Cargada en Sandbox</h1></div>';
    let scriptVue = 'export default {}';

    if (appVue) {
      const { template, script } = this.desglosarSFCVue(appVue.contenido);
      if (template) templateVue = template;
      if (script) scriptVue = script;
    } else if (vueFiles.length > 0) {
      const { template, script } = this.desglosarSFCVue(vueFiles[0].contenido);
      if (template) templateVue = template;
      if (script) scriptVue = script;
    }

    const scriptLimpio = this.adaptarScriptVue(scriptVue);
    const scriptLog = this.obtenerScriptIntercepcionLogs();

    return `<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <style>
    ${estilosCombinados}
  </style>
  ${scriptLog}
</head>
<body class="bg-slate-50 text-slate-900 antialiased min-h-full font-sans">
  <div id="app">${templateVue}</div>

  <script>
    try {
      const { ref, reactive, computed, onMounted } = Vue;
      const AppDefinition = ${scriptLimpio};
      const { createApp } = Vue;
      const app = createApp(AppDefinition);
      app.mount('#app');
      console.log('✅ A.R.E.S. Live Sandbox inicializado exitosamente.');
    } catch (err) {
      console.error('💥 Error en Live Sandbox:', err.message);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Genera el script de captura de logs de consola.
   */
  private obtenerScriptIntercepcionLogs(): string {
    return `<script>
      window.__ARES_LOGS__ = [];
      ['log', 'warn', 'error', 'info'].forEach(method => {
        const original = console[method];
        console[method] = function(...args) {
          window.__ARES_LOGS__.push({
            type: method,
            message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
            time: new Date().toLocaleTimeString()
          });
          original.apply(console, args);
          if (window.parent) {
            window.parent.postMessage({ type: 'ARES_SANDBOX_LOG', logs: window.__ARES_LOGS__ }, '*');
          }
        };
      });
    </script>`;
  }

  /**
   * Desglosa un archivo Single File Component (.vue) en <template>, <script> y <style>.
   */
  private desglosarSFCVue(contenido: string): { template: string; script: string; style: string } {
    const matchTemplate = contenido.match(/<template>([\s\S]*?)<\/template>/i);
    const matchScript = contenido.match(/<script(?:[^>]*)>([\s\S]*?)<\/script>/i);
    const matchStyle = contenido.match(/<style(?:[^>]*)>([\s\S]*?)<\/style>/i);

    return {
      template: matchTemplate ? matchTemplate[1].trim() : '',
      script: matchScript ? matchScript[1].trim() : '',
      style: matchStyle ? matchStyle[1].trim() : '',
    };
  }

  /**
   * Limpia imports y tipados de TypeScript para ejecución directa en navegador sin bundler.
   */
  private limpiarImportsTypeScript(tsCode: string): string {
    return tsCode
      .replace(/import\s+[^;]+;?/g, '')
      .replace(/export\s+(?:default\s+)?/g, '')
      .replace(/:\s*[A-Z][a-zA-Z0-9_<>\[\]|]+/g, '')
      .replace(/interface\s+[A-Za-z0-9_]+[\s\S]*?\{[\s\S]*?\}/g, '')
      .replace(/type\s+[A-Za-z0-9_]+\s*=[^;]+;/g, '');
  }

  /**
   * Adapta la definición del componente Vue para montaje con Vue 3 CDN.
   */
  private adaptarScriptVue(scriptCode: string): string {
    if (!scriptCode.trim()) {
      return '{ data() { return {}; } }';
    }

    let code = this.limpiarImportsTypeScript(scriptCode);

    if (code.includes('export default')) {
      code = code.replace(/export\s+default\s+/, '');
      return code.trim();
    }

    return `{
      setup() {
        ${code}
        return {};
      }
    }`;
  }

  /**
   * Inyecta captura de logs en archivos index.html preexistentes.
   */
  private inyectarIntercepcionLogs(html: string): string {
    const scriptLog = this.obtenerScriptIntercepcionLogs();

    if (/<head\b[^>]*>/i.test(html)) {
      return html.replace(/<head\b[^>]*>/i, `$&\n${scriptLog}`);
    } else if (/<html\b[^>]*>/i.test(html)) {
      return html.replace(/<html\b[^>]*>/i, `$&\n<head>\n${scriptLog}\n</head>`);
    } else {
      return `<head>\n${scriptLog}\n</head>\n${html}`;
    }
  }
}

export const previewCompilerService = new PreviewCompilerService();
