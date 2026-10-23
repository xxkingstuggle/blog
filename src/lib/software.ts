import type { ImageMetadata } from 'astro';
import usblinkmicIcon from '../assets/projects/usblinkmic-icon.png';
import usblinkmicShot from '../assets/projects/usblinkmic-mac.png';
import habitbloomIcon from '../assets/projects/habitbloom-icon.png';
import habitbloomShot from '../assets/projects/habitbloom-cover.png';

export interface SoftwareDownloadItem {
	label: string;
	platform: string;
	version: string;
	size: string;
	format: string;
	url: string;
	primary?: boolean;
	note?: string;
}

export interface SoftwareWorkflowStep {
	step: string;
	title: string;
	description: string;
	detail: string;
}

export interface SoftwareScenario {
	scenario: string;
	pain: string;
	outcome: string;
	mechanism: string;
}

export interface SoftwareSpecItem {
	label: string;
	value: string;
}

export interface SoftwareProduct {
	slug: 'usblinkmic' | 'habitbloom';
	name: string;
	tagline: string;
	headline: string;
	summary: string;
	category: string;
	platforms: string[];
	platformsLabel: string;
	statusBadge: string;
	statusTone: 'release' | 'source';
	latestVersion: string;
	releaseDate: string;
	availabilitySummary: string;
	availabilityNotice: string;
	repoUrl: string;
	repoVisibility: 'public' | 'private';
	releasesUrl?: string;
	checksumsUrl?: string;
	articleSlug: string;
	articleTitle: string;
	icon: ImageMetadata;
	screenshot: ImageMetadata;
	screenshotAlt: string;
	screenshotCaption: string;
	downloads: SoftwareDownloadItem[];
	highlights: Array<{ title: string; body: string }>;
	scenarios: SoftwareScenario[];
	workflow: SoftwareWorkflowStep[];
	specs: SoftwareSpecItem[];
	faq: Array<{ question: string; answer: string }>;
}

