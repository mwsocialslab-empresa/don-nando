const URL_SHEETS = "https://script.google.com/macros/s/AKfycbyRbAiuDMfdyiASwWra6Zgm-_4zCeYuhyAhreXtZTdqxHeoqOmyZL08ySEAz-BInPNt/exec";

let carrito = [];
let productos = [];
let total = 0;

// ========================
// CARGA DE PRODUCTOS (CON CACHÉ OPTIMIZADA)
// ========================

const CACHE_KEY = 'cache_productos';
const CACHE_TIME_KEY = 'cache_productos_fecha';
const mediaHora = 0;

const cacheLocal = localStorage.getItem(CACHE_KEY);
const ultimaCarga = localStorage.getItem(CACHE_TIME_KEY);
const ahora = Date.now();

if (cacheLocal && ultimaCarga && (ahora - ultimaCarga < mediaHora)) {
    renderizarProductos(JSON.parse(cacheLocal));
} else {
    cargarDesdeSheets();
}

function cargarDesdeSheets() {
    fetch(URL_SHEETS)
        .then(r => r.json())
        .then(data => {
            // Cargamos los productos directamente sin guardar copias viejas
            renderizarProductos(data);
        })
        .catch(error => {
            console.error("Error cargando Sheets:", error);
            document.getElementById("productos").innerHTML =
                `<div class="alert alert-danger mx-auto text-center">
                  No se pudo cargar el catálogo. Por favor, refrescá la página.
                </div>`;
        });
}

function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    let htmlFinal = ""; 
    productos = [];
    let index = 0;

    for (const categoria in data) {
        data[categoria].forEach(p => {
            if (!p.nombre || p.nombre.trim() === "") return;
            const precioOriginal = parseFloat(String(p.precio).replace(',', '.'));
            const precioOferta = p.oferta ? parseFloat(String(p.oferta).replace(',', '.')) : 0;
            const precioFinal = precioOferta > 0 ? precioOferta : precioOriginal;
            const unidad = p.unidad || 'kg';

            productos.push({ nombre: p.nombre, precio: precioFinal, unidad });

            htmlFinal += `
        <div class="col-6 col-md-4 col-lg-3 producto"
             data-categoria="${categoria}"
             data-oferta="${precioOferta > 0}">
          <div class="card h-100 shadow-sm border-0" style="border-radius:12px;">
            <div class="position-relative p-2">
              <img src="${p.imagen || 'https://via.placeholder.com/150'}"
                   class="card-img-top rounded-3"
                   style="aspect-ratio:1/1; object-fit:cover;"
                   loading="lazy">
              ${precioOferta > 0 ? '<span class="badge-oferta">OFERTA</span>' : ''}
            </div>

            <div class="card-body p-2 d-flex flex-column">
              <h6 class="fw-bold text-capitalize text-start" style="font-size:1.25rem;">
                ${p.nombre.toLowerCase()}
              </h6>

              <div class="text-center my-1">
                <span class="text-success fw-bold fs-5">$${precioFinal}</span>
                <small class="text-muted">/${unidad}</small>
              </div>

              <div class="d-flex justify-content-center mb-2">
                <div class="input-group input-group-sm" style="width:100px;">
                  <button class="btn btn-light border" onclick="cambiarCantidad(${index}, -0.5)">-</button>
                  <input id="cant${index}"
                         class="form-control text-center bg-white border-0 fw-bold p-0"
                         value="0" readonly>
                  <button class="btn btn-light border" onclick="cambiarCantidad(${index}, 0.5)">+</button>
                </div>
              </div>

              <button class="btn btn-dark btn-sm w-100 fw-bold rounded-3 mt-auto"
                      onclick="agregar(${index})">
                Agregar
              </button>
            </div>
          </div>
        </div>
      `;
            index++;
        });
    }
    contenedor.innerHTML = htmlFinal;
}

// ========================
// INTERACCIÓN
// ========================

function cambiarCantidad(i, v) {
    const input = document.getElementById(`cant${i}`);
    let cant = parseFloat(input.value) || 0;
    cant = Math.max(0, cant + v);
    input.value = cant % 1 === 0 ? cant : cant.toFixed(1);
}

