import { playNarration, esc, formatJapaneseCopy, stage, characterLayer, openMissionCamera, completeMissionPhoto } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";

// 描く前の仕掛け。タップや時間だけを記録し、絵の中身は判定しない。
// page.play に書かれた分だけ出す。全部終えるまで撮影ボタンは押せない。
//   choose: えらぶ（いつもの／へんてこ）、hard: むずかしい版（★）、wait: まって（合図まで待つ）、
//   who: だれと・だれに、branch: おはなしの分かれ道（助けるかどうか）
const WAIT_MS = 3000;

function playChoices(play) {
  const groups = [];
  if (play?.choose) {
    groups.push({
      key: "choose", question: play.choose.question || "どっちに する？",
      options: [
        { label: play.choose.usual, patch: { unusual: false } },
        { label: play.choose.unusual, patch: { unusual: true } },
      ],
    });
  }
  if (play?.hard) {
    groups.push({
      key: "hard", question: "どっちで かく？",
      options: [
        { label: play.hard.normal, patch: { hardChosen: false } },
        { label: `★ ${play.hard.star}`, patch: { hardChosen: true } },
      ],
    });
  }
  if (play?.branch) {
    groups.push({
      key: "branch", question: play.branch.question,
      options: play.branch.options.map((option) => ({ label: option.label, patch: { helped: option.helps === true } })),
    });
  }
  if (play?.who) {
    groups.push({
      key: "with", question: "だれと いく？",
      options: [
        { label: "ひとり", patch: { withPeople: false } },
        { label: "かぞく", patch: { withPeople: true } },
        { label: "ともだち", patch: { withPeople: true } },
        { label: "みんな", patch: { withPeople: true } },
      ],
    });
    groups.push({
      key: "show", question: "だれに みせたい？",
      options: [
        { label: "だれにも", patch: { wantShow: false, forFamily: false } },
        { label: "かぞく", patch: { wantShow: true, forFamily: true } },
        { label: "ともだち", patch: { wantShow: true, forFamily: true } },
      ],
    });
  }
  if (play?.wait) groups.push({ key: "wait", wait: true });
  return groups;
}

function playChoicesMarkup(groups) {
  return groups.map((group) => group.wait ? `
    <div class="play-choice" data-play-group="wait">
      <p class="play-choice__q">あいずが なるまで まってね</p>
      <button type="button" class="play-card play-wait" data-play-wait>…まってね</button>
      <p class="play-wait__msg" data-play-wait-msg></p>
    </div>` : `
    <div class="play-choice" data-play-group="${group.key}">
      <p class="play-choice__q">${esc(group.question)}</p>
      <div class="play-choice__cards">${group.options.map((option, index) => `
        <button type="button" class="play-card" data-play-option="${index}">${esc(option.label)}</button>`).join("")}
      </div>
    </div>`).join("");
}

export const MissionScreen = {
  render(ctx, { page }) {
    const groups = playChoices(page.play);
    const img = ctx.repo.assetUrl(page.image);
    const character = ctx.repo.assetUrl(page.character);
    return stage(`
      <div class="screen reader page--in">
        <button class="back" data-back>‹</button>
        <div class="scene">
          <img src="${img}" alt="" onerror="this.style.opacity=0">
          ${characterLayer(character)}
        </div>
        <p class="lead">${formatJapaneseCopy(page.text)}</p>
        <p class="prompt">${formatJapaneseCopy(page.prompt)}</p>
        ${playChoicesMarkup(groups)}
        <button class="mission-shoot" data-shoot${groups.length ? " disabled" : ""}> ${esc(page.doneLabel || "とってみよう！")}</button>
      </div>`);
  },
  mount(ctx, { page }, root) {
    playNarration(ctx.repo.assetUrl(page.audio));
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

    // 仕掛けのタップを遊びの記録に残す。全部選んだら撮影ボタンが押せるようになる。
    const groups = playChoices(page.play);
    const picked = new Set();
    const shootButton = root.querySelector("[data-shoot]");
    const domains = { domains: page.developmentDomains ?? [] };
    const finish = (key) => {
      picked.add(key);
      if (picked.size >= groups.length) shootButton.disabled = false;
    };
    groups.filter((group) => !group.wait).forEach((group) => {
      const box = root.querySelector(`[data-play-group="${group.key}"]`);
      box.querySelectorAll("[data-play-option]").forEach((button) => {
        button.onclick = () => {
          box.querySelectorAll("[data-play-option]").forEach((other) => other.classList.toggle("is-picked", other === button));
          ctx.session.recordPlay(page.id, group.options[Number(button.dataset.playOption)].patch, domains);
          finish(group.key);
        };
      });
    });

    // まって: 合図の前にタップしたら「はやかったね」（待てなかった）。合図まで待てたら「いま！」を押す。
    const waitButton = root.querySelector("[data-play-wait]");
    if (waitButton) {
      const message = root.querySelector("[data-play-wait-msg]");
      let ready = false;
      let early = false;
      let timer = null;
      const arm = () => {
        ready = false;
        waitButton.textContent = "…まってね";
        waitButton.classList.remove("is-ready");
        clearTimeout(timer);
        timer = setTimeout(() => {
          ready = true;
          waitButton.textContent = "いま！ タップ";
          waitButton.classList.add("is-ready");
        }, WAIT_MS);
      };
      arm();
      waitButton.onclick = () => {
        if (!ready) {
          early = true;
          message.textContent = "はやかったね！ もういちど まってね";
          arm();
          return;
        }
        message.textContent = early ? "できたね！" : "じょうずに まてたね！";
        waitButton.disabled = true;
        ctx.session.recordPlay(page.id, { waitOk: !early }, domains);
        finish("wait");
      };
    }

    shootButton.onclick = () => {
      // 描き始めた印。撮影まで進まずに抜けると、「途中でやめない」の記録になる。
      ctx.session.recordPlay(page.id, { started: true }, { domains: page.developmentDomains ?? [] });
      openMissionCamera(ctx, page, {
      onGuidedCapture: async (dataUrl, guide) => {
        await completeMissionPhoto(ctx, page, dataUrl, {
          captureWindow: guide.frame,
          captureMask: guide.mask,
          captureFullMask: guide.fullMask,
        });
        ctx.notify?.("しゃしんを 保存したよ！");
        ctx.go("ACHIEVE", { page });
      },
      onFallback: (dataUrl) => ctx.go("PREVIEW", { page, dataUrl }),
      });
    };
    // 「しゃしんなし」ボタンは撤去済み。要素が無いのに onclick を触るとエラーになるためガード
    const tap = root.querySelector("[data-tap]");
    if (tap) {
      tap.onclick = () => {
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: null,
          missionImage: page.image, missionCharacter: page.character,
        });
        ctx.go("ACHIEVE", { page });
      };
    }
  },
};
