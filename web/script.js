<<<<<<< HEAD
T.load().then(ps => { document.querySelector("#g").innerHTML = T.primerosConStock(ps).map(p => T.card(p)).join("") || "<p>Pronto vas a ver productos acá.</p>" });
=======
T.load().then(ps => { document.querySelector("#g").innerHTML = ps.map(T.card).join("") || "<p>Pronto vas a ver productos acá.</p>" });
>>>>>>> 0aab7b1fed432dab012fffc66d171a52b88a310b
