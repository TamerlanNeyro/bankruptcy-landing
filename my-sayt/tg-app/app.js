// app.js — Вся логика Telegram Mini App
// Банкротство физических лиц
// Структура: Telegram SDK → MockUI → Состояние → Роутер → Контроллеры экранов → Инит

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. TELEGRAM WEB APP SDK
   В Telegram: window.Telegram.WebApp — нативный объект SDK.
   В браузере (тест): используем mock с теми же методами.
═══════════════════════════════════════════════════════════════ */
const tg = window.Telegram?.WebApp || null;
// initData непустой только внутри Telegram; в браузере SDK грузится, но initData = ""
const inTelegram = !!(tg && tg.initData !== '');

/* ═══════════════════════════════════════════════════════════════
   2. MOCK — кнопки для тестирования в браузере
   Создаются только если НЕ внутри Telegram.
═══════════════════════════════════════════════════════════════ */
const Mock = {
  mainBtn: null,
  backBtn: null,
  mainCb:  null,
  backCb:  null,

  init() {
    if (inTelegram) return;

    // MainButton — синяя кнопка снизу
    this.mainBtn = document.createElement('button');
    this.mainBtn.id = 'mock-main-btn';
    this.mainBtn.style.display = 'none';
    this.mainBtn.addEventListener('click', () => this.mainCb?.());
    document.body.appendChild(this.mainBtn);

    // BackButton — ссылка «Назад» сверху
    this.backBtn = document.createElement('button');
    this.backBtn.id = 'mock-back-btn';
    this.backBtn.textContent = '← Назад';
    this.backBtn.style.display = 'none';
    this.backBtn.addEventListener('click', () => this.backCb?.());
    document.body.appendChild(this.backBtn);
  },

  showMain(text, disabled = false) {
    if (!this.mainBtn) return;
    this.mainBtn.textContent = text;
    this.mainBtn.style.display = 'block';
    this.mainBtn.classList.toggle('disabled', disabled);
    this.mainBtn.disabled = disabled;
  },
  hideMain() {
    if (this.mainBtn) this.mainBtn.style.display = 'none';
  },
  setMainCb(fn) { this.mainCb = fn; },

  showBack() { if (this.backBtn) this.backBtn.style.display = 'block'; },
  hideBack() { if (this.backBtn) this.backBtn.style.display = 'none'; },
  setBackCb(fn) { this.backCb = fn; },
};

/* ═══════════════════════════════════════════════════════════════
   3. ОБЁРТКИ ДЛЯ TG API
   Единый интерфейс — работает и в TG, и в браузере.
═══════════════════════════════════════════════════════════════ */
let _mainHandler = null;
let _backHandler = null;

const Btn = {
  // Главная кнопка (снизу экрана в TG)
  main: {
    show(text, cb, disabled = false) {
      // Снимаем предыдущий обработчик
      if (_mainHandler && inTelegram) tg.MainButton.offClick(_mainHandler);
      _mainHandler = cb;
      if (inTelegram) {
        tg.MainButton.setText(text);
        if (cb) tg.MainButton.onClick(cb);
        disabled ? tg.MainButton.disable() : tg.MainButton.enable();
        tg.MainButton.show();
      } else {
        Mock.showMain(text, disabled);
        Mock.setMainCb(cb);
      }
    },
    hide() {
      if (_mainHandler && inTelegram) tg.MainButton.offClick(_mainHandler);
      _mainHandler = null;
      inTelegram ? tg.MainButton.hide() : Mock.hideMain();
    },
    enable() {
      inTelegram ? tg.MainButton.enable() : (() => {
        if (Mock.mainBtn) { Mock.mainBtn.disabled = false; Mock.mainBtn.classList.remove('disabled'); }
      })();
    },
    disable() {
      inTelegram ? tg.MainButton.disable() : (() => {
        if (Mock.mainBtn) { Mock.mainBtn.disabled = true; Mock.mainBtn.classList.add('disabled'); }
      })();
    },
    loading(on) {
      if (inTelegram) {
        on ? tg.MainButton.showProgress() : tg.MainButton.hideProgress();
      } else {
        if (Mock.mainBtn) Mock.mainBtn.textContent = on ? '⏳ Отправка...' : (_mainHandler?.name || '');
      }
    },
  },

  // Кнопка «Назад» (в шапке TG)
  back: {
    show(cb) {
      try { if (_backHandler && inTelegram) tg.BackButton.offClick(_backHandler); } catch(e) {}
      _backHandler = cb;
      if (inTelegram) {
        try { if (cb) tg.BackButton.onClick(cb); tg.BackButton.show(); return; } catch(e) {}
      }
      Mock.setBackCb(cb);
      Mock.showBack();
    },
    hide() {
      try { if (_backHandler && inTelegram) tg.BackButton.offClick(_backHandler); } catch(e) {}
      _backHandler = null;
      try { if (inTelegram) { tg.BackButton.hide(); return; } } catch(e) {}
      Mock.hideBack();
    },
  },
};

