# Rafef Tech Store Project Analysis / Анализ проекта Rafef Tech Store

Analysis date / Дата анализа: `2026-06-09`

Scope / Охват:
- Based on the repository contents in `src/`, `backend/`, `docs/`, `scripts/`, `infrastructure/`, and root config files.
- Build artifacts such as `dist/` and dependencies such as `node_modules/` are intentionally excluded from the structural analysis.

## 1. Project Identity / Идентичность проекта

### RU
- Название проекта: `Rafef Tech` / `rafef-tech-frontend` + `rafef-tech-backend`.
- Назначение: локальная система управления магазином техники и сервисным бизнесом с CRM, каталогом, складом, ремонтом, продажами, финансами, проектами, интеграциями и администрированием.
- Какую проблему решает:
  - убирает разрозненные Excel/бумажные процессы;
  - объединяет клиентов, товары, заказы на ремонт, продажи и склад в одной системе;
  - даёт ролевой доступ, аудит действий и событийную ленту;
  - создаёт основу для автоматизаций через `n8n` и внешние интеграции.
- Целевая аудитория:
  - администратор/владелец магазина;
  - кассир/продавец;
  - сервисный инженер/приёмщик ремонта;
  - складской сотрудник;
  - оператор проектов/монтажа;
  - back-office персонал.

### EN
- Project name: `Rafef Tech` / `rafef-tech-frontend` + `rafef-tech-backend`.
- Purpose: a local business management system for a tech retail and repair store, covering CRM, catalog, inventory, repair, sales, finance, projects, integrations, and administration.
- Problem solved:
  - replaces fragmented spreadsheet/manual workflows;
  - centralizes customers, products, repair orders, sales, and stock;
  - adds role-based access, auditing, and event visibility;
  - provides a foundation for automation via `n8n` and external services.
- Target users:
  - store owner/admin;
  - cashier/sales staff;
  - repair intake/service staff;
  - inventory operator;
  - project/installation operator;
  - back-office staff.

## 2. Tech Stack / Технологический стек

### Frontend / Фронтенд
- Framework: `React 19.1` + `TypeScript`
- Build tool: `Vite 6`
- Routing: `react-router-dom 7` with `createBrowserRouter`
- State management:
  - server state: `@tanstack/react-query 5`
  - client/auth state: `Zustand`
  - forms: `react-hook-form`
  - validation: `zod` + `@hookform/resolvers`
- UI library:
  - no external design system like MUI/Ant/Shadcn
  - custom component set in `src/shared/ui` and `src/shared/components`
  - icons from `lucide-react`
- Styling:
  - custom global CSS
  - token files in `src/shared/themes/*.css` and `src/shared/themes/tokens.ts`
  - no Tailwind, no CSS Modules, no styled-components
- HTTP:
  - mostly custom `fetch` wrapper in `src/shared/api/httpClient.ts`
  - some modules, especially finance, still call `fetch` directly
- Localization:
  - `i18next` + `react-i18next`
  - only Russian locale is configured

### Backend / Бэкенд
- Runtime: `Node.js`
- Framework: `Express 5`
- Language: `TypeScript`
- Database: `MySQL 8.4` via `mysql2/promise`
- Validation: `zod`
- Auth-related libraries: `bcryptjs`, `cookie-parser`
- Deployment helpers:
  - `docker-compose`
  - `Caddy` reverse proxy
  - `Adminer` for DB inspection

### Important clarification / Важное уточнение
- Authentication is not JWT-based in practice.
- The backend creates a random opaque session token, stores only its SHA-256 hash in MySQL, sets the raw token in an `httpOnly` cookie, and also returns it as `accessToken`.
- The frontend sends that token as `Bearer` and also relies on cookie-based auth with `credentials: 'include'`.

## 3. Project Structure / Структура проекта

Relevant tree / Значимое дерево:

```text
Rafef_Tech_Store/
├─ src/                          Frontend app
│  ├─ app/                       App shell, router, layouts, providers
│  ├─ modules/                   Domain logic by business area
│  ├─ routes/                    Route-level pages
│  ├─ shared/                    Shared API, UI, theme, permissions, i18n, assets
│  └─ styles/                    Reset and global CSS
├─ backend/                      Backend app
│  ├─ src/
│  │  ├─ config/                 Environment parsing
│  │  ├─ database/               Pool, migration runner, seeding
│  │  ├─ modules/                Domain modules: auth, crm, catalog, etc.
│  │  ├─ shared/                 Shared HTTP/error helpers
│  │  └─ types/                  Express request augmentation
│  ├─ database/migrations/       SQL schema foundations by domain
│  └─ scripts/                   Smoke checks and data import helpers
├─ docs/                         Verification notes
├─ infrastructure/               Infra env files, especially MySQL
├─ public/                       Static frontend assets
├─ scripts/                      Top-level deployment helper(s)
├─ docker-compose.yml            Local stack: MySQL, Adminer, backend, frontend, Caddy
├─ Caddyfile                     Reverse proxy for `/api` and frontend
├─ README.md                     Frontend usage notes
└─ CURRENT_STATUS.md             Internal project status snapshot
```

### Architectural notes / Архитектурные заметки
- Frontend is feature-sliced loosely by domain: `modules/*` for logic and `routes/*` for screens.
- Backend follows a consistent `routes -> service -> repository` structure per module.
- SQL migrations are split by business domain from auth through integrations.
- The repo is effectively a full-stack monorepo, not just a frontend project.

## 4. Key Features / Ключевые возможности

