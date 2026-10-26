T.load().then(ps => { document.querySelector("#g").innerHTML = ps.map(T.card).join("") || "<p>Pronto vas a ver productos acá.</p>" });
