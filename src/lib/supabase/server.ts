import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/types';
import { supabaseConfig } from './config';
export async function createClient() {
 const {url,key}=supabaseConfig();
 const store=await cookies();
 return createServerClient<Database>(url,key,{
  cookies:{
   getAll(){return store.getAll();},
   setAll(values){
    try{values.forEach(({name,value,options})=>store.set(name,value,options));}
    catch{/* Server Components are read only. proxy.ts refreshes cookies. */}
   }
  }
 });
}
export async function requireUser() {
 const db=await createClient();
 const {data,error}=await db.auth.getUser();
 if(error || !data.user) redirect('/entrar?expired=1');
 return {db,user:data.user};
}
