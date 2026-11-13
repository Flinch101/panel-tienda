T.load().then(ps => { document.querySelector("#g").innerHTML = T.primerosConStock(ps).map(p => T.card(p)).join("") || "<p>Pronto vas a ver productos acá.</p>" });
