import { Settings } from "../../js/Settings.js";

export const SUPPORTED_LANGUAGES = Object.freeze(["ja", "en", "zh-Hans"]);

const STRINGS = {
  "common.back": { ja: "もどる", en: "Back", "zh-Hans": "返回" },
  "common.on": { ja: "オン", en: "On", "zh-Hans": "开启" },
  "common.off": { ja: "オフ", en: "Off", "zh-Hans": "关闭" },
  "common.next": { ja: "つぎへ ›", en: "Next ›", "zh-Hans": "下一步 ›" },
  "common.retry": { ja: "もういちど", en: "Try again", "zh-Hans": "再试一次" },
  "common.close": { ja: "閉じる", en: "Close", "zh-Hans": "关闭" },
  "common.cancel": { ja: "やめる", en: "Cancel", "zh-Hans": "取消" },
  "common.settings": { ja: "せってい", en: "Settings", "zh-Hans": "设置" },
  "common.child": { ja: "こども", en: "Child", "zh-Hans": "孩子" },
  "common.parent": { ja: "おうちのひと", en: "Parent", "zh-Hans": "家长" },
  "common.book": { ja: "えほん", en: "Picture books", "zh-Hans": "绘本" },
  "common.memories": { ja: "おもいで", en: "Memories", "zh-Hans": "回忆" },
  "common.bookmarks": { ja: "しおり", en: "Bookmarks", "zh-Hans": "书签" },
  "common.done": { ja: "できたよ！", en: "Done!", "zh-Hans": "完成了！" },
  "common.completed": { ja: "クリア！", en: "Complete!", "zh-Hans": "完成！" },

  "mode.ask": { ja: "だれと はじめる？", en: "Who will start?", "zh-Hans": "和谁一起开始？" },
  "mode.firstTime": { ja: "？ はじめてのかたへ", en: "? First time here?", "zh-Hans": "？第一次使用？" },
  "home.title": { ja: "なにして あそぶ？", en: "What shall we play?", "zh-Hans": "想玩什么？" },
  "home.howToPlay": { ja: "？ あそびかた", en: "? How to play", "zh-Hans": "？玩法" },
  "home.dailyMission": { ja: "きょうの ミッション", en: "Today's mission", "zh-Hans": "今天的任务" },
  "home.tryIt": { ja: "やってみる ›", en: "Try it ›", "zh-Hans": "试试看 ›" },
  "home.avatar": { ja: "じぶん", en: "Me", "zh-Hans": "我" },

  "select.title": { ja: "どの えほんを よむ？", en: "Which book shall we read?", "zh-Hans": "想读哪本绘本？" },
  "select.memories": { ja: "おもいで", en: "Memories", "zh-Hans": "回忆" },
  "select.activity": { ja: "活動履歴", en: "Activity history", "zh-Hans": "活动记录" },
  "select.analysis": { ja: "子どもの特性分析", en: "Child profile", "zh-Hans": "孩子特性分析" },
  "select.guide": { ja: "操作方法", en: "How it works", "zh-Hans": "操作方法" },
  "select.loading": { ja: "読み込み中…", en: "Loading…", "zh-Hans": "加载中…" },
  "select.resume": { ja: "つづきから", en: "Continue", "zh-Hans": "继续" },
  "select.restart": { ja: "はじめから", en: "Start over", "zh-Hans": "从头开始" },
  "select.ghost": { ja: "おたのしみに", en: "Coming soon", "zh-Hans": "敬请期待" },

  "story.previous": { ja: "‹ まえ", en: "‹ Previous", "zh-Hans": "‹ 上一页" },
  "story.finish": { ja: "つぎへ ›", en: "Next ›", "zh-Hans": "下一步 ›" },
  "story.addBookmark": { ja: "しおりに追加", en: "Add bookmark", "zh-Hans": "添加书签" },
  "story.removeBookmark": { ja: "しおりをはずす", en: "Remove bookmark", "zh-Hans": "移除书签" },
  "story.takePhoto": { ja: "とってみよう！", en: "Take a photo!", "zh-Hans": "来拍张照片吧！" },

  "preview.title": { ja: "しゃしんを うごかしてね", en: "Move your photo into place", "zh-Hans": "移动照片到合适的位置" },
  "preview.dragHint": { ja: "☝ ゆびで うごかす　🔍 おおきさも かえられるよ", en: "☝ Drag with your finger　🔍 You can resize it too", "zh-Hans": "☝ 用手指移动　🔍 也可以调整大小" },
  "preview.transparent": { ja: "白い背景を透明にする", en: "Make the white background transparent", "zh-Hans": "将白色背景变透明" },
  "preview.convertHint": { ja: "白い紙や白い壁の写真のときだけチェックしてね", en: "Check this only for photos of white paper or a white wall", "zh-Hans": "只有在白纸或白墙照片时才勾选" },
  "preview.keep": { ja: "✓ これにする", en: "✓ Use this", "zh-Hans": "✓ 使用这张" },
  "preview.busy": { ja: "つくっているよ…", en: "Creating it…", "zh-Hans": "正在制作…" },

  "settings.title": { ja: "せってい", en: "Settings", "zh-Hans": "设置" },
  "settings.lead": { ja: "じぶんに あわせて ちょうせいできるよ", en: "Make the app comfortable for you", "zh-Hans": "可以按自己的习惯调整" },
  "settings.sound": { ja: "おと", en: "Sound", "zh-Hans": "声音" },
  "settings.bgmDescription": { ja: "本だなやホームで音楽を流します", en: "Play music on the home and bookshelf screens", "zh-Hans": "在主页和书架页面播放音乐" },
  "settings.effects": { ja: "こうかおん", en: "Sound effects", "zh-Hans": "音效" },
  "settings.effectsDescription": { ja: "ボタンやページをめくる音を流します", en: "Play button and page-turn sounds", "zh-Hans": "播放按钮和翻页音效" },
  "settings.narration": { ja: "よみきかせ", en: "Read aloud", "zh-Hans": "朗读" },
  "settings.narrationDescription": { ja: "専用の音声を準備しています。現在は試用機能です", en: "Dedicated narration is being prepared. This is a test feature", "zh-Hans": "专用语音正在准备中，目前为测试功能" },
  "settings.development": { ja: "開発中", en: "In testing", "zh-Hans": "测试中" },
  "settings.display": { ja: "ひょうじ", en: "Display", "zh-Hans": "显示" },
  "settings.fontSize": { ja: "文字の大きさ", en: "Text size", "zh-Hans": "文字大小" },
  "settings.fontSizeDescription": { ja: "絵本の文章やボタンの文字を調整します", en: "Adjust story and button text", "zh-Hans": "调整绘本和按钮文字大小" },
  "settings.small": { ja: "小さめ", en: "Small", "zh-Hans": "小" },
  "settings.standard": { ja: "標準", en: "Standard", "zh-Hans": "标准" },
  "settings.large": { ja: "大きめ", en: "Large", "zh-Hans": "大" },
  "settings.animations": { ja: "アニメーション", en: "Animations", "zh-Hans": "动画" },
  "settings.animationsDescription": { ja: "画面の動きをオン・オフします", en: "Turn screen motion on or off", "zh-Hans": "开启或关闭画面动画" },
  "settings.theme": { ja: "テーマ", en: "Theme", "zh-Hans": "主题" },
  "settings.themeDescription": { ja: "自動・昼・夜から選べます", en: "Choose automatic, day, or night", "zh-Hans": "可选择自动、白天或夜间" },
  "settings.day": { ja: "昼", en: "Day", "zh-Hans": "白天" },
  "settings.auto": { ja: "自動", en: "Auto", "zh-Hans": "自动" },
  "settings.night": { ja: "夜", en: "Night", "zh-Hans": "夜间" },
  "settings.languageGroup": { ja: "ことば", en: "Language", "zh-Hans": "语言" },
  "settings.languageLabel": { ja: "画面の言語", en: "App language", "zh-Hans": "界面语言" },
  "settings.languageDescription": { ja: "日本語・English・中文に切り替えられます（テスト中）", en: "Switch between Japanese, English, and Chinese (testing)", "zh-Hans": "可切换日语、英语和中文（测试中）" },
  "settings.japanese": { ja: "日本語", en: "Japanese", "zh-Hans": "日语" },
  "settings.english": { ja: "English", en: "English", "zh-Hans": "英语" },
  "settings.chinese": { ja: "中文", en: "Chinese", "zh-Hans": "中文" },
  "settings.security": { ja: "おうちのひと", en: "Parent", "zh-Hans": "家长" },
  "settings.changePin": { ja: "おうちのひとの PIN を変更", en: "Change parent PIN", "zh-Hans": "修改家长 PIN" },
  "settings.pinDescription": { ja: "おうちのひと入口の4けたの暗証番号", en: "The 4-digit code for the parent area", "zh-Hans": "进入家长区域的4位密码" },
  "settings.dataPrivacy": { ja: "データとプライバシー", en: "Data & privacy", "zh-Hans": "数据与隐私" },
  "settings.export": { ja: "きろくを書き出す", en: "Export records", "zh-Hans": "导出记录" },
  "settings.exportDescription": { ja: "写真と思い出をバックアップ用ファイルに保存する", en: "Save photos and memories to a backup file", "zh-Hans": "将照片和回忆保存为备份文件" },
  "settings.privacy": { ja: "プライバシーについて", en: "Privacy", "zh-Hans": "隐私说明" },
  "settings.privacyDescription": { ja: "写真や記録の保存場所を確認する", en: "See where photos and records are stored", "zh-Hans": "查看照片和记录的保存位置" },
  "settings.reset": { ja: "設定を初期値にもどす", en: "Reset settings", "zh-Hans": "恢复默认设置" },
  "settings.resetConfirm": { ja: "設定を初期値にもどしますか？", en: "Reset all settings to their defaults?", "zh-Hans": "要恢复所有默认设置吗？" },
  "settings.exportSuccess": { ja: "きろくを書き出しました", en: "Records exported", "zh-Hans": "记录已导出" },
  "settings.exportError": { ja: "書き出しに失敗しました", en: "Export failed", "zh-Hans": "导出失败" },
  "settings.pinCurrent": { ja: "現在の PIN を入力", en: "Enter your current PIN", "zh-Hans": "请输入当前 PIN" },
  "settings.pinNew": { ja: "新しい PIN を入力", en: "Enter a new PIN", "zh-Hans": "请输入新的 PIN" },
  "settings.pinConfirm": { ja: "新しい PIN をもう一度入力", en: "Enter the new PIN again", "zh-Hans": "请再次输入新的 PIN" },
  "privacy.title": { ja: "プライバシーについて", en: "Privacy", "zh-Hans": "隐私说明" },
  "privacy.lead": { ja: "たいせつな きろくの あつかい", en: "How important records are handled", "zh-Hans": "重要记录的处理方式" },
  "privacy.prototype": { ja: "このプロトタイプについて", en: "About this prototype", "zh-Hans": "关于这个原型" },
  "privacy.photo": { ja: "写真を撮るとき", en: "When taking photos", "zh-Hans": "拍照时" },

  "parent.title": { ja: "活動レポート", en: "Activity report", "zh-Hans": "活动报告" },
  "parent.week": { ja: "今週の活動日数", en: "Active days this week", "zh-Hans": "本周活动天数" },
  "parent.total": { ja: "累計活動日数", en: "Total active days", "zh-Hans": "累计活动天数" },
  "parent.log": { ja: "活動履歴", en: "Activity history", "zh-Hans": "活动记录" },
  "parent.dailyMission": { ja: "今日のミッション", en: "Today's mission", "zh-Hans": "今天的任务" },

  "analysis.title": { ja: "お子さまの成長レポート", en: "Child growth report", "zh-Hans": "孩子成长报告" },
  "analysis.filterKicker": { ja: "記録を選択", en: "Choose records", "zh-Hans": "选择记录" },
  "analysis.filterTitle": { ja: "表示する期間", en: "Report period", "zh-Hans": "显示期间" },
  "analysis.all": { ja: "すべて", en: "All", "zh-Hans": "全部" },
  "analysis.allMonths": { ja: "すべての月", en: "All months", "zh-Hans": "所有月份" },
  "analysis.allDays": { ja: "すべての日", en: "All days", "zh-Hans": "所有日期" },
  "analysis.byMonth": { ja: "月別", en: "By month", "zh-Hans": "按月" },
  "analysis.byDay": { ja: "日別", en: "By day", "zh-Hans": "按日" },
  "analysis.completedBooks": { ja: "完成した絵本", en: "Books completed", "zh-Hans": "完成的绘本" },
  "analysis.completedMissions": { ja: "達成したミッション", en: "Missions completed", "zh-Hans": "完成的任务" },
  "analysis.activeDays": { ja: "活動日数", en: "Active days", "zh-Hans": "活动天数" },
  "analysis.traits": { ja: "お子さまの特徴", en: "Child profile", "zh-Hans": "孩子特性" },
  "analysis.workStyles": { ja: "Big Fiveと職業傾向の関連", en: "Big Five and work styles", "zh-Hans": "Big Five 与职业风格" },
  "analysis.next": { ja: "次の活動の提案", en: "Suggested next activity", "zh-Hans": "下一项活动建议" },
  "analysis.history": { ja: "活動履歴（実績）", en: "Activity history", "zh-Hans": "活动记录" },
  "analysis.favoriteColor": { ja: "好きな色", en: "Favorite colors", "zh-Hans": "喜欢的颜色" },
  "analysis.personality": { ja: "性格", en: "Personality", "zh-Hans": "性格" },
  "analysis.favoriteThings": { ja: "好きなこと", en: "Favorite things", "zh-Hans": "喜欢的事情" },
  "analysis.lesson": { ja: "習い事の提案", en: "Activity ideas", "zh-Hans": "兴趣建议" },

  "avatar.create": { ja: "じぶんを つくろう！", en: "Create yourself!", "zh-Hans": "创造自己的形象！" },
  "avatar.chooseAnimal": { ja: "どの どうぶつに へんしん する？", en: "Which animal will you become?", "zh-Hans": "想变成哪种动物？" },
  "avatar.custom": { ja: "じぶんで つくる", en: "Build my own", "zh-Hans": "自己设计" },
  "avatar.favoriteColor": { ja: "すきな いろ", en: "Favorite color", "zh-Hans": "喜欢的颜色" },
  "avatar.name": { ja: "なまえを つけよう", en: "Choose a name", "zh-Hans": "取个名字" },
  "avatar.save": { ja: "これで へんしん！", en: "Become this!", "zh-Hans": "就这样变身！" },

  "guide.back": { ja: "‹ もどる", en: "‹ Back", "zh-Hans": "‹ 返回" },
  "guide.next": { ja: "つぎへ ›", en: "Next ›", "zh-Hans": "下一步 ›" },
  "guide.later": { ja: "あとで", en: "Later", "zh-Hans": "以后再看" },
};