// Haptic feedback — работает только в TG
const Haptic = {
  tap()     { inTelegram && tg.HapticFeedback?.impactOccurred('light'); },
  success() { inTelegram && tg.HapticFeedback?.notificationOccurred('success'); },
  error()   { inTelegram && tg.HapticFeedback?.notificationOccurred('error'); },
};

// Облачное хранилище — в браузере / старых версиях TG заменяем на localStorage
const _lsSet = (k, v) => { try { localStorage.setItem('tma_' + k, v); } catch(e) {} };
const _lsGet = (k) => { try { return localStorage.getItem('tma_' + k); } catch(e) { return null; } };
const _lsRm  = (k) => { try { localStorage.removeItem('tma_' + k); } catch(e) {} };

const Store = {
  set(key, val, cb) {
    if (inTelegram) {
      try { tg.CloudStorage.setItem(key, val, cb); return; } catch(e) {}
    }
    _lsSet(key, val);
    cb?.(null, true);
  },
  get(key, cb) {
    if (inTelegram) {
      try { tg.CloudStorage.getItem(key, cb); return; } catch(e) {}
    }
    cb(null, _lsGet(key));
  },
  remove(key, cb) {
    if (inTelegram) {
      try { tg.CloudStorage.removeItem(key, cb); return; } catch(e) {}
    }
    _lsRm(key);
    cb?.(null, true);
  },
};

/* ═══════════════════════════════════════════════════════════════
   4. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
═══════════════════════════════════════════════════════════════ */
const state = {
  user:            inTelegram ? (tg.initDataUnsafe?.user || null) : null,
  quizStep:        1,
  quizAnswers:     {},     // { debt: 'medium', housing: 'own', ... }
  selectedSvcId:   null,   // ID выбранной услуги
  formContext:     'home', // откуда открыта форма
  phoneShared:     false,  // поделился ли номером через requestContact
  phone:           '',     // телефон (из requestContact или вручную)
  selectedTime:    '',     // утром / днём / вечером

  // Экраны с Tab Bar
  tabScreens: new Set(['home', 'services', 'about']),

  // История навигации
  history: [],
};

/* ═══════════════════════════════════════════════════════════════
   5. РОУТЕР
   go(id)     — переход вперёд
   back()     — шаг назад по истории
═══════════════════════════════════════════════════════════════ */
const Router = {

  go(screenId, opts = {}) {
    const prev = state.history[state.history.length - 1];

    // Пишем в историю
    if (opts.replace) {
      state.history = [screenId];
    } else if (!opts.noHistory) {
      state.history.push(screenId);
    }

    // Переключаем экраны
    document.querySelectorAll('.screen').forEach(el => {
      if (el.classList.contains('active')) {
        el.classList.add('slide-out');
        el.classList.remove('active');
        setTimeout(() => el.classList.remove('slide-out'), 260);
      }
    });
    const next = document.getElementById('screen-' + screenId);
    if (next) {
      next.classList.remove('slide-out');
      next.classList.add('active');
      // Скролл наверх при смене экрана
      setTimeout(() => { next.scrollTop = 0; }, 50);
    }

    // Tab Bar
    const showTab = state.tabScreens.has(screenId);
    const tabBar = document.getElementById('tab-bar');
    tabBar.classList.toggle('hidden', !showTab);
    if (showTab) {
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === screenId)
      );
    }

    // Back Button — показываем если есть куда возвращаться
    const canBack = state.history.length > 1 && !['splash','welcome','home','success'].includes(screenId);
    if (canBack) {
      Btn.back.show(() => Router.back());
    } else {
      Btn.back.hide();
    }

    // Инициализируем контент экрана
    const ctrl = screens[screenId];
    if (ctrl) ctrl.init(opts);
  },

  back() {
    if (state.history.length <= 1) return;
    state.history.pop();
    const prev = state.history[state.history.length - 1];
    this.go(prev, { noHistory: true });
  },
};

