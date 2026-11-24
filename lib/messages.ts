import type { Locale } from './locale';
import type { PoemFontId } from './poem-fonts';
import type { ThemeId } from './theme';
import type { MasteryLevel } from './prisma-client';

// The interface text in each language. `zh` defines the shape and `en` is
// typed by it, so a key missing from either is a type error. Entries that
// include a number or a name are functions; English plurals are handled
// inside them.

const num = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) =>
  `${num(n)} ${n === 1 ? one : many}`;

const zh = {
  brand: '唐诗博览',
  description: '阅读、收藏、背诵全唐诗',
  common: {
    loading: '加载中...',
    retry: '重试',
    actionFailed: '操作失败，请重试',
    explore: '去探索',
    unverifiedLimit: (max: number) => `（未验证用户上限：${max} 首）`,
  },
  nav: {
    about: '关于',
    font: '字体',
    theme: '外观',
    favorites: '收藏',
    memorization: '背诵',
    login: '登录',
    signup: '注册',
    myFavorites: '我的收藏',
    logout: '退出登录',
    menu: '菜单',
  },
  fonts: {
    noto: '思源宋体',
    cactus: '仙人掌明体',
    wenkai: '霞鹜文楷',
    mashanzheng: '马善政楷书',
    longcang: '龙藏行书',
  } satisfies Record<PoemFontId, string>,
  themes: {
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
  } satisfies Record<ThemeId, string>,
  search: {
    placeholder: '搜索诗词标题或内容...',
    clear: '清除',
    submit: '搜索',
  },
  home: {
    loadingFilters: '加载筛选器...',
    poets: '诗人',
    tags: '标签',
    selected: (n: number) => `已选 ${n}`,
    collapse: '收起 ▲',
    expand: '展开 ▼',
    searchLabel: (query: string) => `搜索 "${query}"`,
    nameSeparator: '、',
    results: (label: string, total: number) =>
      `${label} · 共 ${num(total)} 首，按知名度排序`,
    recommended: '为您推荐名篇佳作',
    noResults: '没有找到符合条件的诗词',
    noResultsHint: '请尝试调整筛选条件',
  },
  feed: {
    end: '已经到底了',
    loadFailed: '加载失败，点击重试',
  },
  favorite: {
    add: '收藏',
    saved: '已收藏',
    remove: '取消收藏',
    savedBy: (n: number) => `${num(n)} 人收藏`,
    limitReached: (count: number, max: number) =>
      `您已收藏 ${count} 首诗词（未验证用户上限：${max} 首）\n\n是否前往验证邮箱？`,
  },
  memorize: {
    add: '背诵',
    active: '背诵中',
    addTitle: '加入背诵列表',
    removeTitle: '移出背诵列表',
    limitReached: (count: number, max: number) =>
      `您已添加 ${count} 首诗词到背诵列表（未验证用户上限：${max} 首）\n\n是否前往验证邮箱？`,
  },
  mastery: {
    NEW: '新增',
    LEARNING: '学习中',
    YOUNG: '熟悉',
    MATURE: '掌握',
    MASTERED: '精通',
  } satisfies Record<MasteryLevel, string>,
  poem: {
    original: '原文',
    translation: '译文',
    commentary: '赏析',
    background: '背景',
    tags: '标签',
  },
  poet: {
    introduction: '简介',
    showMore: '显示更多',
    showLess: '收起',
    works: '代表作品',
    workCount: (n: number) => `共 ${n} 首${n >= 10 ? '（显示前10首）' : ''}`,
    noWorks: '暂无收录作品',
  },
  favorites: {
    title: '我的收藏',
    count: (n: number) => `您已收藏 ${n} 首诗词`,
    limitTitle: '即将达到收藏上限',
    limitBody: (left: number) =>
      `您还可以收藏 ${left} 首诗词。验证邮箱即可解锁无限收藏！`,
    empty: '您还没有收藏任何诗词',
    emptyHint: '去探索页面发现喜欢的诗词吧',
  },
  memorization: {
    title: '我的背诵',
    count: (n: number) => `共 ${n} 首诗词`,
    limitTitle: '即将达到背诵上限',
    limitBody: (left: number) =>
      `您还可以添加 ${left} 首诗词到背诵列表。验证邮箱即可解锁无限背诵！`,
    levels: '掌握程度',
    due: '待复习',
    emptyLevel: '这一等级还没有诗词',
    noneDue: '今天没有需要复习的诗词。到期的诗词会出现在这里。',
    empty: '您还没有添加任何诗词到背诵列表',
    emptyHint: '去探索页面发现想要背诵的诗词吧',
  },
  practice: {
    loadFailed: '加载失败，请重试',
    submitFailed: '提交失败，请重试',
    doneTitle: '太棒了！',
    doneBody: '您已完成所有今日复习',
    reviewedTotal: (n: number) => `本次共复习 ${n} 首诗词`,
    backToList: '返回背诵列表',
    keepExploring: '继续探索',
    back: '返回',
    reviewedSoFar: (n: number) => `已复习 ${n} 首`,
    recallPrompt: '请尝试回忆这首诗词的内容',
    showAnswer: '显示答案',
    totalReviews: '复习次数',
    correctReviews: '正确次数',
    accuracy: '正确率',
    howWell: '您的掌握程度如何？',
    grades: {
      again: { label: '再来一次', hint: '<1天' },
      hard: { label: '困难', hint: '较短' },
      good: { label: '良好', hint: '适中' },
      easy: { label: '简单', hint: '较长' },
    },
  },
  auth: {
    email: '邮箱',
    password: '密码',
    unexpectedError: '发生意外错误，请重试',
    loginTitle: '登录',
    loggingIn: '登录中...',
    loginFailed: '登录失败',
    passwordPlaceholder: '请输入密码',
    noAccount: '还没有账号?',
    signupNow: '立即注册',
    signupTitle: '注册账号',
    signingUp: '注册中...',
    signupFailed: '注册失败',
    name: '用户名 (可选)',
    namePlaceholder: '张三',
    passwordHint: '至少 6 个字符',
    haveAccount: '已有账号?',
    loginNow: '立即登录',
  },
  verify: {
    missingToken: '缺少验证令牌',
    failed: '验证失败',
    error: '验证过程中出错，请稍后重试',
    verifying: '验证中...',
    verifyingBody: '正在验证您的邮箱，请稍候',
    successTitle: '验证成功！',
    successBody: '邮箱验证成功！',
    redirecting: '3秒后将自动跳转到首页...',
    homeNow: '立即返回首页',
    home: '返回首页',
    signupAgain: '重新注册',
  },
  banner: {
    title: '请验证您的邮箱',
    sentBefore: '我们已向 ',
    sentAfter: ' 发送了验证邮件',
    resent: '验证邮件已重新发送！请检查您的邮箱。',
    resendFailed: '发送失败，请稍后重试',
    sending: '发送中...',
    resend: '重新发送',
    close: '关闭',
  },
  about: {
    metaTitle: '关于 · 唐诗博览',
    title: '关于唐诗博览',
    intro: (poems: number, poets: number, tags: number) =>
      `唐诗博览收录《全唐诗》中的 ${num(poems)} 首诗、${num(poets)} 位诗人，可以按 ${tags} 个主题浏览、搜索、收藏，并用间隔重复的方法背诵。`,
    rankingTitle: '推荐与排序',
    ranking:
      '每首诗有一个知名度分数，依据它是否入选《唐诗三百首》等经典选本，以及在古诗文网上受到的关注。首页的推荐从最知名的作品开始，同一档次内随机排列；选择主题后，诗按知名度从高到低排列。',
    memorizeTitle: '背诵',
    memorize:
      '加入背诵的诗会按遗忘规律安排复习：记得越牢，下次复习隔得越久。有诗到期时，我们会发邮件提醒。',
    startMemorizing: '开始背诵',
    fontsTitle: '字体',
    fonts: (names: string[]) =>
      `诗文可以用以下字体显示，在页面顶部的“字体”中切换：${names.join('、')}。书法字体收字较少，缺少的字会用霞鹜文楷显示。`,
  },
};

