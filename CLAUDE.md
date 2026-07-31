# CLAUDE.md — OBSIDIAN CLUB
## Главный файл для Claude Code. Читать первым. Всегда.
## Последнее обновление: июль 2026

---

## ЧТО ТАКОЕ ЭТОТ ПРОЕКТ

**Obsidian Club** — premium private cultural ecosystem. Не dating app. Не BDSM-форум. Не магазин.

Это закрытый клуб с репутационной системой, образованием, физическими артефактами и собственной культурой — для людей в альтернативном lifestyle.

Основатель: **Max (Maksym Tsybulya)**, Украина/Флорида.
Производство физических продуктов: **Torros** (кожа, верёвки, аксессуары).
Персонаж-основатель платформы: **Lord Obsidian**.

---

## ЕДИНСТВЕННАЯ ФОРМУЛА

> FetLife дал сцене место. Obsidian Club даёт ей идентичность.

---

## ВИЗУАЛЬНАЯ ИДЕНТИЧНОСТЬ (финализирована, не менять)

- Монограмма OC: чёрная O с двойным контуром, тёмно-красная C (#8B1A1A) с двойным контуром
- Фон: #EDEAE4 (тёплый светлый)
- OBSIDIAN CLUB: шрифт Cinzel, широкий трекинг
- PRIVATE COMMUNITY: Cinzel, красный
- Это визуальный язык всего проекта — UI, маркетинг, физические продукты

---

## ТЕХНИЧЕСКИЙ СТЕК

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL) — проект: obsidian-club, регион: East US/Ohio
- **ORM**: Prisma (схема задеплоена через `prisma db push`)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Стиль**: Tailwind CSS
- **Деплой**: Vercel (планируется)
- **GitHub**: github.com/rtmaksim15 — репозиторий obsidian-club (private)

### Supabase
- Realtime включён на таблицах: messages, notifications, posts, rooms
- Admin аккаунт: lord.obsidian.oc@gmail.com (bootstrapped через скрипт)

### Google OAuth
- Проект Google Cloud: Obsidian-club
- Client ID: 857046885330-b3gf1t5tr7rglmu70mmg9rahf6nf21sj.apps.googleusercontent.com
- **Статус: РАБОТАЕТ** ✅ — вход через Google подтверждён (июль 2026)

---

## АРХИТЕКТУРА ПРОДУКТА

### Ecosystem Rule
> Каждая фича должна усиливать минимум 3 существующих системы. Если не усиливает — не строим.

### Houses System
Тематические дома внутри клуба. Каждый дом = своя культура, контент, продукты.

**Phase 1 (текущий приоритет):**
- **House of Rope** — шибари/кинбаку вертикаль

**Следующие фазы:** ещё 9 домов (leather, protocol, impact и др.)

### The Vault
Заменяет концепцию "магазина". Доступ к эксклюзивному контенту и продуктам открывается через репутацию — не через деньги напрямую.

### Signature Rope Collection
- Ежегодные лимитированные коллекции: 250 единиц
- Пронумерованные, с сертификатом, с системой передачи (transfer registry)
- Верёвка как коллекционный артефакт — этого нет ни у одного конкурента

---

## КОНКУРЕНТЫ (для понимания контекста)

| Платформа | Что делает | Наш отрыв |
|---|---|---|
| FetLife | Соцсеть без монетизации | У нас репутация + артефакты |
| KNKI | Чаты, нет культуры | У нас Houses + идентичность |
| Submit.gg | Геймификация | У нас физические продукты |
| JOYclub | Европа, платный | У нас закрытость + качество |
| Recon | Leather/gear ниша | Мы шире, но глубже в каждой нише |

---

## PRODUCT ROADMAP

