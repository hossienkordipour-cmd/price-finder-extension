import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {extname} from 'node:path';
import {tutorialFiles} from './tutorial-files.mjs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
export function createTutorialServer() {
  return http.createServer(async(req,res) => {
    const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"};
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400,headers);res.end();return;}
    if(pathname==='/'||pathname==='/tutorial'){res.writeHead(302,{...headers,Location:'/tutorial/'});res.end();return;}
    const key=pathname==='/tutorial/'?'index.html':pathname.startsWith('/tutorial/')?pathname.slice(10):'';
    const file=tutorialFiles.get(key);
    if(!file){res.writeHead(404,headers);res.end('Not found');return;}
    try{const bytes=await readFile(file);res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);}
    catch{res.writeHead(500,headers);res.end('Unable to load tutorial asset');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.TUTORIAL_PORT||4173);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('TUTORIAL_PORT must be between 1024 and 65535');
  const server=createTutorialServer();
  server.on('error',error=>{console.error(`Tutorial server: ${error.message}`);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`PIQO tutorial: http://127.0.0.1:${port}/tutorial/`));
}
