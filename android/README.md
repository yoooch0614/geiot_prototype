# すきのたね Android

这个文件夹是由 Capacitor 生成的 Android 原生工程。

- 网页资源同步到 `app/src/main/assets/public/`
- debug APK 会输出到 `android/ehoeho-debug.apk`
- 不要直接编辑 `app/src/main/assets/public/`，修改项目根目录的 HTML/CSS/JS/JSON 后重新同步

在项目根目录执行：

```bash
npm run android:apk
```

如果只是要打开 Android Studio：

```bash
npm run android:open
```
