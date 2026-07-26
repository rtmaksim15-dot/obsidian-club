# SPEC: Analytics Layer & Panels — Obsidian Club

Version 1.0 · Week 2 sprint · Target: end of July 2026

---

## 0. CONTEXT BLOCK (для Claude Code)

```
REPO:        rtmaksim15-dot/obsidian-club  (~/obsidian-club)
STACK:       Next.js (App Router) + Prisma + Supabase (Postgres, RLS, Realtime)
             Tailwind — tokens: ob-black, ob-accent
             Type: Cinzel (headings), Cormorant (editorial), Inter (data/UI)
MODEL:       Sonnet 5
EXISTING:    /profile (REP system), /house-of-rope, /vault, admin account bootstrapped,
             Realtime on messages, notifications, posts, rooms
BRAND RULE:  no emoji, no gradients, no rounded-full cards. Restrained, editorial,
             high contrast. Numbers in Inter tabular-nums. Section titles in Cinzel.
ECOSYSTEM RULE: every feature must strengthen ≥3 existing systems.
```

**Что строим:** единый событийный слой и два интерфейса поверх него —
операторская консоль (внутренняя) и зеркало участника (публичное, в /profile).

**Что НЕ строим:** 3D-граф памяти, открытый лидерборд, дашборд ради дашборда.

---

## 1. РЕШЕНИЯ, ПРИНЯТЫЕ ЗАРАНЕЕ

| Вопрос | Решение | Почему |
|---|---|---|
| Порядок сборки | Фаза 0 (события) → Фаза 1 (консоль) → Фаза 2 (зеркало) | События невосстановимы задним числом. Консоль раньше зеркала, потому что она скажет, что именно показывать участникам. |
| Прозрачность трекинга | Открыто. Блок «Как считается репутация» в /profile | Клуб построен на чести и репутации. Скрытый трекинг противоречит собственной философии и создаёт риск при первой же утечке. |
| Кто пишет события | Только сервер (server actions / route handlers), service role | Клиентские события подделываются. REP, начисленный по подделанному событию, обесценивает всю систему. |
| Лидерборд | Нет | Публичный рейтинг превращает репутацию в гонку и выдавливает тихих участников. Ранги — да, рейтинг — нет. |

**Проверка Ecosystem Rule:** событийный слой усиливает REP (проверяемые начисления),
The Vault (сигнал спроса до производства), House of Rope (реальная вовлечённость),
инвайт-экономику (качество приглашённых). 4 из 4 — правило выполнено.

---

## 2. ФАЗА 0 — СОБЫТИЙНЫЙ СЛОЙ

### 2.1 Prisma schema

```prisma
model Event {
  id        String   @id @default(cuid())
  userId    String?
  type      String                    // namespaced, см. 2.2
  entity    String?                   // "vault_item" | "post" | "house" | "invite"
  entityId  String?
  meta      Json?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([entity, entityId])
  @@map("events")
}
```

`userId` — nullable и `SetNull`: удаление участника не должно ломать агрегаты.

### 2.2 Таксономия событий

Формат: `domain.action`. Изменение существующего типа запрещено — только новый тип.

```
auth.signup              meta: { provider }
auth.login               meta: { provider }
waitlist.submitted       meta: { source }
waitlist.approved        meta: { reviewedBy, waitDays }
waitlist.rejected        meta: { reason }

house.viewed             entity: house
post.created             entity: post
post.replied             entity: post,  meta: { parentId }
post.reacted             entity: post

vault.item_viewed        entity: vault_item
vault.item_claimed       entity: vault_item, meta: { repSpent }
vault.item_locked_hit    entity: vault_item, meta: { repShort }   // ключевое

rep.granted              meta: { amount, reason, sourceEvent }
rank.changed             meta: { from, to }

invite.sent              entity: invite
invite.accepted          entity: invite, meta: { inviterId, daysToAccept }

search.performed         meta: { query, resultsCount }            // ключевое
profile.viewed           entity: user
```

Два типа помечены как ключевые — `vault.item_locked_hit` и `search.performed`.
Они отвечают на вопрос «чем мы можем быть полезны», остальные только описывают, что уже происходит.

### 2.3 Хелпер

`lib/analytics/track.ts`

```ts
import 'server-only';

type TrackInput = {
  userId?: string | null;
  type: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

export async function track(input: TrackInput): Promise<void> {
  try {
    await prisma.event.create({ data: { ...input, meta: input.meta ?? undefined } });
  } catch (err) {
    console.error('[analytics] track failed', input.type, err);
    // никогда не бросаем — аналитика не должна ронять пользовательский поток
  }
}
```

