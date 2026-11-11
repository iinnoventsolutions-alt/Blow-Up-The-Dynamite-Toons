// D4.6.5F: inspect the installed muxer's actual source for BlockGroup / DiscardPadding support.
// Read-only diagnostic. No binary rewriting or production changes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const entry=require.resolve('webm-muxer');
const source=await readFile(entry,'utf8');
const terms=['DiscardPadding','discardPadding','BlockGroup','SimpleBlock','CodecDelay','SeekPreRoll','preSkip','finalize','addAudioChunk'];
const matches={};
for(const term of terms){
 const offsets=[];let at=-1;
 while((at=source.indexOf(term,at+1))!==-1){offsets.push(at);if(offsets.length>=25)break;}
 matches[term]={count:offsets.length,contexts:offsets.slice(0,8).map(i=>source.slice(Math.max(0,i-220),Math.min(source.length,i+380)))};
}
const result={packageEntry:entry,sourceLength:source.length,matches,assessment:'Source inspection only; matching identifiers do not establish functional padding support.'};
await mkdir('diagnostic-output',{recursive:true});
await writeFile('diagnostic-output/d4-6-5f-muxer-source.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({packageEntry:entry,sourceLength:source.length,counts:Object.fromEntries(Object.entries(matches).map(([k,v])=>[k,v.count]))},null,2));
