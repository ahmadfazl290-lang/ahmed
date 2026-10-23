import {createPronunciationHandlers} from '../../../lib/pronunciation-service.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
// Only this server route reads credentials. They never enter a browser bundle.
const handlers=createPronunciationHandlers({
  getConfig:()=>({key:process.env.AZURE_SPEECH_KEY,region:process.env.AZURE_SPEECH_REGION,endpoint:process.env.AZURE_SPEECH_ENDPOINT,tier:process.env.AZURE_SPEECH_TIER}),
  fetchImpl:(...args: Parameters<typeof fetch>)=>fetch(...args),
});
export const GET=handlers.GET;
export const POST=handlers.POST;