### ✅ СДЕЛАНО
- GitHub репозиторий создан
- Supabase проект создан, таблицы задеплоены
- Realtime включён
- Admin аккаунт создан
- Google OAuth — работает (включая pending-заявку для новых, ещё не одобренных email)
- Базовый UI страницы входа
- Профиль пользователя (`/profile`) — базовая страница, аватар/имя/уровень/REP
- The Vault полностью заменяет Shop (Shop убран) — и теперь реальная механика: `VaultItem` (открывается по REP), `/vault` показывает реальные предметы locked/unlocked, `POST /api/admin/vault-items` для добавления
- House of Rope (Phase 1) — структура + первый реальный контент + UI: участники теперь сами могут тегировать свои посты домом в композере (`/feed`, `/library`)
- Apple Sign-In — кнопка на `/login`, готова технически, но скрыта за флагом `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` (пока `false`) — ждём Apple Developer аккаунт
- Feed & Posts MVP — фото к постам (Supabase Storage), реальные комментарии, `/posts/[id]`, лента ограничена глобальными постами + домами, в которых состоишь
- Closed Registration & Invite System — approve теперь только генерирует одноразовую invite-ссылку; аккаунт (и пароль) создаётся только при регистрации по `/invite/[token]`; `/register` заблокирован (403). Осталось вручную: выключить в Supabase Dashboard "Allow new users to sign up" — см. TECH_DEBT.md
- User Profiles — `/profile/[username]` (аватар, REP, level, дома, последние 5 постов, REP-история — только владельцу), `/profile/edit` (self-only, bio до 300 символов). Загрузка аватара переехала с UploadThing (никогда не был настроен) на Supabase Storage — тот же паттерн, что и фото постов
- Analytics Phase 0 (SPEC-analytics-panel.md) — событийный слой: `AnalyticsEvent`/`analytics_events` (не `Event`/`events` — уже заняты), `lib/analytics/track.ts` (server-only), RLS (свои события — участнику, все — админу), `track()` подключён в 11 точках. UI (консоль `/admin/insight`, зеркало в `/profile`) — отдельные, ещё не начатые задачи (Phase 1/2)
- **v1 — feed-first** (OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md, теперь в репо): REP-интерфейс отложен за флагом `lib/config/feature-flags.ts#REP_UI_ENABLED` (сейчас `false`) — REP-бейджи, разблокировки `/vault`, REP-история на `/hall`/`/profile`, `/admin/rep` (404 для всех, включая админов). Логика начисления REP не тронута, копится молча
- **v1 — Houses и levels/ranks отложены** (тот же роадмап §V, тот же паттерн флагов) — `HOUSES_UI_ENABLED`/`LEVELS_UI_ENABLED` (оба `false`): `/houses`, `/houses/[slug]`, кнопка вступления и API — теперь тизер/редирект; ярлык уровня (Initiate…Council), прогресс до следующего уровня и рамка аватара по уровню — скрыты. Комната новичков (`newcomers`) — не House, а Room, полностью работает как часть ритуала инициации. Логика (начисления HouseMembership, checkLevelUp) не тронута. Полный ритуал инициации проверен вживую end-to-end со всеми тремя флагами выключенными
- **v1 — Library отложена, Rooms сужены до Newcomers** — `LIBRARY_UI_ENABLED = false`: `/library` теперь тизер ("The Library" / "The shelves are being filled."), вкладка в навигации осталась. Две затравочные статьи House of Rope ("What Is Shibari?", "Getting Started in House of Rope") — сняты с публикации (`isPublished: false`, не удалены), независимо от флага. Комнаты `general`, 7 Local Circles и `house-of-rope` — деактивированы (`isActive: false`, не удалены) по прямому запросу Max; на `/rooms` для v1 видна только Newcomers. Проверено вживую в мобильном вьюпорте: Feed работает, Vault/Library — тизеры, Community — только Newcomers + Events
- **v1 — Feed-first simplification pass** (Threads-level simplicity): исправлен реальный баг продакшна — загрузка фото в композере падала с "Could not upload photo" из-за жёсткого лимита Vercel в 4.5MB на тело serverless-функции; переведено на signed upload URL (файл теперь идёт напрямую в Supabase Storage, минуя функцию). Композер упрощён до единственного поста (без выбора типа/заголовка), перенесён с `/feed` на отдельный экран `/compose`, открываемый с центральной кнопки "+" в нижней навигации. Нижняя навигация — 5 иконок без подписей (Feed/Community/Create Post/Vault/Profile), вкладка Library убрана (роут остался по URL). `PostCard`/`PostList` — плоский стиль без карточек, с разделителями. `/hall` (вкладка Profile) урезан до аватара/имени/Edit profile/своих постов — Reputation и Trust Score теперь тоже за `REP_UI_ENABLED`, стрик логина убран, блок "Your Invitation" — за новым флагом `REFERRALS_UI_ENABLED`. Полный аудит "что ещё видно вне v1-скоупа" — см. TECH_DEBT.md
- **v1 — компрессия фото + редирект Community** — реальные фото с iPhone всё ещё падали с "Image must be 8MB or smaller" даже после фикса signed URL. Добавлена клиентская компрессия (`lib/utils/compressImage.ts`: canvas, максимум 2048px по длинной стороне, JPEG ~0.85) перед загрузкой — применена и к фото постов, и к аватару; HEIC идёт через тот же общий пайплайн без отдельной обработки. `/rooms` теперь редиректит сразу в единственную активную комнату (Newcomers), минуя список из одного пункта и ссылку Events — чисто по данным (`rooms.length === 1`), без флага; когда активируется вторая комната, индекс вернётся сам
- **v1 — Members & Follows** (`OBSIDIAN_ROADMAP_v3.1`): `/members` — простой список активных участников (аватар, имя, строка bio), сортировка по дате вступления; фильтр/поиск — только когда участников станет больше ~30. Вход — ссылка "Members →" в шапке комнаты Newcomers. Модель `Follow` + `POST /api/users/:id/follow` (тот же toggle-паттерн, что у лайков); кнопка Follow/Following и строка "N followers · N following" на каждом публичном профиле. Лента остаётся общей хронологией — подписки её пока не фильтруют. Отзывы (список + форма) на `/profile/[username]` теперь тоже за `REP_UI_ENABLED`. `PostCard`/`PostList` получили режим `compact` (без повтора аватара/имени) — используется в "Your Posts" на `/hall`. Устаревшее уведомление "Your access has been granted" теперь пропадает автоматически после завершения ритуала

