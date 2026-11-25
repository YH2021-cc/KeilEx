# KeilEx

鍦?VS Code 閲屾墦寮€銆佺紪璇戙€侀厤缃苟鍚屾 **Keil MDK-ARM** 宸ョ▼銆傞鐗堝彧鏀寔 `.uvprojx`锛圓RM锛夛紝UI 鏂瑰悜瀵瑰簲璁捐绋?**Concept A 路 Native Workbench**銆?
鐣岄潰鎸?A 鐨勬繁鑹茬増寮忓疄鐜帮細**鑷畾涔変晶杈规爮 + 鍙屾爮榄旀硶妫?+ 鐙珛宸ョ▼椤归〉闈?*锛屼笉鍐嶆槸 VS Code 榛樿琛ㄥ崟椋庢牸銆?
## 鍔熻兘

- 鎵撳紑 `.uvprojx`锛岀敤鑷畾涔夋繁鑹蹭晶杈规爮杩樺師 Target / Group / File 宸ョ▼鏍戙€佺洰鏍囬€夋嫨涓庢瀯寤哄姩浣溿€?- 缂栬瘧锛團7锛夈€侀噸鏂扮紪璇戯紙Ctrl+Alt+F7锛夈€佹竻鐞嗐€佷笅杞藉埌鑺墖锛圕trl+Alt+D锛夈€?- 榄旀硶妫?**鐩爣閫夐」**锛?0 涓腑鏂囬〉绛撅紙鍣ㄤ欢 / 鐩爣 / 杈撳嚭 / 鍒楄〃 / 鐢ㄦ埛 / C/C++ / 姹囩紪 / 閾炬帴鍣?/ 璋冭瘯 / 瀹炵敤宸ュ叿锛夛紝鎸?schema 鍏ㄩ噺鏄剧ず绾?145 涓瓧娈碉紱鍙充笂瑙?`</>` 鍙墦寮€ Advanced XML銆?- **椤圭洰椤?*锛氫晶杈规爮 `榄旀硶妫?/ 椤圭洰椤?/ 鍦?Keil 鎵撳紑` 涓夋寜閽紱鐙珛缂栬緫鍣ㄩ〉闈㈡樉绀哄叏閮ㄦ枃浠讹紙甯﹀垎缁勩€佹悳绱€佸垎缁勮繃婊ゃ€佹墦寮€鎸夐挳锛夛紝骞舵敮鎸?Target / Group / File 鐨勬柊澧炪€佸垹闄ゃ€佹帓搴忋€?- **鍏抽棴宸ョ▼**锛氫晶杈规爮鍙充笂瑙?`脳` 鍏抽棴褰撳墠宸ョ▼锛涘叧闂悗鍥炲埌鈥滄墦寮€ Keil 宸ョ▼鈥濈┖鐘舵€併€?- **鍏ㄩ儴鏂囦欢鏍?*锛氫晶杈规爮 `宸ョ▼ / 鍏ㄩ儴鏂囦欢` 鍒囨崲锛沗鍏ㄩ儴鏂囦欢` 鎸夊伐绋嬬洰褰曟噿鍔犺浇鏄剧ず鎵€鏈夋枃浠跺拰瀛愮洰褰曪紝鐐瑰嚮鏂囦欢鐩存帴鎵撳紑銆?- **IntelliSense 鍚屾**锛氬姞杞藉伐绋嬫垨淇濆瓨榄旀硶妫掑悗锛屾妸 Keil 鐨?`IncludePath` / `Define` 鍚屾鍒板伐浣滃尯 `.vscode/c_cpp_properties.json`锛岃В鍐?C/C++ 鎵句笉鍒板ご鏂囦欢锛涗篃鍙繍琛屽懡浠も€滃悓姝?C/C++ 鍖呭惈璺緞鈥濄€?- **ARM 缂栬瘧鍣ㄥ彲閫?*锛氱洰鏍囬〉涓嬫媺璇诲彇鏈満 ARMCC / ARMCLANG锛屽啓鍏?`pCCUsed` 鍜?`uAC6`銆?- **C/C++ 鍖呭惈璺緞**锛欿eil 椋庢牸鐨勮矾寰勫垪琛紝鏀寔鏂板缓/鎻掑叆/鍒犻櫎/鎺掑簭/娴忚/鎵撳紑璺緞銆?- **璋冭瘯鍣ㄨ缃?*锛氳皟璇曢〉鍜屽疄鐢ㄥ伐鍏烽〉鎻愪緵 `璁剧疆鈥锛屾墦寮€娣辫壊 `Cortex-M 鐩爣椹卞姩璁剧疆`锛涘寘鍚皟璇曘€佽窡韪€丗lash 涓嬭浇銆佸櫒浠跺寘椤电锛孋onnect / Reset 閫夐」涓?Keil 涓€鑷淬€?- 鐩爣鍒囨崲锛氳鍐?`.uvoptx` 涓殑 `IsCurrentTarget`锛屽苟鏀寔鏂板/澶嶅埗/鍒犻櫎鐩爣銆?- 涓嫳鏂囩晫闈細榛樿涓枃锛屽彲鐐瑰嚮鐘舵€佹爮 `涓?/ EN` 鎴栦慨鏀?`keilStudio.language`銆?- 鍙屽悜鍚屾锛氱洃鍚?`.uvprojx` / `.uvoptx` 鐨勫閮ㄥ彉鍖栵紱VS Code 鍐欏叆鍚庯紝Keil 鎵撳紑鏃惰浣跨敤 Project > Reload锛堟垨閲嶆柊鎵撳紑宸ョ▼锛夈€?- 鏋勫缓鏃ュ織涓?Problems锛氳В鏋?ARMCC / AC6 鐨?`file(line): error/warning`锛屽啓鍏?VS Code 璇婃柇銆?
## 鐜瑕佹眰

