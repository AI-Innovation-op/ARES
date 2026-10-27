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

    // 3.1 Caso E: Proyecto de Ensaladas / Comida Saludable / Food DDD
    const esProyectoEnsalada = archivos.some(
      (a) =>
        a.ruta.toLowerCase().includes('ensalada') ||
        a.ruta.toLowerCase().includes('salad') ||
        a.contenido.toLowerCase().includes('ensalada') ||
        a.contenido.toLowerCase().includes('ingrediente') ||
        a.contenido.toLowerCase().includes('lechuga') ||
        titulo.toLowerCase().includes('ensalada') ||
        titulo.toLowerCase().includes('salad')
    );

    if (esProyectoEnsalada) {
      return this.sintetizarEnsaladaApp(titulo);
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
   * Sintetiza una aplicación completa, interactiva y responsiva de Barra Gourmet de Ensaladas (GreenBowl)
   * bajo arquitectura DDD limpia (catálogo con cards/grids, bowl builder en tiempo real, carrito y boleta electrónica).
   */
  private sintetizarEnsaladaApp(titulo: string): string {
    const scriptLog = this.obtenerScriptIntercepcionLogs();

    return `<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo} // GreenBowl Healthy FoodTech</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            salad: {
              50: '#F0FDF4',
              100: '#DCFCE7',
              200: '#BBF7D0',
              300: '#86EFAC',
              400: '#4ADE80',
              500: '#22C55E',
              600: '#16A34A',
              700: '#15803D',
              800: '#166534',
              900: '#14532D',
              950: '#052E16',
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
    .custom-scroll::-webkit-scrollbar-thumb { background: #86EFAC; border-radius: 4px; }
  </style>
  ${scriptLog}
</head>
<body class="bg-salad-50 text-slate-800 antialiased min-h-full flex flex-col selection:bg-salad-300 selection:text-salad-900">

  <!-- 1. Barra de Navegación Superior -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-salad-200 px-4 sm:px-8 py-3.5 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-salad-600 text-white flex items-center justify-center text-xl shadow-md">
        🥗
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-extrabold text-salad-950 tracking-tight leading-none flex items-center gap-2">
          <span>GreenBowl Lab</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
            DDD PATTERN
          </span>
        </h1>
        <p class="text-[11px] text-salad-700 font-medium mt-0.5">Barra Artesanal de Ensaladas & Nutrición Inteligente</p>
      </div>
    </div>

    <!-- Acciones de Cabecera: Carrito con Contador Reactivo -->
    <div class="flex items-center gap-3">
      <button
        id="btnAbrirCarrito"
        type="button"
        onclick="toggleModalCarrito()"
        class="px-3.5 py-2 rounded-xl bg-salad-600 hover:bg-salad-700 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer transform active:scale-95"
      >
        <span>🛒</span>
        <span class="hidden sm:inline">Tu Carrito</span>
        <span id="badgeContadorCarrito" class="px-2 py-0.5 rounded-full bg-white text-salad-900 text-[11px] font-extrabold shadow-sm">
          0
        </span>
        <span id="badgeTotalCabecera" class="hidden sm:inline font-mono font-bold text-salad-100">
          $0.00
        </span>
      </button>
    </div>
  </header>

  <!-- 2. Hero Banner & Constructor de Bowl en Vivo -->
  <section class="bg-gradient-to-br from-salad-900 via-salad-800 to-salad-950 text-white px-4 sm:px-8 py-8 sm:py-12 border-b border-salad-950 relative overflow-hidden">
    <div class="max-w-5xl mx-auto relative z-10 space-y-6">
      <div class="text-center space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-salad-700/50 border border-salad-400/40 text-salad-200 text-xs font-mono">
          <span>⚡</span> <span>AGREGADOS DE DOMINIO // ENSALADA & CARRITO REACTIVO</span>
        </div>
        <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Crea tu Ensalada a la Medida
        </h2>
        <p class="text-xs sm:text-sm text-salad-200 max-w-xl mx-auto">
          Selecciona tus bases frescas, proteínas magras y aderezos con cálculo dinámico de calorías y emisión de boleta electrónica.
        </p>
      </div>

      <!-- Live Bowl Builder Card (Estado Reactivo del Bowl) -->
      <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shadow-xl max-w-3xl mx-auto">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-white/15">
          <div class="flex items-center gap-2 text-salad-300 font-bold text-xs uppercase tracking-wider">
            <span>🥗</span>
            <span>BOWL EN PREPARACIÓN (LIVE AGGREGATE):</span>
          </div>
          <div class="flex items-center gap-3 text-xs font-mono">
            <span class="px-2 py-0.5 rounded bg-black/30 border border-salad-400/30 text-salad-300">
              🔥 <span id="bowlKcal">0</span> kcal
            </span>
            <span class="px-2 py-0.5 rounded bg-salad-500 text-white font-extrabold">
              💰 $<span id="bowlPrecio">0.00</span>
            </span>
          </div>
        </div>

        <!-- Lista de Ingredientes Agregados al Bowl -->
        <div id="bowlIngredientesList" class="py-3 flex flex-wrap gap-1.5 min-h-[46px] items-center">
          <span class="text-xs text-salad-300/80 italic">
            Elige ingredientes del catálogo inferior para armar tu bowl personalizado...
          </span>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-white/15 gap-2">
          <button
            type="button"
            onclick="vaciarBowl()"
            class="text-[11px] text-rose-300 hover:text-rose-100 hover:underline cursor-pointer"
          >
            ✕ Vaciar Bowl
          </button>
          <button
            id="btnGuardarBowl"
            type="button"
            onclick="guardarBowlEnCarrito()"
            class="px-4 py-2 rounded-xl bg-salad-400 hover:bg-salad-300 text-salad-950 font-extrabold text-xs transition cursor-pointer shadow-lg flex items-center gap-1.5 transform active:scale-95"
          >
            <span>🛒</span>
            <span>Guardar Bowl en Carrito</span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- 3. Catálogo de Ingredientes con Filtros -->
  <main class="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-6">
    <!-- Filtros de Categoría -->
    <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-salad-200">
      <div class="flex flex-wrap items-center gap-2">
        <button
          onclick="filtrar('todos')"
          class="filtro-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-salad-700 text-white cursor-pointer shadow-sm"
        >
          Todos (8)
        </button>
        <button
          onclick="filtrar('Vegetal')"
          class="filtro-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-700 hover:bg-salad-100 cursor-pointer border border-salad-200"
        >
          🥬 Vegetales & Bases
        </button>
        <button
          onclick="filtrar('Proteína')"
          class="filtro-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-700 hover:bg-salad-100 cursor-pointer border border-salad-200"
        >
          🍗 Proteínas Magras
        </button>
        <button
          onclick="filtrar('Topping')"
          class="filtro-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-700 hover:bg-salad-100 cursor-pointer border border-salad-200"
        >
          🥑 Toppings & Frutos
        </button>
        <button
          onclick="filtrar('Aderezo')"
          class="filtro-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-700 hover:bg-salad-100 cursor-pointer border border-salad-200"
        >
          🥣 Aderezos Artesanales
        </button>
      </div>

      <div class="text-[11px] font-mono text-salad-800 hidden sm:block">
        Entidad: <span class="text-salad-600 font-bold">Ingrediente(ValueObject)</span>
      </div>
    </div>

    <!-- Grid de Tarjetas de Ingredientes -->
    <div id="gridIngredientes" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Inyectado dinámicamente por JavaScript -->
    </div>
  </main>

  <!-- 4. Drawer Modal del Carrito de Compras -->
  <div id="modalCarrito" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden flex justify-end">
    <div class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
      <!-- Encabezado del Carrito -->
      <div class="p-4 sm:p-5 border-b border-salad-200 bg-salad-50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">🛒</span>
          <div>
            <h3 class="text-sm font-extrabold text-salad-950 font-mono">TU PEDIDO DE ENSALADAS</h3>
            <p class="text-[11px] text-salad-700">Agregado Carrito // Clean Architecture</p>
          </div>
        </div>
        <button onclick="toggleModalCarrito()" class="w-8 h-8 rounded-lg bg-salad-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 font-bold transition flex items-center justify-center cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Lista de Ítems del Carrito -->
      <div id="itemsCarrito" class="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 custom-scroll">
        <!-- Renderizado dinámico -->
      </div>

      <!-- Resumen y Checkout -->
      <div class="p-4 sm:p-5 border-t border-salad-200 bg-salad-50/70 space-y-3">
        <div class="space-y-1.5 text-xs text-slate-600 font-mono">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span id="subtotalCarrito" class="font-bold text-slate-800">$0.00</span>
          </div>
          <div class="flex justify-between text-salad-700">
            <span>Envío Eco-Friendly:</span>
            <span class="font-bold">GRATIS</span>
          </div>
          <div class="flex justify-between text-sm font-extrabold text-salad-950 pt-2 border-t border-salad-200">
            <span>TOTAL:</span>
            <span id="totalFinalCarrito" class="text-base text-salad-700">$0.00</span>
          </div>
        </div>

        <button
          onclick="abrirBoletaModal()"
          class="w-full py-3 rounded-xl bg-salad-600 hover:bg-salad-700 text-white font-extrabold text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider transform active:scale-95"
        >
          <span>🧾</span>
          <span>GENERAR BOLETA ELECTRÓNICA</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 5. Modal de Boleta Electrónica Oficial -->
  <div id="modalBoleta" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-salad-300 font-mono text-xs">
      <!-- Cabecera de la Boleta -->
      <div class="bg-salad-900 text-white p-4 text-center border-b border-salad-950">
        <h4 class="font-extrabold text-sm tracking-widest text-salad-300 uppercase">GREENBOWL FOODTECH S.A.C.</h4>
        <p class="text-[10px] text-salad-200 mt-0.5">R.U.C. 20608945123 // LIMA, PERÚ</p>
        <div class="mt-2 py-1 px-3 inline-block rounded bg-salad-800 border border-salad-600 font-bold text-white text-[11px]">
          BOLETA DE VENTA ELECTRÓNICA: <span id="boletaId">B001-000492</span>
        </div>
      </div>

      <!-- Datos del Cliente y Fecha -->
      <div class="p-4 border-b border-salad-100 bg-salad-50/50 space-y-1 text-[11px]">
        <div class="flex justify-between">
          <span class="text-slate-500">FECHA Y HORA:</span>
          <span id="boletaFecha" class="font-bold text-slate-800"></span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">CLIENTE:</span>
          <span class="font-bold text-salad-800">COMANDANTE A.R.E.S.</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">MONEDA:</span>
          <span class="font-bold text-slate-800">USD / DÓLARES</span>
        </div>
      </div>

      <!-- Tabla de Ítems en la Boleta -->
      <div class="p-4 max-h-48 overflow-y-auto custom-scroll border-b border-salad-100">
        <table class="w-full text-left text-[11px]">
          <thead>
            <tr class="border-b border-slate-200 text-slate-400">
              <th class="pb-1">CANT.</th>
              <th class="pb-1">DESCRIPCIÓN</th>
              <th class="pb-1 text-right">P.UNIT</th>
              <th class="pb-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody id="boletaDetalleBody" class="divide-y divide-slate-100 text-slate-700">
            <!-- Rellenado dinámicamente -->
          </tbody>
        </table>
      </div>

      <!-- Totales e Impuestos -->
      <div class="p-4 bg-salad-50/80 space-y-1 text-[11px] text-slate-700">
        <div class="flex justify-between">
          <span>OP. GRAVADA:</span>
          <span id="boletaSubtotal" class="font-mono font-bold">$0.00</span>
        </div>
        <div class="flex justify-between">
          <span>I.G.V. (18%):</span>
          <span id="boletaIgv" class="font-mono font-bold">$0.00</span>
        </div>
        <div class="flex justify-between text-sm font-extrabold text-salad-950 pt-2 border-t border-salad-200">
          <span>TOTAL A PAGAR:</span>
          <span id="boletaTotalFinal" class="font-mono text-salad-700">$0.00</span>
        </div>

        <div class="pt-3 text-center">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
            <span>✓</span> AUTORIZADA POR SUNAT // EVENTO DOMINIO EMITIDO
          </span>
        </div>
      </div>

      <!-- Pie de Cierre -->
      <div class="p-3 bg-white border-t border-salad-200 flex items-center justify-between">
        <span class="text-[10px] text-slate-400 italic">¡Gracias por nutrirte con código limpio!</span>
        <button
          onclick="cerrarBoleta()"
          class="px-4 py-1.5 rounded-lg bg-salad-600 hover:bg-salad-700 text-white font-bold text-xs cursor-pointer shadow transition"
        >
          Cerrar Boleta
        </button>
      </div>
    </div>
  </div>

  <!-- 6. Notificación Toast -->
  <div
    id="toastNotification"
    class="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-salad-400 flex items-center gap-3 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none"
  >
    <span id="toastIcon" class="text-xl">🥗</span>
    <span id="toastMensaje" class="text-xs font-mono font-semibold">Notificación táctica</span>
  </div>

  <!-- 7. JavaScript Reactivo & Lógica de Dominio -->
  <script>
    // Catálogo de Ingredientes del Dominio DDD
    const INGREDIENTES = [
      { id: 'ing-1', nombre: 'Lechuga Romana & Espinaca', categoria: 'Vegetal', precio: 2.50, kcal: 45, icono: '🥬', badge: 'Base Fresca' },
      { id: 'ing-2', nombre: 'Tomates Cherry & Pepino', categoria: 'Vegetal', precio: 1.80, kcal: 30, icono: '🍅', badge: 'Antioxidantes' },
      { id: 'ing-3', nombre: 'Pechuga de Pollo Parrilla', categoria: 'Proteína', precio: 4.50, kcal: 165, icono: '🍗', badge: 'Proteína Magra' },
      { id: 'ing-4', nombre: 'Tofu Salteado al Sésamo', categoria: 'Proteína', precio: 3.80, kcal: 120, icono: '🧀', badge: 'Vegano' },
      { id: 'ing-5', nombre: 'Palta Hass Fresca', categoria: 'Topping', precio: 2.90, kcal: 160, icono: '🥑', badge: 'Grasas Buenas' },
      { id: 'ing-6', nombre: 'Nueces Caramelizadas & Chía', categoria: 'Topping', precio: 1.50, kcal: 95, icono: '🌰', badge: 'Superfood' },
      { id: 'ing-7', nombre: 'Vinagreta Balsámica Romero', categoria: 'Aderezo', precio: 1.00, kcal: 50, icono: '🫒', badge: 'Sin Gluten' },
      { id: 'ing-8', nombre: 'Mostaza Dijon con Miel', categoria: 'Aderezo', precio: 1.20, kcal: 60, icono: '🍋', badge: 'Artesanal' }
    ];

    // Estado en Memoria
    let filtroActivo = 'todos';
    let bowlActual = []; // Ingredientes del bowl en construcción
    let carrito = []; // Ítems guardados para la orden final

    function renderizarCatalogo() {
      const grid = document.getElementById('gridIngredientes');
      grid.innerHTML = '';

      const filtrados = filtroActivo === 'todos'
        ? INGREDIENTES
        : INGREDIENTES.filter(i => i.categoria === filtroActivo);

      filtrados.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl border border-salad-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between';
        card.innerHTML = \`
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-3xl">\${item.icono}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-salad-100 text-salad-800 font-bold border border-salad-300">
                \${item.badge}
              </span>
            </div>
            <h3 class="font-extrabold text-sm text-slate-800 tracking-tight leading-snug">\${item.nombre}</h3>
            <p class="text-[11px] text-slate-400 font-mono mt-0.5">\${item.categoria} // \${item.kcal} kcal</p>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="font-extrabold font-mono text-salad-700 text-sm">$\${item.precio.toFixed(2)}</span>
            <button
              onclick="agregarAlBowl('\${item.id}')"
              class="px-3 py-1.5 rounded-xl bg-salad-600 hover:bg-salad-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span>+</span>
              <span>Añadir</span>
            </button>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    function agregarAlBowl(idIngrediente) {
      const ing = INGREDIENTES.find(i => i.id === idIngrediente);
      if (!ing) return;

      bowlActual.push(ing);
      actualizarBowlUI();
      mostrarToast(\`Añadido: \${ing.nombre} al bowl.\`, ing.icono);
    }

    function removerDelBowl(index) {
      bowlActual.splice(index, 1);
      actualizarBowlUI();
    }

    function vaciarBowl() {
      bowlActual = [];
      actualizarBowlUI();
      mostrarToast('Bowl reiniciado.', '🔄');
    }

    function actualizarBowlUI() {
      const container = document.getElementById('bowlIngredientesList');
      const kcalEl = document.getElementById('bowlKcal');
      const precioEl = document.getElementById('bowlPrecio');

      if (bowlActual.length === 0) {
        container.innerHTML = '<span class="text-xs text-salad-300/80 italic">Elige ingredientes del catálogo inferior para armar tu bowl personalizado...</span>';
        kcalEl.textContent = '0';
        precioEl.textContent = '0.00';
        return;
      }

      container.innerHTML = '';
      let totalKcal = 0;
      let totalPrecio = 0;

      bowlActual.forEach((item, idx) => {
        totalKcal += item.kcal;
        totalPrecio += item.precio;

        const tag = document.createElement('span');
        tag.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-xs font-bold shadow-sm';
        tag.innerHTML = \`
          <span>\${item.icono}</span>
          <span>\${item.nombre}</span>
          <button onclick="removerDelBowl(\${idx})" class="ml-1 text-rose-300 hover:text-rose-100 font-extrabold cursor-pointer">✕</button>
        \`;
        container.appendChild(tag);
      });

      kcalEl.textContent = totalKcal;
      precioEl.textContent = totalPrecio.toFixed(2);
    }

    function guardarBowlEnCarrito() {
      if (bowlActual.length === 0) {
        mostrarToast('⚠️ Agrega al menos un ingrediente para armar tu ensalada.', '⚠️');
        return;
      }

      const totalPrecio = bowlActual.reduce((acc, i) => acc + i.precio, 0);
      const totalKcal = bowlActual.reduce((acc, i) => acc + i.kcal, 0);

      carrito.push({
        id: 'bowl-' + Date.now(),
        nombre: 'Bowl Personalizado (' + bowlActual.length + ' ingredientes)',
        descripcion: bowlActual.map(i => i.nombre).join(', '),
        precio: totalPrecio,
        kcal: totalKcal,
        cantidad: 1,
        icono: '🥗'
      });

      bowlActual = [];
      actualizarBowlUI();
      actualizarCarritoUI();
      mostrarToast('🎉 ¡Ensalada agregada al carrito con éxito!', '🛒');
      console.log('[DDD Agregado]: Ensalada construida y agregada al Carrito.');
    }

    function actualizarCarritoUI() {
      const countEl = document.getElementById('badgeContadorCarrito');
      const totalHeader = document.getElementById('badgeTotalCabecera');
      const itemsContainer = document.getElementById('itemsCarrito');
      const subtotalEl = document.getElementById('subtotalCarrito');
      const totalFinalEl = document.getElementById('totalFinalCarrito');

      const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
      const totalMonto = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

      countEl.textContent = totalItems;
      totalHeader.textContent = '$' + totalMonto.toFixed(2);
      subtotalEl.textContent = '$' + totalMonto.toFixed(2);
      totalFinalEl.textContent = '$' + totalMonto.toFixed(2);

      itemsContainer.innerHTML = '';
      if (carrito.length === 0) {
        itemsContainer.innerHTML = \`
          <div class="py-12 text-center text-slate-400 space-y-2">
            <span class="text-4xl block">🥗</span>
            <p class="text-xs font-mono">El carrito se encuentra vacío.</p>
          </div>
        \`;
        return;
      }

      carrito.forEach(item => {
        const row = document.createElement('div');
        row.className = 'p-3 rounded-xl bg-salad-50/80 border border-salad-200 flex items-center justify-between gap-3';
        row.innerHTML = \`
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-2xl">\${item.icono}</span>
            <div class="min-w-0">
              <div class="font-extrabold text-xs text-slate-800 truncate">\${item.nombre}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">\${item.descripcion}</div>
              <div class="text-[11px] font-mono font-bold text-salad-700">$\${item.precio.toFixed(2)}</div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button onclick="cambiarCantidad('\${item.id}', -1)" class="w-6 h-6 rounded bg-white border border-salad-300 font-bold text-slate-700 hover:bg-salad-100 cursor-pointer flex items-center justify-center">-</button>
            <span class="font-mono font-extrabold text-xs text-slate-900 w-4 text-center">\${item.cantidad}</span>
            <button onclick="cambiarCantidad('\${item.id}', 1)" class="w-6 h-6 rounded bg-white border border-salad-300 font-bold text-slate-700 hover:bg-salad-100 cursor-pointer flex items-center justify-center">+</button>
          </div>
        \`;
        itemsContainer.appendChild(row);
      });
    }

    function cambiarCantidad(idItem, delta) {
      const idx = carrito.findIndex(i => i.id === idItem);
      if (idx === -1) return;

      carrito[idx].cantidad += delta;
      if (carrito[idx].cantidad <= 0) {
        carrito.splice(idx, 1);
      }
      actualizarCarritoUI();
    }

    function toggleModalCarrito() {
      const modal = document.getElementById('modalCarrito');
      modal.classList.toggle('hidden');
    }

    function abrirBoletaModal() {
      if (carrito.length === 0) {
        mostrarToast('⚠️ Agrega al menos un ítem al carrito.', '⚠️');
        return;
      }

      toggleModalCarrito();

      const modalBoleta = document.getElementById('modalBoleta');
      const fechaEl = document.getElementById('boletaFecha');
      const bodyEl = document.getElementById('boletaDetalleBody');
      const subtotalEl = document.getElementById('boletaSubtotal');
      const igvEl = document.getElementById('boletaIgv');
      const totalEl = document.getElementById('boletaTotalFinal');

      const fecha = new Date().toLocaleString();
      fechaEl.textContent = fecha;

      bodyEl.innerHTML = '';
      let totalMonto = 0;

      carrito.forEach(item => {
        const itemTotal = item.precio * item.cantidad;
        totalMonto += itemTotal;

        const tr = document.createElement('tr');
        tr.className = 'py-1';
        tr.innerHTML = \`
          <td class="font-bold">\${item.cantidad}</td>
          <td class="pr-2">\${item.nombre}</td>
          <td class="text-right">$\${item.precio.toFixed(2)}</td>
          <td class="text-right font-bold">$\${itemTotal.toFixed(2)}</td>
        \`;
        bodyEl.appendChild(tr);
      });

      const subtotal = totalMonto / 1.18;
      const igv = totalMonto - subtotal;

      subtotalEl.textContent = '$' + subtotal.toFixed(2);
      igvEl.textContent = '$' + igv.toFixed(2);
      totalEl.textContent = '$' + totalMonto.toFixed(2);

      modalBoleta.classList.remove('hidden');
      mostrarToast('🧾 Boleta Electrónica generada exitosamente.', '🧾');
      console.log('[DDD Domain Event]: OrderPlacedEvent -> Boleta emitada: B001-000492');
    }

    function cerrarBoleta() {
      document.getElementById('modalBoleta').classList.add('hidden');
      carrito = [];
      actualizarCarritoUI();
      mostrarToast('✨ ¡Compra finalizada! Gracias por tu pedido.', '🎉');
    }

    function filtrar(categoria) {
      filtroActivo = categoria;
      document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('bg-salad-700', 'text-white', 'shadow-sm');
        btn.classList.add('bg-white', 'text-slate-700', 'border', 'border-salad-200');
      });
      event.target.classList.remove('bg-white', 'text-slate-700', 'border', 'border-salad-200');
      event.target.classList.add('bg-salad-700', 'text-white', 'shadow-sm');
      renderizarCatalogo();
    }

    function mostrarToast(mensaje, icono = '🥗') {
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

    // Inicializar UI al montar
    renderizarCatalogo();
    actualizarBowlUI();
    actualizarCarritoUI();
    console.log('✅ A.R.E.S. GreenBowl Healthy Food Sandbox montado exitosamente.');
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