### 🔄 СЛЕДУЮЩИЙ ПРИОРИТЕТ
1. **Apple OAuth (реальные креды)** — Apple Developer аккаунт, Services ID, ключ → настроить в Supabase Dashboard → включить флаг
2. **Остальные дома** — названия и категории для оставшихся 8, когда решит Max
3. **Реальные предметы в Vault** — Max создаёт их через `POST /api/admin/vault-items`, когда определится каталог
4. **MarketplaceItem vs VaultItem** — решить, нужна ли отдельная модель для маркетплейса мерча/билетов, или Vault её заменяет тоже

### 📋 BACKLOG
- Видео посты
- Алгоритмическая лента
- Signature Rope Collection — каталог и transfer registry
- Платежи (последнее — сначала аудитория)

---

## ПРАВИЛА ДЛЯ CLAUDE CODE

1. **Читай этот файл перед каждой задачей** — он главный источник истины
2. **Не меняй визуальную идентичность** — она финализирована
3. **Проверяй Ecosystem Rule** — каждая фича должна усиливать 3+ системы
4. **Задавай вопросы в чате** если что-то неясно — не угадывай
5. **Коммить в GitHub** после каждого завершённого блока работы
6. **Обновляй этот файл** когда статус задачи меняется

---

## КОНТАКТЫ И ДОСТУПЫ

- GitHub: rtmaksim15 (username)
- Supabase: проект obsidian-club
- Google Cloud: проект Obsidian-club
- Admin email: lord.obsidian.oc@gmail.com

---

*CLAUDE.md v2.0 — Восстановлен и обновлён июль 2026*