### Major features / Основные функции
- Authentication and session restore
- Role/permission-based navigation and route access
- Home dashboard with radial navigation and live widgets
- Command center widget area
- CRM customer management
- Product catalog and barcode lookup
- Inventory stock visibility, movements, reservations, purchases, adjustments
- Repair order workflow with device dictionaries, services, parts, status changes, receipts
- POS sales flow with invoice creation, approval, voiding, returns, receipts
- Finance foundations: accounts, payment methods, transactions, ledger, expenses, refunds, work sessions, daily closings
- Creative/print jobs with vendors, job lines, vendor tasks, status history
- Projects with project types, sites, material reservations, installed assets, notes, summaries
- Reports across sales, inventory, finance, repair, projects, and creative
- Integrations dashboard for service health and webhook outbox
- Events feed + footer notification ticker
- Admin/settings for users, roles, permissions, and app settings
- AI assistant safety stub with auditing and no autonomous mutations

### Typical user flows / Типовые пользовательские сценарии

#### RU
1. Вход -> восстановление сессии -> домашний экран -> переход в модуль по разрешениям.
2. CRM -> поиск клиента -> карточка клиента -> редактирование -> добавление контактов/адресов/заметок.
3. Каталог -> поиск товара -> карточка товара -> изменение карточки/цены -> проверка по штрихкоду.
4. Склад -> просмотр остатков -> резервирование/списание/приход -> контроль минимального остатка.
5. Ремонт -> создание устройства/справочников -> создание заказа -> добавление услуг и запчастей -> смена статуса -> печать квитанции.
6. Продажи -> POS -> поиск или скан штрихкода -> корзина -> создание счёта -> авто-проведение -> просмотр счета/чека -> возврат или void.
7. Проекты -> создание проекта -> добавление площадок -> резерв материалов -> монтаж активов -> заметки -> summary.
8. Настройки -> управление пользователями -> роли -> точечные разрешения.
9. Интеграции -> health/outbox -> тестовые webhook-процессы.

#### EN
1. Login -> session restore -> home screen -> navigate to allowed module.
2. CRM -> search customer -> open detail -> edit -> add contacts/locations/notes.
3. Catalog -> search product -> open detail -> edit product/price -> barcode lookup.
4. Inventory -> inspect balances -> reserve/receive/adjust stock -> monitor low stock.
5. Repair -> maintain device dictionaries -> create order -> add services/parts -> change status -> print receipt.
6. Sales -> POS -> search or scan barcode -> cart -> create invoice -> auto-approve -> invoice/receipt -> return or void.
7. Projects -> create project -> add sites -> reserve materials -> record installed assets -> notes -> summary.
8. Settings -> manage users -> roles -> permission overrides.
9. Integrations -> inspect health/outbox -> process/test webhooks.

## 5. API Integrations / Интеграции API

### Internal backend / Внутренний backend
- Frontend talks primarily to the local Express API under `/api`.
- Vite dev server proxies `/api` to `http://localhost:3000` or `VITE_API_PROXY_TARGET`.

### External/backend-side integrations / Внешние интеграции на стороне backend
- `MySQL` as primary datastore
- `n8n`
  - inbound secret-protected webhook endpoint
  - health check URL
  - outbound webhook outbox processing
- `OpenClaw gateway`
  - health/status check foundation only

### Authentication mechanism / Механизм аутентификации
- Login endpoint: `POST /api/auth/login`
- Logout endpoint: `POST /api/auth/logout`
- Current user endpoint: `GET /api/auth/me`
- Backend auth behavior:
  - generates random session token;
  - stores token hash in DB;
  - sets cookie `rt_session` by default;
  - accepts either bearer token or cookie on subsequent requests;
  - checks permissions in middleware.
- Frontend auth behavior:
  - `src/modules/auth/stores/authStore.ts` restores session on first load;
  - protected and public-only routes gate access;
  - optional `mockAuth` exists for local UI review.

### Key endpoint families / Основные семейства endpoint'ов
- Auth: `/api/auth/*`
- Health: `/api/health`
- CRM: `/api/customers`, `/api/customers/:id`, nested contacts/locations/notes
- Catalog: `/api/products`, `/api/categories`, `/api/services`, `/api/barcodes/:barcode/product`, `/api/units`, `/api/suppliers`
- Inventory: `/api/inventory/stock`, `/api/inventory/products/:id/movements`, reservations, purchases, adjustments
- Repair: `/api/repair/device-categories`, brands, models, devices, orders, services, parts, notes, receipts
- Sales: `/api/sales/invoices`, approve, void, returns
- Finance: `/api/finance/accounts`, payment-methods, transactions, ledger, expenses, refunds, work-sessions, daily-closings
- Creative: `/api/creative/job-types`, vendors, jobs, lines, vendor-tasks, status
- Projects: `/api/projects`, types, sites, status, materials, assets, notes, summary
- Reports: `/api/reports/sales|inventory|finance|repair|projects|creative`
- Events: `/api/events/ticker`
- Integrations: `/api/integrations/health`, `/api/integrations/webhook-outbox`, `/api/integrations/n8n/*`
- Admin: `/api/admin/users`, roles, permissions, settings
- AI: `/api/ai/assistant/status`, `/api/ai/assistant/commands`

## 6. Design System / Дизайн-система

### RU
- Готовой внешней дизайн-системы нет.
- Используется собственный light-premium-tech стиль:
  - глобальные CSS-переменные;
  - стеклянные панели `tech-glass-panel`;
  - home/tech токены;
  - собственные кнопки, поля, таблицы, модалки, drawer-компоненты.
- UI-библиотеки:
  - `lucide-react` для иконок;
  - собственные примитивы в `src/shared/ui`;
  - составные компоненты в `src/shared/components`.
- Ключевые токены:
  - `--color-page`
  - `--color-surface`
  - `--color-border`
  - `--color-primary`
  - `--color-primary-strong`
  - `--color-text`
  - `--color-text-muted`
  - `--shadow-panel`
  - `--home-*`
  - `--tech-*`
  - `--font-*`
  - `--radius-*`
  - `--space-*`