- Windows锛堟瀯寤?涓嬭浇渚濊禆 `UV4.exe`锛夈€?- Keil MDK-ARM 5.x锛堟湰鏈洪獙璇佺増鏈細MDK 5.43a / UV4 5.43.1.0锛夈€?- VS Code 1.85+銆?
## 瀹夎

```powershell
code --install-extension keil-studio-0.4.1.vsix
```

鎴栧湪 VS Code 鐨?Extensions 瑙嗗浘鍙充笂瑙?`...` 鈫?**Install from VSIX...** 閫夋嫨 `keil-studio-0.4.1.vsix`銆?
## 閰嶇疆

| 璁剧疆 | 榛樿 | 璇存槑 |
|---|---|---|
| `keilStudio.uv4Path` | 绌?| `UV4.exe` 缁濆璺緞锛涚暀绌烘椂鑷姩妫€娴嬪父瑙佸畨瑁呬綅缃拰娉ㄥ唽琛ㄣ€?|
| `keilStudio.language` | `zh` | `zh` / `en` / `auto`銆?|
| `keilStudio.buildBeforeDownload` | `true` | 涓嬭浇鍓嶅厛澧為噺缂栬瘧銆?|
| `keilStudio.showBuildOutput` | `true` | 鏋勫缓鏃惰嚜鍔ㄦ樉绀?Output 闈㈡澘銆?|
| `keilStudio.autoRefresh` | `true` | 鐩戝惉宸ョ▼鏂囦欢鍙樺寲骞跺埛鏂颁晶杈规爮銆?|
| `keilStudio.warnWhenKeilRunning` | `true` | 妫€娴嬪埌 UV4 杩愯鏃跺湪鏋勫缓杈撳嚭涓彁绀恒€?|
| `keilStudio.keilPollSeconds` | `8` | Keil 杩涚▼妫€娴嬮棿闅旓紝0 琛ㄧず鍏抽棴銆?|