export const SOFTWARE_PRODUCTS: SoftwareProduct[] = [
	{
		slug: 'usblinkmic',
		name: 'USBLinkMic',
		tagline: '一根数据线或同一局域网，把 Android 手机变成 Mac 的低延迟麦克风与双向网络桥',
		headline: '让手边的 Android 手机，直接接管 Mac 的拾音与应急网络。',
		summary:
			'USBLinkMic 是一套由 macOS 菜单栏状态机与 Android 原生端协同工作的跨设备桥接工具。它把「手机麦克风到 Mac 虚拟声卡」「手机 5G/热点网络通过 USB 共享给 Mac」「Mac 有线网络反向通过 USB 给手机」收敛进同一个面板，不依赖云端中转，并针对长时间通话、锁屏与插拔恢复做了自愈设计。',
		category: '跨设备音频与网络工具',
		platforms: ['macOS 26+ (Apple Silicon)', 'Android 8.0+'],
		platformsLabel: 'macOS · Android',
		statusBadge: 'v4.0.8 正式版可下载',
		statusTone: 'release',
		latestVersion: 'v4.0.8',
		releaseDate: '2026-10-17',
		availabilitySummary: '提供 macOS 安装包（DMG / ZIP）与配套 Android 客户端（APK）公开下载。',
		availabilityNotice:
			'当前公开版本为 v4.0.8。macOS 端需搭配 BlackHole 2ch 虚拟声卡以将手机音频注入系统输入设备；USB 链路需开启手机「USB 调试」，无线麦克风模式支持同一局域网下扫码或粘贴配对码直连。',
		repoUrl: 'https://github.com/xxkingstuggle/usblinkmic',
		repoVisibility: 'public',
		releasesUrl: 'https://github.com/xxkingstuggle/usblinkmic/releases/tag/v4.0.8',
		checksumsUrl: 'https://github.com/xxkingstuggle/usblinkmic/releases/download/v4.0.8/SHA256SUMS.txt',
		articleSlug: 'usblinkmic-android-mac-bridge',
		articleTitle: 'USBLinkMic：用一根数据线，把 Android 手机变成 Mac 的麦克风和网卡',
		icon: usblinkmicIcon,
		screenshot: usblinkmicShot,
		screenshotAlt: 'USBLinkMic macOS 控制面板与设备就绪检查界面',
		screenshotCaption: 'USBLinkMic macOS 端界面：在一个窗口内检查 ADB、虚拟声卡与手机端状态，直接切换麦克风与双向网络链路。',
		downloads: [
			{
				label: '下载 macOS 安装包 (.dmg)',
				platform: 'macOS 26+ (Apple Silicon)',
				version: 'v4.0.8',
				size: '34.9 MB',
				format: 'DMG',
				url: 'https://github.com/xxkingstuggle/usblinkmic/releases/download/v4.0.8/USBLinkMic-4.0.8-public.dmg',
				primary: true,
				note: '推荐 macOS 用户下载，拖入 Applications 即可使用',
			},
			{
				label: '下载 Android 客户端 (.apk)',
				platform: 'Android 8.0+',
				version: 'v4.0.8',
				size: '11.4 MB',
				format: 'APK',
				url: 'https://github.com/xxkingstuggle/usblinkmic/releases/download/v4.0.8/USBLinkMic-4.0.8-review.4.apk',
				primary: true,
				note: '安装到 Android 手机，提供麦克风采集与 VPN 反向网络接口',
			},
			{
				label: 'macOS 便携压缩包 (.zip)',
				platform: 'macOS 26+ (Apple Silicon)',
				version: 'v4.0.8',
				size: '31.7 MB',
				format: 'ZIP',
				url: 'https://github.com/xxkingstuggle/usblinkmic/releases/download/v4.0.8/USBLinkMic-4.0.8-public-macOS.zip',
				note: '适合直接解压运行或脚本化部署',
			},
		],
		highlights: [
			{
				title: '手机麦克风 → Mac 虚拟声卡（USB / 无线双模）',
				body: 'Android 端通过 AudioRecord 采集 48kHz / 16-bit PCM 音频，经由 USB ADB 端口转发或局域网配对传回 Mac，并注入 BlackHole 2ch，供会议软件、录音软件和语音输入直接选用。',
			},
			{
				title: '手机网络 → Mac（USB 共享网络）',
				body: '外出或会场 Wi-Fi 拥堵时，通过 USB CDC-NCM 将手机蜂窝网络直接作为 Mac 的有线网卡接入，一边供电一边保持稳定低抖动连接。',
			},
			{
				title: 'Mac 网络 → 手机（免 Root USB 反向共享）',
				body: '在桌面内网、抓包联调或弱移动信号室内，将 Mac 当前网络经由内置 Rust 转发器与 Android VPNService 反向桥接给手机，无需 Root。',
			},
			{
				title: '面向真实桌面现场的自愈状态机',
				body: '内置高采样率重采样、4ms 交叉淡入淡出防爆音、无锁环形缓冲与断线自动退避重连，拔线、息屏或声卡切回后无需重启整套软件。',
			},
		],
		scenarios: [
			{
				scenario: '桌面外接显示器办公 / 线上会议',
				pain: 'MacBook 合盖外接显示器后内置麦克风被遮挡，桌面蓝牙耳机切入通话模式又会导致全系统音质跌落。',
				outcome: '把放在桌面的 Android 手机作为高信噪比指向性麦克风接入 Mac，耳机继续保持高音质立体声输出。',
				mechanism: '48kHz/16-bit 单声道 PCM 帧 + 序列号与 CRC16 校验，经 ADB forward 或局域网直连进入 BlackHole 2ch。',
			},
			{
				scenario: '差旅、会场与咖啡馆弱网救急',
				pain: '公共 Wi-Fi 高丢包，而普通无线个人热点在信道拥挤时耗电快、延迟跳变明显。',
				outcome: '插上 USB 数据线即可让 Mac 走手机 5G 网络，同时给手机补电，连接稳定度接近有线以太网。',
				mechanism: '基于 Android USB 网络共享（CDC-NCM）与 macOS 网络接口状态自动探测。',
			},
			{
				scenario: '移动端联调与桌面网络共享给手机',
				pain: '开发机连着稳定有线网或特定代理环境，但测试手机在室内信号弱、配置无线代理繁琐。',
				outcome: '一键开启「Mac 网络给手机」，手机流量直接走 USB 线经由 Mac 出口访问网络。',
				mechanism: '打包内置 gnirehtet Rust relay 守护进程 + Android 端本地 VPNService 虚拟网卡。',
			},
		],
		workflow: [
			{
				step: '01',
				title: '安装双端应用与虚拟声卡',
				description: '在 Mac 安装 USBLinkMic.app 与 BlackHole 2ch，在手机安装配套 APK。',
				detail: '首次打开时，应用顶部的准备就绪卡片会逐项核对虚拟声卡、ADB 工具与手机连接状态。',
			},
			{
				step: '02',
				title: '选择 USB 数据线或无线局域网连接',
				description: '插上开启了 USB 调试的手机，或在同一 Wi-Fi 下使用配对码/二维码无线连接麦克风。',
				detail: 'v4.0.8 同时支持有线低延迟链路与免插线的无线麦克风会客模式。',
			},
			{
				step: '03',
				title: '按需开启麦克风或网络方向',
				description: '点击对应卡片开关，在系统声音输入中选择 BlackHole 2ch 即可开始说话或联网。',
				detail: '支持开机自启、断线自动重连、实时电平表监控与一键导出脱敏诊断日志。',
			},
		],
		specs: [
			{ label: '当前版本', value: 'v4.0.8（2026-10-17 发布）' },
			{ label: 'macOS 系统要求', value: 'macOS 26+（Apple Silicon arm64）' },
			{ label: 'Android 系统要求', value: 'Android 8.0+（USB 共享网络需 Android 11+）' },
			{ label: '音频规格', value: '48kHz / 16-bit / 单声道 PCM，20ms 分帧 + CRC16' },
			{ label: '连接方式', value: 'USB (ADB / CDC-NCM / VPNService) + 局域网无线麦克风' },
			{ label: '开源许可与源码', value: 'GitHub 公开仓库（SwiftUI + Kotlin + Rust Relay）' },
		],
		faq: [
			{
				question: '为什么麦克风功能需要配合 BlackHole 2ch？',
				answer: 'macOS 对内核级音频驱动有严格签名限制。复用成熟的开源虚拟声卡 BlackHole 2ch，可以让 USBLinkMic 专注于跨设备传输与重采样缓冲，避免在系统里塞入不透明的私有音频驱动。',
			},
			{
				question: '没有数据线的时候能只用麦克风吗？',
				answer: '可以。v4.0.8 支持局域网无线麦克风模式：当 Mac 和 Android 手机在同一 Wi-Fi 下，可通过配对码或扫码直接建立音频流。双向 USB 网络共享则仍需连接数据线。',
			},
			{
				question: '安装包提示未公证或无法直接打开怎么办？',
				answer: '当前公开构建使用本地开发者签名。首次打开如遇系统拦截，可在「系统设置 → 隐私与安全性」中点击「仍要打开」，或在终端对 `/Applications/USBLinkMic.app` 执行 `xattr -cr`。',
			},
		],
	},
	{
		slug: 'habitbloom',
		name: 'HabitBloom',
		tagline: '把每天的小习惯放进一张愿意点开的卡片，在 iPhone、iPad 与 Mac 桌面安静同步',
		headline: '去掉打卡系统的喧哗，只留下一张每天顺手点亮的习惯卡片。',
		summary:
			'HabitBloom 是一款用 SwiftUI 与 SwiftData 构建的跨苹果设备习惯记录应用。它用单页网格、月度日历与心情记录取代复杂的连胜惩罚机制，并通过自研的 Cloudflare Workers + Durable Objects 远端快照方案，解决了个人免费签名（Sideload）环境下桌面 Widget 与多端状态无法同步的痛点。',
		category: '日常习惯与桌面小组件',
		platforms: ['iOS', 'iPadOS', 'macOS (Mac Catalyst)'],
		platformsLabel: 'iPhone · iPad · Mac',
		statusBadge: '源码自编译 · 个人自用迭代中',
		statusTone: 'source',
		latestVersion: '内部演进版',
		releaseDate: '2026-09-19',
		availabilitySummary: '目前以 Xcode 本地签名与 Sideload 方式在作者自己的设备上长期运行，暂未提供公开安装包。',
		availabilityNotice:
			'诚实说明：HabitBloom 旨在验证个人免费签名下的多端同步与 Widget 刷新架构，目前尚未上架 App Store 或打包公开 IPA/DMG。你可以在详情页与工程文章中查看完整的界面设计、SwiftData 建模与 Cloudflare 同步实现。',
		repoUrl: 'https://github.com/xxkingstuggle/HabitBloom',
		repoVisibility: 'private',
		articleSlug: 'habitbloom-habit-tracker',
		articleTitle: 'HabitBloom：把每天的小习惯，放进一张愿意点开的卡片',
		icon: habitbloomIcon,
		screenshot: habitbloomShot,
		screenshotAlt: 'HabitBloom 在 iPhone 与 iPad 上的习惯卡片、日历与统计界面',
		screenshotCaption: 'HabitBloom 真实运行界面：柔和的暖色卡片层级，将今日打卡、月度热力日历与轻量心情记录收束在同一屏。',
		downloads: [],
		highlights: [
			{
				title: '无压迫感的卡片式每日打卡',
				body: '打开应用第一眼只展示今天需要完成的习惯卡片与进度环。没有红点轰炸、排行榜或断签焦虑，点一下即可完成记录。',
			},
			{
				title: '月度日历回看与轻量心情批注',
				body: '每次打卡可顺手附上当天的心情与简短备注；在月历视图中按天回看时，能看清习惯起伏背后的生活脉络。',
			},
			{
				title: '突破免费签名限制的桌面 Widget 同步',
				body: '针对个人免费 Apple ID 无法使用 App Group / CloudKit 的限制，设计了「本地文件降级 + Cloudflare 远端快照」双轨链路，让桌面小组件依然能实时反映打卡进度。',
			},
			{
				title: 'iPhone · iPad · Mac 三端同源体验',
				body: '基于 SwiftUI 与 SwiftData 单一代码库适配 iOS、iPadOS 分栏与 Mac Catalyst 桌面窗口，多设备通过 WebSocket 与版本快照保持最终一致。',
			},
		],
		scenarios: [
			{
				scenario: '早晚例行小事的快速确认',
				pain: '功能繁重的效率软件打开需要先过启动页、切标签、填表单，记录成本比习惯本身还高。',
				outcome: '在桌面小组件看到今日剩余习惯，点进卡片一秒完成勾选，立刻回到原本的生活节奏。',
				mechanism: 'SwiftUI 轻量视图层级 + WidgetKit 定时拉取最新聚合快照。',
			},
			{
				scenario: '在 iPhone、iPad 与 Mac 之间无缝切换',
				pain: '白天在 Mac 前工作、晚上用 iPhone 睡前复盘，如果只在单机存储，记录很快就会割裂。',
				outcome: '任意设备修改习惯或打卡后，其他在线设备通过 WebSocket 实时收到同步通知并合并本地状态。',
				mechanism: 'Cloudflare Workers + Durable Objects 维护房间级快照与乐观锁版本号。',
			},
			{
				scenario: '不想为自用小工具每年交平台税',
				pain: 'Apple Developer Program 每年 99 美元；而不付费的个人免费签名会被剥夺 CloudKit 与跨进程 App Group 权限。',
				outcome: '零平台年费即可在自己的多台苹果设备上跑通多端同步与桌面 Widget 展示。',
				mechanism: '将主应用聚合好的轻量 Widget 快照推送到个人边缘节点，由小组件独立读取。',
			},
		],
		workflow: [
			{
				step: '01',
				title: '建立低摩擦的习惯卡片',
				description: '为每个习惯设定图标、色彩与周期，首页自动聚合成清爽的今日待办网格。',
				detail: '刻意克制配置项，避免把时间花在「装修任务管理器」上。',
			},
			{
				step: '02',
				title: '随手记录打卡与当下心情',
				description: '点击卡片完成今日打卡，可选记录心情状态与一句简短备注。',
				detail: '所有改动优先写入本地 SwiftData，离线状态下同样即时响应。',
			},
			{
				step: '03',
				title: '边缘节点同步到多端与桌面小组件',
				description: '后台自动将全量快照与 Widget 摘要同步至 Cloudflare Durable Objects。',
				detail: '即使在免费签名环境下，iPhone、iPad、Mac 与桌面小组件也能保持一致。',
			},
		],
		specs: [
			{ label: '当前状态', value: '个人自用与持续演进（Xcode 本地签名安装）' },
			{ label: '支持平台', value: 'iOS · iPadOS · macOS (Mac Catalyst)' },
			{ label: '客户端技术栈', value: 'SwiftUI + SwiftData + WidgetKit' },
			{ label: '同步后端', value: 'Cloudflare Workers + Durable Objects + WebSocket' },
			{ label: '离线能力', value: '本地优先存储，网络恢复后基于版本号自动合并' },
			{ label: '配套工程手记', value: '已公开完整设计取舍与免费签名突围方案' },
		],
		faq: [
			{
				question: '为什么页面上没有提供 HabitBloom 的直接下载安装包？',
				answer: '因为 HabitBloom 目前使用作者个人的免费 Apple ID 签名运行，未上架 App Store，也未签发可通用的企业/公证分发包。我们坚持只提供真实可用的安装包，不放失效链接或虚假下载按钮。',
			},
			{
				question: '如果想参考它的免费签名 Widget 同步方案，可以从哪里了解？',
				answer: '可以直接阅读配套工程文章《HabitBloom：把每天的小习惯，放进一张愿意点开的卡片》，文中详细记录了 App Group 受限原因、Cloudflare Workers + Durable Objects 同步协议以及离线冲突处理。',
			},
		],
	},
];

export function getSoftwareBySlug(slug: string): SoftwareProduct | undefined {
	return SOFTWARE_PRODUCTS.find((product) => product.slug === slug);
}

export function getSoftwareByArticleSlug(articleSlug: string): SoftwareProduct | undefined {
	return SOFTWARE_PRODUCTS.find((product) => product.articleSlug === articleSlug);
}
