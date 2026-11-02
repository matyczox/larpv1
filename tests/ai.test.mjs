import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import net from 'node:net';
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function ready(url){for(let i=0;i<40;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,65));}throw Error('Serwer nie wystartował');}

test('lokalne AI: wykrywanie Ollama, dobór szablonu i tutor',async()=>{
  let lastTutorRequest;
  const mock=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'qwen3.5:9b'}]}));return;}
    if(req.url==='/api/chat'){
      const buffers=[];for await(const b of req)buffers.push(b);
      const body=JSON.parse(Buffer.concat(buffers).toString());
      if(body.format==='json')res.end(JSON.stringify({message:{content:'{"supported":true,"subject":"biology","reason":"Układ krążenia"}'}}));
      else{lastTutorRequest=body;res.end(JSON.stringify({message:{content:'Sprawdź, jak zmienia się wartość y.'}}));}
      return;
    }
    res.statusCode=404;res.end('{}');
  });
  await new Promise(r=>mock.listen(0,'127.0.0.1',r));
  const ollamaPort=mock.address().port, appPort=await port();
  const child=spawn(process.execPath,['server/server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(appPort),OLLAMA_URL:`http://127.0.0.1:${ollamaPort}`,OLLAMA_MODEL:'qwen3.5:9b'},stdio:'ignore'});
  const url=`http://127.0.0.1:${appPort}`;
  try{
    await ready(url);
    const health=await (await fetch(url+'/api/health')).json();assert.equal(health.aiAvailable,true);
    const result=await fetch(url+'/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:'krążenie małe'})});
    assert.equal(result.status,200);assert.equal((await result.json()).subject,'biology');
    const tutor=await fetch(url+'/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Jakie jest a?',context:{subject:'Matematyka',task:'Wyznacz a',hint:'Policz nachylenie',explanation:'Prawidłowy wynik to 2',attempt:{a:3},result:null}})});
    assert.equal(tutor.status,200);assert.match((await tutor.json()).reply,/Sprawdź/);
    const prompt=lastTutorRequest.messages[1].content;
    assert.ok(!prompt.includes('Prawidłowy wynik to 2'),'rozwiązanie wzorcowe nie powinno trafiać do tutora przed sprawdzeniem');
  }finally{child.kill('SIGTERM');await new Promise(r=>mock.close(r));}
});
