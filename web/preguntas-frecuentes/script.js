const d=[...document.querySelectorAll("details")];d.forEach(x=>x.ontoggle=()=>x.open&&d.forEach(y=>y!==x&&(y.open=false)));