/* ═══════════════════════════════════════════════════════════════
   6. КОНТРОЛЛЕРЫ ЭКРАНОВ
   Каждый экран — объект с методом init().
═══════════════════════════════════════════════════════════════ */
const screens = {

  /* ─── СПЛЭШ ─────────────────────────────────────────────── */
  splash: {
    init() {
      Btn.main.hide();
      Btn.back.hide();

      setTimeout(() => {
        // Если квиз уже пройден — открываем Home с таббаром
        Store.get('quiz_done', (err, done) => {
          if (done) {
            Router.go('home', { replace: true });
            return;
          }
          // Иначе — Welcome, восстанавливаем незаконченный квиз если есть
          Store.get('quiz_answers', (err2, val) => {
            if (val) {
              try {
                const saved = JSON.parse(val);
                if (Object.keys(saved).length > 0) state.quizAnswers = saved;
              } catch(e) {}
            }
            Router.go('welcome', { replace: true });
          });
        });
      }, 1500);
    },
  },

  /* ─── WELCOME ────────────────────────────────────────────── */
  welcome: {
    init() {
      // Персональное приветствие с именем из Telegram
      const name = state.user?.first_name;
      const h = new Date().getHours();
      const greet = h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
      const greetEl = document.getElementById('welcome-user-greeting');
      if (greetEl) greetEl.textContent = name ? `${greet}, ${name}! 👋` : `${greet}! 👋`;

      Btn.main.show('Узнать, подхожу ли я →', () => {
        state.quizStep = 1;
        state.quizAnswers = {};
        Router.go('quiz');
      });

      // Баннер «продолжить квиз» — если есть сохранённые ответы
      const savedStep = Object.keys(state.quizAnswers).length;
      const banner = document.getElementById('resume-banner');
      if (savedStep > 0 && savedStep < 5) {
        banner.classList.remove('hidden');
        document.getElementById('btn-resume').onclick = () => {
          state.quizStep = savedStep + 1;
          Router.go('quiz');
        };
        document.getElementById('btn-restart-quiz').onclick = () => {
          state.quizAnswers = {};
          Store.remove('quiz_answers');
          banner.classList.add('hidden');
        };
      } else {
        banner.classList.add('hidden');
      }
    },
  },

  /* ─── ГЛАВНАЯ ────────────────────────────────────────────── */
  home: {
    init() {
      Btn.main.hide();

      // Приветствие с именем из Telegram
      const name = state.user?.first_name;
      const h = new Date().getHours();
      const greet = h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
      document.getElementById('home-greeting').textContent =
        name ? `${greet}, ${name}! 👋` : `${greet}! 👋`;

      // Кнопка «Пройти диагностику» в hero-блоке
      document.getElementById('btn-quiz-home').onclick = () => {
        state.quizStep = 1;
        state.quizAnswers = {};
        Router.go('quiz');
      };

      // Карточки быстрых действий
      document.querySelectorAll('.action-card').forEach(btn => {
        btn.onclick = () => {
          const dest = btn.dataset.goto;
          if (dest === 'form') state.formContext = 'home';
          if (dest === 'quiz') { state.quizStep = 1; state.quizAnswers = {}; }
          Router.go(dest);
        };
      });

      // Кнопка «Поделиться с другом»
      const shareFriendBtn = document.getElementById('btn-share-friend');
      if (shareFriendBtn) {
        shareFriendBtn.onclick = () => {
          const botUsername = APP_DATA.contact.telegram || 'Spisanie_cred_bot';
          const url = `https://t.me/${botUsername}`;
          const text = 'Бесплатная диагностика банкротства — 5 вопросов, честный результат';
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
          if (inTelegram) tg.openTelegramLink(shareUrl);
          else window.open(shareUrl, '_blank');
        };
      }
    },
  },

  /* ─── КВИЗ ───────────────────────────────────────────────── */
  quiz: {
    init() {
      this.renderStep(state.quizStep);
    },

    renderStep(stepNum) {
      const data = APP_DATA.quiz.steps[stepNum - 1];
      const total = APP_DATA.quiz.steps.length;

      // Прогресс-бар
      document.getElementById('quiz-step-num').textContent = stepNum;
      document.getElementById('quiz-fill').style.width = `${(stepNum / total) * 100}%`;

      // Рендер вопроса и вариантов
      // Оборачиваем в .quiz-step-inner — новый элемент каждый раз → анимация воспроизводится
      const body = document.getElementById('quiz-step-body');
      body.innerHTML = `<div class="quiz-step-inner">
        <div class="quiz-question">${data.question}</div>
        <div class="quiz-options">
          ${data.options.map(opt => `
            <button class="quiz-option ${state.quizAnswers[data.id] === opt.id ? 'selected' : ''}"
                    data-step="${data.id}" data-opt="${opt.id}">
              <span style="flex:1;text-align:left">${opt.label}</span>
              <span class="quiz-check">${state.quizAnswers[data.id] === opt.id ? '✓' : ''}</span>
            </button>
          `).join('')}
        </div>
        <div id="quiz-hint" class="quiz-hint hidden"></div>
      </div>`;

      // Если уже есть ответ — показываем hint
      const prevAnswer = state.quizAnswers[data.id];
      if (prevAnswer) {
        const opt = data.options.find(o => o.id === prevAnswer);
        if (opt?.hint) this.showHint(opt.hint, opt.hintType);
        this.updateMainBtn(stepNum, total, true);
      } else {
        this.updateMainBtn(stepNum, total, false);
      }

      // Клики по вариантам ответа
      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const stepId = btn.dataset.step;
          const optId  = btn.dataset.opt;

          state.quizAnswers[stepId] = optId;
          Store.set('quiz_answers', JSON.stringify(state.quizAnswers));
          Haptic.tap();

          // Визуальное выделение выбранного
          document.querySelectorAll('.quiz-option').forEach(b => {
            const isSelected = b.dataset.opt === optId;
            b.classList.toggle('selected', isSelected);
            b.querySelector('.quiz-check').textContent = isSelected ? '✓' : '';
          });

          // Подсказка (hint) под вариантами
          const opt = data.options.find(o => o.id === optId);
          if (opt?.hint) {
            this.showHint(opt.hint, opt.hintType || 'success');
          } else {
            document.getElementById('quiz-hint').classList.add('hidden');
          }

          this.updateMainBtn(stepNum, total, true);
        });
      });

      // Кнопка «Назад»
      if (stepNum > 1) {
        Btn.back.show(() => {
          state.quizStep--;
          this.renderStep(state.quizStep);
        });
      } else {
        // Шаг 1 — назад возвращает на Welcome
        Btn.back.show(() => Router.back());
      }
    },

    showHint(text, type) {
      const el = document.getElementById('quiz-hint');
      el.className = `quiz-hint ${type === 'warning' ? 'warning' : 'success'}`;
      el.textContent = text;
    },

    updateMainBtn(stepNum, total, hasAnswer) {
      const isLast = stepNum === total;
      const btnText = isLast ? 'Узнать результат →' : 'Далее →';

      Btn.main.show(btnText, () => {
        if (isLast) {
          Store.set('quiz_done', 'true');
          Store.set('quiz_answers', JSON.stringify(state.quizAnswers));
          Router.go('result');
        } else {
          state.quizStep++;
          this.renderStep(state.quizStep);
        }
      }, !hasAnswer);
    },
  },

  /* ─── РЕЗУЛЬТАТ КВИЗА ────────────────────────────────────── */
  result: {
    init() {
      const type = this.calculate();
      const data = APP_DATA.quiz.results[type];

      document.getElementById('result-icon').textContent     = data.icon;
      document.getElementById('result-title').textContent    = data.title;
      document.getElementById('result-subtitle').textContent = data.subtitle;
      document.getElementById('result-disclaimer').textContent = APP_DATA.resultDisclaimer;

      document.getElementById('result-benefits').innerHTML =
        data.benefits.map(b => `<div class="result-benefit">${b}</div>`).join('');

      Haptic.success();

      // Главная кнопка → форма заявки
      Btn.main.show('Записаться бесплатно →', () => {
        state.formContext = 'result';
        Router.go('form');
      });

      // Ссылка «Пройти заново»
      document.getElementById('btn-retake').onclick = () => {
        state.quizStep = 1;
        state.quizAnswers = {};
        Store.remove('quiz_answers');
        Router.go('quiz', { noHistory: true });
        state.history[state.history.length - 1] = 'quiz';
      };
    },

    // Логика вычисления результата по ответам
    calculate() {
      const a = state.quizAnswers;

      // Бесплатное МФЦ: долг до 1 млн, нет дохода или пенсия, просрочка > 3 мес
      const mfcDebt    = a.debt === 'low' || a.debt === 'medium';
      const mfcHousing = a.housing !== 'mortgage';
      const mfcIncome  = a.income === 'none' || a.income === 'pension';
      const mfcOverdue = a.overdue === 'long';
      if (mfcDebt && mfcHousing && mfcIncome && mfcOverdue) return 'mfc';

      // Судебное: долг средний или большой, есть просрочка
      const courtDebt   = a.debt === 'medium' || a.debt === 'high';
      const courtOverdue = a.overdue === 'long' || a.overdue === 'short';
      if (courtDebt && courtOverdue) return 'court';

      // Всё остальное — индивидуальный анализ
      return 'individual';
    },
  },

  /* ─── УСЛУГИ ─────────────────────────────────────────────── */
  services: {
    init() {
      Btn.main.hide();

      const list = document.getElementById('service-list');
      list.innerHTML = APP_DATA.services.map(s => `
        <button class="service-card-btn" data-svc="${s.id}">
          <span class="svc-icon">${s.icon}</span>
          <div class="svc-body">
            <div class="svc-name">${s.name}</div>
            <div class="svc-desc">${s.description}</div>
            <span class="svc-tag">${s.tag}</span>
            <span class="svc-for">Для кого: ${s.forWhom.join(' · ')}</span>
          </div>
          <span class="chevron" style="margin-top:4px">›</span>
        </button>
      `).join('');

      list.querySelectorAll('.service-card-btn').forEach(btn => {
        btn.onclick = () => {
          state.selectedSvcId = btn.dataset.svc;
          Router.go('service-card');
        };
      });
    },
  },

  /* ─── КАРТОЧКА УСЛУГИ ────────────────────────────────────── */
  'service-card': {
    init() {
      const svc = APP_DATA.services.find(s => s.id === state.selectedSvcId);
      if (!svc) { Router.go('services'); return; }

      document.getElementById('service-card-body').innerHTML = `
        <div class="svc-full-icon">${svc.icon}</div>
        <h2 class="screen-title">${svc.name}</h2>
        <div class="tag-pills">
          <span class="tag-pill">${svc.price}</span>
          <span class="tag-pill">Срок: ${svc.duration}</span>
        </div>
        <p class="screen-sub">${svc.description}</p>

        <p class="section-label">Что входит</p>
        <ul class="checklist">
          ${svc.whatWeDo.map(item => `<li>${item}</li>`).join('')}
        </ul>

        ${svc.note ? `<div class="note-card">ℹ️ ${svc.note}</div>` : ''}

        <p class="section-label">Для кого</p>
        <div class="tag-pills" style="margin-bottom:20px">
          ${svc.forWhom.map(t => `<span class="tag-pill">${t}</span>`).join('')}
        </div>

        <div class="disclaimer-card">⚠️ ${svc.disclaimer}</div>
      `;

      Btn.main.show('Записаться на консультацию →', () => {
        state.formContext = 'service';
        Router.go('form');
      });
    },
  },

  /* ─── ФОРМА ЗАЯВКИ ───────────────────────────────────────── */
  form: {
    init() {
      // Предзаполняем имя из Telegram
      const nameInput = document.getElementById('inp-name');
      if (state.user?.first_name && !nameInput.value) {
        nameInput.value = state.user.first_name;
      }

      // Кнопка «Поделиться номером»
      const shareBtn = document.getElementById('btn-share');
      const phoneFallback = document.getElementById('phone-fallback');

      if (state.phoneShared) {
        // Уже поделился — показываем подтверждение
        shareBtn.textContent = `✅ ${state.phone}`;
        shareBtn.disabled = true;
      } else {
        shareBtn.textContent = '📱 Поделиться номером из Telegram';
        shareBtn.disabled = false;
        shareBtn.onclick = () => {
          if (inTelegram) {
            tg.requestContact((ok, data) => {
              if (ok && data?.contact?.phone_number) {
                state.phone = data.contact.phone_number;
                state.phoneShared = true;
                shareBtn.textContent = `✅ ${state.phone}`;
                shareBtn.disabled = true;
                phoneFallback.classList.add('hidden');
              } else {
                // Отказал — показываем поле ввода
                phoneFallback.classList.remove('hidden');
              }
              this.validate();
            });
          } else {
            // В браузере — сразу показываем поле ввода
            phoneFallback.classList.remove('hidden');
          }
        };
      }

      // Валидация при вводе телефона
      const phoneInput = document.getElementById('inp-phone');
      phoneInput.addEventListener('input', () => this.validate());
      nameInput.addEventListener('input', () => this.validate());

      // Выбор времени
      document.querySelectorAll('.pill').forEach(pill => {
        pill.classList.toggle('selected', pill.dataset.time === state.selectedTime);
        pill.onclick = () => {
          state.selectedTime = pill.dataset.time;
          document.querySelectorAll('.pill').forEach(p =>
            p.classList.toggle('selected', p.dataset.time === state.selectedTime)
          );
          this.validate();
        };
      });

      // Чекбокс согласия
      document.getElementById('inp-consent').addEventListener('change', () => this.validate());

      // Ссылка на политику конфиденциальности
      document.getElementById('link-privacy').onclick = (e) => {
        e.preventDefault();
        if (inTelegram) tg.openLink(APP_DATA.contact.privacyUrl);
        else window.open(APP_DATA.contact.privacyUrl, '_blank');
      };

      // Защита от случайного закрытия при заполнении формы
      if (inTelegram) tg.ClosingConfirmation?.enable();

      // Главная кнопка (изначально disabled)
      Btn.main.show('Отправить заявку →', () => this.submit(), true);
      this.validate();
    },

    validate() {
      const name  = document.getElementById('inp-name').value.trim();
      const phone = state.phoneShared
        ? state.phone
        : document.getElementById('inp-phone').value.trim();
      const consent = document.getElementById('inp-consent').checked;
      const hasPhone = phone.replace(/\D/g, '').length >= 10;

      if (name && hasPhone && consent) {
        Btn.main.enable();
      } else {
        Btn.main.disable();
      }
    },

    submit() {
      const name  = document.getElementById('inp-name').value.trim();
      const phone = state.phoneShared
        ? state.phone
        : document.getElementById('inp-phone').value.trim();

      // Формируем данные заявки
      const payload = {
        name,
        phone,
        time:        state.selectedTime || 'не указано',
        source:      state.formContext,
        quizAnswers: state.quizAnswers,
        userId:      state.user?.id || null,
        username:    state.user?.username || null,
      };

      Btn.main.loading(true);

      // ─── ОТПРАВКА НА БЭКЕНД ─────────────────────────────────
      // В продакшене замените этот блок на реальный fetch:
      //
      //   fetch(APP_DATA.contact.webhookUrl, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(payload),
      //   })
      //   .then(r => { if (!r.ok) throw new Error(); onSuccess(); })
      //   .catch(() => onError());
      //
      // Сейчас — имитация задержки (1.5 сек), затем успех:
      // ────────────────────────────────────────────────────────
      const onSuccess = () => {
        Btn.main.loading(false);
        if (inTelegram) tg.ClosingConfirmation?.disable();
        Store.set('quiz_answers', '{}');
        state.quizAnswers = {};
        Haptic.success();
        Router.go('success');
      };

      const onError = () => {
        Btn.main.loading(false);
        Haptic.error();
        if (inTelegram) {
          tg.showAlert('Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в Telegram.');
        } else {
          alert('Ошибка отправки. Проверьте соединение.');
        }
      };

      // Заглушка — удалить после подключения реального бэкенда:
      if (!APP_DATA.contact.webhookUrl) {
        setTimeout(onSuccess, 1500);
        return;
      }

      // Реальная отправка:
      fetch(APP_DATA.contact.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then(r => { if (!r.ok) throw new Error(); onSuccess(); })
      .catch(onError);
    },
  },

  /* ─── УСПЕХ ──────────────────────────────────────────────── */
  success: {
    init() {
      Btn.main.hide();
      Btn.back.hide(); // Нельзя вернуться и отправить повторно

      document.getElementById('btn-to-home').onclick = () => {
        Router.go('home', { replace: true });
      };
    },
  },

  /* ─── О НАС ─────────────────────────────────────────────── */
  about: {
    init() {
      Btn.main.hide();

      const l = APP_DATA.lawyer;
      const c = APP_DATA.company;
      const contact = APP_DATA.contact;

      document.getElementById('about-body').innerHTML = `
        <!-- Карточка юриста -->
        <div class="lawyer-card">
          <div class="lawyer-avatar"><img src="lawyer.jpg" alt="${l.name}"></div>
          <div>
            <span class="lawyer-name">${l.name}</span>
            <span class="lawyer-title">${l.title}</span>
            <span class="lawyer-spec">${l.specialization}</span>
          </div>
        </div>

        <p style="font-size:14px;color:var(--hint);margin-bottom:20px;line-height:1.55">${l.bio}</p>

        <!-- Статистика -->
        <div class="stats-row">
          <div class="stat-box">
            <span class="stat-val">${l.stats.cases}</span>
            <span class="stat-lbl">завершённых дел</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">${l.stats.totalDebt}</span>
            <span class="stat-lbl">сопровождено к списанию</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">${l.stats.successRate}*</span>
            <span class="stat-lbl">успешных дел</span>
          </div>
        </div>
        <p class="stat-note">*без абсолютных гарантий, каждое дело индивидуально</p>

        <!-- Реквизиты (аккордеон) -->
        <details class="accordion">
          <summary>Реквизиты организации</summary>
          <div class="accordion-body">
            <div>${c.name}</div>
            <div>ИНН: ${c.inn}</div>
            <div>ОГРНИП: ${c.ogrnip}</div>
            <div>Адрес: ${c.address}</div>
            <div>Email: ${c.email}</div>
          </div>
        </details>

        <!-- Ссылки -->
        <div class="about-links">
          <a class="about-link" href="#" data-link="privacy">Политика конфиденциальности</a>
          <a class="about-link" href="#" data-link="offer">Публичная оферта</a>
        </div>

        <!-- Обязательный дисклеймер по ст. 28.1 38-ФЗ -->
        <div class="legal-warn">
          ⚠️ ${APP_DATA.legalWarning}
        </div>
      `;

      // Ссылки открываем через TG openLink
      document.querySelectorAll('[data-link]').forEach(a => {
        a.onclick = (e) => {
          e.preventDefault();
          const url = a.dataset.link === 'privacy' ? contact.privacyUrl : contact.offerUrl;
          if (inTelegram) tg.openLink(url);
          else window.open(url, '_blank');
        };
      });
    },
  },

  /* ─── ОШИБКА ─────────────────────────────────────────────── */
  error: {
    init() {
      Btn.main.hide();
      document.getElementById('btn-retry').onclick = () => {
        // Возвращаемся к предпоследнему экрану в истории
        const prev = state.history[state.history.length - 2] || 'home';
        Router.go(prev, { noHistory: true });
      };
    },
  },
};

