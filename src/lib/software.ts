import type { ImageMetadata } from 'astro';
import usblinkmicIcon from '../assets/projects/usblinkmic-icon.png';
import usblinkmicShot from '../assets/projects/usblinkmic-mac.png';
import habitbloomIcon from '../assets/projects/habitbloom-icon.png';
import habitbloomShot from '../assets/projects/habitbloom-cover.png';
import zjxDownloadIcon from '../assets/projects/zjx-download-icon.png';
import zjxDownloadShot from '../assets/projects/zjx-download-cover.png';
import routeLensIcon from '../assets/projects/route-lens-icon.png';
import routeLensShot from '../assets/projects/route-lens-cover.png';
import tintpaneIcon from '../assets/projects/tintpane-icon.png';
import tintpaneShot from '../assets/projects/tintpane-cover.png';
import thoughtNavigatorIcon from '../assets/projects/thought-navigator-icon.png';
import thoughtNavigatorShot from '../assets/projects/thought-navigator-shot.png';
import dimWallpaperIcon from '../assets/projects/dim-wallpaper-icon.png';
import dimWallpaperShot from '../assets/projects/dim-wallpaper-cover.png';
import framelitIcon from '../assets/projects/framelit-icon.png';
import framelitShot from '../assets/projects/framelit-cover.png';

export interface SoftwareDownloadItem { label:string; platform:string; version:string; size:string; format:string; url:string; primary?:boolean; note?:string; }
export interface SoftwareGalleryItem { src:string; width:number; height:number; alt:string; title:string; caption:string; narrow?:boolean; }
export type SoftwareSlug =
  | 'usblinkmic'
  | 'zjx-download'
  | 'route-lens'
  | 'tintpane'
  | 'thought-navigator'
  | 'habitbloom'
  | 'dim-wallpaper'
  | 'framelit';