### EN
- No formal third-party design system is used.
- The app uses a custom light premium tech visual language:
  - global CSS variables;
  - glass-like panels such as `tech-glass-panel`;
  - `home` and `tech` token families;
  - custom buttons, inputs, tables, modals, and drawers.
- UI tooling:
  - `lucide-react` for icons;
  - custom primitives in `src/shared/ui`;
  - composed components in `src/shared/components`.

### Important observation / Важное наблюдение
- The design system is real but undocumented.
- There is no Storybook, no component spec site, and no formal token contract beyond code.

## 7. Localization / Локализация

### RU
- Мультиязычность формально не реализована полностью.
- Настроен только один язык: `ru`.
- Реализация:
  - `i18next`
  - `react-i18next`
  - namespace JSON файлы:
    - `auth.json`
    - `common.json`
    - `errors.json`
    - `modules.json`
    - `navigation.json`
    - `statuses.json`
    - `validation.json`
- Фактическое состояние:
  - приложение Russian-first;
  - часть экранов уже использует переводы;
  - часть страниц всё ещё содержит захардкоженный текст на английском;
  - местами видны проблемы кодировки русских строк.

### EN
- Full multilingual support is not in place yet.
- Only one language is configured: `ru`.
- Implementation uses `i18next` + `react-i18next` with multiple namespaces.
- Actual state:
  - Russian-first product;
  - some screens are localized;
  - some screens still contain hard-coded English text;
  - some files show mojibake/encoding issues for Russian strings.

## 8. Critical Paths (Do Not Modify Lightly) / Критические пути

### Authentication / Аутентификация
- Frontend:
  - `src/modules/auth/stores/authStore.ts`
  - `src/modules/auth/api/auth.api.ts`
  - `src/modules/auth/api/mockAuth.api.ts`
  - `src/app/router/ProtectedRoute.tsx`
  - `src/app/router/PublicOnlyRoute.tsx`
  - `src/shared/api/authToken.ts`
- Backend:
  - `backend/src/modules/auth/auth.routes.ts`
  - `backend/src/modules/auth/auth.service.ts`
  - `backend/src/modules/auth/auth.middleware.ts`
  - `backend/src/modules/auth/auth.repository.ts`

### Routing / Роутинг
- `src/app/router.tsx`
- Permission map:
  - `src/shared/permissions/routePermissions.ts`
  - `src/shared/permissions/permissionCodes.ts`
  - `src/shared/permissions/RequirePermission.tsx`
  - `src/shared/permissions/usePermission.ts`

### Global layouts / Глобальные layout-компоненты
- `src/app/App.tsx`
- `src/app/providers/AppProviders.tsx`
- `src/app/layouts/MainLayout.tsx`
- `src/app/layouts/AuthLayout.tsx`
- `src/shared/components/Navigation/ModuleNav.tsx`
- `src/shared/components/Sidebar/UserCard.tsx`
- `src/shared/components/SystemControls/SystemControls.tsx`

### Notification system / Система уведомлений
- Frontend:
  - `src/shared/components/NotificationTicker/NotificationTicker.tsx`
  - `src/shared/components/NotificationTicker/TickerItem.tsx`
  - `src/modules/events/hooks/useTickerEvents.ts`
  - `src/modules/events/api/events.api.ts`
- Backend:
  - `backend/src/modules/events/events.routes.ts`
  - `backend/src/modules/events/event.service.ts`

## 9. File Inventory / Инвентарь файлов

Note / Примечание:
- This inventory covers meaningful source, config, docs, migration, and helper files.
- Generated output such as `dist/**` and vendor dependencies such as `node_modules/**` are excluded.

### Root and documentation / Корень и документация
- `README.md` - frontend-focused local run and mock auth instructions / инструкции по локальному запуску фронтенда и mock auth.
- `CURRENT_STATUS.md` - internal completion snapshot / снимок текущего статуса проекта.
- `PROJECT_GRAPH.md` - high-level dependency map / обзорный граф зависимостей.
- `SETUP_FROM_SCRATCH.md` - environment setup guide / инструкция по развёртыванию с нуля.
- `TASK_PROTOCOL.md` - UI regression and working rules / правила работы и предосторожности.
- `AGENT_CONTEXT.md` - internal context note / внутренний контекст.
- `package.json` - frontend dependencies and scripts / зависимости и скрипты фронтенда.
- `package-lock.json` - frontend lockfile / lockfile фронтенда.
- `vite.config.ts` - Vite config with `/api` proxy / конфиг Vite с proxy.
- `tsconfig.json` - root TS references / корневой TS-конфиг.
- `tsconfig.app.json` - frontend TS config / TS-конфиг фронтенда.
- `tsconfig.node.json` - node-side TS config for tooling / TS-конфиг для node tooling.
- `index.html` - Vite HTML shell / HTML-оболочка Vite.
- `docker-compose.yml` - local full stack orchestration / локальная оркестрация полного стека.
- `Caddyfile` - reverse proxy config / конфиг reverse proxy.
- `.env.example` - root env example / пример env.
- `.env.local` - local frontend env override / локальный env фронтенда.
- `.dockerignore` - docker ignore rules / правила ignore для Docker.
- `.gitignore` - git ignore rules / правила ignore для Git.
- `docs/frontend-phase-1-verification.md` - verification notes / заметки по верификации.
- `scripts/deploy-staging.sh` - staging deployment helper / helper для staging deploy.
- `egyptian_customers_grouped.csv` - sample/import data source / CSV с клиентскими данными.