function agregar(i) {
    const input = document.getElementById(`cant${i}`);
    const cant = parseFloat(input.value);
    if (cant <= 0) return;

    const prod = productos[i];
    const existe = carrito.find(p => p.nombre === prod.nombre);

    if (existe) existe.cantidad += cant;
    else carrito.push({ ...prod, cantidad: cant });

    const btnFlotante = document.getElementById("carritoFlotante");
    if (btnFlotante) {
        btnFlotante.classList.add("btn-pop");
        setTimeout(() => btnFlotante.classList.remove("btn-pop"), 300);
    }

    input.value = 0;
    actualizarCarrito();
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const subtotalModal = document.getElementById("subtotalModal");
    const contadorMobile = document.getElementById("contadorCarrito");
    const contadorNav = document.getElementById("contadorNav");

    listaModal.innerHTML = "";
    total = 0;

    if (!carrito.length) {
        listaModal.innerHTML = `<p class="text-center text-muted py-3">El carrito está vacío</p>`;
    } else {
        carrito.forEach((p, i) => {
            const sub = p.precio * p.cantidad;
            total += sub;
            const nombrePro = p.nombre.charAt(0).toUpperCase() + p.nombre.slice(1).toLowerCase();

            listaModal.innerHTML += `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div class="d-flex flex-column">
            <span class="fw-bold">${nombrePro}</span>
            <small class="text-muted">${p.cantidad}${p.unidad} x $${p.precio}</small>
          </div>
          <div class="d-flex align-items-center">
            <span class="me-2 fw-bold">$${sub.toFixed(2)}</span>
            <button class="btn btn-sm text-danger border-0" onclick="eliminar(${i})">✕</button>
          </div>
        </div>
      `;
        });
    }

    if (totalModal) totalModal.innerText = total.toFixed(2);
    if (subtotalModal) subtotalModal.innerText = total.toFixed(2);

    const items = carrito.length;
    [contadorMobile, contadorNav].forEach(c => {
        if (c) {
            c.innerText = items;
            c.style.display = items > 0 ? "inline-block" : "none";
        }
    });

    // --- BLOQUEO VISUAL POR MONTO MÍNIMO ---
    const btnEnviar = document.querySelector(".btn-success-pedido");
    if (btnEnviar) {
        if (total > 0 && total < 45000) {
            btnEnviar.style.opacity = '0.6';
            btnEnviar.innerText = 'Mínimo de envío $45.000';
        } else {
            btnEnviar.style.opacity = '1';
            btnEnviar.innerText = 'Confirmar y enviar pedido';
        }
    }
}

function eliminar(i) {
    carrito.splice(i, 1);
    actualizarCarrito();
}

function vaciarCarrito() {
    carrito = [];
    actualizarCarrito();
    const modalElt = document.getElementById('modalCarrito');
    const modalInst = bootstrap.Modal.getInstance(modalElt);
    if(modalInst) modalInst.hide();
}

function filtrar(categoria) {
    document.querySelectorAll(".producto").forEach(p => {
        const cat = p.dataset.categoria;
        const esOferta = p.dataset.oferta === "true";
        p.style.display = (categoria === "todos" || (categoria === "ofertas" && esOferta) || cat === categoria) ? "block" : "none";
    });
}

function obtenerNumeroPedido() {
    let contadorTotal = parseInt(localStorage.getItem("contador_pedidos_total")) || 0;
    contadorTotal++;
    localStorage.setItem("contador_pedidos_total", contadorTotal);
    const prefijo = Math.floor(contadorTotal / 10000);
    const sufijo = contadorTotal % 10000;
    return `${String(prefijo).padStart(3, "0")}-${String(sufijo).padStart(4, "0")}`;
}

// ========================
// FINALIZAR PEDIDO (CON VALIDACIÓN DE $45.000)
// ========================
function enviarPedidoWhatsApp() { // Le quité el async para evitar bloqueos de seguridad
    if (!carrito.length) return;

    const nombre = document.getElementById("nombreCliente").value.trim();
    const telefono = document.getElementById("telefonoCliente").value.trim();
    const direccion = document.getElementById("direccionModal").value.trim();
    const errorDiv = document.getElementById("errorDireccion");

    if (!nombre || !telefono || !direccion) {
        if (errorDiv) errorDiv.classList.remove("d-none");
        return;
    }

    if (total < 45000) {
        mostrarAlertMinimo();
        return;
    }

    if (errorDiv) errorDiv.classList.add("d-none");

    const btnEnviar = document.querySelector(".btn-success-pedido");
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = 'Redirigiendo...';
    }

    const numeroPedido = obtenerNumeroPedido();
    const fechaPedido = obtenerFechaPedido();
    const aliasMP = "walter30mp";
    const linkApp = "link.mercadopago.com.ar/home";

    // EMOJIS SEGUROS
    const iconCarrito = "\uD83D\uDED2"; 
    const iconCalendario = "\uD83D\uDCC5"; 
    const iconUsuario = "\uD83D\uDC64"; 
    const iconTel = "\uD83D\uDCDE"; 
    const iconPin = "\uD83D\uDCCD"; 
    const iconCheck = "\u2705"; 
    const iconBolsa = "\uD83D\uDCB0"; 
    const iconManos = "\uD83E\uDD1D"; 
    const iconLentes = "\uD83D\uDE0E"; 
    const iconGracias = "\uD83D\uDE4F"; 

    let msg = iconCarrito + " *PEDIDO N\u00B0 " + numeroPedido + "*\n";
    msg += iconCalendario + " " + fechaPedido + "\n\n";
    msg += iconUsuario + " *CLIENTE:* " + nombre.toUpperCase() + "\n";
    msg += iconTel + " *TEL:* " + telefono + "\n";
    msg += iconPin + " *DIREC:* " + direccion.toUpperCase() + "\n";
    msg += "--------------------------\n";
    
    carrito.forEach(p => {
        msg += iconCheck + " " + p.cantidad + (p.unidad || 'un') + " - " + p.nombre.toUpperCase() + "\n";
    });
    
    msg += "--------------------------\n";
    msg += iconBolsa + " *TOTAL A PAGAR:* $" + total.toFixed(2) + "\n\n";
    msg += iconManos + " *MERCADO PAGO:*\n";
    msg += "\uD83D\uDCF1 *TOC\u00C1 EN \"INICIAR SESI\u00D3N\"*\n";
    msg += "\uD83D\uDC47 App: " + linkApp + "\n";
    msg += "\uD83D\uDC49 *Alias:* " + aliasMP + "\n\n";
    msg += iconLentes + " *No olvides mandar el comprobante*\n\n";
    msg += iconGracias + " \u00A1Muchas gracias por tu compra!";

    const whatsappUrl = "https://wa.me/5491127461954?text=" + encodeURIComponent(msg);

    // 1. MANDAR A SHEETS (Sin esperar respuesta, para no frenar la redirección)
    fetch(URL_SHEETS, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            pedido: numeroPedido,
            fecha: fechaPedido,
            cliente: nombre,
            telefono: telefono,
            productos: carrito.map(p => p.cantidad + (p.unidad || 'un') + " " + p.nombre).join("\n"),
            total: total.toFixed(2),
            direccion: direccion,
        })
    });

    // 2. REDIRECCIÓN INMEDIATA (Usamos window.open para saltar el bloqueo de iOS/Chrome)
    window.open(whatsappUrl, '_blank');

    // 3. LIMPIEZA POSTERIOR
    setTimeout(() => {
        if (typeof vaciarCarrito === "function") vaciarCarrito();
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.innerText = "Confirmar y enviar pedido";
        }
    }, 1000);
}

