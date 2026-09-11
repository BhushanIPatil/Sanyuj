Deno.serve(() => new Response(JSON.stringify({error:"Public accounts have been retired"}),{status:410,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}}));