const exactTranslations = {
  ...Object.values(STRINGS).reduce((map, item) => {
    if (!map[item.ja]) map[item.ja] = { en: item.en, "zh-Hans": item["zh-Hans"] };
    return map;
  }, {}),
  "‹ もどる": { en: "‹ Back", "zh-Hans": "‹ 返回" },
  "‹ せってい": { en: "‹ Settings", "zh-Hans": "‹ 设置" },
  "⚙ せってい": { en: "⚙ Settings", "zh-Hans": "⚙ 设置" },
  "☆ しおり": { en: "☆ Bookmarks", "zh-Hans": "☆ 书签" },
  "？ はじめてのかたへ": { en: "? First time here?", "zh-Hans": "？第一次使用？" },
  "？ あそびかた": { en: "? How to play", "zh-Hans": "？玩法" },
  "はじめてのかたへ": { en: "First time here?", "zh-Hans": "第一次使用？" },
  "おうちのひとへ": { en: "For parents", "zh-Hans": "家长指南" },
  "つかいかた": { en: "How to use", "zh-Hans": "使用方法" },
  "あそびかた": { en: "How to play", "zh-Hans": "玩法" },
  "はじめよう！": { en: "Let's start!", "zh-Hans": "开始吧！" },
  "‹ 戻る": { en: "‹ Back", "zh-Hans": "‹ 返回" },
  "次へ ›": { en: "Next ›", "zh-Hans": "下一步 ›" },
  "後で": { en: "Later", "zh-Hans": "以后再看" },
  "お子さまの成長レポート": { en: "Child growth report", "zh-Hans": "孩子成长报告" },
  "お子さまのこれまでの活動状況をまとめています。": { en: "A summary of your child's activity so far.", "zh-Hans": "汇总孩子目前的活动情况。" },
  "レポートを保存": { en: "Save report", "zh-Hans": "保存报告" },
  "専門家に共有する場合は、PNGまたはPDFで保存してください。": { en: "Save as PNG or PDF when sharing with a specialist.", "zh-Hans": "与专家分享时，请保存为 PNG 或 PDF。" },
  "記録を選択": { en: "Choose records", "zh-Hans": "选择记录" },
  "表示する期間": { en: "Report period", "zh-Hans": "显示期间" },
  "月別": { en: "By month", "zh-Hans": "按月" },
  "月を選択": { en: "Choose a month", "zh-Hans": "选择月份" },
  "日別": { en: "By day", "zh-Hans": "按日" },
  "日を選択": { en: "Choose a day", "zh-Hans": "选择日期" },
  "月または日を選択すると、その期間の集計と活動履歴を表示します。": { en: "Choose a month or day to see the totals and activity history for that period.", "zh-Hans": "选择月份或日期后，可查看该期间的统计和活动记录。" },
  "お子さまのBig Five 5因子参考プロフィール": { en: "Child Big Five five-factor reference profile", "zh-Hans": "孩子 Big Five 五维参考档案" },
  "Big Fiveと職業傾向の関連": { en: "Big Five and work-style tendencies", "zh-Hans": "Big Five 与职业倾向的关联" },
  "次の活動の提案": { en: "Suggested next activity", "zh-Hans": "下一项活动建议" },
  "絵本を毎日少しずつ読むことで、無理なく継続できます。": { en: "Reading a little every day can help build a sustainable routine.", "zh-Hans": "每天阅读一点，有助于轻松坚持。" },
  "初めての絵本も、お子さまのペースで進めてみてください。": { en: "For a new picture book, please proceed at your child's pace.", "zh-Hans": "第一次阅读绘本时，也请按照孩子的节奏进行。" },
  "活動履歴（実績）": { en: "Activity history (actual results)", "zh-Hans": "活动记录（实际成果）" },
  "活動記録はまだありません。": { en: "There are no activity records yet.", "zh-Hans": "目前还没有活动记录。" },
  "すべての絵本": { en: "All picture books", "zh-Hans": "所有绘本" },
  "今日のミッション": { en: "Today's mission", "zh-Hans": "今天的任务" },
  "お子さまのホーム画面に「1日1冊読む」という目標を表示します。対象の絵本はここで変更できます。": { en: "Show a goal to read one picture book a day on your child's home screen. Choose the book here.", "zh-Hans": "在孩子主页显示每天阅读一本绘本的目标，并在这里选择绘本。" },
  "読む絵本": { en: "Picture book to read", "zh-Hans": "要读的绘本" },
  "ミッションで読む絵本": { en: "Picture book for the mission", "zh-Hans": "任务要读的绘本" },
  "活動記録はまだありません。お子さまモードで活動すると、ここに表示されます。": { en: "There are no activity records yet. They will appear here when your child uses Child mode.", "zh-Hans": "目前还没有活动记录。孩子使用儿童模式后，记录会显示在这里。" },
  "活動レポート": { en: "Activity report", "zh-Hans": "活动报告" },
  "今週の活動日数": { en: "Active days this week", "zh-Hans": "本周活动天数" },
  "累計活動日数": { en: "Total active days", "zh-Hans": "累计活动天数" },
  "※ ストリークはアプリ外で活動した日数を数えます。中断しても記録は失われません。": { en: "※ The streak counts days of activity outside the app. Records are not lost when activity is interrupted.", "zh-Hans": "※ 连续记录按应用外的活动天数计算。中断也不会丢失记录。" },
  "⚙ 設定": { en: "⚙ Settings", "zh-Hans": "⚙ 设置" },
  "デモ用：記録をリセット": { en: "Demo: reset records", "zh-Hans": "演示：重置记录" },
  "暗証番号を入力してください": { en: "Enter your PIN", "zh-Hans": "请输入密码" },
  "プロトタイプ用": { en: "Prototype", "zh-Hans": "原型" },
  "もう一度入力してください": { en: "Please enter it again", "zh-Hans": "请再次输入" },
  "保護者向け": { en: "For parents", "zh-Hans": "家长指南" },
  "思い出を確認": { en: "Review memories", "zh-Hans": "查看回忆" },
  "本棚の絵本を選択": { en: "Select a picture book on the shelf", "zh-Hans": "选择书架上的绘本" },
  "完成した絵本と写真を確認できます": { en: "Review completed picture books and photos", "zh-Hans": "查看完成的绘本和照片" },
  "活動履歴を確認": { en: "Review activity history", "zh-Hans": "查看活动记录" },
  "「活動履歴」を選択": { en: "Select “Activity history”", "zh-Hans": "选择“活动记录”" },
  "活動日数とミッションの達成状況を確認できます": { en: "Review active days and mission completion status", "zh-Hans": "查看活动天数和任务完成情况" },
  "特性分析を確認": { en: "Review the child profile", "zh-Hans": "查看孩子特性" },
  "「子どもの特性分析」を選択": { en: "Select “Child profile”", "zh-Hans": "选择“孩子特性分析”" },
  "お子さまの活動傾向を確認できます": { en: "Review your child's activity tendencies", "zh-Hans": "查看孩子的活动倾向" },
  "絵本": { en: "Picture book", "zh-Hans": "绘本" },
  "思い出": { en: "Memories", "zh-Hans": "回忆" },
  "お子さまが作成した絵本はまだありません。": { en: "Your child has not completed a picture book yet.", "zh-Hans": "孩子还没有完成绘本。" },
  "絵本を完成すると、ここに表示されます。": { en: "Completed picture books will appear here.", "zh-Hans": "完成的绘本会显示在这里。" },
  "活動記録がないため、参考値を表示しています。写真をアップロードすると色の傾向も反映されます。": { en: "There is no activity record yet, so reference values are shown. Uploaded photo colors will also be reflected.", "zh-Hans": "目前没有活动记录，因此显示参考值。上传照片的颜色倾向也会反映出来。" },
  "絵本の達成記録から、現在の活動傾向を集計しています。": { en: "Current activity tendencies are calculated from completed picture-book records.", "zh-Hans": "根据完成绘本的记录统计当前活动倾向。" },
  "ミッションを「すべての絵本」に変更しました": { en: "Mission changed to “All picture books”", "zh-Hans": "任务已改为《所有绘本》" },
  "閉じる": { en: "Close", "zh-Hans": "关闭" },
  "おうちのひと レポート": { en: "Parent report", "zh-Hans": "家长报告" },
  "Big Five（ビッグファイブ・5因子）": { en: "Big Five (five factors)", "zh-Hans": "Big Five（五个维度）" },
  "Big Five（デモ表示）": { en: "Big Five (demo)", "zh-Hans": "Big Five（演示）" },
  "Big Five（活動から集計）": { en: "Big Five (from activity)", "zh-Hans": "Big Five（根据活动统计）" },
  "お子さまの Big Five メモ": { en: "Child Big Five memo", "zh-Hans": "孩子的 Big Five 记录" },
  "Big Five と職業の つながり": { en: "Big Five and work styles", "zh-Hans": "Big Five 与职业风格" },
  "子どもの Big Five 5因子参考プロフィール": { en: "Child Big Five five-factor reference profile", "zh-Hans": "孩子 Big Five 五维参考档案" },
  "開放性": { en: "Openness", "zh-Hans": "开放性" },
  "誠実性": { en: "Conscientiousness", "zh-Hans": "尽责性" },
  "外向性": { en: "Extraversion", "zh-Hans": "外向性" },
  "協調性": { en: "Agreeableness", "zh-Hans": "宜人性" },
  "情緒安定性": { en: "Emotional Stability", "zh-Hans": "情绪稳定性" },
  "PNGで保存": { en: "Save as PNG", "zh-Hans": "保存为 PNG" },
  "PDFで保存": { en: "Save as PDF", "zh-Hans": "保存为 PDF" },
  "プロト用": { en: "Prototype", "zh-Hans": "原型" },
  "✓ これにする": { en: "✓ Use this", "zh-Hans": "✓ 使用这张" },
  "✓ できたよ！": { en: "✓ Done!", "zh-Hans": "✓ 完成了！" },
  "やったね！": { en: "Well done!", "zh-Hans": "做得好！" },
  "1さつ よめたね！": { en: "You read one book!", "zh-Hans": "读完一本绘本了！" },
  "ミッション かんりょう！": { en: "Mission complete!", "zh-Hans": "任务完成！" },
  "えほん日記を 保存したよ！": { en: "Your picture-book diary was saved!", "zh-Hans": "绘本日记已保存！" },
  "しゃしんを 保存したよ！": { en: "Your photo was saved!", "zh-Hans": "照片已保存！" },
  "もう一度ためしてね": { en: "Please try again", "zh-Hans": "请再试一次" },
  "保存に しっぱいしました": { en: "Could not save", "zh-Hans": "保存失败" },
  "しおりをはずす": { en: "Remove bookmark", "zh-Hans": "移除书签" },
  "しおりに追加": { en: "Add bookmark", "zh-Hans": "添加书签" },
  "お気に入りをはずす": { en: "Remove favorite", "zh-Hans": "移除收藏" },
  "お気に入りを いつでも みられるよ": { en: "Your favorites, anytime", "zh-Hans": "随时查看收藏" },
  "ページのしおり": { en: "Page bookmark", "zh-Hans": "页面书签" },
  "お気に入りのページ": { en: "Favorite page", "zh-Hans": "收藏的页面" },
  "お気に入りの写真": { en: "Favorite photo", "zh-Hans": "收藏的照片" },
  "お気に入りの挿絵": { en: "Favorite illustration", "zh-Hans": "收藏的插图" },
  "本棚にもどる": { en: "Back to bookshelf", "zh-Hans": "返回书架" },
  "しゃしんなし": { en: "No photo", "zh-Hans": "没有照片" },
  "まだ しおりが ありません。": { en: "There are no bookmarks yet.", "zh-Hans": "还没有书签。" },
  "まだ おもいでが ありません。": { en: "There are no memories yet.", "zh-Hans": "还没有回忆。" },
  "えほんを よんで つくろう！": { en: "Read a book to make one!", "zh-Hans": "读绘本来制作吧！" },
  "おたのしみに": { en: "Coming soon", "zh-Hans": "敬请期待" },
  "操作方法": { en: "How it works", "zh-Hans": "操作方法" },
  "活動履歴": { en: "Activity history", "zh-Hans": "活动记录" },
  "子どもの特性分析": { en: "Child profile", "zh-Hans": "孩子特性分析" },
  "きろく": { en: "Records", "zh-Hans": "记录" },
  "すべて": { en: "All", "zh-Hans": "全部" },
  "すべての月": { en: "All months", "zh-Hans": "所有月份" },
  "すべての日": { en: "All days", "zh-Hans": "所有日期" },
  "月ごと": { en: "By month", "zh-Hans": "按月" },
  "日にちごと": { en: "By day", "zh-Hans": "按日" },
  "完成したえほん": { en: "Books completed", "zh-Hans": "完成的绘本" },
  "できたえほん": { en: "Books completed", "zh-Hans": "完成的绘本" },
  "できたミッション": { en: "Missions completed", "zh-Hans": "完成的任务" },
  "活動した日": { en: "Active days", "zh-Hans": "活动天数" },
  "こどものホームに「1日1さつ よもう」の目標を表示します。よむ絵本はここで変えられます。": { en: "Show a daily reading goal on the child's home screen. Choose the book here.", "zh-Hans": "在孩子主页显示每天读一本绘本的目标，并在这里选择绘本。" },
  "よむ えほん": { en: "Book to read", "zh-Hans": "要读的绘本" },
  "どのえほんでもOK": { en: "Any picture book", "zh-Hans": "任意绘本" },
  "デモ用: きろくをリセット": { en: "Demo: reset records", "zh-Hans": "演示：重置记录" },
  "PINがちがいます": { en: "Incorrect PIN", "zh-Hans": "PIN 不正确" },
  "PINを変更しました": { en: "PIN changed", "zh-Hans": "PIN 已修改" },
  "4けたの数字を入力してください": { en: "Enter a 4-digit number", "zh-Hans": "请输入4位数字" },
  "2回のPINが一致しません": { en: "The PINs do not match", "zh-Hans": "两次 PIN 不一致" },
  "設定を初期値にもどしますか？": { en: "Reset all settings to their defaults?", "zh-Hans": "要恢复所有默认设置吗？" },
  "日本語": { en: "Japanese", "zh-Hans": "日语" },
  "（テスト中）English": { en: "(Testing) English", "zh-Hans": "（测试中）英语" },
  "（测试中）中文": { en: "(Testing) Chinese", "zh-Hans": "（测试中）中文" },
  "こどもで はじめる": { en: "Start as a child", "zh-Hans": "以孩子身份开始" },
  "「こども」を タッチ！": { en: "Tap “Child” to begin!", "zh-Hans": "点击“孩子”开始！" },
  "えほんを よんで、ミッションに ちょうせんするよ": { en: "Read picture books and try missions", "zh-Hans": "读绘本并挑战任务" },
  "「おうちのひと」を タッチ！": { en: "Tap “Parent”!", "zh-Hans": "点击“家长”！" },
  "PINを 入れると、きろくや おもいでを みられるよ": { en: "Enter the PIN to see records and memories", "zh-Hans": "输入 PIN 查看记录和回忆" },
  "しゃしんミッション": { en: "Photo missions", "zh-Hans": "照片任务" },
  "ミッションで しゃしんを とろう！": { en: "Take photos during missions!", "zh-Hans": "在任务中拍照吧！" },
  "「とってみよう！」で しゃしんを とって、えほんを つくるよ": { en: "Tap “Take a photo!” and make your picture book", "zh-Hans": "点击“来拍张照片吧！”制作绘本" },
  "えほん！": { en: "Picture books!", "zh-Hans": "绘本！" },
  "「えほん」を タッチ！": { en: "Tap “Picture books”!", "zh-Hans": "点击“绘本”！" },
  "すきな ほんを えらぶよ": { en: "Choose a book you like", "zh-Hans": "选择喜欢的绘本" },
  "みぎへ スーッ！": { en: "Swipe right!", "zh-Hans": "向右滑动！" },
  "ゆびを みぎへ すべらせる！": { en: "Slide your finger to the right!", "zh-Hans": "用手指向右滑动！" },
  "ページが めくれるよ": { en: "The page will turn", "zh-Hans": "页面会翻过去" },
  "しゃしん！": { en: "Photos!", "zh-Hans": "照片！" },
  "「とってみよう！」を タッチ！": { en: "Tap “Take a photo!”", "zh-Hans": "点击“来拍张照片吧！”" },
  "いっしょに やってみよう": { en: "Let's try it together", "zh-Hans": "一起试试看吧" },
  "えほんを 1さつ よもう！": { en: "Let's read one picture book!", "zh-Hans": "一起读一本绘本吧！" },
  "✓ クリア！": { en: "✓ Complete!", "zh-Hans": "✓ 完成！" },
  "じぶんの アバターを つくる": { en: "Create your avatar", "zh-Hans": "创建自己的头像" },
  "おもいでを ひらく": { en: "Open memories", "zh-Hans": "打开回忆" },
  "本棚の ほんを タッチ": { en: "Tap a book on the shelf", "zh-Hans": "点击书架上的绘本" },
  "かんせいした えほんと しゃしんを みられます": { en: "See completed books and photos", "zh-Hans": "查看完成的绘本和照片" },
  "活動履歴を みる": { en: "View activity history", "zh-Hans": "查看活动记录" },
  "「活動履歴」を タッチ": { en: "Tap “Activity history”", "zh-Hans": "点击“活动记录”" },
  "あそんだ日と ミッションの数を みられます": { en: "See play days and mission counts", "zh-Hans": "查看活动天数和任务数量" },
  "特性分析を みる": { en: "View the child profile", "zh-Hans": "查看孩子特性" },
  "「子どもの特性分析」を タッチ": { en: "Tap “Child profile”", "zh-Hans": "点击“孩子特性分析”" },
  "こどもの あそびの ようすを みられます": { en: "See patterns in the child's play", "zh-Hans": "查看孩子的游戏情况" },
  "よみかけが あるよ。": { en: "You have a book in progress.", "zh-Hans": "有一本绘本还没读完。" },
  "どうする？": { en: "What would you like to do?", "zh-Hans": "想怎么做？" },
  "「はじめから」に すると、この えほんで とった しゃしんは きえます": { en: "Starting over will delete photos taken in this book", "zh-Hans": "从头开始会删除这本绘本中拍摄的照片" },
  "‹ まえ": { en: "‹ Previous", "zh-Hans": "‹ 上一页" },
  "まえのページ": { en: "Previous page", "zh-Hans": "上一页" },
  "とってみよう！": { en: "Take a photo!", "zh-Hans": "来拍张照片吧！" },
  "しゃしんを うごかしてね": { en: "Move your photo into place", "zh-Hans": "移动照片到合适的位置" },
  "とったしゃしん": { en: "Taken photo", "zh-Hans": "拍摄的照片" },
  "しゃしんのおおきさ": { en: "Photo size", "zh-Hans": "照片大小" },
  "ちいさくする": { en: "Make smaller", "zh-Hans": "缩小" },
  "おおきくする": { en: "Make larger", "zh-Hans": "放大" },
  "しゃしんの大きさ": { en: "Photo size", "zh-Hans": "照片大小" },
  "もういちど": { en: "Try again", "zh-Hans": "再试一次" },
  "いっしょに よんだよ": { en: "We read it together", "zh-Hans": "一起读过了" },
  "きろくが ありません": { en: "There are no records", "zh-Hans": "还没有记录" },
  "まだ おもいでが ありません。<br>えほんを よんで つくろう！": { en: "There are no memories yet.<br>Read a book to make one!", "zh-Hans": "还没有回忆。<br>读绘本来制作吧！" },
  "まだ きろくが ありません。": { en: "There are no records yet.", "zh-Hans": "还没有记录。" },
  "えほんのページや おもいでの写真に": { en: "Add ☆ to book pages or memory photos", "zh-Hans": "给绘本页面或回忆照片加上 ☆" },
  "☆をつけると、ここに まとまります。": { en: "and they will be collected here.", "zh-Hans": "它们就会集中显示在这里。" },
  "親モード向けに、今までの活動の様子を かんたんに まとめました。": { en: "A simple summary of the child's activity for parents.", "zh-Hans": "为家长简单整理了孩子目前的活动情况。" },
  "今週 あそんだ日": { en: "Days played this week", "zh-Hans": "本周活动天数" },
  "これまで あそんだ日": { en: "Days played overall", "zh-Hans": "累计活动天数" },
  "きょう：": { en: "Today: ", "zh-Hans": "今天：" },
  "まだ": { en: "Not yet", "zh-Hans": "还没有" },
  "クリアずみ 🎉": { en: "Complete 🎉", "zh-Hans": "已完成 🎉" },
  "※ ストリークは「外で活動した日数」に付き、途切れても没収しません（健全設計）。": { en: "※ The streak counts days of activity outside the app and is never taken away if interrupted.", "zh-Hans": "※ 连续记录按在应用外活动的天数计算，中断也不会被清零。" },
  "参照データを読み込めないため、候補を表示できません。": { en: "Reference data could not be loaded, so suggestions are unavailable.", "zh-Hans": "无法加载参考数据，因此暂时无法显示建议。" },
  "専門家にわたすときは、PNGまたはPDFを保存してお使いください。": { en: "Save the PNG or PDF when sharing this with a specialist.", "zh-Hans": "需要与专家分享时，请保存 PNG 或 PDF。" },
  "月または日にちを選ぶと、数字と活動履歴がその期間に切り替わります。": { en: "Choose a month or day to filter the numbers and activity history.", "zh-Hans": "选择月份或日期后，数字和活动记录会切换到对应期间。" },
  "※ 将来の職業診断ではなく、遊びや体験と仕事の スタイルのつながりを見る参考表示です。": { en: "※ This is a reference for exploring links between play and work styles, not a career diagnosis.", "zh-Hans": "※ 这是探索游戏体验与工作风格联系的参考显示，不是职业诊断。" },
  "※ Big Five と職業候補はプロトタイプの参考表示です。診断・評価ではありません。": { en: "※ Big Five and work suggestions are reference displays in this prototype, not a diagnosis or evaluation.", "zh-Hans": "※ Big Five 和职业建议仅为原型参考显示，不是诊断或评价。" },
  "活動記録がまだないため、デモ値で計算しています。写真をアップロードすると色も結果に反映されます。": { en: "There is no activity yet, so demo values are shown. Uploaded photo colors will also affect the result.", "zh-Hans": "目前还没有活动记录，因此显示演示数值。上传照片的颜色也会反映到结果中。" },
  "正式版では、保存期間、削除方法、問い合わせ先を含む正式なプライバシー規約を掲載します。": { en: "The full version will include a formal privacy policy with retention, deletion, and contact details.", "zh-Hans": "正式版将提供包含保存期限、删除方法和联系方式的隐私政策。" },
  "撮った写真、絵本の進み具合、完成した思い出は、現在このブラウザの端末内に保存されます。": { en: "Photos, reading progress, and completed memories are currently stored on this device in this browser.", "zh-Hans": "拍摄的照片、绘本进度和完成的回忆目前保存在此浏览器的设备中。" },
  "現時点ではサーバーへ自動送信したり、公開したりする機能はありません。": { en: "At this time, nothing is automatically sent to a server or made public.", "zh-Hans": "目前不会自动发送到服务器，也不会公开。" },
  "ブラウザのデータを消去すると、写真や記録も消えることがあります。おうちのひとの設定画面から、定期的にバックアップを書き出してください。": { en: "Clearing browser data may delete photos and records. Parents should export a backup regularly from Settings.", "zh-Hans": "清除浏览器数据可能会删除照片和记录。请家长定期在设置中导出备份。" },
  "写真は絵本の中で使うために保存されます。家族以外の人が写り込まないよう、おうちの人と一緒に確認してください。": { en: "Photos are stored for use in the picture book. Check them with a parent so other people are not included without permission.", "zh-Hans": "照片会保存并用于绘本中。请和家长确认，避免未经同意拍到其他人。" },
  "あんしょうばんごうを いれてね": { en: "Enter the PIN", "zh-Hans": "请输入 PIN" },
  "プロト用": { en: "Prototype", "zh-Hans": "原型" },
  "もう一度ためしてね": { en: "Please try again", "zh-Hans": "请再试一次" },
  "おと": { en: "Sound", "zh-Hans": "声音" },
  "ひょうじ": { en: "Display", "zh-Hans": "显示" },
  "ことば": { en: "Language", "zh-Hans": "语言" },
  "じぶんの アバターを つくろう": { en: "Create your avatar", "zh-Hans": "创建自己的头像" },
  "とじる": { en: "Close", "zh-Hans": "关闭" },
  "じぶんを つくろう！": { en: "Create yourself!", "zh-Hans": "创造自己的形象！" },
  "ぞうさん": { en: "Elephant", "zh-Hans": "大象" },
  "うさぎさん": { en: "Rabbit", "zh-Hans": "兔子" },
  "とらさん": { en: "Tiger", "zh-Hans": "老虎" },
  "ねこさん": { en: "Cat", "zh-Hans": "猫咪" },
  "いぬさん": { en: "Dog", "zh-Hans": "小狗" },
  "みどり": { en: "Green", "zh-Hans": "绿色" },
  "きいろ": { en: "Yellow", "zh-Hans": "黄色" },
  "ももいろ": { en: "Pink", "zh-Hans": "粉色" },
  "みずいろ": { en: "Light blue", "zh-Hans": "浅蓝色" },
  "ラベンダー": { en: "Lavender", "zh-Hans": "薰衣草紫" },
  "じぶんの いろ": { en: "Custom color", "zh-Hans": "自定义颜色" },
  "じぶんの いろを つくる": { en: "Create a custom color", "zh-Hans": "创建自定义颜色" },
  "なまえを つけよう": { en: "Choose a name", "zh-Hans": "取个名字" },
  "れい：ももた": { en: "e.g. Momo", "zh-Hans": "例如：桃桃" },
  "つけた なまえは、えほんの なかにも でてくるよ": { en: "Your name will also appear in the picture book", "zh-Hans": "取的名字也会出现在绘本中" },
  "これで へんしん！": { en: "Become this!", "zh-Hans": "就这样变身！" },
  "からだの いろ": { en: "Body color", "zh-Hans": "身体颜色" },
  "みみ": { en: "Ears", "zh-Hans": "耳朵" },
  "おめめ": { en: "Eyes", "zh-Hans": "眼睛" },
  "おくち": { en: "Mouth", "zh-Hans": "嘴巴" },
  "かざり": { en: "Accessory", "zh-Hans": "装饰" },
  "いろぬり（いろえんぴつで すきに ぬってね）": { en: "Coloring (use the pencils to draw freely)", "zh-Hans": "涂色（用彩色铅笔自由涂画）" },
  "いろぬりキャンバス": { en: "Coloring canvas", "zh-Hans": "涂色画布" },
  "けしごむ": { en: "Eraser", "zh-Hans": "橡皮擦" },
  "ぜんぶ けす": { en: "Clear all", "zh-Hans": "全部清除" },
};

