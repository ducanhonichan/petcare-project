const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
let user = {id:1, role:'ADMIN', is_banned:0};
let dbError = false;
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
  if(dbError) throw new Error('mock database failure');
  if(sql.startsWith('SELECT id, role, is_banned FROM users')) return [user && params[0]===user.id ? [user] : []];
  throw new Error('Unexpected query in review: '+sql);
}}};
const jwtPath=require.resolve('../src/config/jwt');
require.cache[jwtPath]={id:jwtPath,filename:jwtPath,loaded:true,exports:{secret:'review-secret',expiresIn:'1h'}};
const auth=require('../src/middleware/requireAuth');
const admin=require('../src/middleware/requireAdmin');
const app=express();app.use(express.json());
app.get('/protected',auth,(req,res)=>res.json(req.user));
app.get('/admin',auth,admin,(req,res)=>res.json(req.user));
app.use('/api/auth',require('../src/routes/auth.routes'));
// Load the actual server to test its final JSON handlers without opening a second port.
let productionApp;
const expressPath=require.resolve('express');
const factory=Object.assign((...args)=>{productionApp=express(...args);productionApp.listen=()=>{};return productionApp;},express);
require.cache[expressPath].exports=factory;
require('../server');
require.cache[expressPath].exports=express;
app.use((err,req,res,next)=>res.status(500).json({message:'Internal server error'}));

test('T28 security and JSON validation integration',async(t)=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const prodServer=express.application.listen.call(productionApp,0,'127.0.0.1');await new Promise(r=>prodServer.once('listening',r));
 t.after(()=>Promise.all([new Promise(r=>server.close(r)),new Promise(r=>prodServer.close(r))]));
 const base='http://127.0.0.1:'+server.address().port;
 const prod='http://127.0.0.1:'+prodServer.address().port;
 const token=jwt.sign({id:1,role:'ADMIN'},'review-secret');
 const headers={Authorization:'Bearer '+token};
 await t.test('active user works; ban revokes existing token; unban restores it',async()=>{
  assert.equal((await fetch(base+'/protected',{headers})).status,200);
  user.is_banned=1;const denied=await fetch(base+'/protected',{headers});
  assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{message:'Account is banned'});
  user.is_banned=0;assert.equal((await fetch(base+'/protected',{headers})).status,200);
 });
 await t.test('role changes in DB override token role',async()=>{
  user.role='USER';assert.equal((await fetch(base+'/admin',{headers})).status,403);
  user.role='ADMIN';const oldUserToken=jwt.sign({id:1,role:'USER'},'review-secret');
  assert.equal((await fetch(base+'/admin',{headers:{Authorization:'Bearer '+oldUserToken}})).status,200);
 });
 await t.test('deleted account and invalid token are rejected',async()=>{
  const saved=user;user=null;assert.equal((await fetch(base+'/protected',{headers})).status,401);user=saved;
  assert.equal((await fetch(base+'/protected',{headers:{Authorization:'Bearer bad'}})).status,401);
 });
 await t.test('DB failure fails closed',async()=>{
  dbError=true;assert.equal((await fetch(base+'/admin',{headers})).status,500);dbError=false;
 });
 await t.test('production server returns JSON for unknown path, malformed and oversized JSON',async()=>{
  const missing=await fetch(prod+'/not-a-route');assert.equal(missing.status,404);assert.deepEqual(await missing.json(),{message:'Route not found'});
  const malformed=await fetch(prod+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});
  assert.equal(malformed.status,400);assert.deepEqual(await malformed.json(),{message:'Invalid JSON body'});
  const large=await fetch(prod+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'x'.repeat(110000)})});
  assert.equal(large.status,413);assert.deepEqual(await large.json(),{message:'Request body too large'});
 });
 await t.test('register rejects overlong names, email and UTF-8 password bytes before DB writes',async()=>{
  const valid={name:'Demo',email:'demo@example.com',password:'abcdefgh'};
  for(const body of [{...valid,name:'x'.repeat(101)},{...valid,email:'x'.repeat(250)+'@example.com'},{...valid,password:'é'.repeat(37)}]){
   const response=await fetch(prod+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   assert.equal(response.status,400);assert.equal(typeof(await response.json()).message,'string');
  }
 });
});