### Frontend entry and app shell / Точки входа и оболочка фронтенда
- `src/main.tsx` - React entry point and global CSS imports / вход React и подключение глобальных стилей.
- `src/vite-env.d.ts` - Vite typings / типы Vite.
- `src/app/App.tsx` - app root with router and providers / корневой компонент приложения.
- `src/app/router.tsx` - full route map / полная карта маршрутов.
- `src/app/errors/AppErrorBoundary.tsx` - top-level error boundary / глобальный boundary ошибок.
- `src/app/layouts/AuthLayout.tsx` - login/auth visual shell / layout экрана входа.
- `src/app/layouts/MainLayout.tsx` - main authenticated app shell / главный layout авторизованной части.
- `src/app/providers/AppProviders.tsx` - QueryClient and i18n bootstrap / провайдеры приложения.
- `src/app/router/ProtectedRoute.tsx` - authenticated route guard / guard для защищённых роутов.
- `src/app/router/PublicOnlyRoute.tsx` - guest-only route guard / guard для публичных роутов.

### Frontend modules / Модули фронтенда

#### Admin
- `src/modules/admin/api/admin.api.ts` - admin users/roles/permissions/settings client / API-клиент администрирования.

#### Auth
- `src/modules/auth/api/auth.api.ts` - real auth API wrapper / обёртка над реальным auth API.
- `src/modules/auth/api/mockAuth.api.ts` - local mock auth mode / mock auth для локального UI.
- `src/modules/auth/components/LoginForm.tsx` - login form UI / форма входа.
- `src/modules/auth/hooks/useAuth.ts` - auth convenience hook / helper hook auth.
- `src/modules/auth/hooks/useCurrentUser.ts` - current user hook / hook текущего пользователя.
- `src/modules/auth/stores/authStore.ts` - Zustand auth state and session lifecycle / auth-store и восстановление сессии.
- `src/modules/auth/types/auth.types.ts` - auth DTO types / типы аутентификации.
- `src/modules/auth/validators/login.validator.ts` - client-side login validation / клиентская валидация логина.

#### Catalog
- `src/modules/catalog/api/catalog.api.ts` - catalog/product/category/service API client / API каталога.
- `src/modules/catalog/components/ProductForm.tsx` - product create/edit form / форма товара.
- `src/modules/catalog/types/catalog.types.ts` - catalog entity types / типы сущностей каталога.
- `src/modules/catalog/validators/catalog.schemas.ts` - Zod product schemas / схемы валидации товара.

#### Command Center
- `src/modules/command-center/components/WidgetArea.tsx` - placeholder widget zone / зона виджетов command center.

#### Creative
- `src/modules/creative/api/creative.api.tsx` - creative jobs/vendors/job types API / API для печати и дизайна.

#### CRM
- `src/modules/crm/api/crm.api.ts` - customers API client / API клиентов.
- `src/modules/crm/components/CustomerForm.tsx` - customer form / форма клиента.
- `src/modules/crm/types/crm.types.ts` - CRM types / CRM-типы.
- `src/modules/crm/validators/customer.schemas.ts` - customer/contact/location/note schemas / схемы CRM-форм.

#### Events
- `src/modules/events/api/events.api.ts` - ticker events API / API событийной ленты.
- `src/modules/events/hooks/useTickerEvents.ts` - polling hook for ticker / polling hook уведомлений.
- `src/modules/events/types/event.types.ts` - event types / типы событий.

#### Finance
- `src/modules/finance/api/finance.api.tsx` - finance fetch client, currently direct `fetch` / API финансов на прямом fetch.

#### Home
- `src/modules/home/homeModules.ts` - home radial menu config / конфиг домашнего кругового меню.
- `src/modules/home/components/CenterLogoButton.tsx` - center home CTA / центральная кнопка.
- `src/modules/home/components/RadialMenu.tsx` - radial navigation container / контейнер круговой навигации.
- `src/modules/home/components/RadialMenuItem.tsx` - individual radial module item / элемент кругового меню.

#### Integrations
- `src/modules/integrations/api/integrations.api.ts` - integrations health/outbox API / API интеграций.

#### Inventory
- `src/modules/inventory/api/inventory.api.ts` - inventory API client / API склада.
- `src/modules/inventory/types/inventory.types.ts` - stock/reservation/purchase/adjustment types / типы склада.
- `src/modules/inventory/utils/inventoryErrors.ts` - inventory error mapping / маппинг ошибок склада.
- `src/modules/inventory/validators/inventory.schemas.ts` - inventory validation schemas / схемы валидации склада.

#### Projects
- `src/modules/projects/api/projects.api.ts` - projects API client / API проектов.

#### Repair
- `src/modules/repair/api/repair.api.ts` - repair API client / API ремонта.

#### Reports
- `src/modules/reports/api/reports.api.ts` - reports API client / API отчётов.

#### Sales
- `src/modules/sales/api/sales.api.ts` - sales/invoices/returns API client / API продаж.

### Frontend routes / Маршруты фронтенда

#### Catalog pages
- `src/routes/catalog/BarcodeLookupPage.tsx` - barcode search screen / экран поиска по штрихкоду.
- `src/routes/catalog/CategoriesPage.tsx` - category list/create page / страница категорий.
- `src/routes/catalog/ProductDetailPage.tsx` - product details and edits / карточка товара.
- `src/routes/catalog/ProductsPage.tsx` - product search/list/create page / список и создание товаров.
- `src/routes/catalog/ServicesPage.tsx` - services management page / страница услуг.

#### Command center
- `src/routes/command-center/CommandCenterPage.tsx` - command center shell / оболочка command center.

#### Creative pages
- `src/routes/creative/JobDetailPage.tsx` - creative job lines, tasks, status history / детали творческой работы.
- `src/routes/creative/JobsPage.tsx` - creative jobs list/create / список работ.
- `src/routes/creative/JobTypesPage.tsx` - job type dictionary page / справочник типов работ.
- `src/routes/creative/VendorsPage.tsx` - vendor dictionary page / справочник подрядчиков.

