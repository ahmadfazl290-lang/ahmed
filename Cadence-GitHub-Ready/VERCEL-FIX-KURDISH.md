# چارەسەری هەڵەی app لە Vercel

پەیامی `Couldn't find any pages or app directory` واتە Next.js لەو فۆڵدەرەی Buildی تێدا دەکرێت، فۆڵدەری app نادۆزێتەوە. ئەمە لە نەبارکردنی فۆڵدەرەکان یان Root Directoryی هەڵە دروست دەبێت. پەیامەکانی npm funding و cache-dir هۆکاری ئەم شکستی Buildە نین.

## ١. فایلەکان لە GitHub تەواو بار بکە

Cadence-GitHub-Ready.zip دەربهێنە. ناوەڕۆکی ZIPەکە لە سەرەتا دەبێت بەم شێوەیە بێت:

```text
app/
  page.tsx
  layout.tsx
  api/
components/
lib/
public/
database/
tests/
docs/
package.json
package-lock.json
next.config.mjs
vercel.json
```

لە کۆگاکەی GitHub، Add file → Upload files بکەرەوە. لە File Explorerی کۆمپیوتەرەکەت، بچۆ ناو ئەو فۆڵدەرەی دەرتھێناوە؛ فایل و فۆڵدەرەکان پێکەوە هەڵبژێرە و ڕایانبکێشە بۆ ناو پەڕەی Uploadی GitHub. تەنها هەڵبژاردنی فایلە تەنیاکان لە Choose your files، فۆڵدەری app و components بار ناکات. ZIPەکە خۆی بۆ کۆگاکە بار مەکە.

پاش Commit changes لە پەڕەی سەرەکیی کۆگاکە پشتڕاستی بکەرەوە کە app و components و lib و package.json هەموویان لە هەمان ئاستن. app بکەرەوە و دڵنیا بە page.tsx و layout.tsxی تێدایە. ئەگەر تەنها package.json و README و فایلە تەنیاکان دەبینیت، فۆڵدەرەکانی پڕۆژەکە هێشتا بار نەکراون.

GitHub لە هەر بارکردنی وێبگەڕدا زۆرترین ١٠٠ فایل ڕێگە دەدات. پاکێجی GitHub-ready لەو سنوورە ناچێتە دەرەوە؛ کۆدی بەرنامە و هەموو تاقیکردنەوە یەکەییەکان تێدایە، تەنها سکریپتە زیادەکانی پشکنینی وێبگەڕ و ڕاپۆرتە کۆنەکان تێدا نین. کۆدی تەواو لە پاکێجی full-source دەمێنێتەوە.

GitHub Desktopیش دەتوانێت هەموو فۆڵدەرەکان بە تەواوی Commit و Push بکات. لیستی REMOVED-FILES.txt بخوێنەوە؛ بارکردنی فایلە نوێکان، فایلە کۆنە سڕاوەکان بە خۆکار ناسڕێتەوە.

## ٢. Root Directory لە Vercel ڕێکبخە

لە پڕۆژەکەی Vercel (لە وێنەکەت ناوی ahmedە)، Settings → Build and Deployment بکەرەوە.

| شوێنی فایلەکان لە GitHub | Root Directory لە Vercel |
| --- | --- |
| app و package.json لە سەرەتای کۆگاکەن | بەتاڵ؛ سەرەتای کۆگا |
| app و package.json لە ناو فۆڵدەری Cadence-Fixedن | Cadence-Fixed |
| app و package.json لە ناو فۆڵدەرێکی ترن | ناوی ڕاستەقینەی هەمان فۆڵدەر |

Root Directory مەکە بە app؛ دەبێت ئەو فۆڵدەرە بێت کە app و package.json هەردووکی تێدایە. ئەگەر app لە GitHub نییە، گۆڕینی Root Directory بە تەنها چارەسەر نییە؛ یەکەم فۆڵدەرەکان بار بکە.

Framework Preset: Next.js. Build Command: npm run build. Output Directory: ڕێکخستنی بنەڕەتی Next.js؛ Override ناچالاک بێت. Node.js: 24.x؛ لە package.json و lockfileیش 24.x دیاریکراوە تا پلەی سەرەکی بە خۆکار نەگۆڕێت.

## ٣. هەمان commitی نوێ بڵاو بکەرەوە

Save بکە. لە Deployments، commitی نوێی دوای بارکردنی فۆڵدەرەکان هەڵبژێرە و بڵاوی بکەرەوە. Redeployی commitێکی کۆن کە appی تێدا نەبووە هەمان هەڵە دووبارە دەکاتەوە. چاوەڕێی Ready بە، پاشان لە هەمان پڕۆژە Visit بکە.

ئەگەر هێشتا 404 هەبوو، دڵنیا بە ئەو domainە دەکەیتەوە کە بە هەمان پڕۆژە و وەشانی Ready بەستراوەتەوە. 404 پێش Buildی سەرکەوتوو بەڵگەی کێشە لە ڕووکاری بەرنامەکە نییە.

## ئاگادارکردنەوەی cache-dir

پەیامی زەردی `Unknown env config cache-dir` هەڵەی کەمبوونی app دروست ناکات. ئەگەر خۆت `NPM_CONFIG_CACHE_DIR` یان `npm_config_cache_dir`ت لە Environment Variables زیاد کردووە، ڕێکخستنە ناپێویستەکە لاببە؛ ناوی ڕێکخستنی npm بۆ cache بریتییە لە cache. هیچ Environment Variableێکی تایبەت بە Supabase یان Azure مەسڕەوە بۆ چارەسەری ئەم پەیامە.

ئەم پاکێجە کۆدی تەواوی چاککراوە. هەتا GitHub/Vercel لێرە بەست نەکرێنەوە، ڕێکخستنە تایبەتییەکانی کۆگاکەت و پڕۆژەکەت بە خۆکار ناگۆڕدرێن.

سەرچاوەکان: [ڕێکخستنی Root Directory لە Vercel](https://vercel.com/docs/builds/configure-a-build#root-directory)، [وەشانە پشتگیریکراوەکانی Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)، [بارکردنی فایل بۆ GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).
