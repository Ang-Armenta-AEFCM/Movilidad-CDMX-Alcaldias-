
const fmt=n=>Number(n).toLocaleString('es-MX');let schools=[],geo=null,poly=null,boundaries=null,heat=null,boroughClicks=null,points=null,selected='',filtered=[];const map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([19.37,-99.14],10);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors',maxZoom:19}).addTo(map);const $=id=>document.getElementById(id);const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');const nval=x=>Number(x)||0;const select=(id,values)=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;$(id).append(o)});function amount(x){return x.total;}function jenks(data,k){let values=[...data].sort((a,b)=>a-b),n=values.length;if(!n)return [0,1];k=Math.min(k,n);let mat1=Array.from({length:n+1},()=>Array(k+1).fill(0)),mat2=Array.from({length:n+1},()=>Array(k+1).fill(Infinity));for(let i=1;i<=k;i++){mat1[1][i]=1;mat2[1][i]=0}for(let l=2;l<=n;l++){let sum=0,sq=0,w=0;for(let m=1;m<=l;m++){let i=l-m+1,v=values[i-1];w++;sum+=v;sq+=v*v;let variance=sq-sum*sum/w;if(i>1)for(let j=2;j<=k;j++){let z=variance+mat2[i-1][j-1];if(mat2[l][j]>=z){mat1[l][j]=i;mat2[l][j]=z}}}mat1[l][1]=1;mat2[l][1]=sq-sum*sum/w}let breaks=Array(k+1);breaks[k]=values[n-1];breaks[0]=values[0];let count=k,idx=n;while(count>1){let id=Math.max(1,mat1[idx][count]-1);breaks[count-1]=values[id-1];idx=id;count--}return breaks}const palette=['#fff0f1','#f6bfca','#ed91aa','#d35481','#983657'];function color(v,breaks){let idx=0;for(let i=1;i<breaks.length-1;i++)if(v>breaks[i])idx++;return palette[Math.min(idx,4)]}function apply(){let bor=$('borough').value;filtered=schools.map(x=>({...x,count:amount(x)})).filter(x=>(!bor||norm(x.alcaldia)===norm(bor))&&x.count>0);let total=filtered.reduce((s,x)=>s+x.count,0);$('total').textContent=fmt(total);$('schools').textContent=fmt(filtered.length);let agg={};for(let x of filtered)agg[norm(x.alcaldia)]=(agg[norm(x.alcaldia)]||0)+x.count;let ranking=Object.entries(agg).sort((a,b)=>b[1]-a[1]);$('ranking').innerHTML=ranking.slice(0,8).map(([key,v])=>{let name=schools.find(x=>norm(x.alcaldia)===key)?.alcaldia||key;return `<div class="rankrow"><span class="rankname">${name}</span><div class="barback"><div class="bar" style="width:${100*v/ranking[0][1]}%"></div></div><b>${fmt(v)}</b></div>`}).join('')||'<p>Sin registros para los filtros seleccionados.</p>';if(poly){map.removeLayer(poly);poly=null}if(heat){map.removeLayer(heat);heat=null}if(points){map.removeLayer(points);points=null}if(geo&&$('showBoroughs').checked){let breaks=jenks(Object.values(agg).concat(Array.from({length:Math.max(0,16-Object.keys(agg).length)},()=>0)),5);poly=L.geoJSON(geo,{style:f=>{let v=agg[norm(f.properties.NOMGEO)]||0;return {stroke:false,fillColor:v?color(v,breaks):'#f5f5f5',fillOpacity:v ? .47 : .12}},interactive:false}).addTo(map)}if($('showZones').checked&&typeof L.heatLayer==='function'){heat=L.heatLayer(filtered.filter(x=>x.lat&&x.lon).map(x=>[x.lat,x.lon,Math.sqrt(x.count)]),{radius:24,blur:19,maxZoom:14,max:8,minOpacity:.30,gradient:{0.12:'#1bba72',0.32:'#a9d85e',0.50:'#ffe35d',0.68:'#ff982e',0.84:'#e53422',1:'#a80014'}}).addTo(map)}if($('showPoints').checked){let groups=new Map();for(let x of filtered.filter(x=>x.lat&&x.lon)){let key=x.inmueble_master||('CCT:'+x.cct);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}points=L.layerGroup([...groups.values()].map(group=>{let x=group[0],count=group.reduce((s,y)=>s+y.count,0),multi=group.length>1;let details=multi?`<p><b>CCT con estudiantes internacionales en este inmueble:</b></p>${group.map(y=>`<p><b>${y.cct}</b> · ${y.nombre} · ${y.nivel}: <strong>${fmt(y.count)} estudiantes</strong></p>`).join('')}`:`<p><b>CCT:</b> ${x.cct}</p><p><b>Nivel:</b> ${x.nivel}</p>`;return L.circleMarker([x.lat,x.lon],{pane:'markerPane',radius:Math.min(12,3+Math.sqrt(count)*1.25),weight:1,color:'#fff',fillColor:'#087c6d',fillOpacity:.83}).bindPopup(`<div class="popup"><h3>${multi?'Inmueble con varios CCT':x.nombre}</h3><p><b>Alcaldía:</b> ${x.alcaldia}</p>${details}<p><strong>${fmt(count)} estudiantes en total</strong></p></div>`)})).addTo(map)}if(geo){
  if(!boroughClicks){
    if(!map.getPane('boroughClickPane')){map.createPane('boroughClickPane');map.getPane('boroughClickPane').style.zIndex='425';}
    boroughClicks=L.geoJSON(geo,{pane:'boroughClickPane',style:{color:'transparent',weight:0,fillColor:'#ffffff',fillOpacity:0.002},interactive:true,
      onEachFeature:(f,l)=>{l.on('click',event=>{
        const name=norm(f.properties.NOMGEO),members=filtered.filter(x=>norm(x.alcaldia)===name);
        const sum=members.reduce((n,x)=>n+x.count,0);
        const cct=new Set(members.map(x=>x.cct)).size;
        // Un solo punto de entrada para los clics: ninguna capa de referencia tapa a las alcaldías.
        const zoneDetails=referenceDetailsAt(event.latlng);
        const boroughInfo=`<div class="popup"><h3>${f.properties.NOMGEO}</h3><p><strong>${fmt(sum)} estudiantes internacionales</strong></p><p>${fmt(cct)} CCT con estudiantes</p></div>`;
        L.popup({maxWidth:340}).setLatLng(event.latlng).setContent(boroughInfo+zoneDetails).openOn(map);
      });}
    }).addTo(map);
  }
  boroughClicks.bringToFront();
}
if(boundaries)boundaries.bringToFront();$('status').textContent=geo?'':'Límites de alcaldías no disponibles; mapa de calor activo.'}function fit(){map.fitBounds([[19.04,-99.38],[19.61,-98.92]],{padding:[15,15]})}for(let id of ['borough','showZones','showBoroughs','showPoints'])$(id).addEventListener('change',()=>{apply();if(id==='borough'&&$('borough').value){let a=filtered.filter(x=>x.lat&&x.lon);if(a.length)map.fitBounds(L.latLngBounds(a.map(x=>[x.lat,x.lon])).pad(.17),{maxZoom:13})}else if(id==='borough')fit()});$('reset').onclick=()=>{for(let id of ['borough'])$(id).value='';apply();fit()};$('fit').onclick=fit;async function init(){try{let r=await fetch('data/escuelas.json');if(!r.ok)throw Error('No se pudo cargar la información');schools=await r.json();select('borough',schools.map(x=>x.alcaldia));apply();fit()}catch(e){$('status').textContent=e.message+' · Abrir con servidor web local.';return}try{let url='https://services3.arcgis.com/GUmo8WkgMj5wT1l3/ArcGIS/rest/services/poligonos_alcaldias_cdmx/FeatureServer/0/query?where=1%3D1&outFields=NOMGEO&outSR=4326&f=geojson';let r=await fetch(url);if(!r.ok)throw Error('Servicio geográfico');let data=await r.json();if(data.features?.length===16){geo=data;boundaries=L.geoJSON(geo,{style:{color:'#73354e',weight:2.1,opacity:.95,fill:false},interactive:false}).addTo(map);boundaries.bringToFront();apply()}else throw Error('Límites incompletos')}catch(e){$('status').textContent='Mapa de calor disponible. Límites territoriales requieren conexión al servicio ArcGIS.'}}init();