#### CRM pages
- `src/routes/customers/CustomerDetailPage.tsx` - customer detail with contacts/locations/notes drawers / детальная карточка клиента.
- `src/routes/customers/CustomersPage.tsx` - customer search/list/create hub / основной экран клиентов.

#### Error and utility pages
- `src/routes/error/RouteErrorPage.tsx` - route error fallback / fallback ошибок роутинга.
- `src/routes/not-found/NotFoundPage.tsx` - 404 page / страница 404.
- `src/routes/placeholders/ModulePlaceholderPage.tsx` - generic placeholder module screen / placeholder-страница модуля.
- `src/routes/placeholders/modulePlaceholderConfig.ts` - placeholder text map / конфиг placeholder-модулей.

#### Events and reports
- `src/routes/events/EventsPage.tsx` - events feed page / страница ленты событий.
- `src/routes/reports/ReportsPage.tsx` - multi-report dashboard / дашборд отчётов.

#### Finance pages
- `src/routes/finance/AccountsPage.tsx` - payment accounts CRUD-lite page / страница платёжных счетов.
- `src/routes/finance/DailyClosingPage.tsx` - daily closing input page / закрытие дня.
- `src/routes/finance/ExpensesPage.tsx` - expenses input page / расходы.
- `src/routes/finance/LedgerPage.tsx` - customer ledger input page / ledger клиента.
- `src/routes/finance/MethodsPage.tsx` - payment methods page / методы оплаты.
- `src/routes/finance/RefundsPage.tsx` - refunds input page / возвраты средств.
- `src/routes/finance/TransactionsPage.tsx` - transactions input page / транзакции.
- `src/routes/finance/WorkSessionsPage.tsx` - cashier/work session page / рабочие смены.

#### Home and auth
- `src/routes/home/HomePage.tsx` - dashboard home with widgets and radial menu / домашний экран с KPI.
- `src/routes/login/LoginPage.tsx` - login page shell / экран входа.

#### Integrations
- `src/routes/integrations/IntegrationHealthPage.tsx` - health and webhook outbox tables / состояние интеграций и outbox.

#### Inventory pages
- `src/routes/inventory/InventoryAdjustmentsPage.tsx` - stock adjustments page / корректировки склада.
- `src/routes/inventory/InventoryMovementsPage.tsx` - product movement lookup / движения склада.
- `src/routes/inventory/InventoryPurchasesPage.tsx` - purchase/receiving page / закупки и приёмка.
- `src/routes/inventory/InventoryReservationsPage.tsx` - reservation management page / резервы.
- `src/routes/inventory/InventoryStockPage.tsx` - current stock balance page / остатки на складе.

#### Projects pages
- `src/routes/projects/ProjectDetailPage.tsx` - project operations page / операционная карточка проекта.
- `src/routes/projects/ProjectsPage.tsx` - projects list/create page / список проектов.
- `src/routes/projects/ProjectSummaryPage.tsx` - printable/summary project view / summary проекта.
- `src/routes/projects/ProjectTypesPage.tsx` - project types dictionary / типы проектов.

#### Repair pages
- `src/routes/repair/DevicesPage.tsx` - device dictionaries and device creation / устройства и справочники.
- `src/routes/repair/OrderDetailPage.tsx` - repair order operations / детальная страница заказа ремонта.
- `src/routes/repair/OrdersPage.tsx` - repair order list/create / список и создание заказов ремонта.
- `src/routes/repair/ReceiptPage.tsx` - repair receipt page / квитанция ремонта.

#### Sales pages
- `src/routes/sales/InvoiceDetailPage.tsx` - invoice detail, voiding / детали счета.
- `src/routes/sales/PosPage.tsx` - POS/cart workflow / экран кассы.
- `src/routes/sales/SalesReceiptPage.tsx` - sales receipt page / чек продажи.

#### Settings
- `src/routes/settings/SettingsPage.tsx` - admin users/roles/permissions UI / административные настройки.

### Frontend shared layer / Общий слой фронтенда

#### Shared API
- `src/shared/api/apiErrors.ts` - API error class and helpers / ошибки API.
- `src/shared/api/authToken.ts` - access token storage helper / хранение токена.
- `src/shared/api/endpoints.ts` - endpoint constants / константы endpoint'ов.
- `src/shared/api/httpClient.ts` - common fetch wrapper / общий HTTP-клиент.
- `src/shared/api/types.ts` - API request/response helper types / типы API.

#### Shared assets
- `src/shared/assets/avatars/index.ts` - avatar export map / экспорт аватаров.
- `src/shared/assets/avatars/manager-avatar.png` - manager avatar asset / ассет аватара.
- `src/shared/assets/icons/README.md` - icon placeholder note / заметка об иконках.
- `src/shared/assets/logos/index.ts` - logo export map / экспорт логотипов.
- `src/shared/assets/logos/rafef-tech-logo.png` - app logo asset / логотип приложения.
- `src/shared/assets/logos/README.md` - branding placeholder note / заметка по брендингу.