`import 'server-only'` — обязательно. Это единственная гарантия, что хелпер не утечёт в клиент.

### 2.4 RLS (Supabase)

```sql
alter table events enable row level security;

-- запись: только service role (политика не нужна, service role обходит RLS)

-- участник видит только свои события
create policy events_own_read on events
  for select using (auth.uid()::text = "userId");

-- админ видит всё
create policy events_admin_read on events
  for select using (
    exists (select 1 from users u
            where u.id = auth.uid()::text and u.role = 'ADMIN')
  );
```

### 2.5 Точки внедрения

Проставить `track()` в существующих server actions:

- `app/api/auth/callback` → `auth.login`, `auth.signup`
- форма заявки → `waitlist.submitted`
- админское одобрение → `waitlist.approved` / `waitlist.rejected`
- `/house-of-rope` page → `house.viewed`
- создание поста/ответа → `post.created`, `post.replied`
- `/vault` — просмотр карточки → `vault.item_viewed`; попытка при нехватке REP → `vault.item_locked_hit`; получение → `vault.item_claimed`
- начисление REP → `rep.granted` (в той же транзакции, что и само начисление)
- поиск → `search.performed`

---

## 3. ФАЗА 1 — ОПЕРАТОРСКАЯ КОНСОЛЬ `/admin/insight`

Четыре блока. Не добавлять пятый без удаления одного из существующих.

### Блок A — Воронка доступа

```
Заявки (30д) → Одобрено → Активирован → Удержан
```

- **Активирован** = ≥1 событие вне домена `auth` в течение 7 дней после одобрения
- **Удержан** = ≥1 событие на 30-й день после одобрения

```sql
with approved as (
  select "userId", "createdAt" as approved_at
  from events where type = 'waitlist.approved'
),
activated as (
  select distinct a."userId"
  from approved a
  join events e on e."userId" = a."userId"
   and e."createdAt" between a.approved_at and a.approved_at + interval '7 days'
   and e.type not like 'auth.%'
)
select
  (select count(*) from approved) as approved,
  (select count(*) from activated) as activated;
```

Целевой ориентир для закрытого клуба: активация ≥60%. Ниже 40% — проблема
не в наборе людей, а в первом экране после входа.

### Блок B — Здоровье ядра

- **Живые**: distinct userId с ≥1 неавторизационным событием за 14 дней ÷ всего одобренных
- **Концентрация**: доля всех событий, приходящаяся на топ-10% участников

```sql
with counts as (
  select "userId", count(*) c
  from events
  where "createdAt" > now() - interval '30 days'
    and type not like 'auth.%' and "userId" is not null
  group by 1
),
ranked as (
  select c, ntile(10) over (order by c desc) as decile from counts
)
select
  round(100.0 * sum(c) filter (where decile = 1) / nullif(sum(c),0), 1)
  as top_decile_share_pct
from ranked;
```

Выше ~70% — клуб держится на нескольких людях и рухнет, если двое уйдут.
Это метрика риска, а не тщеславия. Выводить с явным порогом, окрашивая в `ob-accent` при превышении.

### Блок C — Сигналы пользы

Самый ценный блок. Не график — **рабочий список**, каждая строка с действием.

1. **Запросы без результата** — `search.performed` где `meta->>'resultsCount' = '0'`,
   сгруппировать по нормализованному запросу, порядок по частоте.
   *Действие: создать материал / предмет Vault.*
2. **Спрос выше доступа** — `vault.item_locked_hit`, сгруппировать по `entityId`,
   с медианой `meta->>'repShort'`.
   *Действие: пересмотреть порог или выпустить промежуточный предмет.*
3. **Смотрят, но не берут** — `vault.item_viewed` без последующего `claimed` у того же участника за 14 дней.
   *Действие: переписать описание предмета или снять его.*
4. **Вопросы без ответа** — посты старше 48 часов с нулём ответов.
   *Действие: ответить лично. Это прямая обязанность оператора, а не метрика.*

### Блок D — Риск ухода

Таблица, не график:

| Участник | Ранг | REP | Последнее действие | Тренд 14д |
|---|---|---|---|---|

Строки: последнее событие >21 дня назад, ИЛИ падение числа событий за 14 дней
более чем на 50% относительно предыдущих 14. Сортировка по REP убывающе —
сначала те, чей уход дороже всего.

### Доступ и производительность