function languageOrDefault(value = Settings.get("language")) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "ja";
}

function interpolate(value, vars = {}) {
  return String(value).replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
  );
}

export function t(key, vars = {}, language = Settings.get("language")) {
  const lang = languageOrDefault(language);
  const item = STRINGS[key];
  if (!item) return key;
  return interpolate(item[lang] ?? item.ja, vars);
}

function preserveWhitespace(original, translated) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated.trim()}${trailing}`;
}

function translatePattern(value, language) {
  let match = value.match(/^(\d+)さい$/);
  if (match) return language === "en" ? `${match[1]} years old` : `${match[1]}岁`;

  match = value.match(/^(\d+)こ たっせい$/);
  if (match) return language === "en" ? `${match[1]} completed` : `完成 ${match[1]} 项`;

  match = value.match(/^きょう：(.+) ／ これまで (\d+)日 クリア$/);
  if (match) return language === "en"
    ? `Today: ${match[1]} / ${match[2]} days completed`
    : `今天：${match[1]} / 累计完成 ${match[2]} 天`;

  match = value.match(/^今日：(.+) ／ 累計 (\d+)日達成$/);
  if (match) {
    const today = match[1] === "達成済み 🎉"
      ? (language === "en" ? "Completed 🎉" : "已完成 🎉")
      : (language === "en" ? "Not completed" : "未完成");
    return language === "en"
      ? `Today: ${today} / ${match[2]} days completed`
      : `今天：${today} / 累计完成 ${match[2]} 天`;
  }

  match = value.match(/^(\d+)件達成$/);
  if (match) return language === "en" ? `${match[1]} completed` : `完成 ${match[1]} 项`;

  match = value.match(/^『(.+)』を よもう！$/);
  if (match) return language === "en" ? `Read “${match[1]}”!` : `一起读《${match[1]}》！`;

  match = value.match(/^(\d+)回つづけてまちがえたので、(\d+)秒まってね$/);
  if (match) return language === "en"
    ? `You entered it incorrectly ${match[1]} times. Please wait ${match[2]} seconds.`
    : `连续输错 ${match[1]} 次，请等待 ${match[2]} 秒。`;

  match = value.match(/^PINがちがいます（あと(\d+)回）$/);
  if (match) return language === "en"
    ? `Incorrect PIN (${match[1]} attempts left)`
    : `PIN 不正确（还剩 ${match[1]} 次）`;

  match = value.match(/^PINが一致しません（残り(\d+)回）$/);
  if (match) return language === "en"
    ? `PINs do not match (${match[1]} attempts left)`
    : `PIN 不一致（还剩 ${match[1]} 次）`;

  match = value.match(/^3回連続で間違えたため、(\d+)秒後に再入力してください$/);
  if (match) return language === "en"
    ? `Three incorrect attempts. Please try again in ${match[1]} seconds.`
    : `连续输错 3 次，请在 ${match[1]} 秒后重新输入。`;

  match = value.match(/^ミッションを『(.+)』にしました$/);
  if (match) return language === "en"
    ? `Mission changed to “${match[1]}”`
    : `任务已改为《${match[1]}》`;

  match = value.match(/^ミッションを『(.+)』に変更しました$/);
  if (match) return language === "en"
    ? `Mission changed to “${match[1]}”`
    : `任务已改为《${match[1]}》`;

  match = value.match(/^今日のミッションを(有効|無効)にしました$/);
  if (match) return language === "en"
    ? `Today's mission ${match[1] === "有効" ? "enabled" : "disabled"}`
    : `今天的任务已${match[1] === "有効" ? "开启" : "关闭"}`;

  match = value.match(/^(.+)、やったね！$/);
  if (match) return language === "en" ? `${match[1]}, well done!` : `${match[1]}，做得好！`;

  match = value.match(/^(.+)、1さつ よめたね！$/);
  if (match) return language === "en" ? `${match[1]}, you read one book!` : `${match[1]}，读完一本绘本了！`;

  match = value.match(/^(.+)が よんだよ$/);
  if (match) return language === "en" ? `${match[1]} read it` : `${match[1]}读过了`;

  return null;
}