#### Shared components
- `src/shared/components/AccessDenied/AccessDenied.tsx` - permission-denied state / экран отказа в доступе.
- `src/shared/components/ConfirmDialog/ConfirmDialog.tsx` - confirmation modal / диалог подтверждения.
- `src/shared/components/DataTable/DataTable.tsx` - generic table component / базовая таблица.
- `src/shared/components/DevModeBadge/DevModeBadge.tsx` - dev/mock auth marker / бейдж dev/mock режима.
- `src/shared/components/EmptyState/EmptyState.tsx` - empty-state block / пустое состояние.
- `src/shared/components/ErrorState/ErrorState.tsx` - error-state block / блок ошибки.
- `src/shared/components/FormDrawer/FormDrawer.tsx` - slide-over form drawer / drawer для форм.
- `src/shared/components/Header/AppHeader.tsx` - header helper component / вспомогательный header.
- `src/shared/components/LoadingScreen/LoadingScreen.tsx` - startup/auth loading screen / экран загрузки.
- `src/shared/components/Modal/Modal.tsx` - generic modal / модальное окно.
- `src/shared/components/MoneyDisplay/MoneyDisplay.tsx` - formatted money renderer / форматирование денег.
- `src/shared/components/Navigation/ModuleNav.tsx` - permission-aware side navigation / боковая навигация.
- `src/shared/components/NotificationTicker/NotificationTicker.tsx` - footer ticker shell / контейнер нижней ленты уведомлений.
- `src/shared/components/NotificationTicker/TickerItem.tsx` - single ticker item / элемент ленты.
- `src/shared/components/SearchInput/SearchInput.tsx` - styled search input / поисковое поле.
- `src/shared/components/Sidebar/UserCard.tsx` - user profile/logout card / карточка пользователя.
- `src/shared/components/SkipLink/SkipLink.tsx` - accessibility skip link / skip link доступности.
- `src/shared/components/StatusBadge/StatusBadge.tsx` - generic status badge / бейдж статуса.
- `src/shared/components/SystemControls/SystemControls.tsx` - system-level controls cluster / служебные контролы.

#### Shared config, i18n, permissions, theme
- `src/shared/config/env.ts` - frontend env mapping / env-переменные фронтенда.
- `src/shared/localization/i18n.ts` - i18n bootstrapping / инициализация i18n.
- `src/shared/localization/ru/auth.json` - auth translations / переводы auth.
- `src/shared/localization/ru/common.json` - common translations / общие переводы.
- `src/shared/localization/ru/errors.json` - API/UI error translations / переводы ошибок.
- `src/shared/localization/ru/modules.json` - module labels and placeholders / названия модулей.
- `src/shared/localization/ru/navigation.json` - navigation labels / подписи навигации.
- `src/shared/localization/ru/statuses.json` - status labels / статусы.
- `src/shared/localization/ru/validation.json` - validation messages / сообщения валидации.
- `src/shared/permissions/permissionCodes.ts` - permission code constants / коды разрешений.
- `src/shared/permissions/PermissionGate.tsx` - inline permission-based rendering / условный рендер по правам.
- `src/shared/permissions/RequirePermission.tsx` - route/page-level permission gate / guard страницы.
- `src/shared/permissions/routePermissions.ts` - module path to permission map / маппинг путей к правам.
- `src/shared/permissions/usePermission.ts` - permission hook / hook проверки прав.
- `src/shared/themes/colors.css` - color and tech token definitions / цветовые и tech-токены.
- `src/shared/themes/layout.css` - spacing/radius tokens / токены layout.
- `src/shared/themes/tokens.ts` - JS token mirror / JS-слой токенов.
- `src/shared/themes/typography.css` - font tokens / типографические токены.

#### Shared UI primitives
- `src/shared/ui/Badge.tsx` - badge primitive / примитив badge.
- `src/shared/ui/Button.tsx` - button primitive / примитив кнопки.
- `src/shared/ui/Card.tsx` - card primitive / примитив card.
- `src/shared/ui/Checkbox.tsx` - checkbox primitive / примитив checkbox.
- `src/shared/ui/IconButton.tsx` - icon button / иконкокнопка.
- `src/shared/ui/Input.tsx` - input primitive / примитив input.
- `src/shared/ui/PasswordInput.tsx` - password field primitive / поле пароля.
- `src/shared/ui/Select.tsx` - select primitive / примитив select.
- `src/shared/ui/Spinner.tsx` - spinner primitive / спиннер.
- `src/shared/ui/Tabs.tsx` - tabs primitive / вкладки.
- `src/shared/ui/Textarea.tsx` - textarea primitive / текстовая область.
- `src/shared/ui/Tooltip.tsx` - tooltip primitive / тултип.

#### Widgets
- `src/shared/widgets/WidgetCard.tsx` - command-center widget card / карточка виджета.
- `src/shared/widgets/WidgetRegistry.ts` - widget key registry / реестр ключей виджетов.

#### Styles
- `src/styles/global.css` - main app styling and page-specific CSS / основной CSS проекта.
- `src/styles/reset.css` - CSS reset / reset-стили.

### Backend root / Корень backend
- `backend/README.md` - backend setup guide / инструкция по backend.
- `backend/package.json` - backend dependencies and scripts / зависимости backend.
- `backend/package-lock.json` - backend lockfile / lockfile backend.
- `backend/tsconfig.json` - backend TS config / TS-конфиг backend.

### Backend entry/config/database / Точки входа, конфиг и БД
- `backend/src/app.ts` - express app composition / сборка Express app.
- `backend/src/server.ts` - server bootstrap and listen / запуск HTTP-сервера.
- `backend/src/config/env.ts` - backend env schema / схема env backend.
- `backend/src/database/migrate.ts` - migration runner entry / entrypoint миграций.
- `backend/src/database/migrationRunner.ts` - SQL migration executor / исполнитель миграций.
- `backend/src/database/mysql.ts` - MySQL pool and connectivity helpers / пул MySQL.
- `backend/src/database/seed.ts` - seeding entry / entrypoint сидов.

### Backend modules / Модули backend

#### Admin
- `backend/src/modules/admin/admin.repository.ts` - admin DB queries / запросы админ-модуля.
- `backend/src/modules/admin/admin.routes.ts` - admin HTTP routes / роуты администрирования.
- `backend/src/modules/admin/admin.service.ts` - user/permission business logic / логика пользователей и прав.

#### AI
- `backend/src/modules/ai/ai.routes.ts` - assistant status/command endpoints / endpoints AI assistant.
- `backend/src/modules/ai/ai.schemas.ts` - safe command validation / схема безопасных команд.
- `backend/src/modules/ai/ai.service.ts` - audited non-autonomous assistant stub / безопасный stub AI.

