import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';

async function unusedPort() {
  const s=net.createServer();
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  const port=s.address().port;
  await new Promise(resolve=>s.close(resolve));
  return port;
}
async function waitForServer(url) {
  for(let i=0;i<40;i++) {
    try {const r=await fetch(url);if(r.ok)return;}
    catch {}
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  throw Error('Serwer nie wstał');
}
test('serwer dostarcza interfejs, dane i API bez opłat',async()=>{
  const port=await unusedPort();
  const child=spawn(process.execPath,['server/server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),OLLAMA_URL:'http://127.0.0.1:1'},stdio:'ignore'});
  const url=`http://127.0.0.1:${port}`;
  try {
    await waitForServer(url);
    const page=await fetch(url);assert.equal(page.status,200);assert.match(await page.text(),/PARADOX/);
    const js=await fetch(url+'/src/app.js');assert.equal(js.status,200);assert.match(await js.text(),/function onRoute/);
    const css=await fetch(url+'/assets/style.css');assert.equal(css.status,200);assert.match(await css.text(),/\.mission-side/);
    const health=await fetch(url+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).aiAvailable,false);
    const missing=await fetch(url+'/not-real');assert.equal(missing.status,404);
    const invalid=await fetch(url+'/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:'{bad json'});
    assert.equal(invalid.status,400);
    const planWithoutModel=await fetch(url+'/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:'Past Perfect'})});
    assert.equal(planWithoutModel.status,503);
    const withoutModel=await fetch(url+'/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Jak policzyć a?',context:{subject:'Matematyka'}})});
    assert.equal(withoutModel.status,503);
  } finally {child.kill('SIGTERM');}
});