- Route guard: `role === 'ADMIN'`, иначе 404 (не 403 — не подтверждаем существование раздела)
- Все запросы — server components, без клиентского фетча
- `revalidate = 300`. Кнопка ручного обновления.
- Графики: recharts, только линия и столбец. Никаких пончиков и радаров.

---

## 4. ФАЗА 2 — ЗЕРКАЛО УЧАСТНИКА (в `/profile`)

Принцип: показываем только то, что человек может изменить действием. Всё остальное — шум или давление.

1. **Траектория REP** — линия за 90 дней + список последних начислений
   («За что: ответ в House of Rope · +15 · 12 июля»). Источник — `rep.granted`.
2. **Что открывается дальше** — ближайший порог, сколько REP не хватает,
   и **одно конкретное действие**, которое его закроет.
3. **Приглашения** — сколько осталось, статус отправленных, кто из приглашённых активен.
4. **Присутствие** — в каких Домах ты участвуешь; где тебя нет — как приглашение, не как упрёк.

### Блок прозрачности (обязателен)

Заголовок Cinzel: «Как считается репутация».
Текст Cormorant, 3–4 предложения: что фиксируется, что не фиксируется,
что данные не покидают клуб, что рейтинга участников не существует.
Формулировка в тоне Lord Obsidian — сдержанно, без юридического языка.

Участник видит **только свои** данные. Чужой REP и чужая активность не отображаются нигде.

---

## 5. КРИТЕРИИ ПРИЁМКИ

**Фаза 0**
- [ ] `events` создана через `prisma db push`, индексы на месте
- [ ] RLS включён; участник читает только свои строки (проверено вторым аккаунтом)
- [ ] `track()` вызывается минимум в 10 точках из 2.5
- [ ] `track()` не может быть импортирован в клиентский компонент (сборка падает)
- [ ] Падение записи события не ломает пользовательский поток

**Фаза 1**
- [ ] `/admin/insight` отдаёт 404 неадминистратору
- [ ] Все четыре блока рендерятся на реальных данных
- [ ] Блок C выдаёт кликабельные строки с переходом к объекту
- [ ] Страница загружается менее чем за 1.5 с при 50k событий

**Фаза 2**
- [ ] Траектория REP совпадает с суммой `rep.granted`
- [ ] «Что открывается дальше» показывает ровно одно действие
- [ ] Блок прозрачности присутствует и написан в тоне бренда
- [ ] Ни один участник не видит данных другого участника

---

## 6. ПРОМПТЫ ДЛЯ CLAUDE CODE

Запускать строго по одному. Не начинать следующий, пока не пройдены критерии приёмки предыдущего.

### Промпт 1 — событийный слой

```
Read CLAUDE.md and SPEC-analytics-panel.md sections 0 and 2.

Implement Phase 0 only:
1. Add the Event model to prisma/schema.prisma exactly as specified, run prisma db push.
2. Create lib/analytics/track.ts with `import 'server-only'` at the top.
3. Write the RLS policies from 2.4 as a SQL migration file and apply it.
4. Wire track() into every insertion point listed in 2.5.
   Do not invent new event types — use only the taxonomy in 2.2.
5. Verify: create a test event as a non-admin user and confirm RLS blocks
   reading another user's events.

Do NOT build any UI in this task. Report which insertion points you wired
and which you could not find in the codebase.
```

### Промпт 2 — операторская консоль

```
Read SPEC-analytics-panel.md section 3.

Build /admin/insight as server components. Four blocks A–D, in that order,
using the SQL provided. Admin-only, 404 otherwise. revalidate = 300.

Styling: existing Tailwind tokens (ob-black, ob-accent), Cinzel for block
titles, Inter tabular-nums for all figures. No emoji. Charts via recharts,
line and bar only.

Block C must render as an actionable list where each row links to the
underlying entity — not as a chart.

Ask before adding any dependency beyond recharts.
```

### Промпт 3 — зеркало участника

```
Read SPEC-analytics-panel.md section 4.

Extend the existing /profile page with the four member-facing modules plus
the transparency block. Members see only their own data — enforce this in the
query, not only in the UI.

Write the transparency copy in Lord Obsidian's voice: restrained, short
sentences, no legal or product-marketing language. Show me the copy for
approval before finalizing.
```

---

## 7. ЧЕГО ИЗБЕГАТЬ

- Метрики, под которую нет решения. Если, увидев число, ты не знаешь, что сделать, — её быть не должно.
- Клиентский трекинг. Один раз подделанное событие обесценивает REP навсегда.
- Показ участнику того, на что он не может повлиять.
- Расширение консоли на пятый блок. Четыре — потолок; новое входит только вместо старого.
