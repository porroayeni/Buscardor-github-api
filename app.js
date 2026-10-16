const API = 'https://api.github.com';
const form = document.querySelector('#form-buscar');
const input = document.querySelector('#input-usuario');
const selectOrden = document.querySelector('#select-orden');
const boton = document.querySelector('#btn-buscar');
const estado = document.querySelector('#estado');
const perfil = document.querySelector('#perfil');
const titulo = document.querySelector('#titulo-repos');
const repos = document.querySelector('#repos');

// Elementos nuevos
const divLenguajes = document.querySelector('#resumen-lenguajes');
const btnCargarMas = document.querySelector('#btn-cargar-mas');
const piePeticiones = document.querySelector('#pie-peticiones');

// Variables para paginación (Actividad 3)
let paginaActual = 1;
let usuarioActual = '';
let todosLosRepos = []; // Para contar los idiomas

// Actividad 3: Modificar obtenerJSON para capturar peticiones restantes
async function obtenerJSON(url) {
    const res = await fetch(url);
    
    // Leer y mostrar la cabecera
    const limiteRestante = res.headers.get('x-ratelimit-remaining');
    if (limiteRestante !== null) {
        piePeticiones.textContent = `Peticiones disponibles en la API: ${limiteRestante}`;
    }

    if (res.status === 404) throw new Error('Usuario no encontrado');
    if (res.status === 403) throw new Error('Límite de peticiones alcanzado');
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    
    return res.json();
}

function mostrarPerfil(u) {
    const img = document.createElement('img');
    img.src = u.avatar_url;
    img.alt = `Avatar de ${u.login}`;
    
    const nombre = document.createElement('h2');
    nombre.textContent = u.name ?? u.login;
    
    const datos = document.createElement('p');
    datos.textContent = `${u.public_repos} repositorios • ${u.followers} seguidores`;
    
    const enlace = document.createElement('a');
    enlace.href = u.html_url;
    enlace.target = '_blank';
    enlace.textContent = 'Ver en GitHub';
    
    const info = document.createElement('div');
    info.append(nombre, datos, enlace);
    
    perfil.replaceChildren(img, info);
    perfil.classList.remove('oculto');
}

// Modificada para permitir añadir sin borrar (parámetro limpiar)
function mostrarRepos(lista, limpiar = true) {
    if (limpiar) repos.innerHTML = '';
    
    lista.forEach(r => {
        const a = document.createElement('a');
        a.href = r.html_url;
        a.target = '_blank';
        a.textContent = r.name;
        
        const li = document.createElement('li');
        const lenguaje = r.language ?? 'sin lenguaje';
        li.append(a, ` (${lenguaje}) ${r.stargazers_count}`);
        
        repos.append(li);
    });
    titulo.classList.remove('oculto');
}

// Actividad 2: Función de resumen de lenguajes
function procesarLenguajes(listaRepos) {
    const conteo = {};
    listaRepos.forEach(r => {
        if (r.language) {
            conteo[r.language] = (conteo[r.language] || 0) + 1;
        }
    });
    
    const arrayLenguajes = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    
    if (arrayLenguajes.length > 0) {
        const resumenFormateado = arrayLenguajes.map(([lenguaje, cant]) => `${lenguaje} (${cant})`).join(' | ');
        divLenguajes.textContent = `Lenguajes detectados: ${resumenFormateado}`;
    } else {
        divLenguajes.textContent = 'No hay lenguajes detectados.';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usuario = encodeURIComponent(input.value.trim());
    if (!usuario) return;
    
    // Reiniciar paginación
    usuarioActual = usuario;
    paginaActual = 1;
    todosLosRepos = [];
    
    // Actividad 2: Añadido 'sort' del select y 'page' 
    const params = new URLSearchParams({ sort: selectOrden.value, per_page: 5, page: paginaActual });
    
    boton.disabled = true;
    estado.className = '';
    estado.textContent = 'Buscando...';
    btnCargarMas.classList.add('oculto');
    divLenguajes.textContent = '';
    
    try {
        const [datosUsuario, datosRepos] = await Promise.all([
            obtenerJSON(`${API}/users/${usuario}`),
            obtenerJSON(`${API}/users/${usuario}/repos?${params}`)
        ]);
        
        mostrarPerfil(datosUsuario);
        mostrarRepos(datosRepos, true); // True = limpia la lista
        
        todosLosRepos = [...datosRepos];
        procesarLenguajes(todosLosRepos);
        
        // Actividad 3: Ocultar si hay menos de 5 resultados
        if (datosRepos.length === 5) {
            btnCargarMas.classList.remove('oculto');
        }
        
        estado.textContent = '';
    } catch (error) {
        perfil.classList.add('oculto');
        titulo.classList.add('oculto');
        repos.innerHTML = '';
        estado.className = 'error';
        estado.textContent = error.message;
    } finally {
        boton.disabled = false;
    }
});

// Actividad 3: Evento del Botón Cargar Más
btnCargarMas.addEventListener('click', async () => {
    paginaActual++; // Siguiente página
    const params = new URLSearchParams({ sort: selectOrden.value, per_page: 5, page: paginaActual });
    
    btnCargarMas.disabled = true;
    btnCargarMas.textContent = 'Cargando...';
    
    try {
        const nuevosRepos = await obtenerJSON(`${API}/users/${usuarioActual}/repos?${params}`);
        
        mostrarRepos(nuevosRepos, false); // False = añade sin borrar los anteriores
        
        // Actualizamos los lenguajes globalmente
        todosLosRepos = [...todosLosRepos, ...nuevosRepos];
        procesarLenguajes(todosLosRepos);
        
        // Si devuelve menos de 5, ya no hay más páginas
        if (nuevosRepos.length < 5) {
            btnCargarMas.classList.add('oculto');
        }
    } catch (error) {
        estado.className = 'error';
        estado.textContent = error.message;
    } finally {
        btnCargarMas.disabled = false;
        btnCargarMas.textContent = 'Cargar más';
    }
});