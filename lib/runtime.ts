import {neon} from '@neondatabase/serverless';
class Statement {
 constructor(private text:string,private values:unknown[]=[]){}
 bind(...values:unknown[]){return new Statement(this.text,values);}
 private async execute(){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_NOT_CONFIGURED');
  let position=0;const query=this.text.replace(/\?/g,()=>`$${++position}`);
  if(position!==this.values.length)throw new Error('INVALID_PARAMETERS');
  return neon(url).query(query,this.values);
 }
 async first<T=Record<string,unknown>>():Promise<T|null>{const rows=await this.execute();return (rows[0] as T)||null;}
 async run(){await this.execute();return {success:true};}
}
export const env={
 get DB(){return process.env.DATABASE_URL?{prepare:(query:string)=>new Statement(query)}:undefined;},
 get ANTHROPIC_API_KEY(){return process.env.ANTHROPIC_API_KEY||'';},
 get ANTHROPIC_MODEL(){return process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6';},
};
