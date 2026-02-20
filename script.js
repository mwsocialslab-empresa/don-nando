const URL_SHEETS = "https://script.google.com/macros/s/AKfycbzXqJ6OZYl1cZu4IpEUCtSly5Hnud01Hrl1FyIrBwscb2tfR7Tr73Vcj-L-YzQz2toh8Q/exec";

const HORARIOS_ATENCION = {
    1: { inicio: "08:30", fin: "20:00" }, // Lunes
    2: { inicio: "08:30", fin: "20:00" }, // Martes
    3: { inicio: "08:30", fin: "20:00" }, // Miércoles
    4: { inicio: "08:30", fin: "20:00" }, // Jueves
    5: { inicio: "20:30", fin: "21:00" }, // Viernes
    6: { inicio: "08:30", fin: "20:00" }, // Sábado
    0: { inicio: "08:30", fin: "12:00" }  // Domingo
};

let carrito = [];
let productos = [];
let total = 0;

// ========================
// CARGA DE PRODUCTOS
// ========================
cargarDesdeSheets();

function cargarDesdeSheets() {
    fetch(URL_SHEETS)
        .then(r => r.json())
        .then(data => {
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
// INTERACCIÓN CARRITO
// ========================
function cambiarCantidad(i, v) {
    const input = document.getElementById(`cant${i}`);
    let cant = parseFloat(input.value) || 0;
    cant = Math.max(0, cant + v);
    input.value = cant % 1 === 0 ? cant : cant.toFixed(1);
}

function agregar(i) {
    // 1. VALIDACIÓN DE HORARIO (Asegura que el cartel salga CADA VEZ que se presiona si está cerrado)
    if (!estaAbierto()) {
        const modalElement = document.getElementById('modalCerrado');
        if (modalElement) {
            // Forzamos la creación de una instancia nueva para que se dispare siempre
            const modalCerrado = new bootstrap.Modal(modalElement);
            modalCerrado.show();
        } else {
            alert("Local Cerrado"); 
        }
        return; // IMPORTANTE: Corta la ejecución aquí para que no se sume al carrito
    }

    // 2. TU LÓGICA ORIGINAL (Se mantiene intacta)
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

// ASEGURATE DE TENER ESTA FUNCIÓN ASÍ PARA QUE NO FALLE EL CÁLCULO
function estaAbierto() {
    const ahora = new Date();
    const dia = ahora.getDay(); // 0=Domingo, 1=Lunes...
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const hActual = hora * 100 + minutos;

    const h = HORARIOS_ATENCION[dia];
    if (!h) return false;

    const [hI, mI] = h.inicio.split(":").map(Number);
    const [hF, mF] = h.fin.split(":").map(Number);
    const inicio = hI * 100 + mI;
    const fin = hF * 100 + mF;

    // Manejo de horarios que pasan la medianoche (ej: hasta las 01:00)
    if (fin < inicio) {
        return (hActual >= inicio || hActual <= fin);
    }
    return (hActual >= inicio && hActual <= fin);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
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
                </div>`;
        });
    }

    if (totalModal) totalModal.innerText = total.toFixed(2);

    const items = carrito.length;
    [contadorMobile, contadorNav].forEach(c => {
        if (c) {
            c.innerText = items;
            c.style.display = items > 0 ? "inline-block" : "none";
        }
    });

    const btnEnviar = document.querySelector(".btn-success-pedido");
    if (btnEnviar) {
        if (total > 0 && total < 45000) {
            btnEnviar.style.opacity = '0.6';
            btnEnviar.innerText = 'Mínimo de envío $45.000';
        } else {
            btnEnviar.style.opacity = '1';
            btnEnviar.innerText = 'Enviar pedido por WhatsApp';
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


// ========================
// FINALIZAR PEDIDO
// ========================
function enviarPedidoWhatsApp() {
    // 1. Validar horario antes de cualquier otra cosa
    if (!estaAbierto()) {
        const modalCerrado = new bootstrap.Modal(document.getElementById('modalCerrado'));
        modalCerrado.show();
        return; 
    }

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
    if (btnEnviar) btnEnviar.disabled = true;

    const numeroPedido = obtenerNumeroPedido();
    const fechaPedido = obtenerFechaPedido();
    const aliasMP = "Frigo19";
    const linkApp = "/link.mercadopago.com.ar/home";

    let msg = "🛒 *PEDIDO N\u00B0 " + numeroPedido + "*\n";
    msg += "📅 " + fechaPedido + "\n\n";
    msg += "👤 *CLIENTE:* " + nombre.toUpperCase() + "\n";
    msg += "📞 *TEL:* " + telefono + "\n";
    msg += "📍 *DIREC:* " + direccion.toUpperCase() + "\n";
    msg += "--------------------------\n";
    
    carrito.forEach(p => {
        msg += "✅ " + p.cantidad + (p.unidad || 'kg') + " - " + p.nombre.toUpperCase() + "\n";
    });
    
    msg += "--------------------------\n";
    msg += "💰 *TOTAL A PAGAR:* $" + total.toFixed(2) + "\n\n";
    msg += "🤝 *MERCADO PAGO:*\n";
    msg += "👇 *Alias:* " + aliasMP + "\n";
    msg += "👇 *Nombre: Eduardo Quiroga* " + "\n\n";
    msg += "🙏 ¡Muchas gracias!";

    const whatsappUrl = "https://wa.me/5491135980370?text=" + encodeURIComponent(msg);

    // Registro en Sheets
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

    // ABRIR EN PESTAÑA NUEVA
    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
        vaciarCarrito();
        if (btnEnviar) btnEnviar.disabled = false;
    }, 1500);
}

// ========================
// FUNCIONES AUXILIARES
// ========================
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

function obtenerFechaPedido() {
    const ahora = new Date();
    return `${String(ahora.getDate()).padStart(2, "0")}/${String(ahora.getMonth() + 1).padStart(2, "0")}/${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
}

function mostrarAlertMinimo() {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const alertHtml = `
      <div class="fixed-bottom d-flex justify-content-center pb-4" style="z-index: 2000;">
        <div class="alert alert-danger alert-dismissible fade show shadow-lg mb-0" role="alert" style="border-radius: 20px; width: 92%;">
          <strong>⚠️ Monto insuficiente</strong><br>El envío mínimo es de $45.000.
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      </div>`;
    container.innerHTML = alertHtml;
    setTimeout(() => { container.innerHTML = ""; }, 5000);
}

// Listener para el input de dirección
document.addEventListener("DOMContentLoaded", () => {
    const direccionInput = document.getElementById("direccionModal");
    if (direccionInput) {
        direccionInput.addEventListener("input", () => {
            document.getElementById("errorDireccion").classList.add("d-none");
        });
    }
});

// Scroll del carrito flotante
window.addEventListener("scroll", () => {
    const btn = document.getElementById("carritoFlotante");
    if (!btn) return;
    const scrollPropio = window.innerHeight + window.scrollY;
    const alturaTotal = document.documentElement.offsetHeight;
    if (scrollPropio >= alturaTotal - 50) btn.classList.add("carrito-subido");
    else btn.classList.remove("carrito-subido");
});