// Capas de referencia importadas del respaldo uMap; se cargan sin duplicar alcaldías.
const referenceLayers = {priority:null,camps:null};
const referenceData = {priority:null,camps:null};
// Hit-testing de polígonos GeoJSON, sin capas transparentes que capturen eventos.
function insideRing(lon,lat,ring){
  let hit=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function insidePolygon(lon,lat,rings){
  return rings.length>0&&insideRing(lon,lat,rings[0])&&!rings.slice(1).some(r=>insideRing(lon,lat,r));
}
function containsLocation(geometry,ll){
  if(!geometry)return false;
  if(geometry.type==='Polygon')return insidePolygon(ll.lng,ll.lat,geometry.coordinates);
  if(geometry.type==='MultiPolygon')return geometry.coordinates.some(rings=>insidePolygon(ll.lng,ll.lat,rings));
  return false;
}
function referenceDetailsAt(latlng){
  let details=[];
  for(const [id,config] of Object.entries(referenceConfig)){
    if(!$(config.check).checked||!referenceData[id])continue;
    const matches=referenceData[id].features.filter(f=>containsLocation(f.geometry,latlng));
    for(const f of matches)details.push(overlayPopup(f,config.label));
  }
  return details.join('');
}
const referenceConfig = {
  priority:{check:'showPriority',file:'data/zonas_prioritarias.geojson',label:'Zona prioritaria',style:{color:'#0878aa',weight:2.8,opacity:1,fillColor:'#6dd7fb',fillOpacity:0.10,dashArray:null}},
  camps:{check:'showCamps',file:'data/campamentos.geojson',label:'Campamento, zona o colonia',style:{color:'#6534ad',weight:2.8,opacity:1,fillColor:'#c69af8',fillOpacity:0.10,dashArray:'7 4'}}
};
// All content from uploaded GeoJSON is text, never trusted markup.
function safeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function overlayPopup(feature,kind){
  const p=feature.properties||{};
  let title=p.Nombre||p.Zona||'Zona sin nombre';
  let rows=[];
  if(p.Zona)rows.push(`<p><b>Identificador:</b> ${safeText(p.Zona)}</p>`);
  if(p['Dirección'])rows.push(`<p><b>Dirección:</b> ${safeText(p['Dirección'])}</p>`);
  if(p['Características'])rows.push(`<p class="overlay-description"><b>Características:</b> ${safeText(p['Características'])}</p>`);
  if(p['Descripción'])rows.push(`<p class="overlay-description"><b>Descripción:</b> ${safeText(p['Descripción'])}</p>`);
  return `<div class="popup"><p class="overlay-kind">${safeText(kind)}</p><h3>${safeText(title)}</h3>${rows.join('')}</div>`;
}
async function initReferenceLayers(){
  // Los polígonos solo son visuales; sus fichas se consultan desde el clic de alcaldía.
  if(!map.getPane('referenceFills')){
    map.createPane('referenceFills');
    map.getPane('referenceFills').style.zIndex='410';
    map.getPane('referenceFills').style.pointerEvents='none';
  }
  const entries=Object.entries(referenceConfig);
  await Promise.all(entries.map(async ([id,config])=>{
    try{
      const response=await fetch(config.file);
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('GeoJSON no válido');
      // La capa es 100% no interactiva: no puede bloquear las fichas, ni al activarse ni al apagarse.
      referenceData[id]=data;
      referenceLayers[id]=L.geoJSON(data,{pane:'referenceFills',style:()=>({...config.style}),interactive:false});
      const input=$(config.check);
      input.addEventListener('change',()=>{if(input.checked)referenceLayers[id].addTo(map);else map.removeLayer(referenceLayers[id]);});
      if(input.checked)referenceLayers[id].addTo(map);
    }catch(error){
      $(config.check).disabled=true;
      console.error('No se cargó la capa '+id,error);
    }
  }));
}
initReferenceLayers();