/* ═══════════════════════════════════════════════════════════════
   7. TAB BAR — навигация по вкладкам
═══════════════════════════════════════════════════════════════ */
function initTabBar() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      // Для квиза всегда сбрасываем шаг
      if (tab === 'quiz') {
        state.quizStep = 1;
        state.quizAnswers = {};
      }
      Router.go(tab);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   8. ОФФЕР-МОДАЛКА (показывается один раз при первом открытии)
═══════════════════════════════════════════════════════════════ */
const Offer = {
  STORAGE_KEY: 'tma_offer_seen',

  init() {
    const seen = localStorage.getItem(this.STORAGE_KEY);
    if (seen) return; // уже видел — не показываем

    const overlay = document.getElementById('offer-overlay');
    const cta     = document.getElementById('offer-cta');
    const skip    = document.getElementById('offer-skip');

    // Ссылка на бота с UTM-меткой
    const botUsername = APP_DATA.contact.telegram || 'YOUR_BOT_USERNAME';
    cta.href = `https://t.me/${botUsername}?start=from_app`;

    // Показываем через 1.5 сек (после сплэша)
    setTimeout(() => {
      overlay.classList.remove('hidden');
    }, 1600);

    // Клик по кнопке — открываем бота и закрываем
    cta.addEventListener('click', () => {
      this.close();
      if (inTelegram) tg.openTelegramLink(cta.href);
    });

    // Пропустить
    skip.addEventListener('click', () => this.close());

    // Клик по фону — закрыть
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  },

  close() {
    localStorage.setItem(this.STORAGE_KEY, '1');
    const overlay = document.getElementById('offer-overlay');
    overlay.style.animation = 'offer-fade-out 0.2s ease forwards';
    setTimeout(() => overlay.classList.add('hidden'), 220);
  },
};

