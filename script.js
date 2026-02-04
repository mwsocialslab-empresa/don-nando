const URL_SHEETS = "https://script.google.com/macros/s/AKfycbyRbAiuDMfdyiASwWra6Zgm-_4zCeYuhyAhreXtZTdqxHeoqOmyZL08ySEAz-BInPNt/exec";

let carrito = [];
let productos = [];
let total = 0;

// ========================
// CARGA DE PRODUCTOS (CON CACHÉ OPTIMIZADA)
// ========================

const CACHE_KEY = 'cache_productos';
const CACHE_TIME_KEY = 'cache_productos_fecha';
const mediaHora = 30 * 60 * 1000;

const cacheLocal = localStorage.getItem(CACHE_KEY);
const ultimaCarga = localStorage.getItem(CACHE_TIME_KEY);
const ahora = Date.now();

// Si hay cache y es reciente, cargamos de inmediato
if (cacheLocal && ultimaCarga && (ahora - ultimaCarga < mediaHora)) {
    renderizarProductos(JSON.parse(cacheLocal));
} else {
    cargarDesdeSheets();
}

function cargarDesdeSheets() {
    fetch(URL_SHEETS)
        .then(r => r.json())
        .then(data => {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIME_KEY, Date.now());
            renderizarProductos(data);
        })
        .catch(() => {
            if (cacheLocal) {
                renderizarProductos(JSON.parse(cacheLocal));
            } else {
                document.getElementById("productos").innerHTML =
                    `<div class="alert alert-danger mx-auto text-center">
                      No se pudo cargar el catálogo. Reintenta más tarde.
                    </div>`;
            }
        });
}

function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    let htmlFinal = ""; // Acumulamos todo aquí para que cargue más rápido
    productos = [];
    let index = 0;

    for (const categoria in data) {
        data[categoria].forEach(p => {
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
              <h6 class="fw-bold mb-1 text-capitalize text-start" style="font-size:0.95rem;">
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
    contenedor.innerHTML = htmlFinal; // Una sola escritura al DOM
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
        listaModal.innerHTML =
            `<p class="text-center text-muted py-3">El carrito está vacío</p>`;
    } else {
        carrito.forEach((p, i) => {
            const sub = p.precio * p.cantidad;
            total += sub;
            const nombrePro =
                p.nombre.charAt(0).toUpperCase() + p.nombre.slice(1).toLowerCase();

            listaModal.innerHTML += `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div class="d-flex flex-column">
            <span class="fw-bold">${nombrePro}</span>
            <small class="text-muted">${p.cantidad}${p.unidad} x $${p.precio}</small>
          </div>
          <div class="d-flex align-items-center">
            <span class="me-2 fw-bold">$${sub.toFixed(2)}</span>
            <button class="btn btn-sm text-danger border-0"
                    onclick="eliminar(${i})">✕</button>
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
}

function eliminar(i) {
    carrito.splice(i, 1);
    actualizarCarrito();
}

function vaciarCarrito() {
    if (confirm("¿Vaciar todo el carrito?")) {
        carrito = [];
        actualizarCarrito();
    }
}

function filtrar(categoria) {
    document.querySelectorAll(".producto").forEach(p => {
        const cat = p.dataset.categoria;
        const esOferta = p.dataset.oferta === "true";
        p.style.display =
            (categoria === "todos" ||
                (categoria === "ofertas" && esOferta) ||
                cat === categoria)
                ? "block"
                : "none";
    });
}

// ========================
// FINALIZAR PEDIDO
// ========================

async function enviarPedidoWhatsApp() {
    if (!carrito.length) return;

    const direccionInput = document.getElementById("direccionModal");
    const direccion = direccionInput.value.trim();
    const errorDiv = document.getElementById("errorDireccion");

    if (!direccion) {
        errorDiv.classList.remove("d-none");
        direccionInput.focus();
        return;
    }

    errorDiv.classList.add("d-none");

    const btnEnviar = document.querySelector(".btn-success-pedido");
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    }

    const numeroPedido = obtenerNumeroPedido();
    const fechaPedido = obtenerFechaPedido();
    const aliasMP = "walter30mp";
    const linkPago = `https://www.mercadopago.com.ar/home?alias=${aliasMP}`;

    let msg = `🛒 *PEDIDO N° ${numeroPedido}*\n`;
    msg += `📅 ${fechaPedido}\n`;
    msg += `--------------------------\n`;
    carrito.forEach(p => {
        msg += `✅ ${p.cantidad}${p.unidad} - ${p.nombre.toUpperCase()}\n`;
    });
    msg += `--------------------------\n`;
    msg += `📍 *Dir:* ${direccion}\n`;
    msg += `💰 *Total a pagar:* $${total.toFixed(2)}\n\n`;
    msg += `💳 *Pagá con Mercado Pago:* ${linkPago}\n\n`;
    msg += `🙏 ¡Gracias por tu compra!`;

    const whatsappUrl = `https://wa.me/5491127461954?text=${encodeURIComponent(msg)}`;

    try {
        // Ejecutamos el guardado en Sheets SIN esperar a que termine para no bloquear el redireccionamiento
        fetch(URL_SHEETS, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pedido: numeroPedido,
                fecha: fechaPedido,
                productos: carrito.map(p => `${p.cantidad}${p.unidad} ${p.nombre}`).join("\n"),
                total: total.toFixed(2),
                direccion: direccion,
            })
        });

        // EN MÓVIL: window.location.href es mucho más fiable que window.open
        // Detectamos si es móvil de forma sencilla
        const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (esMovil) {
            window.location.href = whatsappUrl;
        } else {
            window.open(whatsappUrl, "_blank");
        }

        // Limpiamos el carrito después de un momento
        setTimeout(() => {
            carrito = [];
            actualizarCarrito();
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.innerText = "Pedido Enviado";
            }
            // Cerrar modal si usas Bootstrap
            const modalElt = document.getElementById('modalCarrito');
            if(modalElt) {
                const modalInst = bootstrap.Modal.getInstance(modalElt);
                if(modalInst) modalInst.hide();
            }
        }, 1000);

    } catch (error) {
        console.error("Error:", error);
        // Si todo falla, al menos intentamos abrir WhatsApp
        window.location.href = whatsappUrl;
    }
}

function cerrarMenuMobile() {
    const menu = document.getElementById("menuNav");
    const bsCollapse = bootstrap.Collapse.getInstance(menu);
    if (bsCollapse) bsCollapse.hide();
}

// ========================
// UTILIDADES
// ========================
function obtenerNumeroPedido() {
    // 1. Obtenemos el contador total almacenado (o empezamos en 0)
    let contadorTotal = parseInt(localStorage.getItem("contador_pedidos_total")) || 0;
    
    // 2. Incrementamos para el nuevo pedido
    contadorTotal++;
    
    // 3. Guardamos el nuevo total para la próxima vez
    localStorage.setItem("contador_pedidos_total", contadorTotal);
    
    // 4. Lógica de formato 000-0000
    // El prefijo (primeros 3 dígitos) es el total dividido 10000
    // El sufijo (últimos 4 dígitos) es el resto de esa división
    const prefijo = Math.floor(contadorTotal / 10000);
    const sufijo = contadorTotal % 10000;
    
    // 5. Formateamos con ceros a la izquierda
    const parte1 = String(prefijo).padStart(3, "0");
    const parte2 = String(sufijo).padStart(4, "0");
    
    return `${parte1}-${parte2}`;
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