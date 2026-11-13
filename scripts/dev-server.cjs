// Local static site + the same API handler used by Vercel. No Google mock here.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const inquiry = require('../api/inquiry.js');
const root = path.resolve(__dirname,'../public');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif'};
http.createServer(async (req,res)=>{
 const url = new URL(req.url,'http://localhost');
 if(url.pathname==='/api/inquiry'){
  let body='';
  try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,message:'Please shorten your project details.'}));return;}}
   req.body=body;
   res.status=code=>{res.statusCode=code;return res};
   res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
   await inquiry(req,res);
  }catch{if(!res.writableEnded){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,message:'Unable to submit your inquiry.'}));}}
  return;
 }
 let file;
 try {file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}
 catch {res.writeHead(400);res.end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,bytes)=>{
  if(error){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 });
}).listen(Number(process.env.PORT)||8090,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${Number(process.env.PORT)||8090}`));