/* ═══════════════════════════════════════════════════════════════
   9. ИНИЦИАЛИЗАЦИЯ
═══════════════════════════════════════════════════════════════ */
function init() {
  // Расширяем WebApp на весь экран и сигнализируем о готовности
  if (inTelegram) {
    tg.expand();
    tg.ready();
    // Применяем цвета темы Telegram к CSS-переменным
    applyTelegramTheme();
    // Следим за изменением темы (пользователь переключает TG-тему)
    tg.onEvent('themeChanged', applyTelegramTheme);
  }

  Mock.init();
  initTabBar();
  Offer.init();

  // Запуск с экрана Splash
  screens.splash.init();
}

function applyTelegramTheme() {
  if (!inTelegram) return;
  const tp = tg.themeParams;
  const r  = document.documentElement;

  const map = {
    bg_color:            '--tg-theme-bg-color',
    secondary_bg_color:  '--tg-theme-secondary-bg-color',
    text_color:          '--tg-theme-text-color',
    hint_color:          '--tg-theme-hint-color',
    link_color:          '--tg-theme-link-color',
    button_color:        '--tg-theme-button-color',
    button_text_color:   '--tg-theme-button-text-color',
  };

  Object.entries(map).forEach(([key, cssVar]) => {
    if (tp[key]) r.style.setProperty(cssVar, tp[key]);
  });

  // Класс dark на body для вспомогательных стилей
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
}

// Стартуем при загрузке страницы
document.addEventListener('DOMContentLoaded', init);
