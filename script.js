const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwb9EhIdBKP2Jqoo1BnYF35cUg304CzvLQzpS0BG1tCqFJ8fCowHLyfgMk_QWZb0jg9Sg/exec";

let carrito = [];
let productos = [];
let total = 0;

// ========================
// CARGA DE PRODUCTOS (Optimized)
// ========================

// Intentar cargar desde caché para velocidad instantánea
const cache = localStorage.getItem('cache_productos');
if (cache) {
  renderizarProductos(JSON.parse(cache));
}

fetch(URL_SHEETS)
  .then(r => r.json())
  .then(data => {
    localStorage.setItem('cache_productos', JSON.stringify(data));
    renderizarProductos(data);
  })
  .catch(() => {
    if (!cache) {
      document.getElementById("productos").innerHTML = `<div class="alert alert-danger mx-auto text-center">No se pudo cargar el catálogo. Reintenta más tarde.</div>`;
    }
  });

function renderizarProductos(data) {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = ""; 
  productos = []; 
  let index = 0;

  for (const categoria in data) {
    data[categoria].forEach(p => {
      const precioOriginal = parseFloat(String(p.precio).replace(',', '.'));
      const precioOferta = p.oferta ? parseFloat(String(p.oferta).replace(',', '.')) : 0;
      const precioFinal = precioOferta > 0 ? precioOferta : precioOriginal;
      const unidad = p.unidad || 'kg';

      productos.push({ nombre: p.nombre, precio: precioFinal, unidad: unidad });

contenedor.innerHTML += `
        <div class="col-6 col-md-4 col-lg-3 producto" data-categoria="${categoria}" data-oferta="${precioOferta > 0}">
          <div class="card h-100 shadow-sm border-0" style="border-radius: 12px;">
            <div class="position-relative p-2">
              <img src="${p.imagen || 'https://via.placeholder.com/150'}" 
                   class="card-img-top rounded-3" 
                   style="aspect-ratio: 1 / 1; object-fit: cover;" 
                   loading="lazy">
              ${precioOferta > 0 ? '<span class="badge-oferta">OFERTA</span>' : ''}
            </div>
            
            <div class="card-body p-2 d-flex flex-column">
              <h6 class="fw-bold mb-1 text-capitalize text-start" style="font-size: 0.95rem;">
                ${p.nombre.toLowerCase()}
              </h6>
              
              <div class="text-center my-1">
                <span class="text-success fw-bold fs-5">$${precioFinal}</span>
                <small class="text-muted text-lowercase">/${unidad}</small>
              </div>
              
              <div class="d-flex justify-content-center mb-2">
                <div class="input-group input-group-sm" style="width: 100px;">
                  <button class="btn btn-light border" onclick="cambiarCantidad(${index}, -0.5)">-</button>
                 <input id="cant${index}"class="form-control text-center
                  bg-white border-0 fw-bold p-0"value="0"readonly>
                  <button class="btn btn-light border" onclick="cambiarCantidad(${index}, 0.5)">+</button>
                </div>
              </div>
              
              <button class="btn btn-dark btn-sm w-100 fw-bold rounded-3 mt-auto" onclick="agregar(${index})">
                Agregar
              </button>
            </div>
          </div>
        </div>
      `;
      index++;
    });
  }
}

// ========================
// INTERACCIÓN
// ========================

function cambiarCantidad(i, v) {
  const input = document.getElementById(`cant${i}`);
  let cant = parseFloat(input.value) || 0;
  cant = Math.max(0, cant + v);
  // Si es entero muestra 1, si tiene decimal muestra 1.5
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

  // Feedback visual
  const btnFlotante = document.getElementById("carritoFlotante");
  if (btnFlotante) {
    btnFlotante.classList.add("btn-pop");
    setTimeout(() => btnFlotante.classList.remove("btn-pop"), 300);
  }

  input.value = 0;
  actualizarCarrito();
  mostrarAlerta(`Añadido: ${prod.nombre}`);
}

