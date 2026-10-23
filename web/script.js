T.load().then(ps => { document.querySelector("#g").innerHTML = ps.slice(0, 8).map(T.card).join("") || "<p>Pronto vas a ver productos acá.</p>" });
