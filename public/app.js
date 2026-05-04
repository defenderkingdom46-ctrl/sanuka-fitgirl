let store = {};
const logBox = document.getElementById('logBox');

// logs
new EventSource('/events').onmessage = e => {
  const d = JSON.parse(e.data);
  logBox.textContent += `[${d.type}] ${d.msg}\n`;
};

// tabs
document.querySelectorAll('.nav').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  };
});

// scan
async function scan(){
  const url=document.getElementById('url').value;
  document.getElementById('status').innerText="SCANNING...";

  const res=await fetch('/api/extract',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url})
  });

  const data=await res.json();
  store=data.report;

  document.getElementById('download').href=data.download;
  document.getElementById('download').innerText="DOWNLOAD ZIP";

  render(store);
}

// render list
function render(data){
  const list=document.getElementById('endpointList');

  let get=0, post=0;

  list.innerHTML=Object.values(data).map(ep=>{
    return Object.keys(ep.methods).map(m=>{
      if(m==="GET") get++;
      if(m==="POST") post++;

      return `
        <div class="endpoint" onclick='showDetails(${JSON.stringify(ep).replace(/'/g,"\\'")})'>
          <b>${m}</b> ${ep.url}
        </div>
      `;
    }).join('');
  }).join('');

  document.getElementById('stat-endpoints').innerText=Object.keys(data).length;
  document.getElementById('stat-get').innerText=get;
  document.getElementById('stat-post').innerText=post;

  drawGraph(get, post);
}

// details panel
function showDetails(ep){
  const d=document.getElementById('details');

  d.innerHTML=`
    <h3>${ep.url}</h3>
    <pre>${JSON.stringify(ep.methods,null,2)}</pre>
    <button onclick="copy('${ep.url}')">Copy URL</button>
    <button onclick="window.open('${ep.url}')">Open</button>
  `;
}

// filter
function filter(){
  const q=document.getElementById('search').value.toLowerCase();
  const m=document.getElementById('methodFilter').value;

  const filtered=Object.fromEntries(
    Object.entries(store).filter(([k,v])=>{
      if(q && !k.toLowerCase().includes(q)) return false;
      if(m && !v.methods[m]) return false;
      return true;
    })
  );

  render(filtered);
}

// copy
function copy(text){
  navigator.clipboard.writeText(text);
}

// graph
function drawGraph(get,post){
  const c=document.getElementById('graph');
  const ctx=c.getContext('2d');
  c.width=300; c.height=150;

  ctx.clearRect(0,0,300,150);

  ctx.fillStyle="#38bdf8";
  ctx.fillRect(50,150-get*5,40,get*5);

  ctx.fillStyle="#22c55e";
  ctx.fillRect(120,150-post*5,40,post*5);
}