export interface SoftwareProduct {
  slug:SoftwareSlug; name:string; tagline:string; headline:string; summary:string; category:string;
  platforms:string[]; platformsLabel:string; statusBadge:string; statusTone:'release'|'source'; latestVersion:string; releaseDate:string;
  availabilitySummary:string; availabilityNotice:string; repoUrl:string; repoVisibility:'public'|'private'; releasesUrl?:string; checksumsUrl?:string;
  articleSlug:string; articleTitle:string; icon:ImageMetadata; screenshot:ImageMetadata; screenshotAlt:string; screenshotCaption:string; secondaryScreenshot?:ImageMetadata;
  interfaceHeading?:string; galleryKicker?:string; galleryHeading?:string; galleryNotice?:string; gallery?:SoftwareGalleryItem[];
  verifiedAt:string; developmentVersion:string; installedVersion:string; contribution:string; limitations:string[]; sources:Array<{label:string;url:string}>;
  downloads:SoftwareDownloadItem[]; highlights:Array<{title:string;body:string}>;
  scenarios:Array<{scenario:string;pain:string;outcome:string;mechanism:string}>;
  workflow:Array<{step:string;title:string;description:string;detail:string}>;
  specs:Array<{label:string;value:string}>; faq:Array<{question:string;answer:string}>;
}
const release = 'https://github.com/xxkingstuggle/usblinkmic/releases';
export const SOFTWARE_PRODUCTS:SoftwareProduct[] = [
  {
    slug:'usblinkmic', name:'USBLinkMic', category:'跨设备音频与网络工具',
    tagline:'让 Android 的麦克风和网络，接进 Mac 的工作流',
    headline:'一根线，接起手边的两个设备。',
    summary:'USBLinkMic 把 Android 手机拾音、手机 USB 网络共享给 Mac、Mac 网络反向共享给手机整合进一个原生 macOS 面板与菜单栏入口。音频支持 USB ADB 与局域网自动发现重连，并对接 BlackHole 虚拟声卡供会议与录音软件直接选用。',
    platforms:['macOS 26+ · Apple Silicon','Android 8.0+'], platformsLabel:'macOS · Android', statusBadge:'v4.0.17 公开发布', statusTone:'release',latestVersion:'v4.0.17',releaseDate:'2026-11-24',
    availabilitySummary:'公开提供 v4.0.17 macOS DMG / ZIP 与 Android APK，配套 SHA-256 校验清单。Mac 安装包内置配套 Android APK、ADB 与精简 OpenJDK 运行时。',
    availabilityNotice:'macOS 公开包尚未完成 Apple 公证。USB 功能需要调试授权；供其他 Mac 软件使用的音频输入需要 BlackHole 2ch。Android USB 网络共享依赖系统与机型支持，请先读安装说明。',
    repoUrl:'https://github.com/xxkingstuggle/usblinkmic',repoVisibility:'public',releasesUrl:`${release}/tag/v4.0.17`,checksumsUrl:`${release}/download/v4.0.17/SHA256SUMS.txt`,
    articleSlug:'usblinkmic-v4-evolution',articleTitle:'USBLinkMic 4.0 演进手记：USB 充电协商、ADB 断连自愈与局域网自动重连',
    icon:usblinkmicIcon,screenshot:usblinkmicShot,screenshotAlt:'USBLinkMic Mac 4.0.10 开发版的手机麦克风面板，设备标识已遮盖',
    screenshotCaption:'USBLinkMic Mac 原生主界面与工作区（设备标识已遮盖）。现已同步发布 v4.0.17 正式构建包，包含设备管理、麦克风通道切换、USB 双向供网与菜单栏快捷入口。',
    interfaceHeading:'连接状态，看得见。',
    verifiedAt:'2026-11-24（v4.0.17 公开发版与 54 项资源哈希核验通过）',developmentVersion:'v4.0.17（Mac + Android 同步发版）',installedVersion:'Mac v4.0.17 · 打包签名与 SHA-256 校验通过',
    contribution:'我负责需求取舍、跨平台集成、维护与验收，Codex 等 AI 助手参与实现和审查。项目复用 Android platform-tools、Gnirehtet 的 Java relay，随包保留 OpenJDK 运行时与许可，并通过外部 BlackHole 虚拟声卡对接音频输入；这些第三方成果不属于个人从零实现。',
    limitations:['跨机型、息屏、插拔与长时间运行的完整 T01–T24 设备矩阵仍在持续扩充。','收到 PCM 帧不等于会议软件已收到可听声音；音频路由与系统输入需配合 BlackHole 2ch 确认。','未承诺普遍的低延迟数值、功耗收益或所有 Android ROM 的网络兼容性。','无线麦克风链路未加密，只适合可信局域网。'],
    sources:[{label:'v4.0.17 发行页与文件',url:`${release}/tag/v4.0.17`},{label:'公开版安装说明',url:`${release}/download/v4.0.17/INSTALL.md`},{label:'工作原理说明',url:`${release}/download/v4.0.17/HOW-IT-WORKS.md`},{label:'依赖与来源',url:'https://github.com/xxkingstuggle/usblinkmic/blob/main/docs/dependencies.md'}],
    downloads:[
      {label:'下载 macOS DMG（推荐）',platform:'macOS 26+ · Apple Silicon',version:'v4.0.17',size:'33.0 MB',format:'DMG',url:`${release}/download/v4.0.17/USBLinkMic-4.0.17.dmg`,primary:true,note:'拖入应用程序即可；已内置配套 v4.0.17 Android APK'},
      {label:'下载 Android APK',platform:'Android 8.0+',version:'v4.0.17',size:'11.0 MB',format:'APK',url:`${release}/download/v4.0.17/USBLinkMic-4.0.17.apk`,primary:true,note:'与公开 Mac v4.0.17 版本配套'},
      {label:'macOS ZIP',platform:'macOS 26+ · Apple Silicon',version:'v4.0.17',size:'30.0 MB',format:'ZIP',url:`${release}/download/v4.0.17/USBLinkMic-4.0.17-macOS.zip`,note:'与 DMG 同版，适合直接解压检查'}
    ],
    highlights:[{title:'手机拾音，Mac 接收',body:'Android AudioRecord 采集音频，通过 USB ADB 转发或局域网直连传给 Mac。输出到 BlackHole 2ch 后，可在其他软件里选择对应音频输入。'},
      {title:'网络有两个方向',body:'手机网络给 Mac 走 Android USB 网络共享；Mac 网络给手机走 Java relay 和 Android VPNService。两条网络路径互斥，并各有权限和系统条件。'},
      {title:'把连接状态说明白',body:'面板集中展示设备、依赖与任务状态。开发版进一步区分请求成功、收到有效音频和实际可听，避免一个绿色状态代替所有判断。'},
      {title:'复用成熟部件',body:'将 ADB 和手机端配套资源组织进安装流程，复用 BlackHole 与 Gnirehtet，把主要工作放在两端集成、错误提示和生命周期处理。'}],
    scenarios:[{scenario:'会议与录音的输入选择',pain:'想用手边的 Android 拾音，又不想每次手动配置转发和音频路由。',outcome:'通过面板连接手机，再在 Mac 软件中选择虚拟声卡。实际可听与音质由使用环境验证。',mechanism:'AudioRecord → ADB / 局域网 → Mac → BlackHole。'},
      {scenario:'Mac 临时使用手机网络',pain:'需要通过数据线接入手机当前可共享的网络。',outcome:'使用 Android USB 网络共享，Mac 识别对应网络接口；是否可用受系统与设备支持影响。',mechanism:'Android Tethering / CDC-NCM 与 macOS 网络接口。'},
      {scenario:'把 Mac 网络送回手机',pain:'测试手机需要使用桌面侧网络，希望减少手工中继步骤。',outcome:'通过 USB 和 Android 本地 VPN 接口进行反向网络共享，无需 Root。',mechanism:'ADB reverse + Gnirehtet Java relay + VPNService。'}],
    workflow:[{step:'01',title:'先准备两端',description:'按公开版安装说明准备 Mac 应用、Android 客户端与 BlackHole 2ch。',detail:'先确认系统要求和未公证安装边界。'},
      {step:'02',title:'建立连接',description:'USB 模式需要数据线与手机调试授权；无线麦克风使用同一局域网配对。',detail:'USB 网络链路仍需要数据线，不随无线麦克风启用。'},
      {step:'03',title:'确认实际使用结果',description:'在 Mac 软件里选择音频输入，分别检查手机、接收与软件端的状态。',detail:'收到音频帧只是中间一步，听见声音还需要正确路由。'}],
    specs:[{label:'公开版本',value:'v4.0.17 / 2026-11-24'},{label:'系统',value:'macOS 26+ Apple Silicon / Android 8.0+'},{label:'USB 网络',value:'手机网络共享需兼容 Android 系统（文档建议 Android 11+）'},{label:'源码',value:'Swift / Kotlin / 第三方 Java relay'},{label:'音频链路',value:'USB ADB 或局域网自动重连 / BlackHole 2ch'},{label:'发版校验',value:'54 项打包资源 SHA-256 与 APK 签名验证通过'}],
    faq:[{question:'v4.0.17 相比早期 v4.0.8 解决了哪些关键问题？',answer:'新增了局域网无线麦克风断线自动重连、USB 充电状态探测与协商策略、ADB 掉线自愈以及全新的深浅色工作区面板。'},
      {question:'为什么需要 BlackHole？',answer:'它提供一个可被其他 Mac 软件选择的虚拟音频设备。USBLinkMic 负责接收和转送手机音频，BlackHole 负责系统侧音频接入，两者职责不同。'},
      {question:'已经可以保证所有手机都稳定使用吗？',answer:'还不能。已有公开包与实现，但系统网络能力、音频路由、锁屏和长期运行仍需要逐设备验证。遇到问题可以在公开仓库提交经过脱敏的复现步骤。'}]
  },
  {
    slug:'zjx-download',name:'zjx-download',category:'macOS 原生多线程下载器 · Chrome MV3 扩展',
    tagline:'浏览器一键接管，macOS 原生分片并发与断点续传',
    headline:'把下载交回原生桌面，分片进度落盘可恢复。',
    summary:'zjx-download 是基于 Swift / SwiftUI 编写的 macOS 原生多线程下载器，配套 Chrome MV3 浏览器扩展、Native Messaging Host 与无头 CLI。支持 HTTP Range 多连接并发分片、跨会话断点续传状态落盘、未知长度流回退续传以及定时队列调度。',
    platforms:['macOS 14+ · Universal (arm64 / x86_64)','Chrome MV3 扩展','macOS CLI'],platformsLabel:'macOS · Chrome MV3 · CLI',
    statusBadge:'v2.0.4 公开发布',statusTone:'release',latestVersion:'v2.0.4',releaseDate:'2026-11-24',
    availabilitySummary:'公开提供 v2.0.4 Universal macOS 原生应用包（内置 ZJXDownloadCore.framework、Native Host 与 CLI）及 Chrome MV3 扩展包。',
    availabilityNotice:'macOS 应用使用 Apple Development 签名，尚未完成公证。流媒体下载仅支持未加密的有限 TS media playlist，明确不支持 DRM、独立音轨拼接或无限直播流录制。',
    repoUrl:'https://github.com/xxkingstuggle/zjx-download',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.4',
    checksumsUrl:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.4/SHA256SUMS.txt',
    articleSlug:'zjx-download-native-architecture',articleTitle:'zjx-download 架构复盘：用 Swift 重写 macOS 原生多线程下载器与 Chrome Native Messaging 交接',
    icon:zjxDownloadIcon,screenshot:zjxDownloadShot,
    screenshotAlt:'zjx-download macOS 原生主窗口与分片进度面板',
    screenshotCaption:'zjx-download v2.0.4 macOS 原生主界面真实运行截图，支持按分类筛选、并发队列调度、分片级断点续传与 SHA-256 校验。',
    interfaceHeading:'分片进度与队列状态，一目了然。',
    galleryKicker:'真实运行截图 / NATIVE MACOS & CHROME MV3',
    galleryHeading:'从浏览器捕获到原生分片落盘的完整闭环。',
    galleryNotice:'以下为 zjx-download v2.0.4 在 macOS 上的真实运行截图（涵盖浅色与深色主题、主队列窗口及单任务分片详情）。',
    gallery:[
      {src:'/media/zjx-download/main-window.webp',width:1600,height:1197,alt:'zjx-download 主窗口真实运行截图',title:'01 / 原生主队列与分类视图',caption:'集中管理进行中、已完成与排队任务，支持 cURL 导入、批量添加与速率限制。'},
      {src:'/media/zjx-download/task-complete.webp',width:1600,height:889,alt:'zjx-download 下载完成弹窗与校验面板',title:'02 / 任务完成与文件校验',caption:'下载完成后可直接校验文件摘要、定位 Finder 路径或复核连接分片。'},
      {src:'/media/zjx-download/app-home-dark.webp',width:1840,height:964,alt:'zjx-download 深色模式主界面',title:'03 / 深色模式工作台',caption:'原生 SwiftUI 适配 macOS 深色外观，保持高对比度状态指示。'},
      {src:'/media/zjx-download/app-download-dark.webp',width:1840,height:964,alt:'zjx-download 深色模式分片下载进度',title:'04 / 多连接并发分片',caption:'每个分片独立持久化偏移量，暂停或异常退出后从已提交检查点恢复。'}
    ],
    verifiedAt:'2026-11-24（11 项核心 XCTest 全绿，v2.0.4 双架构签名通过）',
    developmentVersion:'v2.0.4 / build 20261117.2',
    installedVersion:'macOS Universal (arm64 + x86_64) · 11/11 单元测试通过',
    contribution:'我主导了 Swift/SwiftUI 原生客户端架构、分片断点续传状态机、Loopback 与 Native Messaging 通信层及 Chrome MV3 扩展重写。早期浏览器集成协议参考了 AmirHossein Abdolmotallebi 的开源项目并在许可中完整致谢。',
    limitations:['仅支持 HTTP/HTTPS 与未加密有限 HLS TS 媒体列表，不支持 DRM 流媒体或私有视频站点破解。','macOS 安装包暂未进行 Apple Notarization 公证，首次运行需在系统设置中放行。','跨站点重定向时的认证 Header 会按安全策略自动剥离，防止凭据泄露。'],
    sources:[
      {label:'v2.0.4 发行页与安装包',url:'https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.4'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/zjx-download'},
      {label:'安装与使用账本',url:'https://github.com/xxkingstuggle/zjx-download/blob/main/INSTALL_LEDGER.md'}
    ],
    downloads:[
      {label:'macOS 原生应用包（Universal）',platform:'macOS 14+ · arm64 & x86_64',version:'v2.0.4',size:'1.6 MB',format:'ZIP',url:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.4/zjx-download-2.0.4-macOS.zip',primary:true,note:'含 zjx-download.app、Native Messaging Host 与无头 CLI'},
      {label:'Chrome MV3 浏览器扩展',platform:'Chromium / Chrome 114+',version:'v2.0.1',size:'34 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.4/zjx-download-chrome-extension-2.0.1.zip',note:'解压后在 chrome://extensions 加载即可接管浏览器下载'}
    ],
    highlights:[
      {title:'分片级断点续传持久化',body:'将多连接 HTTP Range 分片的已落盘字节与未知长度单流临时文件统一写入 StateStore，解决重启或暂停后进度归零问题。'},
      {title:'Chrome MV3 + Native Messaging 双通道交接',body:'浏览器扩展捕获下载请求并携带必要 Referer / Cookie（跨域重定向自动脱敏），通过 Native Host 自动唤醒桌面端并投递任务。'},
      {title:'Loopback 端口冲突消解与队列自启动',body:'修复 IPv4/IPv6 双重绑定导致的 15151 端口冲突，应用启动时自动触发 processQueue() 恢复未完成队列。'},
      {title:'内置无头 CLI 与校验服务',body:'除 SwiftUI 图形界面外，随包提供 zjx-download-cli 供终端脚本调用，并支持 SHA-256 / MD5 摘要核验。'}
    ],
    scenarios:[
      {scenario:'大体积发行包与镜像下载',pain:'浏览器自带下载器偶发断流后无法恢复，且单连接吞吐受限。',outcome:'由 Chrome 扩展一键转交 zjx-download，按多连接分片拉取并持久化每个分片检查点。',mechanism:'HTTP Range 分片并发 + StateStore 检查点原子落盘。'},
      {scenario:'未返回 Content-Length 的动态流',pain:'部分服务端不响应 HEAD 或不返回总长度，传统分片器在暂停后会丢弃已下载部分。',outcome:'自动降级为单连接流式保留临时文件，恢复时携带已有字节偏移尝试续传。',mechanism:'Unprobed 单流临时文件保留与偏移对齐。'},
      {scenario:'夜间定时队列与脚本批量拉取',pain:'需要在指定时段自动开始/停止下载队列，或在脚本里无头执行并等待退出码。',outcome:'通过 QueueScheduler 触发定时事件，或使用 CLI 在下载完成时立即返回精确退出码。',mechanism:'QueueScheduler 定时器 + CLI 生命周期完成信号。'}
    ],
    workflow:[
      {step:'01',title:'安装桌面端与注册 Host',description:'解压 zjx-download.app 移入 /Applications，首次打开自动完成 Native Messaging 清单注册。',detail:'也可使用 scripts/manage-native-host 手动管理。'},
      {step:'02',title:'加载 Chrome MV3 扩展',description:'解压扩展包并在 chrome://extensions 开启开发者模式加载，弹窗即显示桌面端连接状态。',detail:'支持配置自动拦截的文件后缀与最小体积阈值。'},
      {step:'03',title:'分片下载与完成核验',description:'在主窗口查看实时分片进度、暂停恢复或执行 SHA-256 校验。',detail:'11 项核心 XCTest 覆盖状态恢复与并发边界。'}
    ],
    specs:[
      {label:'公开版本',value:'v2.0.4 (build 20261117.2)'},
      {label:'架构支持',value:'macOS Universal (arm64 + x86_64)'},
      {label:'核心框架',value:'Swift 6 · SwiftUI · ZJXDownloadCore.framework'},
      {label:'浏览器扩展',value:'Chrome Manifest V3 · Native Messaging'},
      {label:'自动化测试',value:'11 项 XCTest 核心状态机与恢复单测通过'},
      {label:'开源许可',value:'Apache-2.0'}
    ],
    faq:[
      {question:'v2.0.4 如何解决以前启动时报端口占用（15151）的问题？',answer:'早期版本同时对 localhost 解析出的 IPv4 与 IPv6 地址重复绑定同一端口；v2.0.4 收敛了 Loopback 监听绑定逻辑并增加了实例探测。'},
      {question:'暂停后再恢复，为什么不会重新从 0% 开始？',answer:'v2.0.4 在 StateStore 中记录了每个分片已刷盘的 verifiedCheckpoint，并对未知长度的单连接任务保留未完成临时文件，恢复时直接从断点续接。'},
      {question:'跨域重定向时 Cookie 会泄露给第三方域名吗？',answer:'不会。NetworkConfiguration 内置了跨域凭据剥离逻辑（已由 testNetworkConfigurationStripsCrossOriginCredentials 单测覆盖）。'}
    ]
  },
  {
    slug:'route-lens',name:'Route Lens',category:'Chrome MV3 扩展 · AI 模型路由观测',
    tagline:'在 ChatGPT 页面右侧窄栏，实时对照请求与响应的真实模型路由字段',
    headline:'请求了什么模型，实际返回了什么路由，当场对照。',
    summary:'Route Lens 是一款面向 ChatGPT Web 端的 Chrome Manifest V3 扩展。它在页面 Main World 拦截会话请求与 SSE 响应流，提取请求参数与服务端响应中的模型与路由字段，在 Shadow DOM 隔离的右侧窄栏与弹窗中实时对照展示，帮助开发者识别模型静默降级、路由转发或字段冲突。',
    platforms:['Chrome / Chromium 114+ (Manifest V3)','ChatGPT Web (chatgpt.com)'],platformsLabel:'Chrome MV3 · Web',
    statusBadge:'v1.3.1 公开发布',statusTone:'release',latestVersion:'v1.3.1',releaseDate:'2026-11-24',
    availabilitySummary:'公开提供 v1.3.1 Chrome 扩展安装包（ZIP）与完整源码，18 项 Node.js 自动化测试与静态检查全部通过。',
    availabilityNotice:'扩展仅在浏览器本地解析并展示请求与响应中的路由元数据，不上传任何对话内容，也不会修改、伪造或绕过任何服务端鉴权与安全挑战。',
    repoUrl:'https://github.com/xxkingstuggle/route-lens',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.1',
    checksumsUrl:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.1/SHA256SUMS.txt',
    articleSlug:'route-lens-chatgpt-routing-inspector',articleTitle:'Route Lens：在 Chrome MV3 中拦截并对照 ChatGPT 请求与响应的模型路由字段',
    icon:routeLensIcon,screenshot:routeLensShot,
    screenshotAlt:'Route Lens 在深色模式下展示右侧窄栏的模型路由对照信息',
    screenshotCaption:'Route Lens v1.3.1 真实运行预览：右侧 Shadow DOM 窄栏实时显示请求模型、响应报告模型、路由状态与时间戳，支持深浅色与几何尺寸自定义。',
    interfaceHeading:'请求与响应字段，同屏透明对照。',
    galleryKicker:'界面预览 / SHADOW DOM RAIL & POPUP',
    galleryHeading:'不打断对话流，在窄栏与弹窗中掌控全部路由细节。',
    galleryNotice:'以下为 Route Lens v1.3.1 自动化 UI 预览与验证生成的真实界面截图，涵盖深浅色右侧窄栏与中英双语配置弹窗。',
    gallery:[
      {src:'/media/route-lens/rail-system-dark.webp',width:1280,height:900,alt:'Route Lens 深色模式右侧窄栏',title:'01 / 深色模式右侧窄栏',caption:'通过 Shadow DOM 注入在页面右侧，不污染宿主样式，实时呈现请求与响应模型对照。'},
      {src:'/media/route-lens/rail-default-light.webp',width:1280,height:900,alt:'Route Lens 浅色模式右侧窄栏',title:'02 / 浅色模式与多字段视图',caption:'清晰区分“字段一致”“显式路由转换”与“字段缺失/冲突”状态。'},
      {src:'/media/route-lens/popup-zh-light.webp',width:360,height:740,alt:'Route Lens 中文浅色配置弹窗',title:'03 / 中文外观与字段控制弹窗',caption:'支持调节窄栏宽度、高度、上下位置、可见字段及一键恢复默认外观。',narrow:true},
      {src:'/media/route-lens/popup-en-dark.webp',width:360,height:740,alt:'Route Lens 英文深色配置弹窗',title:'04 / 英文深色模式弹窗',caption:'内置对称的中英双语字典与 320px+ 紧凑布局适配。',narrow:true}
    ],
    verifiedAt:'2026-11-24（18 项单元测试与 check.mjs 静态审计通过）',
    developmentVersion:'v1.3.1',
    installedVersion:'Chrome MV3 v1.3.1 · 18/18 自动化测试通过',
    contribution:'我独立完成了 Main World 握手与流解析钩子、模型路由一致性判定状态机、Shadow DOM 窄栏与中英双语 Popup 控制面板的架构、实现与测试。',
    limitations:['当服务端 SSE 响应未携带某项内部路由字段时，严格标记为“未报告/无法确认”，绝不猜测或虚构模型名称。','受 ChatGPT 前端接口结构演进影响，如上游更改 JSON/SSE 字段路径需同步更新解析器。'],
    sources:[
      {label:'v1.3.1 发行页与扩展包',url:'https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.1'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/route-lens'},
      {label:'维护与架构说明',url:'https://github.com/xxkingstuggle/route-lens/blob/main/MAINTENANCE.md'}
    ],
    downloads:[
      {label:'Chrome MV3 扩展安装包',platform:'Chrome / Edge / Brave (MV3)',version:'v1.3.1',size:'159 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.1/route-lens-1.3.1.zip',primary:true,note:'解压后在 chrome://extensions 加载即可使用'},
      {label:'完整源码与测试归档',platform:'Node.js 20+ · Chrome MV3',version:'v1.3.1',size:'1.0 MB',format:'ZIP',url:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.1/route-lens-1.3.1-source.zip',note:'含 18 项自动化测试与 UI 验证脚本'}
    ],
    highlights:[
      {title:'先握手后采集的零残留钩子',body:'Main World 页面钩子在收到 Content Script 首次启用握手前不采集任何数据；当用户关闭开关时立即停止监听并清理 DOM。'},
      {title:'严格的路由一致性判定语义',body:'将请求模型与响应中的多处模型字段逐一比对，精确区分“一致”“显式路由（如 auto 路由到具体模型）”“服务端字段冲突”与“字段缺失”。'},
      {title:'Shadow DOM 几何可调窄栏',body:'右侧观测栏封装在独立 Shadow Root 内，支持在 Popup 中无级调节宽度、高度、垂直位置与字段显隐，适配深浅色与窄窗口。'},
      {title:'18 项自动化单测与隐私门禁',body:'所有解析逻辑、握手时序、双语字典对称性及去个人路径检查均由 node:test 自动化套件守护。'}
    ],
    scenarios:[
      {scenario:'核查模型是否发生静默回退',pain:'在 Web 端选择了高阶推理模型，但回复质量异常，无法凭肉眼判断后端是否实际路由到了轻量模型。',outcome:'在右侧窄栏直接查看本次请求的 requested model 与响应流实际返回的 model slug。',mechanism:'Main World fetch/SSE 旁路解析 + 字段一致性状态机。'},
      {scenario:'多轮对话路由历史追溯',pain:'同一会话中切换过模型或触发了工具调用，不清楚每一轮分别由哪个子模型响应。',outcome:'按消息轮次记录路由摘要，并在切换会话时自动隔离上下文，不串台。',mechanism:'会话上下文 ID 绑定与清空隔离机制。'},
      {scenario:'窄屏或分屏阅读时不遮挡正文',pain:'传统浮窗容易挡住代码块或输入框。',outcome:'通过 Popup 滑块自由收缩窄栏宽度、高度或折叠非核心字段。',mechanism:'Shadow DOM CSS 变量实时注入与外观独立重置。'}
    ],
    workflow:[
      {step:'01',title:'解压并加载扩展',description:'下载 route-lens-1.3.1.zip 解压，在 chrome://extensions 开启开发者模式加载。',detail:'仅申请 chatgpt.com 最小主机权限与 storage。'},
      {step:'02',title:'发起对话实时观测',description:'打开 ChatGPT 发送消息，右侧窄栏自动显示请求模型与响应流模型字段。',detail:'可在扩展弹窗随时暂停采集或清空当前记录。'},
      {step:'03',title:'按需定制窄栏外观',description:'在 Popup 切换中英语言、深浅色主题、窄栏尺寸与显示字段。',detail:'重置外观不会清除已保存的隐私与捕获开关设置。'}
    ],
    specs:[
      {label:'公开版本',value:'v1.3.1 / 2026-11-24'},
      {label:'扩展规范',value:'Chrome Manifest V3 (Main World + Isolated World)'},
      {label:'UI 隔离',value:'Shadow DOM + CSS Custom Properties'},
      {label:'国际化',value:'中 / 英双语对称字典'},
      {label:'自动化测试',value:'18 项 node:test 单测 + 静态权限审计通过'},
      {label:'数据边界',value:'100% 本地内存与 chrome.storage.local'}
    ],
    faq:[
      {question:'Route Lens 会修改发往 ChatGPT 的请求内容吗？',answer:'不会。它只对响应流和请求参数做只读旁路克隆解析，不篡改任何请求体、Header 或鉴权凭据。'},
      {question:'当服务端返回多个模型字段且不一致时怎么显示？',answer:'状态机不会强行猜一个模型，而是明确标记为“字段冲突”并列出各原始字段值供开发者自行核对。'},
      {question:'关闭采集开关后，页面钩子还会在后台运行吗？',answer:'不会。首次握手确认关闭或运行中切换关闭时，钩子会立即停止实时采集与 DOM 兜底扫描。'}
    ]
  },
  {
    slug:'tintpane',name:'Tintpane',category:'Chrome MV3 扩展 · Chromium PWA 窗口主题引擎',
    tagline:'让 Chromium PWA 窗口标题栏动态跟随网页配色，支持域名树继承与焦点感知',
    headline:'每个独立窗口，都拥有贴合页面的呼吸感标题栏。',
    summary:'Tintpane（原代号 Colorful）是一款专为 Chromium 桌面 PWA 窗口设计的 Manifest V3 扩展。它采用“默认关闭、按需动态注册脚本”的轻量架构，通过 display-mode: standalone 精确识别独立应用窗口，实时采样页面顶栏或背景色注入 meta[name="theme-color"]，并支持域名树层级继承、双向别名同步与窗口焦点/失焦双态配色。',
    platforms:['Chrome / Edge / Brave Desktop (Manifest V3)','macOS / Windows / Linux Chromium PWA'],platformsLabel:'Chrome MV3 · Desktop PWA',
    statusBadge:'v2.4.0 公开发布',statusTone:'release',latestVersion:'v2.4.0',releaseDate:'2026-10-29',
    availabilitySummary:'公开提供 v2.4.0 扩展安装包（ZIP）与完整开源仓库。内置自动化构建与测试套件。',
    availabilityNotice:'Tintpane 默认对所有普通浏览器标签页关闭，仅在用户显式启用且处于独立 PWA / 应用窗口（或显式允许的场景）时更新 theme-color。',
    repoUrl:'https://github.com/xxkingstuggle/tintpane',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0',
    articleSlug:'tintpane-chromium-pwa-theme-engine',articleTitle:'Tintpane 2.4：Chromium PWA 窗口动态主题色注入、域名树继承与双向别名同步',
    icon:tintpaneIcon,screenshot:tintpaneShot,
    screenshotAlt:'Tintpane v2.4.0 Chromium PWA 动态主题色架构与域名树继承机制概览',
    screenshotCaption:'Tintpane v2.4.0 核心机制：默认关闭与 standalone 检测、域名树层级继承与双向别名组同步、以及焦点/失焦状态下的平滑 theme-color 注入。',
    interfaceHeading:'默认安静，启用即贴合。',
    verifiedAt:'2026-11-24（v2.4.0 公开 Release 与单元测试核验通过）',
    developmentVersion:'v2.4.0',
    installedVersion:'Chrome MV3 v2.4.0 公开发行版',
    contribution:'我独立设计并实现了按需动态脚本注册机制、域名树配置继承算法、双向别名组同步及窗口焦点状态配色引擎。',
    limitations:['部分强制锁定 manifest theme_color 且不允许 DOM 覆盖的特殊内嵌页面可能受 Chromium 内核限制。','颜色自动采样依赖页面顶部固定栏或 body 计算背景色，全屏 Canvas/WebGL 页面建议使用手动指定颜色。'],
    sources:[
      {label:'v2.4.0 发行页与下载',url:'https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/tintpane'}
    ],
    downloads:[
      {label:'Tintpane Chrome MV3 扩展包',platform:'Chrome / Edge / Brave (MV3)',version:'v2.4.0',size:'48 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/tintpane/releases/download/v2.4.0/tintpane-v2.4.0.zip',primary:true,note:'公开发行版，解压后在 chrome://extensions 加载'}
    ],
    highlights:[
      {title:'默认关闭与按需动态脚本注册',body:'利用 chrome.scripting.registerContentScripts 仅对用户启用的域名挂载脚本，结合 standalone 媒体查询，对日常普通网页浏览零性能损耗。'},
      {title:'域名树层级继承（Domain Tree）',body:'为根域名配置主题规则后，所有子域名自动沿域名树向上查找并继承配置，同时允许特定子域名单独覆写。'},
      {title:'双向别名组同步（Bidirectional Alias）',body:'针对同一产品跨多个域名（如 chat.openai.com 与 chatgpt.com）的场景，支持双向别名映射，一处修改多域同步生效。'},
      {title:'焦点感知与可逆恢复',body:'支持为窗口激活（Focus）与后台失焦（Blur）配置平滑过渡色，关闭开关时立即还原站点原始 meta[name="theme-color"]。'}
    ],
    scenarios:[
      {scenario:'把常用 Web 应用安装为桌面 PWA',pain:'很多网站安装为 Chromium PWA 后，顶部标题栏始终是刺眼的纯白或死板的固定色，无法随页面深浅色切换。',outcome:'启用 Tintpane 后，PWA 标题栏实时采样页面顶栏背景色，与网页融为一体。',mechanism:'DOM 顶栏计算样式采样 + meta[name="theme-color"] 动态重写。'},
      {scenario:'多子域 SaaS 工作台统一配色',pain:'企业后台或文档站常跨越多个子域名，逐个配置窗口颜色既繁琐又容易在跳转时闪烁。',outcome:'在主域名配置一次，所有子域名与关联别名域名自动继承同一套配色策略。',mechanism:'域名树最长前缀匹配 + 双向别名图同步。'},
      {scenario:'多显示器下区分当前激活的 PWA 窗口',pain:'同时打开多个深色 PWA 窗口时，难以一眼看出哪个窗口正持有键盘焦点。',outcome:'窗口失焦时标题栏自动转为柔和的低饱和度色调，重新聚焦时恢复主色。',mechanism:'window focus/blur 事件监听与双态色彩插值。'}
    ],
    workflow:[
      {step:'01',title:'在 PWA 窗口中点开扩展',description:'打开目标 Chromium PWA 应用，在工具栏打开 Tintpane 启用当前站点。',detail:'普通浏览器标签页默认不生效，互不干扰。'},
      {step:'02',title:'选择自动采样或自定义配色',description:'可使用自动背景色跟随，也可为浅色/深色/失焦状态分别设定精确色值。',detail:'支持一键开启子域名继承与别名同步。'},
      {step:'03',title:'随时还原或导出配置',description:'任何时候关闭站点开关，立即恢复网页原生 theme-color，不留持久化污染。',detail:'配置保存在本地 storage，支持完整备份恢复。'}
    ],
    specs:[
      {label:'公开版本',value:'v2.4.0'},
      {label:'扩展架构',value:'Chrome Manifest V3 · Dynamic Content Scripts'},
      {label:'配置模型',value:'域名树前缀继承 + 双向别名同步'},
      {label:'窗口检测',value:'matchMedia("(display-mode: standalone)")'},
      {label:'开源仓库',value:'github.com/xxkingstuggle/tintpane'},
      {label:'许可协议',value:'MIT License'}
    ],
    faq:[
      {question:'Tintpane 和以前文章里提到的 Colorful 是什么关系？',answer:'Colorful 是早期私有原型的内部代号；在完成按需动态脚本注册、域名树继承与双向别名同步重构后，项目以 Tintpane 正式开源并发布了 v2.4.0。'},
      {question:'为什么坚持“默认关闭”而不是全局自动注入所有网页？',answer:'全局注入不仅浪费后台内存，还会在用户未预期的站点覆盖原生主题色。按需动态注册能做到只管用户点名的 PWA，且随时可逆。'},
      {question:'页面切换深色模式时标题栏会自动跟着变吗？',answer:'会。扩展通过 MutationObserver 与 prefers-color-scheme 监听页面主题变更，在毫秒级重新计算并更新标题栏色值。'}
    ]
  },
  {
    slug:'thought-navigator',name:'思路导航 V3',category:'AI Agent Skill · Codex 思考模型路由插件',
    tagline:'把 25 个思考模型收进可安装的 Codex 插件，让 AI 按任务自主发现或跳过',
    headline:'你只管说清问题，用不用框架由 Agent 按需路由。',
    summary:'思路导航 V3（Thought Navigator）是一个面向 Codex 与 Agent Skills 生态的思考方法路由插件。它将第一性原理、双向钢人、事前验尸、苏格拉底提问等 25 个思考模型整理为标准化单文件 SKILL.md，设计了“模型自主按需发现”与“用户显式点名导航”双路径编排，并内置严格的停止条件，防止在简单事实或直接执行任务上过度套用框架。',
    platforms:['Codex CLI / Desktop Plugin','Claude Code / Agent Skills'],platformsLabel:'Codex · Agent Skills',
    statusBadge:'v3.0.1 公开发布',statusTone:'release',latestVersion:'v3.0.1',releaseDate:'2026-11-24',
    availabilitySummary:'公开提供 v3.0.1 Codex 插件安装包（ZIP）与 MIT 开源仓库，包含 1 个总控导航 Skill 与 24 个专项思考方法 Skill。',
    availabilityNotice:'思考模型不是万能公式。插件内置了明确的“跳过边界”：当任务只是写代码、查事实或缺外部证据时，会直接执行或先补证据，不强行套用思考框架。',
    repoUrl:'https://github.com/xxkingstuggle/thought-navigator-v3',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/thought-navigator-v3/releases/tag/v3.0.1',
    checksumsUrl:'https://github.com/xxkingstuggle/thought-navigator-v3/releases/download/v3.0.1/SHA256SUMS.txt',
    articleSlug:'thought-navigator-v3',articleTitle:'思路导航 V3：把 25 个思考方法做成可按需调用的 Codex 插件',
    icon:thoughtNavigatorIcon,screenshot:thoughtNavigatorShot,
    screenshotAlt:'思路导航 V3 的双路径 Skill 路由架构图',
    screenshotCaption:'思路导航 V3 核心设计：将“人先替 AI 选方法”反转为“人描述真实卡点，模型在 25 个 Skill 入口中按需发现、组合或跳过”。',
    interfaceHeading:'选方法的负担，交给路由层。',
    galleryKicker:'架构图解 / SKILL ROUTING & PLUGIN PACKAGING',
    galleryHeading:'从方法过载到按需发现的三层演进。',
    galleryNotice:'以下为思路导航 V3 的核心路由机制与插件目录结构图解。',
    gallery:[
      {src:'/media/thought-navigator-v3/01-method-overload.svg',width:1280,height:720,alt:'思考方法过载示意图',title:'01 / 痛点：方法越多，启动越慢',caption:'手工挑选思考框架把“解决问题”变成了“先研究工具”，增加了认知摩擦。'},
      {src:'/media/thought-navigator-v3/02-routing-decision.svg',width:1280,height:720,alt:'双路径路由决策示意图',title:'02 / 双路径编排与跳过边界',caption:'支持隐式按需发现与显式导航，遇到纯执行或事实缺失任务立即停止套框架。'},
      {src:'/media/thought-navigator-v3/03-plugin-structure.svg',width:1280,height:720,alt:'Codex 插件目录结构图',title:'03 / 单文件 SKILL.md 与插件封装',caption:'去除冗余 references 嵌套，每个 Skill 独立内聚，降低 Token 消耗与维护成本。'}
    ],
    verifiedAt:'2026-11-24（v3.0.1 插件包与 25 个 Skill 结构校验通过）',
    developmentVersion:'v3.0.1',
    installedVersion:'Codex Plugin v3.0.1 · 25 个 Skill 入口',
    contribution:'我基于开源思考方法库（comeonzhj/thinking-methods）提炼了触发条件与适用边界，独立设计了双路径路由规则、防过度套用停止条件及 Codex 插件化打包结构。',
    limitations:['Skill 路由依赖宿主 Agent 对工具描述（description）的语义匹配能力；在不同底层模型上的自主触发灵敏度会有差异。','思考框架只能辅助厘清结构与盲区，不能替代真实的业务数据与实验验证。'],
    sources:[
      {label:'v3.0.1 发行页与插件包',url:'https://github.com/xxkingstuggle/thought-navigator-v3/releases/tag/v3.0.1'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/thought-navigator-v3'}
    ],
    downloads:[
      {label:'Thought Navigator v3.0.1 插件包',platform:'Codex / Agent Skills',version:'v3.0.1',size:'52 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/thought-navigator-v3/releases/download/v3.0.1/thought-navigator-v3.0.1-plugin.zip',primary:true,note:'含 plugin/ 清单与全部 25 个思考方法 SKILL.md'}
    ],
    highlights:[
      {title:'从“人选工具”反转为“任务驱动发现”',body:'把每个思考方法的适用信号与反例写进 YAML frontmatter 的 description，让 Agent 在理解用户问题后自动决定是否加载对应 Skill。'},
      {title:'双入口协同：1 个总控 + 24 个专项方法',body:'问题清晰时直接命中专项方法（如 pre-mortem、steelman）；问题混沌时可点名调用 thought-navigator 先做诊断分流。'},
      {title:'显式定义“何时停止与跳过”',body:'明确规定事实查询、确定性代码实现或缺少基础证据时直接跳过思考框架，杜绝用长篇方法论包装空洞结论。'},
      {title:'零嵌套单文件 SKILL.md 架构',body:'将早期分散的多层参考文档收敛为高信息密度的单文件 SKILL.md，减少 Agent 二次读取延迟与上下文膨胀。'}
    ],
    scenarios:[
      {scenario:'方案上线前排查隐蔽风险',pain:'团队对新方案盲目乐观，常规检查清单容易漏掉非技术耦合风险。',outcome:'Agent 自动触发或由导航推荐「事前验尸（Pre-mortem）」，倒推“假设三个月后彻底失败”的具体死因。',mechanism:'任务意图匹配 -> 加载 pre-mortem/SKILL.md -> 输出风险与预案。'},
      {scenario:'两个技术或产品路线争执不下',pain:'各自只挑对方弱点攻击，讨论陷入立场之争。',outcome:'调用「双向钢人（Steelmanning）」，先帮双方各把最强成立条件补齐，再比较核心取舍。',mechanism:'冲突信号识别 -> 加载 steelman/SKILL.md -> 对称强化论证。'},
      {scenario:'目标模糊、不知道从何下手',pain:'想法很多但纠缠在一起，既像资源不够又像方向不对。',outcome:'显式调用「思路导航」先拆出当前真正卡住的那一个子问题，再推荐 1–2 个最匹配的切入方法。',mechanism:'thought-navigator 诊断分流 -> 最小可执行下一步。'}
    ],
    workflow:[
      {step:'01',title:'安装插件或技能目录',description:'将 plugin/skills 安装到 ~/.codex/skills 或通过插件市场挂载。',detail:'开箱即用，无需额外配置外部 API。'},
      {step:'02',title:'直接描述你的真实问题',description:'像平时一样提问，Agent 会在后台评估是否需要加载某个思考方法。',detail:'也可显式输入“用思路导航帮我拆一下”。'},
      {step:'03',title:'获得聚焦结论与下一步',description:'所有 Skill 均约束为直接输出针对当前问题的分析结论，不背诵方法论教材。',detail:'达到理解最小充分程度后立即停止。'}
    ],
    specs:[
      {label:'公开版本',value:'v3.0.1 / 2026-11-24'},
      {label:'Skill 数量',value:'25 个（1 个路由导航 + 24 个专项思考方法）'},
      {label:'单技能结构',value:'零嵌套单文件 SKILL.md'},
      {label:'兼容环境',value:'Codex CLI / Desktop · Claude Code · Magpie'},
      {label:'方法来源',value:'改编自 comeonzhj/thinking-methods (MIT)'},
      {label:'开源许可',value:'MIT License'}
    ],
    faq:[
      {question:'25 个 Skill 同时装进去，会不会每次对话都占满上下文？',answer:'不会。Agent 默认只读取每个 Skill 顶部的简短 name 和 description（渐进式披露）；只有当某个方法真正切中当前任务时，才会按需读取该 Skill 的正文。'},
      {question:'为什么不做一个自动连续调用 5 个方法的复杂工作流？',answer:'真实问题不是流水线。强制串联多个思考框架往往只会产出冗长正确的废话；一次选准 1 个最贴切的角度切进去，通常就够了。'},
      {question:'如果我只是想让 AI 改一段 Bug，它会强行先来一段苏格拉底提问吗？',answer:'不会。每个 Skill 的 description 和路由规则都写了明确的负面触发条件（不触发场景），纯代码执行和事实查询会直接跳过。'}
    ]
  },
  {
    slug:'habitbloom',name:'HabitBloom',category:'习惯记录 · iOS / Mac / WidgetKit',
    tagline:'从一张习惯卡片，到真正能使用的系统小组件',
    headline:'让今天的目标，变成愿意点开的卡片。',
    summary:'HabitBloom 是一个以本地数据为核心的 SwiftUI 习惯打卡应用，包含习惯卡片、提醒、统计、交互式 Widget 与可选的 Cloudflare 快照备份。重点不在把功能堆满，而是把记录、小组件和数据回并组成完整的使用路径。',
    platforms:['iPhone / iPad（SwiftUI）','Mac Catalyst','WidgetKit'],platformsLabel:'iOS · iPadOS · Mac',
    statusBadge:'v1.0.0 源码公开',statusTone:'source',
    latestVersion:'v1.0.0（开源源码版）',releaseDate:'2026-11-24',
    availabilitySummary:'GitHub 仓库已正式转为 Public 并发布 v1.0.0 源码 Release，完整公开 SwiftUI、SwiftData、WidgetKit 与 Cloudflare Worker / Durable Objects 工程，可通过 Xcode 自行编译运行。',
    availabilityNotice:'项目以完整 Xcode 开源工程形式分发。远程快照服务（Cloudflare Worker / Durable Objects）为可选模块，未部署远端时仍可作为纯本地习惯打卡应用完整运行。',
    repoUrl:'https://github.com/xxkingstuggle/HabitBloom',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/HabitBloom/releases/tag/v1.0.0',
    articleSlug:'habitbloom-habit-tracker',articleTitle:'HabitBloom：从习惯卡片到可交互 Widget 的工程实践',
    icon:habitbloomIcon,screenshot:habitbloomShot,
    screenshotAlt:'HabitBloom 品牌与习惯卡片视觉概览',
    screenshotCaption:'HabitBloom 视觉概览：结合 SwiftUI 本地习惯卡片、WidgetKit 交互小组件与 Cloudflare 轻量远端快照。',
    interfaceHeading:'从一张卡片开始。',
    verifiedAt:'2026-11-24（完成凭据隔离审计、转为 Public 并发布 v1.0.0）',
    developmentVersion:'v1.0.0 · SwiftUI + WidgetKit + Cloudflare 源码工程',
    installedVersion:'源码公开版（Xcode 本地编译与 HabitCore 单测通过）',
    contribution:'我负责产品范围、交互取舍和客户端/Widget/Worker 数据路径的组织，使用 AI 工具协助开发与代码审查。源码里的第三方平台能力归 Apple、Cloudflare 所有；实际运行结果以构建、测试和真机核验为准。',
    limitations:[
      '当前以 Xcode 源码工程与 GitHub Release 源码包形式分发，暂未上架 App Store。',
      '采用本地 SwiftData 优先 + 远端轻量快照合并架构，不包含重型多端 CRDT 实时冲突解决界面。',
      'Widget 刷新频率遵循 iOS WidgetKit 系统时间线预算，在应用启动与小组件交互时触发增量回并。'
    ],
    sources:[
      {label:'v1.0.0 源码 Release',url:'https://github.com/xxkingstuggle/HabitBloom/releases/tag/v1.0.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/HabitBloom'},
      {label:'工程实践文章',url:'/posts/habitbloom-habit-tracker/'}
    ],
    downloads:[],
    highlights:[
      {title:'卡片式日常打卡',body:'SwiftUI 提供习惯配置、颜色/图标/卡片样式与每日分组；SwiftData 本地保存习惯、打卡记录和备注。'},
      {title:'交互式桌面小组件',body:'WidgetKit 提供单习惯、多习惯与进度摘要；通过 App Intents 处理小组件打卡，并在主应用启动时回并状态。'},
      {title:'可选的远程快照',body:'App Group 可用时读取本地快照，部分侧载场景下通过 Cloudflare Worker / Durable Objects 读取远端快照；不将其称为实时同步。'},
      {title:'测试与工程边界',body:'仓库包含核心逻辑的 smoke/stress 检查入口、设备测试清单和签名权限说明，记录哪些功能已实现、哪些仍需实测。'}
    ],
    scenarios:[
      {scenario:'每天只想快速完成打卡',pain:'不希望一个轻量记录工具被复杂的账户流程和云依赖拖住。',outcome:'本地优先的习惯卡片、提醒和连续天数统计；无需部署远程服务器也能作为本地应用使用。',mechanism:'SwiftUI · SwiftData · UserNotifications'},
      {scenario:'在桌面小组件里直接操作',pain:'Widget 需要独立展示数据，交互结果也要回到主 App。',outcome:'通过快照提供小组件展示状态，通过 App Intent 与后续回并同步用户的打卡操作。',mechanism:'WidgetKit · App Intents · App Group'},
      {scenario:'侧载时共享能力不稳定',pain:'免费签名或重签名可能造成 App Group 读写不稳定。',outcome:'增加可选 HTTP 远端快照路径，减少对单一共享机制的依赖；网络和刷新限制依旧存在。',mechanism:'Cloudflare Workers · Durable Objects · HTTP'}
    ],
    workflow:[
      {step:'01',title:'检查和构建源码',description:'仓库公开后按 README 安装 Xcode/Swift 工具链，从工程运行 iOS 模拟器或 Mac Catalyst。',detail:'暂无可直接下载安装的公开包；构建与签名取决于本机环境。'},
      {step:'02',title:'体验本地功能',description:'创建习惯卡片，检查打卡、提醒、统计页面和 Widget 显示。',detail:'不配置远程服务，也可以先检查主要本地路径。'},
      {step:'03',title:'按需验证远程功能',description:'依照 REMOTE_SYNC.md 自行部署 Worker，并在本地忽略配置中设置地址和密钥。',detail:'需独立验证刷新时机、侧载限制与异常回退，不复用作者密钥。'}
    ],
    specs:[
      {label:'客户端',value:'SwiftUI · SwiftData · WidgetKit'},
      {label:'远程选项',value:'Cloudflare Workers · Durable Objects'},
      {label:'构建',value:'Xcode · iOS Simulator · Mac Catalyst'},
      {label:'自动化检查',value:'HabitCoreSmokeTests / HabitCoreStressTests（仓库提供）'},
      {label:'开源状态',value:'Public (MIT License) · v1.0.0 已发布'},
      {label:'分发状态',value:'提供完整 Xcode 源码工程；暂未分发签名 IPA'}
    ],
    faq:[
      {question:'现在可以直接克隆 HabitBloom 的源码了吗？',answer:'可以。仓库已完成凭据隔离审计并转为 Public（MIT 许可），克隆后参考 INSTALL.md 与 SECRETS.example.md 即可在 Xcode 编译。'},
      {question:'为什么有云端功能，却不能叫实时同步？',answer:'远程部分实现 HTTP 快照与轻量文字备份。WidgetKit 刷新、离线操作和多设备冲突仍受限制，不能保证实时一致。'},
      {question:'不部署 Cloudflare Worker 后端能正常使用吗？',answer:'完全可以。HabitBloom 采用本地优先架构，习惯卡片、打卡记录、统计与 App Group 小组件均基于本地 SwiftData 独立运行；远端 Worker 仅在侧载环境 App Group 受限或需要跨端轻量备份时按需启用。'}
    ]
  },
  {
    slug:'dim-wallpaper',name:'DimWallpaper',category:'macOS 原生菜单栏工具 · 桌面图层压暗',
    tagline:'不修改系统壁纸源文件，在桌面与图标之间挂载零交互穿透压暗层',
    headline:'深色模式下，让刺眼的亮色壁纸安静下来。',
    summary:'DimWallpaper 是用纯 Swift + AppKit 编写的轻量级 macOS 菜单栏工具。它不改动或重编码用户的原始壁纸文件，而是在 CGWindowLevelForKey(.desktopWindow) + 1 层级为每块显示器创建全穿透遮罩窗口（位于系统壁纸上方、桌面图标与应用程序窗口下方），支持跟随系统深色模式自动压暗、10%–85% 强度无级调节及多显示器热插拔同步。',
    platforms:['macOS 13.0+ · Apple Silicon'],platformsLabel:'macOS · AppKit',
    statusBadge:'v1.0.0 公开发布',statusTone:'release',latestVersion:'v1.0.0',releaseDate:'2026-11-24',
    availabilitySummary:'公开提供 v1.0.0 macOS 应用压缩包（ZIP）与 MIT 开源仓库，单二进制零第三方依赖。',
    availabilityNotice:'应用采用本地 ad-hoc 签名（未公证），首次打开如遇系统拦截可在「系统设置 → 隐私与安全性」中点击仍要打开。',
    repoUrl:'https://github.com/xxkingstuggle/dim-wallpaper',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v1.0.0',
    checksumsUrl:'https://github.com/xxkingstuggle/dim-wallpaper/releases/download/v1.0.0/SHA256SUMS.txt',
    articleSlug:'dim-wallpaper-macos-desktop-overlay',articleTitle:'DimWallpaper：不改系统壁纸文件，用 CGWindowLevel 桌面图层实现深色模式壁纸压暗',
    icon:dimWallpaperIcon,screenshot:dimWallpaperShot,
    screenshotAlt:'DimWallpaper 的 CGWindowLevel 桌面图层层级与压暗控制机制图',
    screenshotCaption:'DimWallpaper v1.0.0 核心原理：在 .desktopWindow 与 .desktopIconWindow 之间嵌入 ignoresMouseEvents = true 的穿透遮罩层。',
    interfaceHeading:'只压暗壁纸，不遮挡桌面图标。',
    verifiedAt:'2026-11-24（v1.0.0 编译签名与发版校验通过）',
    developmentVersion:'v1.0.0',
    installedVersion:'macOS arm64 v1.0.0 · 菜单栏常驻验证通过',
    contribution:'我独立完成了 CGWindowLevel 图层实验、多屏幕遮罩窗口生命周期管理、深浅色 KVO 监听与开机自启（SMAppService）实现。',
    limitations:['对系统内置动态壁纸或第三方视频壁纸（只要渲染在标准 .desktopWindow 层）均可压暗，但高于 .desktopIconWindow 的自定义桌面挂件不受遮罩影响。'],
    sources:[
      {label:'v1.0.0 发行页与安装包',url:'https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v1.0.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/dim-wallpaper'}
    ],
    downloads:[
      {label:'DimWallpaper macOS 应用包',platform:'macOS 13+ · Apple Silicon',version:'v1.0.0',size:'68 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/dim-wallpaper/releases/download/v1.0.0/DimWallpaper-1.0.0-macOS.zip',primary:true,note:'解压后将 DimWallpaper.app 拖入应用程序即可'}
    ],
    highlights:[
      {title:'精准的 CGWindowLevel 图层卡位',body:'遮罩层固定在 CGWindowLevelForKey(.desktopWindow) + 1，恰好高于系统壁纸而低于桌面图标（.desktopIconWindow），压暗背景的同时桌面文件依旧清晰。'},
      {title:'100% 鼠标事件穿透与全桌面空间驻留',body:'开启 ignoresMouseEvents = true 并配置 [.canJoinAllSpaces, .stationary, .ignoresCycle]，不拦截桌面点击、框选或 Mission Control 暴露。'},
      {title:'深色模式自动联动与平滑动画',body:'通过 KVO 监听 NSApp.effectiveAppearance，系统切入深色模式时自动以 0.18s 动画淡入压暗，切回浅色模式自动恢复。'},
      {title:'多显示器热插拔与休眠唤醒自愈',body:'监听 didChangeScreenParametersNotification 与 didWakeNotification，外接显示器插拔或合盖唤醒后自动按最新 NSScreen.screens 重建遮罩。'}
    ],
    scenarios:[
      {scenario:'夜间切换 macOS 深色模式办公',pain:'喜欢白天的亮色风景壁纸，但切到深色模式后壁纸边缘依然刺眼，破坏暗色沉浸感。',outcome:'设为「跟随深色模式」，系统变暗时壁纸自动同步压暗 35%–55%，白天自动恢复原图。',mechanism:'NSApp.effectiveAppearance KVO + NSAnimationContext 透明度过渡。'},
      {scenario:'外接超宽屏或双屏专注编码',pain:'副屏空置区域露出高对比度壁纸分散注意力，又不想换成纯黑壁纸。',outcome:'从菜单栏一键调高遮罩浓度至 70%，所有已连接显示器即时同步变暗。',mechanism:'NSScreen 字典映射与多窗口 alphaValue 批量更新。'},
      {scenario:'随时对比原图或临时关闭',pain:'直接修改壁纸图片文件的工具难以无损还原。',outcome:'因为从未触碰原图文件，在菜单栏点击「关闭」即可零延迟回到原始壁纸。',mechanism:'纯内存图层合成，零磁盘壁纸文件写入。'}
    ],
    workflow:[
      {step:'01',title:'启动菜单栏应用',description:'解压并运行 DimWallpaper.app，顶部菜单栏会出现圆形月亮/遮罩图标。',detail:'LSUIElement 应用，不占用 Dock 栏位置。'},
      {step:'02',title:'选择触发策略与浓度',description:'在菜单中选择「跟随深色模式」或「始终压暗」，通过滑块或预设档位调节浓度。',detail:'设置自动保存在本地 UserDefaults。'},
      {step:'03',title:'可选开启登录自启',description:'勾选「登录时启动」，由 macOS 原生 SMAppService.mainApp 托管开机自启。',detail:'无需额外守护进程或 LaunchAgent 脚本。'}
    ],
    specs:[
      {label:'公开版本',value:'v1.0.0 / 2026-11-24'},
      {label:'技术栈',value:'Swift · AppKit · CoreGraphics · ServiceManagement'},
      {label:'安装包体积',value:'约 68 KB（纯原生编译，零第三方依赖）'},
      {label:'窗口层级',value:'CGWindowLevelForKey(.desktopWindow) + 1'},
      {label:'系统要求',value:'macOS 13.0+ (Ventura 及以上)'},
      {label:'开源许可',value:'MIT License'}
    ],
    faq:[
      {question:'开启压暗后，会影响我在桌面上拖拽框选文件或右键新建文件夹吗？',answer:'完全不会。遮罩窗口设置了 ignoresMouseEvents = true，所有鼠标点击、拖拽和手势都会直接穿透到下方的 Finder 桌面。'},
      {question:'为什么桌面上的图标和文字没有一起变暗？',answer:'因为 macOS 的桌面背景（.desktopWindow）和桌面图标（.desktopIconWindow）处于两个相邻但不同的 CGWindowLevel。DimWallpaper 把遮罩精确插在这两层中间。'},
      {question:'拔掉或插上外接显示器后会有黑边或残留吗？',answer:'不会。应用监听了屏幕参数变更与系统唤醒通知，每次显示器拓扑变化都会自动对齐每块屏幕的 frame。'}
    ]
  },
  {
    slug:'framelit',name:'FrameLit',category:'macOS 原生窗口管理器 · 坐标网格与诊断架构',
    tagline:'基于 Swift 与 Accessibility API 的 macOS 窗口布局引擎，支持 6×3 至 48×24 网格编排',
    headline:'用精确的坐标网格与快捷键，重排桌面上的每一扇窗。',
    summary:'FrameLit 是一个用纯 Swift 与 AppKit / Accessibility API 实现的 macOS 窗口管理器工程。它支持半屏、三分屏、四分屏、中心聚焦及跨显示器投送等丰富布局指令，内置可调节精度的 Custom Layout Canvas（6×3 至 48×24 坐标网格编辑器），并配备了 10MiB 自动轮转、零主线程阻塞且自动剥离敏感路径的异步诊断日志系统。',
    platforms:['macOS 14+ · Apple Silicon & Intel','Swift · AppKit · AXUIElement'],platformsLabel:'macOS · Swift · Accessibility',
    statusBadge:'v1.3 架构与原型案例',statusTone:'source',latestVersion:'v1.3（本地工程版）',releaseDate:'2026-11-24',
    availabilitySummary:'当前作为 macOS 窗口布局算法、自定义网格编辑器与原生 UI 重构的工程案例展示。因早期兼容性研究涉及第三方二进制资源比对，按开源合规原则（PROVENANCE.md）保持仓库私有，不分发二进制安装包。',
    availabilityNotice:'本项目全部 77 项图标与视觉资产已由原创生成式图稿替换，Swift 源码为独立实现；但在彻底完成历史非图像资源（如本地化词条与命令表）的 clean-room 替换前，仅展示架构设计与界面重构成果。',
    repoUrl:'https://github.com/xxkingstuggle/FrameLift',repoVisibility:'private',
    articleSlug:'framelit-macos-window-manager',articleTitle:'FrameLit：macOS 原生窗口管理器的坐标网格编辑器与无阻塞诊断日志设计',
    icon:framelitIcon,screenshot:framelitShot,
    screenshotAlt:'FrameLit 深色模式下的窗口布局指令与自定义坐标网格编辑器界面',
    screenshotCaption:'FrameLit v1.3 窗口指令面板与 Custom Layout Canvas（6×3 至 48×24 坐标网格编辑器）深色模式界面。',
    interfaceHeading:'从预设分屏到自由网格，像素级对齐。',
    galleryKicker:'界面设计 / COMMANDS & CUSTOM GRID CANVAS',
    galleryHeading:'把复杂的窗口坐标计算，收进直观的原生面板。',
    galleryNotice:'以下为 FrameLit 的指令管理、偏好设置、浅色模式与多状态交互界面设计图稿。',
    gallery:[
      {src:'/media/framelit/commands-dark.webp',width:1600,height:1236,alt:'FrameLit 深色模式窗口指令与网格画布',title:'01 / 指令面板与自定义网格画布',caption:'左侧管理预设分屏与快捷键，右侧在 6×3 至 48×24 网格上拖拽定义自定义区域。'},
      {src:'/media/framelit/prefs-dark.webp',width:1600,height:1236,alt:'FrameLit 深色模式偏好设置与排除应用列表',title:'02 / 偏好设置与排除规则',caption:'配置边缘拖拽吸附阈值、多显示器行为、忽略应用名单及诊断日志开关。'},
      {src:'/media/framelit/commands-light.webp',width:1600,height:1236,alt:'FrameLit 浅色模式指令面板',title:'03 / 浅色模式高对比度视图',caption:'使用语义化 Token 构建深浅双套外观，保证网格线与快捷键徽章清晰易读。'},
      {src:'/media/framelit/states-dark.webp',width:1600,height:854,alt:'FrameLit 权限引导、快捷键冲突与空状态',title:'04 / 辅助功能授权与冲突提示',caption:'覆盖首次 Accessibility 授权引导、快捷键占用检测与异常恢复状态。'}
    ],
    verifiedAt:'2026-11-24（Swift 源码构建、77 项原创图稿打包与诊断日志单测核验）',
    developmentVersion:'v1.3 · Swift 原生实现 + 77 项重绘视觉资产',
    installedVersion:'本地验证通过；遵守 PROVENANCE 合规边界暂不公开分发',
    contribution:'我完成了 Swift 窗口几何计算引擎、Custom Layout Canvas 网格编辑器、深浅色 UI 系统重构、77 项原创图标资产管线（prepare_artwork.swift）以及异步轮转脱敏诊断日志模块的设计与实现。',
    limitations:['依据仓库 docs/PROVENANCE.md 的合规门禁，在完成全部历史 plist / 本地化资源清理与 Git 历史剥离前，不对外开放仓库或提供 DMG 下载。','部分拒绝响应标准 AXUIElement Size/Position 写操作的非标全屏游戏窗口不支持强制缩放。'],
    sources:[
      {label:'架构与工程复盘文章',url:'/posts/framelit-macos-window-manager/'},
      {label:'软件与工具总览',url:'/software/'}
    ],
    downloads:[],
    highlights:[
      {title:'6×3 至 48×24 自定义坐标网格画布',body:'突破固定二分/三分屏限制，允许用户在可视化网格画布上框选任意比例矩形，并映射为归一化浮点坐标（Normalized Rect）绑定全局快捷键。'},
      {title:'多显示器可视区（visibleFrame）与避让计算',body:'精确扣除 Menu Bar、自动隐藏/常驻 Dock 及屏幕刘海安全区，处理跨异构分辨率显示器移动时的坐标 clamp 与最小尺寸回退。'},
      {title:'零主线程阻塞的 10MiB 轮转脱敏日志',body:'诊断日志在独立后台串行队列落盘，单文件上限 5MiB（双文件 10MiB 自动轮转），写入前自动遮盖用户主目录与窗口私密标题。'},
      {title:'自动化图稿生成与打包管线',body:'编写 tools/prepare_artwork.swift 自动将生成式源图裁切、渲染为 77 个 1x/2x template glyph PNG 与 AppIcon.icns。'}
    ],
    scenarios:[
      {scenario:'超宽带鱼屏的非对称工作区划分',pain:'标准左半屏/右半屏在 34 寸超宽屏上过宽，而固定三分屏又不够放主编辑器。',outcome:'在 24×12 网格上自定义“中置 55% 主编辑器 + 两侧各 22.5% 终端与文档”，一键对齐。',mechanism:'Normalized Grid Rect -> NSScreen.visibleFrame 仿射映射 -> AXUIElementSetAttributeValue。'},
      {scenario:'排查特定第三方应用窗口无法吸附',pain:'部分 Electron 或自定义标题栏窗口在缩放后位置偏移，但同步打日志会拖慢拖拽帧率。',outcome:'开启异步诊断日志记录 AX Position -> Size -> Position 三步补偿前后坐标，不掉帧且不泄露隐私标题。',mechanism:'DispatchQueue.utility 异步追加 + 5MiB×2 轮转 + 路径脱敏。'},
      {scenario:'双显示器快捷键瞬移窗口',pain:'用鼠标把窗口从笔记本内屏拖到外接 4K 显示器再对齐非常费时。',outcome:'按下跨屏投送快捷键，窗口自动投送到下一块显示器并按目标屏幕比例保持相对布局。',mechanism:'NSScreen 拓扑环路查找与比例重映射。'}
    ],
    workflow:[
      {step:'01',title:'授予辅助功能（Accessibility）权限',description:'通过引导面板检查 AXIsProcessTrustedWithOptions，授权应用读写窗口几何属性。',detail:'权限变更时自动刷新状态，无需重启应用。'},
      {step:'02',title:'使用预设分屏或绘制自定义网格',description:'在 Commands 面板启用常用半屏/三分屏，或在 Custom Canvas 上框选专属网格比例。',detail:'实时检测快捷键冲突并高亮提示。'},
      {step:'03',title:'执行三步坐标补偿对齐',description:'触发快捷键或边缘拖拽时，按 Position → Size → Position 顺序写入 AX 属性，消除跨屏缩放偏差。',detail:'对被排除应用名单自动跳过干预。'}
    ],
    specs:[
      {label:'工程版本',value:'v1.3（本地验证构建）'},
      {label:'核心技术',value:'Swift · AppKit · ApplicationServices (AXUIElement)'},
      {label:'网格精度',value:'支持 6×3、12×6、24×12、48×24 四档归一化网格'},
      {label:'日志配额',value:'2 × 5 MiB（总上限 10 MiB 后台异步轮转 + 隐私脱敏）'},
      {label:'视觉资产',value:'77 项原创生成式 1x/2x PNG 与 AppIcon.icns'},
      {label:'发布边界',value:'架构与设计案例展示（遵循 PROVENANCE 合规要求暂不公开源码）'}
    ],
    faq:[
      {question:'为什么 FrameLit 写得这么完整，却不放公开下载链接？',answer:'因为该项目最初是通过研究本地已安装商业软件的行为起步的。虽然 Swift 代码和全部 77 张图标均已重新实现和替换，但仓库历史和非图像资源（如部分命令定义 plist）尚未完成彻底的 clean-room 剥离。把知识产权边界守住，比多放一个下载按钮更重要。'},
      {question:'为什么移动窗口要按“位置 → 尺寸 → 位置”写三次 AXUIElement 属性？',answer:'当窗口从一块小屏幕移到大屏幕并放大时，如果先改尺寸，macOS 可能会因为旧屏幕放不下而自动截断（clamp）宽高；如果先改位置再改尺寸，某些应用又会在尺寸变化时重置锚点。三步写入能稳定兼容绝大多数原生与跨平台窗口。'},
      {question:'诊断日志会记录我屏幕上打开的文档标题或文件路径吗？',answer:'不会。日志模块默认关闭，且即使开启，也会通过正则清洗将用户主目录替换为 ~ 并隐去窗口具体标题文本，只保留 Bundle ID 与几何坐标数值。'}
    ]
  }];
export const WORKBENCH_PROJECTS = [
  {name:'CPA Plugin (WorkBuddy / QoderWork)',status:'开源源码 · Go/CGO 网关插件',summary:'基于 Go c-shared 与 C ABI 扩展 CLIProxyAPI 多模型网关，处理 OAuth/PAT 鉴权、动态模型枚举与协议兼容清洗。',href:'/posts/cpa-go-abi-provider-plugins/'},
  {name:'Local Governance Skill',status:'v1.0.0 公开发布 · Agent 治理协议',summary:'通过工作区落位不变式、PROGRESS/BLOCKED/DECISIONS 三层生命周期账本与证据驱动门禁，治理本地多项目漂移。',href:'/posts/local-governance-agent-workspace/'},
  {name:'ChatGPT Supervisor',status:'v0.1.0 公开发布 · 跨会话状态机',summary:'用不可变 Markdown 请求包、state_version 乐观锁与单执行器互斥锁，解耦高层架构决策与终端代码执行。',href:'/posts/chatgpt-supervisor-state-machine/'},
  {name:'BossHunter 求职 Agent',status:'开源源码 · 自动化投递引擎',summary:'结合多简历画像 YAML 规则评分、反自动化节流控制与本地 SQLite 幂等账本的智能求职助手。',href:'/posts/bosshunter-job-agent-pipeline/'},
  {name:'Xiaomi App Launcher',status:'v1.0.0 公开发布 · Android 启动器',summary:'基于 Kotlin 与 Jetpack Compose 的极简 Android 应用启动器，纯本地毫秒级检索逻辑 100% JVM 单测覆盖。',href:'/posts/xiaomi-app-launcher-compose/'},
  {name:'Three-Layer Site Block',status:'工程实践 · macOS 三层网络分流',summary:'联动 /etc/hosts、Little Snitch 与 FlClash 扩展脚本，通过 Dry-run 预检实现可审计的本机域名封禁与直连治理。',href:'/posts/macos-three-layer-network-governance/'}
];
export function getSoftwareBySlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.slug===slug); }
export function getSoftwareByArticleSlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.articleSlug===slug); }