export function localizeText(value, language = Settings.get("language")) {
  const lang = languageOrDefault(language);
  if (lang === "ja" || !value) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return value;
  const translated = exactTranslations[trimmed]?.[lang] ?? translatePattern(trimmed, lang);
  return translated ? preserveWhitespace(String(value), translated) : value;
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest(
    "[data-no-translate], .book-title:not(.book-title--ghost), .diary-caption, .flip-page .lead, .flip-page .prompt, .analysis-work-style-copy b"
  ));
}

function localizeAttribute(element, attribute, language) {
  if (!element.hasAttribute(attribute)) return;
  const value = element.getAttribute(attribute);
  const translated = localizeText(value, language);
  if (translated !== value) element.setAttribute(attribute, translated);
}

export function localizeUi(root, language = Settings.get("language")) {
  if (!root || languageOrDefault(language) === "ja") return root;
  const lang = languageOrDefault(language);
  const walker = document.createTreeWalker(root, 4);
  const textNodes = [];
  let node = walker.nextNode();
  while (node) {
    if (!shouldSkipTextNode(node)) textNodes.push(node);
    node = walker.nextNode();
  }
  textNodes.forEach((textNode) => {
    textNode.nodeValue = localizeText(textNode.nodeValue, lang);
  });

  root.querySelectorAll("[aria-label], [title], [placeholder]").forEach((element) => {
    if (element.closest("[data-no-translate]")) return;
    ["aria-label", "title", "placeholder"].forEach((attribute) => localizeAttribute(element, attribute, lang));
  });
  return root;
}
