import type { ImageMetadata } from 'astro';
import usblinkmicIcon from '../assets/projects/usblinkmic-icon.png';
import usblinkmicShot from '../assets/projects/usblinkmic-mac.png';
import habitbloomIcon from '../assets/projects/habitbloom-icon.png';
import habitbloomShot from '../assets/projects/habitbloom-cover.png';

export interface SoftwareDownloadItem { label:string; platform:string; version:string; size:string; format:string; url:string; primary?:boolean; note?:string; }
export interface SoftwareProduct {
  slug:'usblinkmic'|'habitbloom'; name:string; tagline:string; headline:string; summary:string; category:string;
  platforms:string[]; platformsLabel:string; statusBadge:string; statusTone:'release'|'source'; latestVersion:string; releaseDate:string;
  availabilitySummary:string; availabilityNotice:string; repoUrl:string; repoVisibility:'public'|'private'; releasesUrl?:string; checksumsUrl?:string;
  articleSlug:string; articleTitle:string; icon:ImageMetadata; screenshot:ImageMetadata; screenshotAlt:string; screenshotCaption:string; secondaryScreenshot?:ImageMetadata;
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
    summary:'USBLinkMic 把手机拾音、手机网络共享给 Mac、Mac 网络反向共享给手机，放进一个原生面板。音频通过 ADB 或局域网传输，网络链路通过 USB 工作。它要解决的是连接、依赖与状态提示散落在多条命令里的麻烦。',
    platforms:['macOS 26+ · Apple Silicon','Android 8.0+'], platformsLabel:'macOS · Android', statusBadge:'v4.0.8 公开发布', statusTone:'release',latestVersion:'v4.0.8',releaseDate:'2026-10-17',
    availabilitySummary:'公开提供 macOS DMG / ZIP 与 Android APK。公开下载对应 v4.0.8；页面顶部总览图为 4.0.10 开发版，下方三张功能分栏图为 v4.0.17 开发版。',
    availabilityNotice:'macOS 公开包尚未完成 Apple 公证。USB 功能需要调试授权；供其他 Mac 软件使用的音频输入需要 BlackHole 2ch。Android USB 网络共享依赖系统与机型支持，请先读安装说明。',
    repoUrl:'https://github.com/xxkingstuggle/usblinkmic',repoVisibility:'public',releasesUrl:`${release}/tag/v4.0.8`,checksumsUrl:`${release}/download/v4.0.8/SHA256SUMS.txt`,
    articleSlug:'usblinkmic-android-mac-bridge',articleTitle:'USBLinkMic：把 Android 麦克风与网络接入 Mac',
    icon:usblinkmicIcon,screenshot:usblinkmicShot,screenshotAlt:'USBLinkMic Mac 4.0.10 开发版的手机麦克风面板，设备标识已遮盖',
    screenshotCaption:'顶部总览图为 2026-10-23 采集的 Mac 4.0.10 开发版真实界面；下方三张功能面板为 2026-11-17 补充的 Mac v4.0.17 开发版截图（均未公开发布，设备标识已遮盖）。仅展示开发界面与状态，不代表公开 v4.0.8 的外观或完整设备验收。',
    verifiedAt:'2026-11-17（新增 v4.0.17 开发版界面截图，非设备回归验收）',developmentVersion:'Mac v4.0.17（功能面板） / 4.0.10（顶部总览）',installedVersion:'顶部总览 4.0.10（本机截图）；下方三张面板 v4.0.17（补充截图，未在本轮重装实测）',
    contribution:'我负责需求取舍、跨平台集成、维护与验收，Codex 等 AI 助手参与实现和审查。项目复用 Android platform-tools、Gnirehtet 的 Java relay，随包保留 OpenJDK 运行时与许可，并通过外部 BlackHole 虚拟声卡对接音频输入；这些第三方成果不属于个人从零实现。',
    limitations:['跨机型、息屏、插拔与长时间运行的完整 T01–T24 设备验收仍待完成。','页面截图分别来自开发版 4.0.10（顶部总览）与 v4.0.17（下方三张功能面板），不能据此认定公开 v4.0.8 已包含后续界面或修复。','收到 PCM 帧不等于会议软件已收到可听声音；音频路由与系统输入需另行确认。','未承诺普遍的低延迟数值、功耗收益或所有 Android ROM 的网络兼容性。','无线麦克风链路未加密，只适合可信局域网。'],
    sources:[{label:'v4.0.8 发行页与文件',url:`${release}/tag/v4.0.8`},{label:'公开版安装说明',url:`${release}/download/v4.0.8/INSTALL.md`},{label:'依赖与来源',url:'https://github.com/xxkingstuggle/usblinkmic/blob/v4.0.8/docs/dependencies.md'}],
    downloads:[
      {label:'下载 macOS DMG',platform:'macOS 26+ · Apple Silicon',version:'v4.0.8',size:'34.9 MB',format:'DMG',url:`${release}/download/v4.0.8/USBLinkMic-4.0.8-public.dmg`,primary:true,note:'未公证，先阅读安装说明'},
      {label:'下载 Android APK',platform:'Android 8.0+',version:'v4.0.8',size:'11.4 MB',format:'APK',url:`${release}/download/v4.0.8/USBLinkMic-4.0.8-review.4.apk`,primary:true,note:'与公开 Mac 版本配套'},
      {label:'macOS ZIP',platform:'macOS 26+ · Apple Silicon',version:'v4.0.8',size:'31.7 MB',format:'ZIP',url:`${release}/download/v4.0.8/USBLinkMic-4.0.8-public-macOS.zip`}
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
    specs:[{label:'公开版本',value:'v4.0.8 / 2026-10-17'},{label:'系统',value:'macOS 26+ Apple Silicon / Android 8.0+'},{label:'USB 网络',value:'手机网络共享需兼容 Android 系统（文档建议 Android 11+）'},{label:'源码',value:'Swift / Kotlin / 第三方 Java relay'},{label:'音频链路',value:'USB ADB 或局域网 / BlackHole 2ch'},{label:'本轮核对',value:'Release、安装元数据、当前 UI；未跑完整设备矩阵'}],
    faq:[{question:'截图里的 4.0.10 和 v4.0.17 在哪里下载？',answer:'顶部总览图来自 4.0.10 开发版，下方三张功能面板来自 v4.0.17 开发版，两者均用于展示真实开发界面且尚未公开发布；目前公开可下载版本为 v4.0.8，界面和功能可能不同。'},
      {question:'为什么需要 BlackHole？',answer:'它提供一个可被其他 Mac 软件选择的虚拟音频设备。USBLinkMic 负责接收和转送手机音频，BlackHole 负责系统侧音频接入，两者职责不同。'},
      {question:'已经可以保证所有手机都稳定使用吗？',answer:'还不能。已有公开包与实现，但系统网络能力、音频路由、锁屏和长期运行仍需要逐设备验证。遇到问题可以在公开仓库提交经过脱敏的复现步骤。'}]
  },
  {
    slug:'habitbloom',name:'HabitBloom',category:'习惯记录 · iOS / Mac / WidgetKit',
    tagline:'从一张习惯卡片，到真正能使用的系统小组件',
    headline:'让今天的目标，变成愿意点开的卡片。',
    summary:'HabitBloom 是一个以本地数据为核心的 SwiftUI 习惯打卡应用，包含习惯卡片、提醒、统计、交互式 Widget 与可选的 Cloudflare 快照备份。重点不在把功能堆满，而是把记录、小组件和数据回并组成完整的使用路径。',
    platforms:['iPhone / iPad（SwiftUI）','Mac Catalyst','WidgetKit'],platformsLabel:'iOS · iPadOS · Mac',
    statusBadge:'源码公开准备中 · 无安装包',statusTone:'source',
    latestVersion:'源码版（未发布 IPA / DMG）',releaseDate:'2026-11-17 核对',
    availabilitySummary:'当前可检查 SwiftUI、SwiftData、WidgetKit、Cloudflare Worker 的完整工程。代码仓库目前仍为私有，正在核对公开安全性；尚无公开 IPA、DMG 或 App Store 版本。公开后可用 Xcode 自行构建。',
    availabilityNotice:'请勿把本页概念配图当作应用运行截图。远程快照需要自行部署并配置；小组件刷新受系统调度影响，且未完成跨设备冲突处理与完整真机回归。',
    repoUrl:'https://github.com/xxkingstuggle/HabitBloom',repoVisibility:'private',
    articleSlug:'habitbloom-habit-tracker',articleTitle:'HabitBloom：从习惯卡片到可交互 Widget 的工程实践',
    icon:habitbloomIcon,screenshot:habitbloomShot,
    screenshotAlt:'HabitBloom 品牌与习惯卡片视觉示意图，非真实运行界面',
    screenshotCaption:'图为 HabitBloom 项目概念展示，不是实际运行截图。真实应用截图、侧载环境与 Mac Catalyst 运行验收正在补充。',
    verifiedAt:'2026-11-17（公开源码与文档核对，不等于设备实测）',
    developmentVersion:'已有本地记录、统计、Widget 与远程快照代码',
    installedVersion:'本轮未连接真机或 Xcode，不能宣称安装验收通过',
    contribution:'我负责产品范围、交互取舍和客户端/Widget/Worker 数据路径的组织，使用 AI 工具协助开发与代码审查。源码里的第三方平台能力归 Apple、Cloudflare 所有；实际运行结果以构建、测试和真机核验为准。',
    limitations:[
      '当前 GitHub 仓库仍为 Private；公开前仅仓库授权成员可查看代码。',
      '尚无正式下载包，Xcode 模拟器、Mac Catalyst、侧载环境的全面回归结果待补。',
      'CloudKit、推送提醒、完整的多设备冲突解决界面尚未实现。',
      'Widget 的网络与刷新时机受系统控制；HTTP 快照不等于实时双向同步。',
      '当前项目概念图不是应用截图；后续补充真实界面、Widget 与测试证据。'
    ],
    sources:[],
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
      {label:'开源状态',value:'Public 审核中；目前仓库仍为 Private'},
      {label:'分发状态',value:'暂未发布 IPA / DMG / App Store 版本'}
    ],
    faq:[
      {question:'已经能直接下载 HabitBloom 吗？',answer:'目前没有公开安装包或 App Store 版本。完成源码公开后，可自行克隆仓库并用 Xcode 编译。'},
      {question:'为什么有云端功能，却不能叫实时同步？',answer:'远程部分实现 HTTP 快照与轻量文字备份。WidgetKit 刷新、离线操作和多设备冲突仍受限制，不能保证实时一致。'},
      {question:'这页面为什么还没有 App 真实截图？',answer:'当前复用的素材是项目概念图而非运行界面。正式展示会补真实手机界面、小组件和必要的脱敏测试记录，不能拿概念图充当成品截图。'}
    ]
  }];
export const WORKBENCH_PROJECTS = [
  {name:'Colorful',status:'私有原型 / 浏览器工具',summary:'让明确启用的 Chromium PWA 使用主题色。重点是默认关闭、域名继承与可恢复的设置。',href:'/posts/browser-tools-boundaries/#colorful'},
  {name:'Linux.do 标题检索',status:'开发札记 / 用户脚本',summary:'只索引公开主题标题，在本地检索。遇到限流或挑战就停下，不越过站点权限。',href:'/posts/browser-tools-boundaries/#linuxdo'},
  {name:'AI 协作实践',status:'工程方法 / 持续修订',summary:'把任务拆清楚，再检查真实差异与验证结果。保留模型参与和人工判断各自的责任。',href:'/posts/lightweight-multi-agent-coding-loop/'},
  {name:'zjx-download',status:'开发中 / 无公开分发',summary:'macOS 下载器与浏览器交接实践。当前仍有网络启动问题，设备验收未完成。',href:'/posts/browser-tools-boundaries/#zjx-download'}
];
export function getSoftwareBySlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.slug===slug); }
export function getSoftwareByArticleSlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.articleSlug===slug); }
