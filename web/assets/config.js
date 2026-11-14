// Editá estos datos con los tuyos
window.CONFIG = {
    whatsapp: "5491161612430",
    json: "https://raw.githubusercontent.com/Flinch101/panel-tienda/refs/heads/main/data/productos.json?v=" + Math.floor(Date.now() / 6e4),
    // Fotos: se prueban en orden. Si una fuente falla (ej: jsDelivr cuando el repo supera los 50 MB) se usa la siguiente.
    // Después de estas, la web prueba la carpeta fotos/ del propio sitio y, por último, el logo.
    fotos: [
        "https://raw.githubusercontent.com/Flinch101/panel-tienda/main/fotos/",
        "https://cdn.jsdelivr.net/gh/Flinch101/panel-tienda@main/fotos/"
    ],
    local: "data/productos.json", // se usa si falla el link de GitHub
    // Google Analytics 4 (gratis): pegá acá tu ID de medición, que empieza con G- (ej: "G-ABC123XYZ9"). Vacío = Analytics apagado.
    analytics: "G-N9L04W63ER",
    mail: "italiaindumentaria0@gmail.com",
    maps: "https://www.google.com/maps/place/San+Justo,+Provincia+de+Buenos+Aires/@-34.6879576,-58.5638958,14z/data=!3m1!4b1!4m6!3m5!1s0x95bcc622f9709805:0xb5f373c7721a50a5!8m2!3d-34.6874084!4d-58.5632629!16zL20vMGM3Njl6?entry=ttu&g_ep=EgoyMDI2MTAxOS4wIKXMDSoASAFQAw%3D%3D",
    ig: "https://instagram.com/italiaindumentaria1", fb: "https://www.facebook.com/italiaindumentaria/", tt: "https://tiktok.com/@italiaindumentaria"
};
