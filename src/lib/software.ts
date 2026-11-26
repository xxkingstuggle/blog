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
export interface SoftwareGallerySecondaryItem { src:string; width:number; height:number; alt:string; label?:string; }
export interface SoftwareGalleryItem {
  src:string;
  width:number;
  height:number;
  alt:string;
  kicker?:string;
  title:string;
  caption:string;
  mechanism?:string;
  narrow?:boolean;
  cropMat?:'window'|'dialog';
  secondary?:SoftwareGallerySecondaryItem;
}
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
  heroCropMat?:'window'|'dialog';
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
    platforms:['macOS 26+ · Apple Silicon','Android 8.0+'], platformsLabel:'macOS · Android', statusBadge:'v4.0.18 公开发布', statusTone:'release',latestVersion:'v4.0.18',releaseDate:'2026-11-26',
    availabilitySummary:'公开提供 v4.0.18 macOS DMG / ZIP 与协议 v4 兼容版 Android APK（v4.0.17），配套 VALIDATION.md 与 SHA-256 校验清单。Mac 安装包内置配套 Android APK、ADB 与精简 OpenJDK 运行时。',
    availabilityNotice:'macOS 公开包尚未完成 Apple 公证。USB 功能需要调试授权；供其他 Mac 软件使用的音频输入需要 BlackHole 2ch。Android USB 网络共享依赖系统与机型支持，请先读安装说明。',
    repoUrl:'https://github.com/xxkingstuggle/usblinkmic',repoVisibility:'public',releasesUrl:`${release}/tag/v4.0.18`,checksumsUrl:`${release}/download/v4.0.18/SHA256SUMS.txt`,
    articleSlug:'usblinkmic-v4-evolution',articleTitle:'USBLinkMic 4.0 演进手记：USB 充电协商、ADB 断连自愈与局域网自动重连',
    icon:usblinkmicIcon,screenshot:usblinkmicShot,screenshotAlt:'USBLinkMic Mac 4.0.10 开发版的手机麦克风面板，设备标识已遮盖',
    screenshotCaption:'USBLinkMic macOS 原生主界面（设备标识已脱敏），集中呈现目标设备、PCM 有效音频帧传输状态与实时电平。',
    interfaceHeading:'连接状态，看得见。',
    galleryKicker:'CORE WORKSPACES · 四大原生工作区',
    galleryHeading:'音频、网络、权限与诊断，各司其职。',
    gallery:[
      {
        src:'/media/usblinkmic/workspace-microphone-dark.webp',
        width:1600,
        height:1028,
        alt:'USBLinkMic v4 深色模式手机麦克风实时拾音与波形增益面板',
        kicker:'01 · AUDIO STREAMING',
        title:'手机拾音，实时波形与数字增益',
        caption:'Android 端采集的 PCM 音频流经 USB ADB 或局域网直连进入 Mac，实时绘制音量波形与分贝峰值，支持本机静音监听切换与 1.25x 数字增益调节，并可直接桥接至 BlackHole 2ch 供会议或录音软件调用。',
        mechanism:'PCM I16 44.1kHz · USB 有线 / 局域网自动重连 · BlackHole 2ch 虚拟声卡输出'
      },
      {
        src:'/media/usblinkmic/workspace-macInternet-dark.webp',
        width:1600,
        height:1028,
        alt:'USBLinkMic v4 深色模式双向有线网络共享面板',
        kicker:'02 · BI-DIRECTIONAL USB NETWORK',
        title:'一条数据线，双向有线网络互通',
        caption:'同一面板内整合「Mac 网络共享给手机（反向代理 / VPN 隧道）」与「手机网络提供给 Mac（原生 USB NCM 虚拟网卡）」。界面把 USB 就绪、NCM 激活、DHCP 分配与出口连通拆解为可视化节点，不再黑盒试错。',
        mechanism:'Android USB NCM 虚拟网卡 · 本地环回 VPNService 隧道 · 互斥路由保护'
      },
      {
        src:'/media/usblinkmic/workspace-devices-dark.webp',
        width:1600,
        height:1028,
        alt:'USBLinkMic v4 深色模式设备识别与手机端权限双向同步面板',
        kicker:'03 · DEVICE & PERMISSION BUS',
        title:'设备识别、权限同步与端口健康监控',
        caption:'通过 USB 控制总线自动识别已连接的 Android 手机，在 Mac 端实时同步手机录音权限（RECORD_AUDIO）、前台常驻服务通知与 VPN 隧道授权状态，并持续监测 TCP 控制端口与音频流端口连通性。',
        mechanism:'TCP 48,125 控制总线 · TCP 48,124 音频流通道 · 端到端权限状态自检'
      },
      {
        src:'/media/usblinkmic/workspace-logs-dark.webp',
        width:1600,
        height:1028,
        alt:'USBLinkMic v4 深色模式诊断日志与模块过滤控制台',
        kicker:'04 · TELEMETRY & DIAGNOSTICS',
        title:'按模块过滤的实时控制台与排障记录',
        caption:'内置诊断日志工作区，支持按音频麦克风、网络共享、设备恢复分类检索或按错误码过滤。无论是 USB 线材闪断还是 ADB 握手异常，均可导出结构化记录即时定位。',
        mechanism:'结构化事件流 · 模块级实时过滤 · 本地一键导出'
      }
    ],
    verifiedAt:'2026-11-26（v4.0.18 macOS 宿主侧 115/115 Swift 单测与动态验收通过并已公开发布）',developmentVersion:'v4.0.18（Wi-Fi 分代连接池、JSON 脱敏、日志工作区升级与关于品牌归属）',installedVersion:'公开包 Mac v4.0.18 + 兼容协议 v4 Android APK v4.0.17（115/115 单测全绿）',
    contribution:'我负责需求取舍、跨平台集成、维护与验收，Codex 等 AI 助手参与实现和审查。项目复用 Android platform-tools、Gnirehtet 的 Java relay，随包保留 OpenJDK 运行时与许可，并通过外部 BlackHole 虚拟声卡对接音频输入；这些第三方成果不属于个人从零实现。',
    limitations:['跨机型、息屏、插拔与长时间运行的完整 T01–T24 设备矩阵仍在持续扩充；2026-11-26 主干加固为 macOS 宿主侧验证，尚未重跑实体 Android 物理链路。','收到 PCM 帧不等于会议软件已收到可听声音；音频路由与系统输入需配合 BlackHole 2ch 确认。','未承诺普遍的低延迟数值、功耗收益或所有 Android ROM 的网络兼容性。','无线麦克风链路未加密，只适合可信局域网。'],
    sources:[{label:'v4.0.18 发行页与文件',url:`${release}/tag/v4.0.18`},{label:'宿主机验证记录',url:`${release}/download/v4.0.18/VALIDATION.md`},{label:'安装说明',url:'https://github.com/xxkingstuggle/usblinkmic/blob/main/docs/install.md'},{label:'依赖与来源',url:'https://github.com/xxkingstuggle/usblinkmic/blob/main/docs/dependencies.md'}],
    downloads:[
      {label:'下载 macOS DMG（推荐）',platform:'macOS 26+ · Apple Silicon',version:'v4.0.18',size:'34.8 MB',format:'DMG',url:`${release}/download/v4.0.18/USBLinkMic-4.0.18.dmg`,primary:true,note:'拖入应用程序即可；已内置协议 v4 兼容版 Android APK'},
      {label:'下载 Android APK（协议 v4）',platform:'Android 8.0+',version:'v4.0.17',size:'11.0 MB',format:'APK',url:`${release}/download/v4.0.18/USBLinkMic-4.0.17.apk`,primary:true,note:'与公开 Mac v4.0.18 完全兼容'},
      {label:'macOS ZIP',platform:'macOS 26+ · Apple Silicon',version:'v4.0.18',size:'31.6 MB',format:'ZIP',url:`${release}/download/v4.0.18/USBLinkMic-4.0.18-macOS.zip`,note:'与 DMG 同版，适合直接解压检查'}
    ],
    highlights:[{title:'手机拾音，Mac 接收',body:'Android AudioRecord 采集音频，通过 USB ADB 转发或局域网直连传给 Mac。主干已将 Wi-Fi 控制通道升级为分代连接池与串行生命周期隔离，避免断连重连残留幽灵会话。'},
      {title:'网络有两个方向',body:'手机网络给 Mac 走 Android USB 网络共享；Mac 网络给手机走 Java relay 和 Android VPNService。两条网络路径互斥，并各有权限和系统条件。'},
      {title:'多设备工作区与脱敏日志',body:'主干支持多手机精准单选、5 类模块日志筛选胶囊、关键字检索与一键复制脱敏（自动遮蔽 JSON 凭据），并补齐 ⌘1–⌘4 / ⌘R 快捷键与无障碍降级。'},
      {title:'复用成熟部件与可审计门禁',body:'复用 ADB、BlackHole 与 Gnirehtet，把工程精力放在跨端生命周期收口、秘密扫描与 114 项 Swift 宿主自动化测试。'}],
    scenarios:[{scenario:'会议与录音的输入选择',pain:'想用手边的 Android 拾音，又不想每次手动配置转发和音频路由。',outcome:'通过面板连接手机，再在 Mac 软件中选择虚拟声卡。实际可听与音质由使用环境验证。',mechanism:'AudioRecord → ADB / 局域网 → Mac → BlackHole。'},
      {scenario:'Mac 临时使用手机网络',pain:'需要通过数据线接入手机当前可共享的网络。',outcome:'使用 Android USB 网络共享，Mac 识别对应网络接口；是否可用受系统与设备支持影响。',mechanism:'Android Tethering / CDC-NCM 与 macOS 网络接口。'},
      {scenario:'把 Mac 网络送回手机',pain:'测试手机需要使用桌面侧网络，希望减少手工中继步骤。',outcome:'通过 USB 和 Android 本地 VPN 接口进行反向网络共享，无需 Root。',mechanism:'ADB reverse + Gnirehtet Java relay + VPNService。'}],
    workflow:[{step:'01',title:'先准备两端',description:'按公开版安装说明准备 Mac 应用、Android 客户端与 BlackHole 2ch。',detail:'先确认系统要求和未公证安装边界。'},
      {step:'02',title:'建立连接',description:'USB 模式需要数据线与手机调试授权；无线麦克风使用同一局域网配对。',detail:'USB 网络链路仍需要数据线，不随无线麦克风启用。'},
      {step:'03',title:'确认实际使用结果',description:'在 Mac 软件里选择音频输入，分别检查手机、接收与软件端的状态。',detail:'收到音频帧只是中间一步，听见声音还需要正确路由。'}],
    specs:[{label:'公开版本',value:'v4.0.18 / 2026-11-26（协议 v4 兼容 4.0.17 APK）'},{label:'系统',value:'macOS 26+ Apple Silicon / Android 8.0+'},{label:'USB 网络',value:'手机网络共享需兼容 Android 系统（文档建议 Android 11+）'},{label:'源码',value:'Swift / Kotlin / 第三方 Java relay'},{label:'音频链路',value:'USB ADB 或局域网分代连接池自动重连 / BlackHole 2ch'},{label:'发版与单测校验',value:'SHA256SUMS.txt 校验清单；macOS 侧 115/115 Swift 单测全绿'}],
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
    statusBadge:'v2.0.5 公开发布',statusTone:'release',latestVersion:'v2.0.5',releaseDate:'2026-11-26',
    availabilitySummary:'公开提供 v2.0.5 macOS 原生应用包（内置 ZJXDownloadCore.framework、Native Host 与 CLI）及同步升级的 Chrome MV3 扩展包（v2.0.5）。',
    availabilityNotice:'macOS 应用使用 Apple Development 签名，尚未完成公证。流媒体下载仅支持未加密的有限 TS media playlist，明确不支持 DRM、独立音轨拼接或无限直播流录制。',
    repoUrl:'https://github.com/xxkingstuggle/zjx-download',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.5',
    checksumsUrl:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.5/SHA256SUMS.txt',
    articleSlug:'zjx-download-native-architecture',articleTitle:'zjx-download 架构复盘：用 Swift 重写 macOS 原生多线程下载器与 Chrome Native Messaging 交接',
    icon:zjxDownloadIcon,screenshot:zjxDownloadShot,
    screenshotAlt:'zjx-download macOS 原生主窗口与分片进度面板',
    screenshotCaption:'zjx-download v2.0.5 macOS 原生主界面真实运行截图，支持按分类筛选、并发队列调度、分片级断点续传与 SHA-256 校验。',
    interfaceHeading:'分片进度与队列状态，一目了然。',
    galleryKicker:'NATIVE WORKFLOW · 原生交互细节',
    galleryHeading:'从浏览器捕获到原生分片落盘的完整闭环。',
    gallery:[
      {
        src:'/media/zjx-download/main-window.webp',
        width:1600,
        height:1046,
        alt:'zjx-download v2.0.4 macOS 原生主窗口与分片进度工作台',
        kicker:'01 · MULTI-SEGMENT WORKSPACE',
        title:'8 线程 HTTP Range 分片队列与实时吞吐仪表盘',
        caption:'主窗口左侧按任务状态与媒体类型分类检索，右侧实时渲染活跃任务的 8 分片并发进度条、已校验检查点（Verified Checkpoint）与单流回退状态。',
        mechanism:'ZJXDownloadCore 分片状态机 · StateStore 检查点原子持久化 · Loopback 15151 监听'
      },
      {
        src:'/media/zjx-download/task-complete.webp',
        width:1520,
        height:1066,
        cropMat:'dialog',
        alt:'zjx-download 下载完成弹窗与校验面板',
        kicker:'02 · VERIFICATION & HANDOFF',
        title:'完成即校验摘要，直达 Finder 或拖拽投递',
        caption:'全部 HTTP Range 分片合并落盘后，自动弹出原生完成面板。支持一键计算 SHA-256 / MD5 摘要核对发行包完整性，也可直接将上方文件图标拖拽至其他 macOS 应用继续处理。',
        mechanism:'分片原子合并 · 内置 SHA-256 / MD5 摘要核验 · 原生拖拽与 Finder 定位'
      }
    ],
    verifiedAt:'2026-11-26（v2.0.5 22/22 XCTest + 5/5 扩展单测、签名包与热重载回环验收全部通过并公开发布）',
    developmentVersion:'v2.0.5（分片落盘幂等清理、热更新 API、多 Cookie 保留、MV3 深浅色重塑与品牌归属）',
    installedVersion:'公开包 macOS v2.0.5 + Chrome MV3 扩展 v2.0.5（22+5 项单测全绿）',
    contribution:'我主导了 Swift/SwiftUI 原生客户端架构、分片断点续传状态机、Loopback 与 Native Messaging 通信层及 Chrome MV3 扩展重写。早期浏览器集成协议参考了 AmirHossein Abdolmotallebi 的开源项目并在许可中完整致谢。',
    limitations:['仅支持 HTTP/HTTPS 与未加密有限 HLS TS 媒体列表，不支持 DRM 流媒体或私有视频站点破解。','macOS 安装包暂未进行 Apple Notarization 公证，首次运行需在系统设置中放行。','跨站点重定向时的认证 Header 会按安全策略自动剥离，防止凭据泄露。'],
    sources:[
      {label:'v2.0.5 发行页与安装包',url:'https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.5'},
      {label:'安装与校验说明',url:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.5/INSTALL.md'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/zjx-download'},
      {label:'安装与使用账本',url:'https://github.com/xxkingstuggle/zjx-download/blob/main/INSTALL_LEDGER.md'}
    ],
    downloads:[
      {label:'macOS 原生应用包',platform:'macOS 26+ · Apple Silicon',version:'v2.0.5',size:'4.5 MB',format:'ZIP',url:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.5/zjx-download-2.0.5-macOS.zip',primary:true,note:'含 zjx-download.app、Native Messaging Host 与无头 CLI'},
      {label:'Chrome MV3 浏览器扩展',platform:'Chromium / Chrome 114+',version:'v2.0.5',size:'65 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/zjx-download/releases/download/v2.0.5/zjx-download-chrome-extension-2.0.5.zip',note:'解压后在 chrome://extensions 加载即可接管浏览器下载'}
    ],
    highlights:[
      {title:'分片级断点续传与崩溃幂等清理',body:'多连接 HTTP Range 分片与 HEAD→GET Range 回退探测统一写入序列化 StateStore；合并校验原子提交后再清理 range-parts 分片目录，断电不丢续传能力且零磁盘残留。'},
      {title:'Chrome MV3 双模重塑与 Native Messaging 交接',body:'扩展零 innerHTML 安全构建并适配深浅色，提供活跃下载迷你进度视图与快捷投递，保留多 Cookie 拼接并自动剥离跨域重定向凭据。'},
      {title:'无损热更新本机 API 与零空转功耗',body:'收敛 127.0.0.1 端口绑定并在切换鉴权/API Key 时保持监听 socket 不断连；拆离高频进度单元格并移除空转轮询，沙箱静置实测 CPU 0.00%。'},
      {title:'内置无头 CLI、摘要校验与无障碍适配',body:'随包提供 zjx-download-cli 支持终端脚本与退出码编排，内置 SHA-256/MD5 校验，完整适配 macOS Reduce Transparency 实色降级。'}
    ],
    scenarios:[
      {scenario:'大体积发行包与镜像下载',pain:'浏览器自带下载器偶发断流后无法恢复，且单连接吞吐受限。',outcome:'由 Chrome 扩展一键转交 zjx-download，按多连接分片拉取并持久化每个分片检查点。',mechanism:'HTTP Range 分片并发 + StateStore 检查点原子落盘。'},
      {scenario:'未返回 Content-Length 的动态流',pain:'部分服务端不响应 HEAD 或不返回总长度，传统分片器在暂停后会丢弃已下载部分。',outcome:'自动降级为单连接流式保留临时文件，恢复时携带已有字节偏移尝试续传。',mechanism:'Unprobed 单流临时文件保留与偏移对齐。'},
      {scenario:'夜间定时队列与脚本批量拉取',pain:'需要在指定时段自动开始/停止下载队列，或在脚本里无头执行并等待退出码。',outcome:'通过 QueueScheduler 触发定时事件，或使用 CLI 在下载完成时立即返回精确退出码。',mechanism:'QueueScheduler 定时器 + CLI 生命周期完成信号。'}
    ],
    workflow:[
      {step:'01',title:'安装桌面端与注册 Host',description:'解压 zjx-download.app 移入 /Applications，首次打开自动完成 Native Messaging 清单注册。',detail:'也可使用 scripts/manage-native-host 手动管理。'},
      {step:'02',title:'加载 Chrome MV3 扩展',description:'解压扩展包并在 chrome://extensions 开启开发者模式加载，弹窗即显示桌面端连接状态。',detail:'支持配置自动拦截的文件后缀与最小体积阈值。'},
      {step:'03',title:'分片下载与完成核验',description:'在主窗口查看实时分片进度、暂停恢复或执行 SHA-256 校验。',detail:'v2.0.5 已全量覆盖 22 项核心 XCTest + 5 项 MV3 扩展单测。'}
    ],
    specs:[
      {label:'公开版本',value:'v2.0.5 (build 20261126.1 / 2026-11-26)'},
      {label:'架构支持',value:'macOS Universal (arm64 + x86_64)'},
      {label:'核心框架',value:'Swift 6 · SwiftUI · ZJXDownloadCore.framework'},
      {label:'浏览器扩展',value:'Chrome Manifest V3 · Native Messaging'},
      {label:'自动化测试',value:'22 项 Swift Core XCTest + 5 项 MV3 扩展单测全绿'},
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
    statusBadge:'v1.3.2 公开发布',statusTone:'release',latestVersion:'v1.3.2',releaseDate:'2026-11-26',
    availabilitySummary:'公开提供 v1.3.2 Chrome MV3 扩展安装包（ZIP）与完整源码归档；包含 6 端零 innerHTML 视觉统一、流式缓冲释放、导出脱敏加固与 7 套共 32 项自动化测试。',
    availabilityNotice:'扩展仅在浏览器本地解析并展示请求与响应中的路由元数据，不上传任何对话内容，也不会修改、伪造或绕过任何服务端鉴权与安全挑战。',
    repoUrl:'https://github.com/xxkingstuggle/route-lens',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.2',
    checksumsUrl:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.2/SHA256SUMS.txt',
    articleSlug:'route-lens-chatgpt-routing-inspector',articleTitle:'Route Lens：在 Chrome MV3 中拦截并对照 ChatGPT 请求与响应的模型路由字段',
    icon:routeLensIcon,screenshot:routeLensShot,
    screenshotAlt:'Route Lens 在深色模式下展示右侧窄栏的模型路由对照信息',
    screenshotCaption:'Route Lens v1.3.2 真实运行预览：右侧 Shadow DOM 窄栏实时显示请求模型、响应报告模型、路由状态与时间戳，支持深浅色与几何尺寸自定义。',
    interfaceHeading:'请求与响应字段，同屏透明对照。',
    galleryKicker:'INTERFACE & CONTROLS · 观测栏与双语控制',
    galleryHeading:'不打断对话流，在窄栏与弹窗中掌控全部路由细节。',
    gallery:[
      {
        src:'/media/route-lens/rail-system-dark.webp',
        width:1600,
        height:1040,
        alt:'Route Lens 深色模式右侧窄栏与 SSE 路由字段实时对照',
        kicker:'01 · LIVE SSE ROUTING RAIL (DARK)',
        title:'深色工作区下的实时请求/响应模型对照窄栏',
        caption:'通过 Shadow DOM 在页面右侧挂载零样式污染的悬浮窄栏，实时展示当前会话的请求模型、SSE 响应模型、路由状态（显式降级或字段一致）与 PoW 时间戳。',
        mechanism:'Main World Fetch / SSE 钩子 · Isolated World 握手闸门 · Shadow DOM 隔离'
      },
      {
        src:'/media/route-lens/rail-default-light.webp',
        width:1600,
        height:1040,
        alt:'Route Lens 浅色模式右侧窄栏与多字段视图',
        kicker:'02 · DETERMINISTIC ROUTING VERDICT (LIGHT)',
        title:'四态路由一致性判定，拒绝盲猜模型',
        caption:'将请求体中的 target model 与 SSE 响应流中的 model_slug、server_model 等字段逐一比对，严格区分「字段一致」「显式路由转换」「服务端字段冲突」与「未报告字段」，绝不虚构未下发的模型名称。',
        mechanism:'Main World Fetch / SSE 钩子 · 四态一致性状态机 · Shadow DOM 样式隔离'
      },
      {
        src:'/media/route-lens/popup-zh-light.webp',
        width:360,
        height:740,
        alt:'Route Lens 中文浅色配置弹窗',
        kicker:'03 · BILINGUAL GEOMETRY & THEME POPUP',
        title:'中英双语与深浅色外观控制弹窗',
        caption:'在 360px 扩展弹窗中无级调节页面侧栏的宽度、高度、垂直位置、字号与背景不透明度，支持按需勾选显示字段并一键恢复默认几何外观；内置对称的中英双语字典与深浅色主题。',
        mechanism:'chrome.storage.local 实时同步 · 窄栏几何无级调节 · 中 / EN 双语即时切换',
        narrow:true,
        secondary:{
          src:'/media/route-lens/popup-en-dark.webp',
          width:360,
          height:740,
          alt:'Route Lens 英文深色配置弹窗',
          label:'English · Dark Mode'
        }
      }
    ],
    verifiedAt:'2026-11-26（v1.3.2 32/32 node:test 单测、10 语种对称校验与 6 端无头 Chrome 渲染验收通过并已公开发布）',
    developmentVersion:'v1.3.2（6 端零 innerHTML 统一、流缓冲释放、Abort 证据保留、导出脱敏与双品牌归属）',
    installedVersion:'Chrome MV3 v1.3.2 公开发行版（32/32 单测与 6 端渲染验收全绿）',
    contribution:'我独立完成了 Main World 握手与流解析钩子、模型路由一致性判定状态机、Shadow DOM 窄栏与中英双语 Popup 控制面板的架构、实现与测试。',
    limitations:['当服务端 SSE 响应未携带某项内部路由字段时，严格标记为“未报告/无法确认”，绝不猜测或虚构模型名称。','受 ChatGPT 前端接口结构演进影响，如上游更改 JSON/SSE 字段路径需同步更新解析器。'],
    sources:[
      {label:'v1.3.2 发行页与扩展包',url:'https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.2'},
      {label:'安装说明',url:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.2/INSTALL.md'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/route-lens'},
      {label:'维护与架构说明',url:'https://github.com/xxkingstuggle/route-lens/blob/main/MAINTENANCE.md'}
    ],
    downloads:[
      {label:'Chrome MV3 扩展安装包',platform:'Chrome / Edge / Brave (MV3)',version:'v1.3.2',size:'164 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.2/route-lens-1.3.2.zip',primary:true,note:'解压后在 chrome://extensions 加载即可使用'},
      {label:'完整源码与测试归档',platform:'Node.js 20+ · Chrome MV3',version:'v1.3.2',size:'1.1 MB',format:'ZIP',url:'https://github.com/xxkingstuggle/route-lens/releases/download/v1.3.2/route-lens-1.3.2-source.zip',note:'含 32 项自动化测试、静态安全门禁与 UI 验证脚本'}
    ],
    highlights:[
      {title:'零残留流式钩子与后台零唤醒',body:'Main World 钩子握手前零采集、隐藏标签页彻底停轮询；SSE 流解析在 finally 中强制释放克隆流缓冲，并在 Abort 中断时保留已到达的路由证据。'},
      {title:'严格的四态路由一致性判定',body:'将请求模型与响应中的多处模型字段逐一比对，精确区分“一致”“显式路由”“服务端字段冲突”与“字段缺失”，导出记录默认自动脱敏。'},
      {title:'6 端零 innerHTML 视觉统一与实时预览',body:'增量更新 Shadow DOM 窄栏与 popup / dashboard / options / appearance / onboarding / announcement 6 个界面全面禁用 innerHTML，外观页支持交互式迷你侧栏实时预览。'},
      {title:'32 项自动化单测与静态安全门禁',body:'7 套零依赖 node:test 套件覆盖流解析、Service Worker 并发与脱敏、侧栏生命周期，check.mjs 强校验零危险 DOM 注入与 10 语种字典完整性。'}
    ],
    scenarios:[
      {scenario:'核查模型是否发生静默回退',pain:'在 Web 端选择了高阶推理模型，但回复质量异常，无法凭肉眼判断后端是否实际路由到了轻量模型。',outcome:'在右侧窄栏直接查看本次请求的 requested model 与响应流实际返回的 model slug。',mechanism:'Main World fetch/SSE 旁路解析 + 字段一致性状态机。'},
      {scenario:'多轮对话路由历史追溯',pain:'同一会话中切换过模型或触发了工具调用，不清楚每一轮分别由哪个子模型响应。',outcome:'按消息轮次记录路由摘要，并在切换会话时自动隔离上下文，不串台。',mechanism:'会话上下文 ID 绑定与清空隔离机制。'},
      {scenario:'窄屏或分屏阅读时不遮挡正文',pain:'传统浮窗容易挡住代码块或输入框。',outcome:'通过 Popup 滑块自由收缩窄栏宽度、高度或折叠非核心字段。',mechanism:'Shadow DOM CSS 变量实时注入与外观独立重置。'}
    ],
    workflow:[
      {step:'01',title:'解压并加载扩展',description:'下载 route-lens-1.3.2.zip 解压，在 chrome://extensions 开启开发者模式加载。',detail:'仅申请 chatgpt.com 最小主机权限与 storage。'},
      {step:'02',title:'发起对话实时观测',description:'打开 ChatGPT 发送消息，右侧窄栏自动显示请求模型与响应流模型字段。',detail:'可在扩展弹窗随时暂停采集或清空当前记录。'},
      {step:'03',title:'按需定制窄栏外观',description:'在 Popup 切换中英语言、深浅色主题、窄栏尺寸与显示字段。',detail:'重置外观不会清除已保存的隐私与捕获开关设置。'}
    ],
    specs:[
      {label:'公开版本',value:'v1.3.2 / 2026-11-26'},
      {label:'扩展规范',value:'Chrome Manifest V3 (Main World + Isolated World)'},
      {label:'UI 隔离与安全',value:'Shadow DOM + 全仓零 innerHTML/eval 静态门禁'},
      {label:'国际化',value:'10 套 _locales 与 6 端 data-i18n 完整校验'},
      {label:'自动化测试',value:'7 套共 32 项 node:test 单测 + check.mjs 静态门禁全绿'},
      {label:'数据边界',value:'100% 本地内存与 chrome.storage.local · 导出默认脱敏'}
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
    statusBadge:'v2.5.0 公开发布',statusTone:'release',latestVersion:'v2.5.0',releaseDate:'2026-11-26',
    availabilitySummary:'公开提供 v2.5.0 Chrome MV3 扩展安装包（ZIP）与 SHA-256 校验清单；完整上线拟真 macOS 标题栏预览弹窗、抗 SPA 死循环引擎与 21 项零依赖单测套件。',
    availabilityNotice:'Tintpane 默认对所有普通浏览器标签页关闭，仅在用户显式启用且处于独立 PWA / 应用窗口（或显式允许的场景）时更新 theme-color。',
    repoUrl:'https://github.com/xxkingstuggle/tintpane',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/tintpane/releases/tag/v2.5.0',
    checksumsUrl:'https://github.com/xxkingstuggle/tintpane/releases/download/v2.5.0/SHA256SUMS.txt',
    articleSlug:'tintpane-chromium-pwa-theme-engine',articleTitle:'Tintpane 2.4：Chromium PWA 窗口动态主题色注入、域名树继承与双向别名同步',
    icon:tintpaneIcon,screenshot:tintpaneShot,
    screenshotAlt:'Tintpane v2.5.0 Chromium PWA 独立窗口动态标题栏取色与扩展控制面板实景',
    screenshotCaption:'Tintpane v2.5.0 真实运行预览：独立 Chromium PWA 窗口顶栏自动同步网页深色背景，右侧扩展 Popup 支持拟真标题栏预览、四路调色盘与站点预设。',
    interfaceHeading:'默认安静，启用即贴合。',
    galleryKicker:'EXTENSION & PWA WORKSPACE · 真实运行界面',
    galleryHeading:'按需动态注入，让每个独立 PWA 窗口拥有呼吸感标题栏。',
    gallery:[
      {
        src:'/media/tintpane/pwa-popup-workspace.webp',
        width:1600,
        height:1000,
        alt:'Tintpane v2.4.0 Chromium PWA 窗口与扩展 Popup 控制面板',
        kicker:'01 · STANDALONE PWA & POPUP ENGINE',
        title:'独立 PWA 窗口标题栏实时同步与域名树控制面板',
        caption:'仅在 display-mode: standalone 独立窗口或显式授权站点激活，实时采样页面顶栏计算色并注入 meta[name="theme-color"]；Popup 面板支持焦点/失焦双态配色与根域名层级继承。',
        mechanism:'chrome.scripting 动态注册 · 域名树向上回溯 · 焦点/失焦双态平滑过渡'
      },
      {
        src:'/media/tintpane/pwa-light-fixed.webp',
        width:1600,
        height:1000,
        alt:'Tintpane v2.4.0 浅色外观与固定颜色模式下的独立 PWA 窗口控制界面',
        kicker:'02 · FIXED PALETTE & LIGHT APPEARANCE',
        title:'浅色与固定颜色模式下的无白条沉浸式顶栏',
        caption:'支持「跟随系统」与「固定颜色」双模式切换；在浅色文档或知识库 PWA 中将标题栏锁定为暖白底色，彻底消除默认 Chromium 刺眼顶栏色差。',
        mechanism:'MutationObserver 节点守护 · 固定色值锁定 · 关闭开关即刻还原'
      }
    ],
    verifiedAt:'2026-11-26（v2.5.0 21/21 node:test 单测与静态检查全部通过并已公开发布）',
    developmentVersion:'v2.5.0（拟真标题栏预览弹窗 + 抗 SPA 覆盖熔断 + 21 项零依赖单测 + 品牌归属）',
    installedVersion:'Chrome MV3 v2.5.0 公开发行版',
    contribution:'我独立设计并实现了按需动态脚本注册机制、域名树配置继承算法、双向别名组同步及窗口焦点状态配色引擎。',
    limitations:['部分强制锁定 manifest theme_color 且不允许 DOM 覆盖的特殊内嵌页面可能受 Chromium 内核限制。','颜色自动采样依赖页面顶部固定栏或 body 计算背景色，全屏 Canvas/WebGL 页面建议使用手动指定颜色。'],
    sources:[
      {label:'v2.5.0 发行页与下载',url:'https://github.com/xxkingstuggle/tintpane/releases/tag/v2.5.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/tintpane'}
    ],
    downloads:[
      {label:'Tintpane Chrome MV3 扩展包',platform:'Chrome / Edge / Brave (MV3)',version:'v2.5.0',size:'30 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/tintpane/releases/download/v2.5.0/Tintpane-2.5.0.zip',primary:true,note:'公开发行版，解压后在 chrome://extensions 加载'}
    ],
    highlights:[
      {title:'按需动态注册与幂等防循环内核',body:'按启用域名动态注册脚本且全量 IIFE 封装防重入叠加；MutationObserver 内置重入锁与 1 秒速率熔断，既可毫秒级夺回 SPA 覆写的 theme-color，又杜绝死循环。'},
      {title:'域名树继承与公共后缀防护',body:'子域名自动沿域名树继承配置并支持单独覆写，2.5.0 分支修复 IPv4 误拆并屏蔽 co.uk / com.cn 等双标签公共后缀，结合双向别名组同步多域规则。'},
      {title:'拟真 macOS 双态标题栏预览弹窗',body:'2.5.0 弹窗内置红黄绿/失焦灰交通灯与 WCAG 对比度自适应预览卡、域名继承链胶囊与一键恢复继承、6 套深浅精选色板及已配置站点折叠管理区，pagehide 自动 flush 防丢写。'},
      {title:'跨窗口焦点同步与零依赖测试门禁',body:'通过 windows.onFocusChanged 精确同步多窗口 Focus/Blur 双态配色，关闭开关立即还原原生 theme-color；21 项零依赖 node:test 单测与静态检查守护全链路。'}
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
      {label:'公开版本',value:'v2.5.0 / 2026-11-26'},
      {label:'扩展架构',value:'Chrome Manifest V3 · Dynamic Content Scripts'},
      {label:'配置模型',value:'域名树前缀继承（含公共后缀防护）+ 双向别名同步'},
      {label:'窗口检测',value:'standalone / minimal-ui / window-controls-overlay'},
      {label:'自动化验证',value:'21 项零依赖 node:test 单测 + 静态检查与 Chromium DOM 对抗验收'},
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
    galleryKicker:'ROUTING ARCHITECTURE · 路由机制图解',
    galleryHeading:'从方法过载到按需发现的三层演进。',
    gallery:[
      {
        src:'/media/thought-navigator-v3/codex-routing-live.webp',
        width:1600,
        height:1040,
        alt:'思路导航 v3.0.1 Codex 插件三层按需路由与 25 个思考方法目录工作台',
        kicker:'01 · CODEX PLUGIN ROUTING WORKSPACE',
        title:'Codex CLI 实机按需路由与 25 个单文件 SKILL.md 目录',
        caption:'左侧展示 @thought-navigator 在 Codex 中识别架构重构冲突并按需加载 first-principles 与 steelman 两个专项 Skill 的三层路由链路；右侧展示 25 个高内聚思考方法与跳过边界。',
        mechanism:'Layer 1/2/3 渐进式上下文披露 · 1 主方法 + 1 辅助方法上限 · 显式跳过边界'
      },
      {
        src:'/media/thought-navigator-v3/01-method-overload.svg',
        width:1280,
        height:720,
        alt:'思考方法过载示意图',
        kicker:'02 · COGNITIVE FRICTION',
        title:'消除“先替 AI 选框架”的启动阻力',
        caption:'传统提示词库要求用户在提问前先从几十种思维模型中手工挑一个，把“解决具体问题”变成了“先研究工具分类”。思路导航将选方法的负担下沉到 Skill 路由层。',
        mechanism:'25 个结构化思考模型 · 任务信号触发 · 零前置记忆负担'
      },
      {
        src:'/media/thought-navigator-v3/02-routing-decision.svg',
        width:1280,
        height:720,
        alt:'双路径路由决策示意图',
        kicker:'03 · DUAL-PATH ROUTING & STOP RULES',
        title:'双路径按需发现与防空转停止边界',
        caption:'支持“模型按任务信号自主匹配专项 Skill”与“用户显式点名 @思路导航”两条路径。遇到写代码、查事实或缺乏外部证据的任务时直接执行，绝不强行套用思考框架。',
        mechanism:'正负向触发边界 · 1 主方法 + 可选 1 辅助方法上限 · 防空转停止条件'
      },
      {
        src:'/media/thought-navigator-v3/03-plugin-structure.svg',
        width:1280,
        height:720,
        alt:'Codex 插件目录结构图',
        kicker:'04 · PROGRESSIVE DISCLOSURE PACKAGING',
        title:'单文件 SKILL.md 内聚封装与按需加载',
        caption:'去除多层 references 嵌套，每个思考方法独立收敛为单个高密度 SKILL.md。宿主默认仅读取顶部简短元数据，只有命中当前任务时才按需加载对应正文。',
        mechanism:'Codex Plugin 标准清单 · 渐进式上下文披露 · 25 个独立 Skill 入口'
      }
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
    statusBadge:'v1.1.0 源码公开',statusTone:'source',
    latestVersion:'v1.1.0（开源源码版）',releaseDate:'2026-11-26',
    availabilitySummary:'GitHub 仓库已发布 v1.1.0 源码 Release，完整公开 SwiftUI、SwiftData、Mac Catalyst、WidgetKit 与加固版 Cloudflare Worker / Durable Objects 工程，可通过 Xcode 自行编译运行。',
    availabilityNotice:'项目以完整 Xcode 开源工程形式分发。远程快照服务（Cloudflare Worker / Durable Objects）为可选模块，未部署远端时仍可作为纯本地习惯打卡应用完整运行。',
    repoUrl:'https://github.com/xxkingstuggle/HabitBloom',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/HabitBloom/releases/tag/v1.1.0',
    articleSlug:'habitbloom-habit-tracker',articleTitle:'HabitBloom：从习惯卡片到可交互 Widget 的工程实践',
    icon:habitbloomIcon,screenshot:habitbloomShot,
    screenshotAlt:'HabitBloom 原生 SwiftUI 今日习惯打卡卡片、连续天数统计与 Widget 快照状态界面',
    screenshotCaption:'HabitBloom v1.1.0 原生运行界面：左侧为 SwiftData 习惯分类与 Cloudflare 快照同步状态，右侧为今日习惯打卡卡片、7 日火花线与完成率面板。',
    interfaceHeading:'从一张卡片开始。',
    galleryKicker:'NATIVE SWIFTUI & WIDGETKIT · 真实界面预览',
    galleryHeading:'本地 SwiftData 秒级打卡，跨进程快照实时同步。',
    gallery:[
      {
        src:'/media/habitbloom/today-habits.webp',
        width:800,
        height:1400,
        narrow:true,
        alt:'HabitBloom 今日习惯打卡卡片与连续记录仪表盘',
        kicker:'01 · TODAY HABIT CARDS & STREAKS',
        title:'SwiftUI 今日习惯卡片、连续打卡火花线与 Widget 快照状态',
        caption:'主界面展示当日待完成与已打卡习惯卡片、连续天数（Streak）及最近 7 天完成轨迹，每次点击即刻触发本地 SwiftData 事务并生成轻量 Widget 状态快照。',
        mechanism:'SwiftData @Model 本地持久化 · HabitStatsService 连续率计算 · WidgetSnapshotPayload'
      },
      {
        src:'/media/habitbloom/streak-calendar.webp',
        width:800,
        height:1400,
        narrow:true,
        alt:'HabitBloom 月度热力日历与 WidgetKit / Cloudflare 双通道快照面板',
        kicker:'02 · MONTH CALENDAR & DUAL-PATH SNAPSHOT',
        title:'月度打卡日历补记与 App Group / Cloudflare 双通道回并',
        caption:'支持按月回溯历史打卡网格与一键补记；右侧面板实时展示 iOS 17 AppIntent 交互小组件与 Cloudflare Durable Objects 远端快照的增量回并状态。',
        mechanism:'MonthCalendarView 历史补记 · App Group 共享容器 · Cloudflare DO 远端快照降级'
      }
    ],
    verifiedAt:'2026-11-26（v1.1.0 完成 Worker 安全门禁、SwiftData 回退容错、Mac Catalyst 桌面化与关于卡片，双平台编译与全部单测全绿并已发布）',
    developmentVersion:'v1.1.0 · SwiftUI + Mac Catalyst + WidgetKit + 加固版 Cloudflare Worker',
    installedVersion:'源码公开版 v1.1.0（Mac Catalyst 本地已签装验证，Core Smoke/Stress 与 Worker 5/5 单测全绿）',
    contribution:'我负责产品范围、交互取舍和客户端/Widget/Worker 数据路径的组织，使用 AI 工具协助开发与代码审查。源码里的第三方平台能力归 Apple、Cloudflare 所有；实际运行结果以构建、测试和真机核验为准。',
    limitations:[
      '当前以 Xcode 源码工程与 GitHub Release 源码包形式分发，暂未上架 App Store。',
      '采用本地 SwiftData 优先 + 远端轻量快照合并架构，不包含重型多端 CRDT 实时冲突解决界面。',
      'Widget 刷新频率遵循 iOS WidgetKit 系统时间线预算，在应用启动与小组件交互时触发增量回并。'
    ],
    sources:[
      {label:'v1.1.0 源码 Release',url:'https://github.com/xxkingstuggle/HabitBloom/releases/tag/v1.1.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/HabitBloom'},
      {label:'工程实践文章',url:'/posts/habitbloom-habit-tracker/'}
    ],
    downloads:[],
    highlights:[
      {title:'卡片式日常打卡与 Mac Catalyst 桌面化',body:'提供实时所见即所得卡片编辑、零习惯快捷模板、有界 NSCache 贴纸解码缓存与完整无障碍降级；Mac Catalyst 支持 1080pt 居中双栏网格、右键菜单及 ⌘N / ⌘1–⌘3 快捷键。'},
      {title:'交互式 Widget 与跨午夜双通道仲裁',body:'WidgetKit 覆盖单习惯/多习惯/摘要三种尺寸并支持跨午夜翻篇；主应用按单习惯 updatedAt 仲裁本地队列与远端快照，SwiftData 落盘成功后再清理队列，杜绝打卡丢失。'},
      {title:'加固版 Cloudflare Worker 与备份差异预览',body:'Worker 强制常量时间 Bearer 鉴权、剥离伪造内部头、校验 JPEG 魔数并清理孤儿图片；本地与云端共享同日 (habitID, normalizedDay) 去重模型，导入前提供可视化差异与冲突预览面板。'},
      {title:'全栈自动化测试与免费签名最小权限',body:'严守免费个人证书最小权限（零 CloudKit/Push entitlement）；覆盖 HabitCore Smoke/Stress、Worker 5 组安全并发单测及 iOS / Mac Catalyst 双平台编译。'}
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
      {label:'自动化检查',value:'HabitCore Smoke & Stress + Worker 5 组安全并发单测 + iOS/Mac Catalyst 双平台编译'},
      {label:'开源状态',value:'Public (MIT License) · v1.1.0 已发布'},
      {label:'分发状态',value:'提供完整 Xcode 源码工程；暂未分发签名 IPA'}
    ],
    faq:[
      {question:'现在可以直接克隆 HabitBloom 的源码了吗？',answer:'可以。仓库已完成凭据隔离审计并转为 Public（MIT 许可），克隆后参考 INSTALL.md 与 SECRETS.example.md 即可在 Xcode 编译。'},
      {question:'为什么有云端功能，却不能叫实时同步？',answer:'远程部分实现 HTTP 快照与轻量文字备份。WidgetKit 刷新、离线操作和多设备冲突仍受限制，不能保证实时一致。'},
      {question:'不部署 Cloudflare Worker 后端能正常使用吗？',answer:'完全可以。HabitBloom 采用本地优先架构，习惯卡片、打卡记录、统计与 App Group 小组件均基于本地 SwiftData 独立运行；远端 Worker 仅在侧载环境 App Group 受限或需要跨端轻量备份时按需启用。'}
    ]
  },
  {
    slug:'dim-wallpaper',name:'DimWallpaper',category:'macOS 原生菜单栏工具 · 壁纸压暗与专注遮罩',
    tagline:'不改壁纸与硬件参数，提供壁纸压暗与类 HazeOver 后台专注遮罩，支持菜单栏与 Dock 精细分条压暗',
    headline:'压暗刺眼壁纸，也把视线聚焦回当前窗口。',
    summary:'DimWallpaper 是用纯 Swift + AppKit + SwiftUI 编写的零依赖 macOS 原生菜单栏工具。既能在 CGWindowLevelForKey(.desktopWindow) + 1 夹缝为每块显示器挂载全穿透壁纸压暗层（保留桌面图标 100% 原亮，5%–80% 无级调节与色温滤镜），也在主干新增了独立「专注遮罩模式（Focus Mode，类 HazeOver）」：保留当前前台应用或最前单窗高亮，柔和压暗后台窗口，并支持独立控制顶部菜单栏与 Dock 零重叠分条压暗、双全局热键与原生毛玻璃控制中心，全程无需录屏或辅助功能权限。',
    platforms:['macOS 13.0+ · Apple Silicon'],platformsLabel:'macOS · AppKit',
    statusBadge:'v2.0.0 公开发布',statusTone:'release',latestVersion:'v2.0.0',releaseDate:'2026-11-26',
    availabilitySummary:'公开提供 v2.0.0 macOS 应用压缩包（ZIP）、SHA-256 校验清单与 MIT 开源仓库；完整内置壁纸压暗、Focus Mode v2 专注遮罩、3 档双屏策略（默认每屏保留最前窗口）、全屏视频豁免与零渗黑菜单栏/Dock 分条压暗。',
    availabilityNotice:'应用采用本地 ad-hoc 签名（未公证），首次打开如遇系统拦截可在「系统设置 → 隐私与安全性」中点击仍要打开。',
    repoUrl:'https://github.com/xxkingstuggle/dim-wallpaper',repoVisibility:'public',
    releasesUrl:'https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v2.0.0',
    checksumsUrl:'https://github.com/xxkingstuggle/dim-wallpaper/releases/download/v2.0.0/SHA256SUMS.txt',
    articleSlug:'dim-wallpaper-macos-desktop-overlay',articleTitle:'DimWallpaper：从桌面壁纸黑纱到类 HazeOver 专注遮罩与菜单栏/Dock 零重叠压暗',
    icon:dimWallpaperIcon,screenshot:dimWallpaperShot,
    screenshotAlt:'DimWallpaper v2.0.0 macOS 菜单栏控制面板与壁纸压暗/专注遮罩实景对比',
    screenshotCaption:'DimWallpaper v2.0.0 真实运行预览：支持壁纸压暗与类 HazeOver 专注遮罩双引擎、每屏保留最前窗口双屏策略、全屏视频自动豁免与桌面图标 100% 原亮保留。',
    interfaceHeading:'只压暗壁纸，不遮挡桌面图标。',
    galleryKicker:'MENUBAR & CGWINDOWLEVEL · 原生图层控制',
    galleryHeading:'卡在壁纸与桌面图标之间的 68 KB 原生薄纱。',
    gallery:[
      {
        src:'/media/dim-wallpaper/menubar-overlay-split.webp',
        width:1600,
        height:1000,
        alt:'DimWallpaper 深色模式下的 macOS 菜单栏状态面板与 40% 壁纸调暗效果',
        kicker:'01 · DARK MODE MENUBAR & OVERLAY',
        title:'深色模式自动生效：5%–80% 无级调暗与桌面图标原亮保留',
        caption:'右上角菜单栏面板提供「启用壁纸调暗」「仅在深色模式下生效」与 5%–80% 连续滑块；遮罩精准压暗底层壁纸，Finder 桌面文件夹图标与标签依然保持 100% 原始清晰度。',
        mechanism:'CGWindowLevelForKey(.desktopWindow) + 1 · NSApp.effectiveAppearance KVO · 0.18s 渐变'
      },
      {
        src:'/media/dim-wallpaper/menubar-light-mode.webp',
        width:1600,
        height:1000,
        alt:'DimWallpaper 浅色模式下的 macOS 菜单栏控制面板与全天候手动调暗视图',
        kicker:'02 · LIGHT APPEARANCE & ALWAYS-ON DIMMING',
        title:'浅色与全天候模式：跨空间常驻与多显示器同步',
        caption:'取消勾选「仅在深色模式下生效」即可在浅色外观下独立压暗高对比壁纸；监听显示器热插拔与系统休眠唤醒通知，自动对齐每块屏幕的物理边界。',
        mechanism:'ignoresMouseEvents = true · .canJoinAllSpaces · didChangeScreenParameters 热插拔重建'
      }
    ],
    verifiedAt:'2026-11-26（v2.0.0 23/23 Swift 核心单测与双屏 WindowServer 动态实测通过并公开发布：零重叠菜单栏截断、台前调度退场、全屏视频豁免与空闲 CPU 0.0%）',
    developmentVersion:'v2.0.0（壁纸调暗 + Focus Mode v2 + 3 档多屏策略 + 全屏视频豁免 + 菜单栏/Dock 零重叠压暗）',
    installedVersion:'macOS arm64 v2.0.0 常驻验证通过（空闲 CPU 0.0%）',
    contribution:'我独立完成了 CGWindowLevel 桌面图层方案、专注遮罩精确 Z 序锚定与菜单栏/Dock 零重叠几何分割、SwiftUI/AppKit 毛玻璃控制中心、双 Carbon 全局热键及 SMAppService 登录项管理。',
    limitations:[
      '对标准 .desktopWindow 层壁纸及常规应用窗口均可无损压暗，不调用硬件 Gamma/亮度 API 且无需录屏或辅助功能权限；高于 .desktopIconWindow 的自定义桌面挂件与系统通知中心保持可见不遮挡。'
    ],
    sources:[
      {label:'v2.0.0 发行页与安装包',url:'https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v2.0.0'},
      {label:'GitHub 开源仓库',url:'https://github.com/xxkingstuggle/dim-wallpaper'}
    ],
    downloads:[
      {label:'DimWallpaper macOS 应用包',platform:'macOS 13+ · Apple Silicon',version:'v2.0.0',size:'606 KB',format:'ZIP',url:'https://github.com/xxkingstuggle/dim-wallpaper/releases/download/v2.0.0/DimWallpaper-2.0.0-macOS.zip',primary:true,note:'解压后将 DimWallpaper.app 拖入应用程序即可'}
    ],
    highlights:[
      {title:'壁纸压暗 + 后台专注遮罩双层沉浸',body:'壁纸层固定在 .desktopWindow + 1 保留桌面图标原亮；主干新增专注遮罩层（Focus Mode），按只读窗口栈精确锚定当前前台应用窗口组或最前单窗下方，两者可独立或叠加使用。'},
      {title:'菜单栏与 Dock 零重叠分条压暗',body:'默认保留系统栏原色；开启压暗时按 screen.frame 与 visibleFrame 将主遮罩、菜单栏条（statusBar + 1）与底/左/右 Dock 条（dock + 1）无重叠切割，并自动扣减伸入 Dock 的前台窗轮廓。'},
      {title:'原生毛玻璃控制中心与双全局热键',body:'左键弹出三标签页毛玻璃 NSPopover（双层实时预览、色温滤镜、逐屏豁免与前台应用一键豁免），右键保留极速菜单；内置零权限 Carbon 双热键（⌃⌥⌘D 壁纸 / ⌃⌥⌘F 专注）。'},
      {title:'零显存常驻与多屏拓扑自愈',body:'暂停、浅色待命或命中豁免应用时自动 orderOut 释放 WindowServer 合成缓冲；响应热插拔、休眠唤醒与空间切换，双屏常驻实测空闲 CPU 0.0%。'}
    ],
    scenarios:[
      {scenario:'夜间深色模式柔和压暗亮色壁纸',pain:'喜欢白天的亮色风景壁纸，但切到深色模式后壁纸边缘刺眼，又不想把桌面文件夹图标一起蒙灰。',outcome:'开启「仅在深色模式下生效」并搭配暖夜/深蓝夜滤镜，壁纸自动压暗而桌面文件与图标保持 100% 原始清晰度。',mechanism:'CGWindowLevelForKey(.desktopWindow) + 1 + NSApp.effectiveAppearance KVO。'},
      {scenario:'多窗口与双屏写作/编码时聚焦当前窗口',pain:'同时开着聊天、浏览器与编辑器，旁边亮晃晃的后台窗口、顶部菜单栏和 Dock 不断抢走注意力。',outcome:'按下 ⌃⌥⌘F 开启专注遮罩，仅保留前台应用或最前单窗原亮，后台窗口与可选的菜单栏/Dock 一并柔和压暗。',mechanism:'CGWindowListCopyWindowInfo 只读 Z 序锚定 + 菜单栏/Dock 无重叠几何分割。'},
      {scenario:'按屏幕或按应用灵活放行与零成本还原',pain:'修图或看色准参考时副屏不能压暗，或在打开取色器、演示工具时需要临时跳过专注遮罩。',outcome:'在控制中心逐屏豁免指定显示器，或一键将当前外部前台应用加入豁免名单；关闭后自动卸载遮罩零残影。',mechanism:'CGDirectDisplayID 逐屏豁免 + 前台应用自进程保活 + orderOut 释放。'}
    ],
    workflow:[
      {step:'01',title:'启动菜单栏应用',description:'运行 DimWallpaper.app 后常驻右上角菜单栏（LSUIElement，不占 Dock），图标直观区分壁纸压暗、仅专注与双重沉浸状态。',detail:'支持 --status / --status-json 命令行诊断与 --defaults-suite 沙箱隔离。'},
      {step:'02',title:'组合壁纸调暗与专注遮罩',description:'左键打开毛玻璃控制中心调节壁纸强度/色温/逐屏开关，或在「专注遮罩」页配置聚焦粒度、菜单栏/Dock 压暗与应用豁免。',detail:'右键菜单与全局热键（⌃⌥⌘D / ⌃⌥⌘F）均可一键切换。'},
      {step:'03',title:'开机自启与零空转待命',description:'开启「登录时启动」由 macOS 原生 SMAppService.mainApp 托管；暂停或浅色待命时自动卸载遮罩释放显存。',detail:'不改壁纸源文件，也不修改硬件显示 Gamma。'}
    ],
    specs:[
      {label:'公开版本',value:'v2.0.0 / 2026-11-26'},
      {label:'技术栈',value:'Swift 6 · AppKit · SwiftUI · CoreGraphics · Carbon · SMAppService'},
      {label:'窗口层级',value:'壁纸 desktopWindow+1 · 专注精确 Z 序 · 菜单栏 statusBar+1 / Dock dock+1'},
      {label:'权限与硬件边界',value:'零录屏权限 · 零辅助功能权限 · 零硬件 Gamma/色表修改'},
      {label:'自动化与动态验证',value:'23/23 Swift 核心单测 · 双屏 WindowServer 零重叠/全屏豁免实测 · 空闲 CPU 0.0%'},
      {label:'系统要求与许可',value:'macOS 13.0+ (Ventura 及以上) · MIT License'}
    ],
    faq:[
      {question:'开启压暗后，会影响我在桌面上拖拽框选文件或右键新建文件夹吗？',answer:'完全不会。壁纸遮罩与专注遮罩窗口全部开启 ignoresMouseEvents = true 且不抢占键盘焦点，所有点击、框选、滚动和系统下拉菜单都会原样穿透。'},
      {question:'专注遮罩（Focus Mode）是如何做到不盖住前台窗口、也不需要录屏或辅助功能权限的？',answer:'通过只读 CGWindowListCopyWindowInfo 识别标准前台窗口栈并用 NSWindow.order(.below, relativeTo:) 把专注遮罩精准插到前台窗口正下方；菜单栏与 Dock 采用基于 screen.frame 与 visibleFrame 的零重叠分条压暗（statusBar+1 / dock+1），全程不采集屏幕像素也不拦截输入事件。'},
      {question:'为什么桌面图标没有一起变暗？暂停或外接屏热插拔后会留残影或占显存吗？',answer:'桌面背景（.desktopWindow）与桌面图标（.desktopIconWindow）位于相邻但独立的窗口层级，壁纸遮罩精准插在两者之间；暂停、浅色待命或命中豁免应用时会自动 orderOut 释放 WindowServer 缓冲，拔插显示器也会按最新屏幕拓扑自动对齐。'}
    ]
  },
  {
    slug:'framelit',name:'FrameLit',category:'macOS 原生窗口管理器 · 坐标网格与诊断架构',
    tagline:'基于 Swift 与 Accessibility API 的 macOS 窗口布局引擎，支持 6×3 至 48×24 网格编排',
    headline:'用精确的坐标网格与快捷键，重排桌面上的每一扇窗。',
    summary:'FrameLit 是一个用纯 Swift 与 AppKit / Accessibility API 实现的 macOS 窗口管理器工程。它支持半屏、三分屏、四分屏、中心聚焦及跨显示器投送等丰富布局指令，内置可调节精度的 Custom Layout Canvas（6×3 至 48×24 坐标网格编辑器），并配备了 10MiB 自动轮转、零主线程阻塞且自动剥离敏感路径的异步诊断日志系统。',
    platforms:['macOS 14+ · Apple Silicon & Intel','Swift · AppKit · AXUIElement'],platformsLabel:'macOS · Swift · Accessibility',
    statusBadge:'v0.2.0 私有工程案例',statusTone:'source',latestVersion:'v0.2.0（本地工程版）',releaseDate:'2026-11-26',
    availabilitySummary:'当前作为 macOS 窗口布局算法、自定义网格编辑器与原生 UI 重构的工程案例展示。因早期兼容性研究涉及第三方二进制资源比对，按开源合规原则（PROVENANCE.md）保持仓库私有，不分发二进制安装包。',
    availabilityNotice:'本项目全部 77 项图标与视觉资产已由原创生成式图稿替换，Swift 源码为独立实现；但在彻底完成历史非图像资源（如本地化词条与命令表）的 clean-room 替换前，仅展示架构设计与界面重构成果。',
    repoUrl:'https://github.com/xxkingstuggle/FrameLift',repoVisibility:'private',
    articleSlug:'framelit-macos-window-manager',articleTitle:'FrameLit：macOS 原生窗口管理器的坐标网格编辑器与无阻塞诊断日志设计',
    icon:framelitIcon,screenshot:framelitShot,
    screenshotAlt:'FrameLit 深色模式下的窗口布局指令与自定义坐标网格编辑器界面',
    screenshotCaption:'FrameLit v1.3 窗口指令面板与 Custom Layout Canvas（6×3 至 48×24 坐标网格编辑器）深色模式界面。',
    interfaceHeading:'从预设分屏到自由网格，像素级对齐。',
    galleryKicker:'INTERFACE & GRID ENGINE · 原生网格工作台',
    galleryHeading:'把复杂的窗口坐标计算，收进直观的原生面板。',
    gallery:[
      {
        src:'/media/framelit/commands-dark.webp',
        width:1760,
        height:1400,
        alt:'FrameLit 深色模式下的窗口布局命令列表与 6x3 至 48x24 坐标网格编辑器',
        kicker:'01 · COMMANDS & GRID WORKSPACE',
        title:'窗口布局命令列表与 6×3 至 48×24 坐标网格编辑器',
        caption:'左侧集中管理横向与纵向分屏命令、快捷键绑定与菜单栏显示开关，右侧内嵌可实时拖拽缩放的目标区域网格画布，支持 6×3 至 48×24 五档网格密度切换。',
        mechanism:'Normalized Grid Rect · 6 档刻度吸附反馈 · 实时百分比与网格坐标读数'
      },
      {
        src:'/media/framelit/prefs-dark.webp',
        width:1760,
        height:1400,
        alt:'FrameLit 深色模式偏好设置面板',
        kicker:'02 · PREFERENCES, GAPS & SAFE AREAS',
        title:'窗口边距、Dock / 菜单栏安全区与偏好同步控制',
        caption:'在原生设置面板中集中配置菜单栏/Dock 图标显隐、开机自启、窗口点距（pt）留白、避开 Dock 与菜单栏安全区以及 iCloud 配置同步，并完整适配浅/深色与 Reduce Transparency。',
        mechanism:'NSScreen.visibleFrame 安全区扣除 · AX 超时护栏 · 零空转事件驱动'
      },
      {
        src:'/media/framelit/commands-light.webp',
        width:1760,
        height:1400,
        alt:'FrameLit 浅色模式指令面板与网格画布',
        kicker:'03 · SEMANTIC LIGHT & DARK TOKENS',
        title:'语义化深浅双主题与 77 项重绘矢量图标',
        caption:'基于统一的色彩与表面语义 Token 构建浅色与深色双套原生外观，配合自动化图稿管线生成的 77 项 1x/2x 布局指令图标，确保网格标尺与快捷键徽章在任意光照下清晰锐利。',
        mechanism:'AppKit Semantic Appearance · prepare_artwork.swift 资产管线 · 1x/2x Template Glyphs'
      },
      {
        src:'/media/framelit/states-dark.webp',
        width:1600,
        height:1183,
        alt:'FrameLit 48x24 放大网格编辑器独立视图',
        kicker:'04 · ENLARGED 48×24 GRID EDITOR',
        title:'48×24 放大编辑画布与命令页实时双向同步',
        caption:'点击「放大编辑」即可展开高密度 48×24 全幅坐标网格，支持拖动移动、边缘吸附缩放与空白处重新框选绘制，所有修改即时同步回命令列表。',
        mechanism:'48×24 高精度网格吸附 · 归一化分数坐标 · 即时持久化'
      }
    ],
    verifiedAt:'2026-11-26（v0.2.0 880×700 顶栏重塑、13 组回归套件全绿、AX 超时与零空转加固、浅/深色 AppKit 视觉快照验收通过；遵守 PROVENANCE 保持私有）',
    developmentVersion:'v0.2.0 · Swift 原生实现 + 880×700 顶栏导航重塑 + 13 组回归套件 + 77 项重绘视觉资产',
    installedVersion:'本地验证通过（空闲 CPU 0.0%）；遵守 PROVENANCE 合规边界暂不公开分发',
    contribution:'我完成了 Swift 窗口几何计算引擎、Custom Layout Canvas 网格编辑器、深浅色 UI 系统重构、77 项原创图标资产管线（prepare_artwork.swift）以及异步轮转脱敏诊断日志模块的设计与实现。',
    limitations:['依据仓库 docs/PROVENANCE.md 的合规门禁，在完成全部历史 plist / 本地化资源清理与 Git 历史剥离前，不对外开放仓库或提供 DMG 下载。','部分拒绝响应标准 AXUIElement Size/Position 写操作的非标全屏游戏窗口不支持强制缩放。'],
    sources:[
      {label:'架构与工程复盘文章',url:'/posts/framelit-macos-window-manager/'},
      {label:'软件与工具总览',url:'/software/'}
    ],
    downloads:[],
    highlights:[
      {title:'6×3 至 48×24 自定义坐标网格画布',body:'突破固定二分/三分屏限制，允许用户在可视化网格画布上框选任意比例矩形，并映射为归一化浮点坐标（Normalized Rect）绑定全局快捷键。'},
      {title:'AX 超时护栏、零空转与跨屏安全区避让',body:'精确扣除 Menu Bar、Dock 与刘海安全区，统一设置 AXUIElement 通信超时防卡死，彻底消除后台定时空转（实测空闲 CPU 0.0%），且快捷键布局后手动拖动窗口绝不回弹。'},
      {title:'零主线程阻塞的 10MiB 轮转脱敏日志',body:'诊断日志在独立后台串行队列落盘，单文件上限 5MiB（双文件 10MiB 自动轮转），写入前自动遮盖用户主目录与窗口私密标题。'},
      {title:'原生 AppKit 无障碍精修与 13 组回归门禁',body:'自研浅/深色自适应导航胶囊、全键帽冲突保护快捷键录制器与 77 项原创 1x/2x 图稿管线，由 13 组 Swift 回归套件与中英双语键门禁持续守护。'}
    ],
    scenarios:[
      {scenario:'超宽带鱼屏的非对称工作区划分',pain:'标准左半屏/右半屏在 34 寸超宽屏上过宽，而固定三分屏又不够放主编辑器。',outcome:'在 24×12 网格上自定义“中置 55% 主编辑器 + 两侧各 22.5% 终端与文档”，一键对齐。',mechanism:'Normalized Grid Rect -> NSScreen.visibleFrame 仿射映射 -> AXUIElementSetAttributeValue。'},
      {scenario:'排查特定第三方应用窗口无法吸附',pain:'部分 Electron 或自定义标题栏窗口在缩放后位置偏移，但同步打日志会拖慢拖拽帧率。',outcome:'开启异步诊断日志记录 AX Position -> Size -> Position 三步补偿前后坐标，不掉帧且不泄露隐私标题。',mechanism:'DispatchQueue.utility 异步追加 + 5MiB×2 轮转 + 路径脱敏。'},
      {scenario:'双显示器快捷键瞬移窗口',pain:'用鼠标把窗口从笔记本内屏拖到外接 4K 显示器再对齐非常费时。',outcome:'按下跨屏投送快捷键，窗口自动投送到下一块显示器并按目标屏幕比例保持相对布局。',mechanism:'NSScreen 拓扑环路查找与比例重映射。'}
    ],
    workflow:[
      {step:'01',title:'授予辅助功能（Accessibility）权限',description:'通过引导面板检查 AXIsProcessTrustedWithOptions，授权应用读写窗口几何属性。',detail:'权限变更时自动刷新状态，无需重启应用。'},
      {step:'02',title:'使用预设分屏或绘制自定义网格',description:'在 Commands 面板启用常用半屏/三分屏，或在 Custom Canvas 上框选专属网格比例。',detail:'实时检测快捷键冲突并高亮提示。'},
      {step:'03',title:'执行三步坐标补偿对齐',description:'触发快捷键或菜单栏命令时，按 Position → Size → Position 顺序写入 AX 属性，消除跨屏缩放偏差。',detail:'对被排除应用名单自动跳过干预，布局后手动拖动不回弹。'}
    ],
    specs:[
      {label:'工程版本',value:'v0.2.0 (build 12 · 本地验证构建 · 空闲 CPU 0.0%)'},
      {label:'核心技术',value:'Swift · AppKit · ApplicationServices (AXUIElement)'},
      {label:'网格精度',value:'支持 6×3、12×6、24×12、48×24 四档归一化网格'},
      {label:'日志配额',value:'2 × 5 MiB（总上限 10 MiB 后台异步轮转 + 隐私脱敏）'},
      {label:'回归与资产',value:'13 组 Swift 回归套件全绿 · 77 项原创 1x/2x 图稿与双语校验'},
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