function mostrarAlertMinimo() {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Usamos mx-auto y un ancho del 92% para que parezca una tarjeta centrada
    const alertHtml = `
      <div class="fixed-bottom d-flex justify-content-center pb-4" style="z-index: 2000;">
        <div class="alert alert-danger alert-dismissible fade show shadow-lg mb-0" role="alert" 
             style="border-radius: 20px; font-family: 'Roboto Condensed', sans-serif; width: 92%; border: 2px solid #f5c2c7;">
          <div class="d-flex align-items-center p-2">
            <div class="bg-white rounded-circle d-flex align-items-center justify-content-center me-3" style="min-width: 45px; height: 45px;">
              <span style="font-size: 1.5rem;">⚠️</span>
            </div>
            <div style="font-size: 1.05rem;">
              <strong style="text-transform: uppercase; color: #842029;">Monto insuficiente</strong><br>
              El envío mínimo es de <b>$45.000</b>.
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="top: 50%; transform: translateY(-50%); right: 10px;"></button>
        </div>
      </div>
    `;
    
    container.innerHTML = alertHtml;

    setTimeout(() => {
      const alertElement = container.querySelector('.alert');
      if (alertElement) {
        const bsAlert = new bootstrap.Alert(alertElement);
        bsAlert.close();
      }
    }, 6000);
}

function cerrarMenuMobile() {
    const menu = document.getElementById("menuNav");
    const bsCollapse = bootstrap.Collapse.getInstance(menu);
    if (bsCollapse) bsCollapse.hide();
}

function obtenerFechaPedido() {
    const ahora = new Date();
    return `${String(ahora.getDate()).padStart(2, "0")}/${String(ahora.getMonth() + 1).padStart(2, "0")}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const direccionInput = document.getElementById("direccionModal");
    const errorDiv = document.getElementById("errorDireccion");
    if (direccionInput && errorDiv) {
        direccionInput.addEventListener("input", () => errorDiv.classList.add("d-none"));
    }
});
// Detectar el scroll para subir el carrito al llegar al fondo
window.addEventListener("scroll", () => {
    const carrito = document.getElementById("carritoFlotante");
    if (!carrito) return;

    // Calculamos la posición actual del scroll
    const scrollPropio = window.innerHeight + window.scrollY;
    const alturaTotal = document.documentElement.offsetHeight;

    // Si estamos a menos de 50px del fondo, subimos el carrito
    if (scrollPropio >= alturaTotal - 50) {
        carrito.classList.add("carrito-subido");
    } else {
        carrito.classList.remove("carrito-subido");
    }
});
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;

// modo oscuro
function setTheme(modo) {
    const body = document.body;
    
    if (modo === 'oscuro') {
        body.classList.add('dark-mode');
        localStorage.setItem('tema-don-nando', 'oscuro');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('tema-don-nando', 'claro');
    }
}

// Al cargar la página, verificamos si ya había elegido un modo
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('tema-don-nando') === 'oscuro') {
        document.body.classList.add('dark-mode');
    }
});