function actualizarCarrito() {
  const listaModal = document.getElementById("listaModal");
  const totalModal = document.getElementById("totalModal");
  const subtotalModal = document.getElementById("subtotalModal");
  const contadorMobile = document.getElementById("contadorCarrito");
  const contadorNav = document.getElementById("contadorNav");

  listaModal.innerHTML = "";
  total = 0;

  if (carrito.length === 0) {
    listaModal.innerHTML = `<p class="text-center text-muted py-3">El carrito está vacío</p>`;
  } else {
    carrito.forEach((p, i) => {
      const sub = p.precio * p.cantidad;
      total += sub;
      const nombrePro = p.nombre.charAt(0).toUpperCase() + p.nombre.slice(1).toLowerCase();

      listaModal.innerHTML += `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div class="d-flex flex-column">
            <span class="fw-bold" style="text-transform: capitalize;">${nombrePro}</span>
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

  // Actualizar contadores
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
    mostrarAlerta("Carrito vaciado", "error");
  }
}

function filtrar(categoria) {
  document.querySelectorAll(".producto").forEach(p => {
    const cat = p.dataset.categoria;
    const esOferta = p.dataset.oferta === "true";
    p.style.display = (categoria === "todos" || (categoria === "ofertas" && esOferta) || cat === categoria) ? "block" : "none";
  });
}

// ========================
// FINALIZAR PEDIDO
// ========================

function enviarPedidoWhatsApp() {
  if (!carrito.length) return;
  const direccion = document.getElementById("direccionModal").value.trim();
  const errorDiv = document.getElementById("errorDireccion"); // Referencia al div de error
  
  if (!direccion) {
    if (errorDiv) errorDiv.classList.remove("d-none"); // Muestra el mensaje rojo
    document.getElementById("direccionModal").focus();
    return;
  } else {
    if (errorDiv) errorDiv.classList.add("d-none"); // Oculta si ya escribió algo
  }

  const numeroPedido = obtenerNumeroPedido();
  const fechaPedido = obtenerFechaPedido();

  let msg = `🛒 *PEDIDO N° ${numeroPedido}*\n📅 ${fechaPedido}\n--------------------------\n`;
  carrito.forEach(p => {
    msg += `✅ ${p.cantidad}${p.unidad} - ${p.nombre.toUpperCase()}\n`;
  });
  msg += `--------------------------\n📍 *Dir:* ${direccion}\n💰 *Total:* $${total.toFixed(2)}`;

  window.open(`https://wa.me/5491127461954?text=${encodeURIComponent(msg)}`, "_blank");
}

function cerrarMenuMobile() {
  const menu = document.getElementById("menuNav");
  const bsCollapse = bootstrap.Collapse.getInstance(menu);
  if (bsCollapse) bsCollapse.hide();
}

// agregar numero de pedido al carrito
function obtenerNumeroPedido() {
  let nro = localStorage.getItem("pedido_numero");
  nro = nro ? parseInt(nro) + 1 : 1;
  localStorage.setItem("pedido_numero", nro);
  return String(nro).padStart(3, "0");
}
function obtenerNumeroPedido() {
  let nro = localStorage.getItem("pedido_numero");
  nro = nro ? parseInt(nro) + 1 : 1;
  localStorage.setItem("pedido_numero", nro);
  return String(nro).padStart(3, "0");
}
function obtenerFechaPedido() {
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, "0");
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const anio = ahora.getFullYear();
  const hora = String(ahora.getHours()).padStart(2, "0");
  const min = String(ahora.getMinutes()).padStart(2, "0");

  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}
function mostrarAlerta(mensaje, tipo = "success") {
  // Como no tienes un sistema de Toast complejo, usamos un console.log 
  // o puedes implementar un alert simple para no romper el flujo.
  console.log(`${tipo.toUpperCase()}: ${mensaje}`);
  
  // Si quieres que el error de dirección desaparezca al escribir:
  const direccionInput = document.getElementById("direccionModal");
  direccionInput.addEventListener('input', () => {
    document.getElementById("errorDireccion").classList.add("d-none");
  });
}