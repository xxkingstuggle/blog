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
    availabilitySummary:'公开提供 macOS DMG / ZIP 与 Android APK。下载对应 v4.0.8；下方截图是本机 4.0.10 开发版。',
    availabilityNotice:'macOS 公开包尚未完成 Apple 公证。USB 功能需要调试授权；供其他 Mac 软件使用的音频输入需要 BlackHole 2ch。Android USB 网络共享依赖系统与机型支持，请先读安装说明。',
    repoUrl:'https://github.com/xxkingstuggle/usblinkmic',repoVisibility:'public',releasesUrl:`${release}/tag/v4.0.8`,checksumsUrl:`${release}/download/v4.0.8/SHA256SUMS.txt`,
    articleSlug:'usblinkmic-android-mac-bridge',articleTitle:'USBLinkMic：把 Android 麦克风与网络接入 Mac',
    icon:usblinkmicIcon,screenshot:usblinkmicShot,screenshotAlt:'USBLinkMic Mac 4.0.10 开发版的手机麦克风面板，设备标识已遮盖',
    screenshotCaption:'2026-10-23 采集的真实 Mac 界面，Mac / Android 安装元数据均为 4.0.10（开发版，未公开发布）。只展示当前界面与状态，不代表公开 v4.0.8 的外观或完整功能验收。设备标识已遮盖。Android 界面截图待补，本图仅展示 Mac。',
    verifiedAt:'2026-10-23',developmentVersion:'4.0.10 · 有未提交修改',installedVersion:'Mac / Android 4.0.10',
    contribution:'我负责需求取舍、跨平台集成、维护与验收，Codex 等 AI 助手参与实现和审查。项目复用 Android platform-tools、Gnirehtet 的 Java relay，随包保留 OpenJDK 运行时与许可，并通过外部 BlackHole 虚拟声卡对接音频输入；这些第三方成果不属于个人从零实现。',
    limitations:['跨机型、息屏、插拔与长时间运行的完整 T01–T24 设备验收仍待完成。','当前截图来自开发版 4.0.10，不能据此认定公开 v4.0.8 已包含后续修复。','收到 PCM 帧不等于会议软件已收到可听声音；音频路由与系统输入需另行确认。','未承诺普遍的低延迟数值、功耗收益或所有 Android ROM 的网络兼容性。','无线麦克风链路未加密，只适合可信局域网。'],
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
    faq:[{question:'截图里的 4.0.10 在哪里下载？',answer:'本页截图是当前本机开发版，用来展示真实界面。4.0.10 尚未公开发布；可下载的是 v4.0.8，界面和功能可能不同。'},
      {question:'为什么需要 BlackHole？',answer:'它提供一个可被其他 Mac 软件选择的虚拟音频设备。USBLinkMic 负责接收和转送手机音频，BlackHole 负责系统侧音频接入，两者职责不同。'},
      {question:'已经可以保证所有手机都稳定使用吗？',answer:'还不能。已有公开包与实现，但系统网络能力、音频路由、锁屏和长期运行仍需要逐设备验证。遇到问题可以在公开仓库提交经过脱敏的复现步骤。'}]
  },
  {
    slug:'habitbloom',name:'HabitBloom',category:'习惯卡片与 Widget 实践',tagline:'让今天的小事，有一张愿意点开的卡片',headline:'记录习惯，也练习给功能划边界。',
    summary:'HabitBloom 用 SwiftUI、SwiftData 和 WidgetKit 探索卡片式习惯记录。这个个人项目还包含免费签名条件下的 HTTP 远端快照方案。它适合作为界面与约束设计案例，尚未成为可公开安装的产品。',
    platforms:['iOS','iPadOS','Mac Catalyst'],platformsLabel:'iPhone · iPad · Mac',statusBadge:'个人原型 · 私有源码',statusTone:'source',latestVersion:'未公开发布',releaseDate:'2026-10-23 核对',
    availabilitySummary:'私有源码，暂无公开 IPA / DMG，也未上架 App Store。本页提供工程说明，不提供下载。',availabilityNotice:'远端快照和 Widget 刷新有调度与网络限制；完整冲突解决 UI 与公开分发流程仍未完成，不承诺多端实时一致。',repoUrl:'',repoVisibility:'private',articleSlug:'habitbloom-habit-tracker',articleTitle:'HabitBloom：给习惯卡片 Widget 留一条远端快照路径',icon:habitbloomIcon,screenshot:habitbloomShot,screenshotAlt:'HabitBloom 项目图标展示，非运行界面',screenshotCaption:'HabitBloom 项目图标与配色展示，不是运行截图。不展示个人习惯、日历与备注数据。',verifiedAt:'2026-10-23',developmentVersion:'个人源码迭代',installedVersion:'本轮未做安装/运行验收',
    contribution:'我负责产品范围、界面方向与集成，AI 助手参与实现与审查。案例仅描述已核对的代码设计，不把原型和静态说明当作多设备功能验收。',limitations:['源码私有且无公开安装包，访客暂时无法自行体验。','HTTP 快照不等于 WebSocket 实时推送；Widget 刷新受系统调度影响。','完整冲突解决 UI、iCloud、服务端推送与公开 IPA 发布流程尚未完成。'],sources:[],downloads:[],
    highlights:[{title:'今天的卡片优先',body:'用图标、颜色与目标日期组织习惯，首页优先展示当天记录。'}, {title:'先存本地',body:'SwiftData 承担本地存储，远端使用 HTTP 快照；不将网络成功与本地记录混为一谈。'}, {title:'Widget 单独拿快照',body:'用预先整理的摘要减少小组件端的数据处理。免费签名和重签名环境需要单独验证。'}],
    scenarios:[{scenario:'快速记录今天',pain:'不希望一次简单记录被复杂的配置和统计打断。',outcome:'尝试用卡片缩短记录路径；本轮未做用户效率测量。',mechanism:'SwiftUI 卡片 + SwiftData 本地记录。'}, {scenario:'让小组件拿到数据',pain:'个人签名条件下，主应用与 Widget 共享数据可能受限。',outcome:'实现 HTTP 快照路径；不承诺即时刷新或完整冲突处理。',mechanism:'Cloudflare Workers / Durable Objects 存取快照。'}],
    workflow:[{step:'01',title:'界定今天要做的事',description:'为习惯选择图标、颜色和周期。',detail:'这是原型的交互设计说明。'}, {step:'02',title:'先完成本地记录',description:'通过卡片记录完成情况，数据保存在本地模型。',detail:'个人图片与备注不作为公开演示素材。'}, {step:'03',title:'单独验证远端与 Widget',description:'检查快照读取与更新触发时机。',detail:'仍需补多设备冲突与侧载环境验收。'}],
    specs:[{label:'状态',value:'个人原型 / 私有源码 / 无公开包'},{label:'客户端',value:'SwiftUI · SwiftData · WidgetKit'},{label:'远端设计',value:'HTTP 快照 / Workers + Durable Objects'},{label:'未完成',value:'完整冲突 UI 与公开分发流程'}],
    faq:[{question:'可以下载或查看源码吗？',answer:'暂时不可以。仓库为私有，没有公开安装包。这里保留的是设计案例与已知限制，未来如公开分发会单独更新。'}, {question:'它能实时同步所有设备吗？',answer:'本轮代码核对支持 HTTP 快照方案，没有将其确认为 WebSocket 实时同步。系统调度、离线恢复和多设备冲突仍需要更多验证。'}]
  }
];
export const WORKBENCH_PROJECTS = [
  {name:'Colorful',status:'私有原型 / 浏览器工具',summary:'让明确启用的 Chromium PWA 使用主题色。重点是默认关闭、域名继承与可恢复的设置。',href:'/posts/browser-tools-boundaries/#colorful'},
  {name:'Linux.do 标题检索',status:'开发札记 / 用户脚本',summary:'只索引公开主题标题，在本地检索。遇到限流或挑战就停下，不越过站点权限。',href:'/posts/browser-tools-boundaries/#linuxdo'},
  {name:'AI 协作实践',status:'工程方法 / 持续修订',summary:'把任务拆清楚，再检查真实差异与验证结果。保留模型参与和人工判断各自的责任。',href:'/posts/lightweight-multi-agent-coding-loop/'},
  {name:'zjx-download',status:'开发中 / 无公开分发',summary:'macOS 下载器与浏览器交接实践。当前仍有网络启动问题，设备验收未完成。',href:'/posts/browser-tools-boundaries/#zjx-download'}
];
export function getSoftwareBySlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.slug===slug); }
export function getSoftwareByArticleSlug(slug:string) { return SOFTWARE_PRODUCTS.find(p=>p.articleSlug===slug); }