#### Audit
- `backend/src/modules/audit/audit.service.ts` - writes audit log rows / запись аудита.

#### Auth
- `backend/src/modules/auth/auth.middleware.ts` - auth + permission middleware / middleware auth и permissions.
- `backend/src/modules/auth/auth.repository.ts` - auth DB operations / DB-операции auth.
- `backend/src/modules/auth/auth.routes.ts` - login/logout/me routes / роуты входа и сессии.
- `backend/src/modules/auth/auth.service.ts` - login/session lifecycle / логика сессий.
- `backend/src/modules/auth/auth.types.ts` - auth backend types / типы auth backend.

#### Catalog
- `backend/src/modules/catalog/catalog.repository.ts` - catalog DB queries / запросы каталога.
- `backend/src/modules/catalog/catalog.routes.ts` - catalog routes / роуты каталога.
- `backend/src/modules/catalog/catalog.schemas.ts` - catalog input validation / схемы каталога.
- `backend/src/modules/catalog/catalog.service.ts` - catalog business logic / логика каталога.

#### Creative
- `backend/src/modules/creative/creative.repository.ts` - creative DB layer / DB-слой creative.
- `backend/src/modules/creative/creative.routes.ts` - creative routes / роуты creative.
- `backend/src/modules/creative/creative.schemas.ts` - creative validation schemas / схемы валидации creative.
- `backend/src/modules/creative/creative.service.ts` - creative business logic / бизнес-логика creative.

#### CRM
- `backend/src/modules/crm/crm.repository.ts` - customer DB access / запросы по клиентам.
- `backend/src/modules/crm/crm.routes.ts` - customer routes / роуты клиентов.
- `backend/src/modules/crm/crm.schemas.ts` - customer validation / схемы CRM.
- `backend/src/modules/crm/crm.service.ts` - customer business logic and audit / логика CRM и аудит.

#### Events
- `backend/src/modules/events/event.service.ts` - creates app event rows / создание app events.
- `backend/src/modules/events/events.routes.ts` - event ticker feed route / роут ленты событий.

#### Finance
- `backend/src/modules/finance/finance.repository.ts` - finance persistence / DB-логика финансов.
- `backend/src/modules/finance/finance.routes.ts` - finance routes / роуты финансов.
- `backend/src/modules/finance/finance.schemas.ts` - finance validation / схемы финансов.
- `backend/src/modules/finance/finance.service.ts` - finance business logic / логика финансов.

#### Health
- `backend/src/modules/health/health.routes.ts` - health check route / health endpoint.

#### Integrations
- `backend/src/modules/integrations/integrations.repository.ts` - outbox and integration DB access / DB-слой интеграций.
- `backend/src/modules/integrations/integrations.routes.ts` - integration routes / роуты интеграций.
- `backend/src/modules/integrations/integrations.service.ts` - health checks and webhook orchestration / логика интеграций.
- `backend/src/modules/integrations/webhookOutbox.worker.ts` - outbox processor / обработчик outbox.

#### Inventory
- `backend/src/modules/inventory/inventory.repository.ts` - inventory persistence / DB-слой склада.
- `backend/src/modules/inventory/inventory.routes.ts` - inventory routes / роуты склада.
- `backend/src/modules/inventory/inventory.schemas.ts` - inventory input schemas / схемы склада.
- `backend/src/modules/inventory/purchase.service.ts` - purchase receiving logic / логика закупок.
- `backend/src/modules/inventory/stock.service.ts` - stock balance logic / логика остатков.
- `backend/src/modules/inventory/stockAdjustment.service.ts` - adjustment logic / логика корректировок.
- `backend/src/modules/inventory/stockMovement.service.ts` - movement history logic / логика движений.
- `backend/src/modules/inventory/stockReservation.service.ts` - reservation lifecycle logic / логика резервов.

#### Projects
- `backend/src/modules/projects/projects.repository.ts` - project DB layer / DB-слой проектов.
- `backend/src/modules/projects/projects.routes.ts` - project routes / роуты проектов.
- `backend/src/modules/projects/projects.schemas.ts` - project validation / схемы проектов.
- `backend/src/modules/projects/projects.service.ts` - project logic, stock reservations, events / логика проектов.

#### Repair
- `backend/src/modules/repair/repair.repository.ts` - repair persistence / DB-слой ремонта.
- `backend/src/modules/repair/repair.routes.ts` - repair routes / роуты ремонта.
- `backend/src/modules/repair/repair.schemas.ts` - repair validation / схемы ремонта.
- `backend/src/modules/repair/repair.service.ts` - repair logic, reservations, events / логика ремонта.

#### Reports
- `backend/src/modules/reports/reports.repository.ts` - report queries / SQL-запросы отчётов.
- `backend/src/modules/reports/reports.routes.ts` - report endpoints / роуты отчётов.
- `backend/src/modules/reports/reports.service.ts` - report service facade / фасад сервиса отчётов.

#### Sales
- `backend/src/modules/sales/sales.repository.ts` - sales persistence / DB-слой продаж.
- `backend/src/modules/sales/sales.routes.ts` - sales routes / роуты продаж.
- `backend/src/modules/sales/sales.schemas.ts` - sales validation / схемы продаж.
- `backend/src/modules/sales/sales.service.ts` - invoice approval, stock impact, returns / логика продаж.

### Backend shared and types / Общие backend-файлы
- `backend/src/shared/errors/AppError.ts` - typed app error / типизированная ошибка приложения.
- `backend/src/shared/http/asyncHandler.ts` - async express wrapper / async-обёртка.
- `backend/src/shared/http/errorMiddleware.ts` - global error middleware / глобальный обработчик ошибок.
- `backend/src/shared/http/ids.ts` - ID parsing helpers / helper'ы для ID.
- `backend/src/shared/http/pagination.ts` - pagination helpers / helper'ы пагинации.
- `backend/src/types/express.d.ts` - request augmentation for `currentUser` and `sessionId` / расширение типов Express.