export type Messages = typeof zh;

const en: Messages = {
  brand: 'Tang Poetry Explorer',
  description: 'Read, save and memorize the Complete Tang Poems',
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    actionFailed: 'Something went wrong. Please try again.',
    explore: 'Explore poems',
    unverifiedLimit: (max: number) =>
      `(up to ${plural(max, 'poem', 'poems')} until you verify your email)`,
  },
  nav: {
    about: 'About',
    font: 'Font',
    theme: 'Theme',
    favorites: 'Saved',
    memorization: 'Memorize',
    login: 'Log in',
    signup: 'Sign up',
    myFavorites: 'My saved poems',
    logout: 'Log out',
    menu: 'Menu',
  },
  fonts: {
    noto: 'Noto Serif SC',
    cactus: 'Cactus Classical Serif',
    wenkai: 'LXGW WenKai',
    mashanzheng: 'Ma Shan Zheng',
    longcang: 'Long Cang',
  },
  themes: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  search: {
    // The poems are in Chinese, so the search is too.
    placeholder: 'Search in Chinese, e.g. 李白',
    clear: 'Clear',
    submit: 'Search',
  },
  home: {
    loadingFilters: 'Loading filters…',
    poets: 'Poets',
    tags: 'Tags',
    selected: (n: number) => `${n} selected`,
    collapse: 'Hide ▲',
    expand: 'Show ▼',
    searchLabel: (query: string) => `Search “${query}”`,
    nameSeparator: ', ',
    results: (label: string, total: number) =>
      `${label} · ${plural(total, 'poem', 'poems')}, best known first`,
    recommended: 'Recommended classics',
    noResults: 'No poems match',
    noResultsHint: 'Try changing the filters',
  },
  feed: {
    end: "That's all of them",
    loadFailed: "Couldn't load more. Click to retry",
  },
  favorite: {
    add: 'Save',
    saved: 'Saved',
    remove: 'Remove from saved',
    savedBy: (n: number) => `Saved by ${plural(n, 'reader', 'readers')}`,
    limitReached: (count: number, max: number) =>
      `You've saved ${plural(count, 'poem', 'poems')}, the limit until you verify your email (${max}).\n\nVerify your email now?`,
  },
  memorize: {
    add: 'Memorize',
    active: 'Memorizing',
    addTitle: 'Add to your memorization list',
    removeTitle: 'Remove from your memorization list',
    limitReached: (count: number, max: number) =>
      `You're memorizing ${plural(count, 'poem', 'poems')}, the limit until you verify your email (${max}).\n\nVerify your email now?`,
  },
  mastery: {
    NEW: 'New',
    LEARNING: 'Learning',
    YOUNG: 'Familiar',
    MATURE: 'Known',
    MASTERED: 'Mastered',
  },
  poem: {
    original: 'Poem',
    translation: 'Translation',
    commentary: 'Commentary',
    background: 'Notes',
    tags: 'Tags',
  },
  poet: {
    introduction: 'Biography',
    showMore: 'Show more',
    showLess: 'Show less',
    works: 'Best-known poems',
    workCount: (n: number) => (n >= 10 ? 'Top 10' : plural(n, 'poem', 'poems')),
    noWorks: 'No poems in the collection',
  },
  favorites: {
    title: 'Saved poems',
    count: (n: number) => `You've saved ${plural(n, 'poem', 'poems')}`,
    limitTitle: 'Almost at the limit',
    limitBody: (left: number) =>
      `You can save ${plural(left, 'more poem', 'more poems')}. Verify your email to save as many as you like.`,
    empty: "You haven't saved any poems yet",
    emptyHint: 'Find poems you like on the home page',
  },
  memorization: {
    title: 'Memorization',
    count: (n: number) => plural(n, 'poem', 'poems'),
    limitTitle: 'Almost at the limit',
    limitBody: (left: number) =>
      `You can add ${plural(left, 'more poem', 'more poems')}. Verify your email to memorize as many as you like.`,
    levels: 'Mastery',
    due: 'Due',
    emptyLevel: 'No poems at this level yet',
    noneDue: 'Nothing is due today. Poems appear here when their review is due.',
    empty: "You haven't added any poems to memorize yet",
    emptyHint: 'Find poems to learn on the home page',
  },
  practice: {
    loadFailed: "Couldn't load the next review. Please try again.",
    submitFailed: "Couldn't save your answer. Please try again.",
    doneTitle: 'All done!',
    doneBody: "You've finished today's reviews",
    reviewedTotal: (n: number) =>
      `${plural(n, 'poem', 'poems')} reviewed this session`,
    backToList: 'Back to memorization',
    keepExploring: 'Keep exploring',
    back: 'Back',
    reviewedSoFar: (n: number) => `${num(n)} reviewed`,
    recallPrompt: 'Try to recite the poem from memory',
    showAnswer: 'Show poem',
    totalReviews: 'Reviews',
    correctReviews: 'Correct',
    accuracy: 'Accuracy',
    howWell: 'How well did you remember it?',
    grades: {
      again: { label: 'Again', hint: '<1 day' },
      hard: { label: 'Hard', hint: 'Shorter' },
      good: { label: 'Good', hint: 'Normal' },
      easy: { label: 'Easy', hint: 'Longer' },
    },
  },
  auth: {
    email: 'Email',
    password: 'Password',
    unexpectedError: 'Something went wrong. Please try again.',
    loginTitle: 'Log in',
    loggingIn: 'Logging in…',
    loginFailed: "Couldn't log in",
    passwordPlaceholder: 'Your password',
    noAccount: "Don't have an account?",
    signupNow: 'Sign up',
    signupTitle: 'Create an account',
    signingUp: 'Signing up…',
    signupFailed: "Couldn't sign up",
    name: 'Name (optional)',
    namePlaceholder: 'Jane Doe',
    passwordHint: 'At least 6 characters',
    haveAccount: 'Already have an account?',
    loginNow: 'Log in',
  },
  verify: {
    missingToken: 'The verification link is missing its token',
    failed: 'Verification failed',
    error: 'Something went wrong while verifying. Please try again later.',
    verifying: 'Verifying…',
    verifyingBody: 'Checking your verification link',
    successTitle: 'Email verified!',
    successBody: 'Your email address is verified.',
    redirecting: 'Taking you to the home page in 3 seconds…',
    homeNow: 'Go to the home page',
    home: 'Home page',
    signupAgain: 'Sign up again',
  },
  banner: {
    title: 'Please verify your email',
    sentBefore: 'we sent a verification link to ',
    sentAfter: '',
    resent: 'Verification email sent again. Please check your inbox.',
    resendFailed: "Couldn't send the email. Please try again later.",
    sending: 'Sending…',
    resend: 'Resend',
    close: 'Close',
  },
  about: {
    metaTitle: 'About · Tang Poetry Explorer',
    title: 'About Tang Poetry Explorer',
    intro: (poems: number, poets: number, tags: number) =>
      `Tang Poetry Explorer holds all ${num(poems)} poems by ${num(poets)} poets in the Complete Tang Poems (全唐诗). Browse them by ${tags} tags, search them, save your favorites, and learn them by heart with spaced repetition.`,
    rankingTitle: 'Recommendations and ranking',
    ranking:
      'Every poem has a fame score, based on whether classic anthologies such as Three Hundred Tang Poems (唐诗三百首) include it and how much attention it gets on gushiwen.cn. The home page recommends the best-known poems first, shuffled within each level of fame; with filters selected, poems are sorted from best known to least.',
    memorizeTitle: 'Memorization',
    memorize:
      "Poems you memorize are scheduled for review by spaced repetition: the better you remember a poem, the longer until you see it again. When a poem is due, you'll get an email reminder.",
    startMemorizing: 'Start memorizing',
    fontsTitle: 'Fonts',
    fonts: (names: string[]) =>
      `Poems can be shown in these typefaces, chosen from Font at the top of the page: ${names.join(', ')}. The calligraphy fonts have fewer characters; any they lack are shown in LXGW WenKai.`,
  },
};

export const MESSAGES: Record<Locale, Messages> = { zh, en };