鏈満 Keil 鍦?`F:\KEIL\UV4\UV4.exe` 鏃讹紝閫氬父鏃犻渶鎵嬪姩閰嶇疆銆?
## 浣跨敤

1. 鎵撳紑鍖呭惈 `.uvprojx` 鐨勬枃浠跺す锛屾墿灞曚細鑷姩鍔犺浇鍞竴鐨勫伐绋嬶紱澶氫釜宸ョ▼鏃朵娇鐢ㄥ懡浠?**鎵撳紑 Keil 宸ョ▼ / Open Keil Project**銆?2. 宸︿晶渚ц竟鏍忕偣鍑绘枃浠舵墦寮€锛涚偣鍑荤洰鏍?鍒嗙粍鍓嶇殑涓夎灞曞紑鎶樺彔锛涘弻鍑荤洰鏍囧彲鍒囨崲褰撳墠鐩爣銆?3. 榄旀硶妫掗〉绛句慨鏀瑰悗鐐瑰嚮 **搴旂敤** 鎴?**纭畾**锛屽啓鍥?`.uvprojx` / `.uvoptx`銆?4. 宸ョ▼椤逛慨鏀瑰厛鏆傚瓨鍦ㄥ唴瀛橈紝鐐瑰嚮 **纭畾** 鎵嶅啓鍥烇紱鍙栨秷鎴栧叧闂爣绛句細涓㈠純鏈繚瀛樹慨鏀广€?5. 鍦?Keil 涓垏鎹㈢洰鏍囨垨鏀硅缃悗锛孷S Code 浼氶€氳繃鏂囦欢鐩戝惉鑷姩鍒锋柊銆?6. 濡傛灉 Keil 宸叉墦寮€鍚屼竴宸ョ▼锛孷S Code 鍐欏叆鍚庤鍦?Keil 涓?**Project > Reload**锛堟垨閲嶆柊鎵撳紑宸ョ▼锛変互鐪嬪埌淇敼銆?
## 鍚屾妯″瀷

