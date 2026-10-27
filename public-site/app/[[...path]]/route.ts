import pages from '../../lib/pages.json';
export function GET(request:Request){let path=new URL(request.url).pathname;if(!path.endsWith('/'))path+='/';const html=(pages as Record<string,string>)[path];return new Response(html||'页面不存在',{status:html?200:404,headers:{'Content-Type':html?'text/html; charset=utf-8':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});}