### Database migrations / Миграции базы данных
- `backend/database/migrations/001_auth_foundation.sql` - auth, users, roles, permissions foundation / база auth и ролей.
- `backend/database/migrations/002_crm_catalog_foundation.sql` - CRM and catalog schema / схема CRM и каталога.
- `backend/database/migrations/003_inventory_foundation.sql` - inventory schema / схема склада.
- `backend/database/migrations/004_repair_foundation.sql` - repair schema / схема ремонта.
- `backend/database/migrations/005_sales_foundation.sql` - sales schema / схема продаж.
- `backend/database/migrations/006_finance_foundation.sql` - finance schema / схема финансов.
- `backend/database/migrations/007_creative_foundation.sql` - creative/jobs schema / схема creative.
- `backend/database/migrations/008_projects_foundation.sql` - projects schema / схема проектов.
- `backend/database/migrations/009_integrations_foundation.sql` - integrations and outbox schema / схема интеграций и outbox.

### Backend scripts / Backend-скрипты
- `backend/scripts/check-audit.js` - audit verification helper / проверка аудита.
- `backend/scripts/check-sales-verification.ts` - sales verification helper / верификация продаж.
- `backend/scripts/creative-smoke.js` - creative smoke test / smoke test creative.
- `backend/scripts/creative-verify.js` - creative verification / проверка creative.
- `backend/scripts/create-vendor-task.js` - vendor task helper / helper задач подрядчика.
- `backend/scripts/import-egyptian-customers.ts` - customer import utility / импорт клиентов.
- `backend/scripts/query-repair-logs.ts` - repair log query helper / helper логов ремонта.
- `backend/scripts/smoke-sales.ts` - sales smoke test / smoke test продаж.

## 10. Readiness for UI Upgrade / Готовность к UI-апгрейду

### Best candidates for visual upgrade / Лучшие кандидаты на визуальный апгрейд
- `src/routes/sales/PosPage.tsx`
  - functional but visually inconsistent;
  - inline `<style>` block inside page;
  - direct `window.location.href` navigation.
- Finance pages:
  - `AccountsPage`, `MethodsPage` are lightweight;
  - `TransactionsPage`, `LedgerPage`, `ExpensesPage`, `RefundsPage`, `WorkSessionsPage`, `DailyClosingPage` are thin forms rather than polished workflows.
- Creative pages:
  - `JobTypesPage`, `VendorsPage`, `JobsPage`, `JobDetailPage` feel admin-like and inconsistent with premium CRM/home styling.
- `EventsPage`
  - data is present, but presentation is very basic.
- `ReportsPage`
  - useful but looks like raw tables rather than analytics-grade UI.
- `ProjectDetailPage`
  - feature-rich but dense and utilitarian.
- `Repair/DevicesPage`
  - strongly CRUD-oriented and not aligned with the nicer CRM style.

### Healthier / more polished areas / Более зрелые визуально зоны
- `LoginPage`
- `HomePage`
- `CustomersPage`
- `InventoryStockPage`
- parts of the shared layout and sidebar

### Technical debt / Технический долг
- Mixed data-fetching styles:
  - most modules use React Query + `httpClient`;
  - finance and some creative flows still use direct `fetch` and local `useState`.
- Heavy `any` usage in several frontend and backend modules.
- Inconsistent localization:
  - Russian-first app;
  - many hard-coded English strings remain.
- Encoding/mojibake issues in multiple files with Russian text.
- Some pages are production-looking, others are internal-admin-like.
- Duplicate patterns instead of shared abstractions in CRUD pages.
- No route-level code splitting.
- Limited UI documentation:
  - no Storybook;
  - no component catalog;
  - no documented token usage guide.
- Placeholder legacy remains:
  - command-center widgets are still mostly placeholder content;
  - generic module placeholder infrastructure exists even though most modules now have screens.
- Generated `dist/` is present in repo, which may add noise.

### Shared components documented? / Документированы ли shared-компоненты?
- Not formally.
- There are only a few README notes for assets.
- Shared components are readable in code, but there is no dedicated documentation system or visual playground.

## Overall Assessment / Общая оценка

### RU
- Проект уже выглядит как полноценная full-stack ERP-lite/retail-ops система для магазина техники и сервиса.
- Архитектура достаточно понятная:
  - frontend по доменным модулям;
  - backend по схеме `routes/service/repository`;
  - БД по последовательным доменным миграциям.
- Самые сильные зоны:
  - auth + permissions;
  - CRM;
  - inventory/repair/sales linkage;
  - settings/admin;
  - integrations/events foundation.
- Самые уязвимые зоны перед крупным UI-redesign:
  - finance and creative consistency;
  - `any` types;
  - i18n/encoding cleanup;
  - removing inconsistent direct `fetch` patterns;
  - bringing all admin-like screens under one shared visual grammar.

### EN
- This is already a real full-stack ERP-lite / retail-operations system for a tech store and repair shop.
- The architecture is understandable and reasonably modular:
  - frontend organized by domain;
  - backend follows `routes/service/repository`;
  - database evolves through domain-based SQL migrations.
- Strongest areas:
  - auth + permissions;
  - CRM;
  - inventory/repair/sales coupling;
  - settings/admin;
  - integrations/events foundation.
- Main weak spots before a major UI redesign:
  - finance and creative consistency;
  - `any` typing debt;
  - i18n/encoding cleanup;
  - inconsistent direct `fetch` usage;
  - aligning all utilitarian screens with the stronger premium-tech visual language.