- **鏋勫缓/涓嬭浇**锛氳皟鐢?`UV4 -b/-r/-c/-f -t -o -j0`銆傜洿鎺?`CreateProcess` 琚郴缁熸嫆缁濇椂锛岃嚜鍔ㄩ檷绾т负 PowerShell `Start-Process`锛堟湰鏈洪獙璇佽繃锛夈€?- **鐩爣/璁剧疆/宸ョ▼椤?*锛氱洿鎺ュ啓 Keil 瀹樻柟 XML锛涗繚鐣欐湭鐭ヨ妭鐐广€丷TE 缁勪欢鍜?TargetOption 瀛愮粨鏋勩€?- **澶栭儴淇敼**锛歚FileSystemWatcher` 鐩戝惉 `.uvprojx` / `.uvoptx`锛?00ms 闃叉姈鍚庨噸鏂拌В鏋愬苟鍒锋柊 UI銆?- **鍐茬獊淇濇姢**锛氶瓟娉曟闈㈡澘鏈夋湭淇濆瓨淇敼鏃讹紝澶栭儴鍙樺寲鍙樉绀衡€滈噸鏂板姞杞?/ 淇濈暀鎴戠殑淇敼鈥濇í骞咃紝涓嶉潤榛樿鐩栥€?- **澶囦唤**锛氶娆″啓鍏ュ墠鐢熸垚 `<宸ョ▼鏂囦欢>.keil-studio.bak`銆?
## 宸茬煡杈圭晫锛堥鐗堬級

- 鍙敮鎸?MDK-ARM `.uvprojx`锛汣51/C251 鐨?`.uvproj` 鏆備笉鏀寔銆?- **Device 椤电鏄枃鏈紪杈?*锛屾殏鏈帴 Pack 鏁版嵁搴撶殑璁惧涓嬫媺锛汧lash 椹卞姩/绠楁硶銆侀┍鍔ㄧ鏈夐€夐」鍦ㄨ皟璇曞櫒 `璁剧疆鈥 涓憟鐜般€俙RAM 鐢ㄤ簬绠楁硶` 涓庣畻娉?Start/Size 浼氬啓鍥?`TargetDriverDllRegistry`锛汣onnect/Reset/鎿﹂櫎绛夐┍鍔ㄧ鏈変綅鐩墠鍙榻愮晫闈紝鏈己琛屽啓鍥炪€?- **Folders/Extensions銆丅ooks銆丳roject Info/Layer** 鐩墠鍙灞曠ず锛汻TE 缁勪欢鍘熸牱淇濈暀锛屼笉鍋氱粨鏋勭紪杈戙€?- Keil 娌℃湁鍏紑鐨勨€滈€愬瓧娈佃缃?API鈥濓紝鍥犳鏃犳硶鍋氬埌 Keil 杩愯涓敼涓€涓瓧娈电珛鍗充簰鍒凤紱閲囩敤鈥滄枃浠剁骇鍙屽悜鍚屾 + 淇濆瓨鍚庨噸杞解€濄€?- 鏋勫缓/涓嬭浇浠嶇敱 UV4 瀹屾垚锛涙湭瀹炵幇 UVSOCK 瀹炴椂妗ュ拰璋冭瘯鍣ㄤ細璇濇帴绠°€傛瀯寤烘椂鑻?Keil 姝ｅ繖锛屽彲鑳藉け璐ワ紝鍏堝叧闂?Keil 涓殑宸ョ▼鏇寸ǔ銆?- 鐩爣鍒囨崲鍐?`.uvoptx`锛汯eil 鎵撳紑鏃堕渶閲嶆柊鍔犺浇宸ョ▼鎵嶈兘鐪嬪埌鏂扮洰鏍囥€?
## 寮€鍙?
```powershell
npm install
npm run build      # esbuild -> dist/extension.js
npm test           # 鏍稿績 XML / 閫夐」 / 鐩爣 / 鏋勫缓娴嬭瘯
npm run package    # 鐢熸垚 keil-studio-0.4.1.vsix
```

娴嬭瘯浣跨敤 `test-project/` 涓殑鐪熷疄 STM32F103 宸ョ▼鍓湰锛涙瀯寤烘祴璇曢渶瑕佹湰鏈?`UV4.exe`銆?
## 鐩綍

```
src/
  extension.js          婵€娲诲叆鍙?  controller.js         宸ョ▼銆佸懡浠ゃ€佺姸鎬佹爮銆佺洃鍚€佹瀯寤虹紪鎺?  i18n.js               涓嫳鏂囧瓧绗︿覆
  keil/
    xml.js              xmldom 瑙ｆ瀽/搴忓垪鍖?鍘熷瓙鍐欏洖
    project.js          uvprojx/uvoptx 妯″瀷銆佺洰鏍囥€佸伐绋嬮」
    optionsSchema.js    榄旀硶妫掑瓧娈靛畾涔変笌璇诲啓
    compilers.js        鏈満 ARMCC / ARMCLANG 妫€娴?    builder.js          UV4 鍛戒护琛屻€丳owerShell 闄嶇骇銆佹棩蹇?璇婃柇瑙ｆ瀽
  ui/
    sidebarView.js      鑷畾涔?Webview 渚ц竟鏍忥紙椤圭洰鍗＄墖 / 鐩爣 / 鍔ㄤ綔 / 鏍?/ 鍐呭瓨鏉★級
    webviewHtml.js      Webview 椤甸潰澹?    optionsPanel.js     榄旀硶妫掗潰鏉?    itemsPanel.js       宸ョ▼椤归潰鏉?media/
  webview/options.*     榄旀硶妫?CSS/JS
  webview/items.*       宸ョ▼椤?CSS/JS
```

## License

MIT


