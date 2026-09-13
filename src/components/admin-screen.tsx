"use client";
import Link from "next/link";
import { useState } from "react";
import { PilotPublish } from "./pilot-publish";
import type { Actor } from "@/lib/security";
import { useLocale, useResource, Heading, Loading, ErrorNotice, Form, Field, ActionButton, api, str, DateLabel, localDate } from "./ui";
type Plan = { id: string; name: string; active: boolean; features: { featureKey: string; usageLimit: number | null; feature: { title: string } }[] };
export function AdminScreen({ section }: { section: string }) {
  const { t } = useLocale();
  return <><Heading title={t("Управление платформой", "Platform administration")} subtitle={t("Люди, материалы и доступ к обучению.", "People, materials and learning access.")} /><nav className="tabs">{[
    ["overview", t("Обзор", "Overview")], ["users", t("Пользователи", "Users")], ["materials", t("Материалы", "Materials")],
    ["access", t("Тарифы и доступ", "Plans & access")], ["import", t("Импорт и состояние", "Import & status")],
  ].map(([key, title]) => <Link className={section === key ? "active" : ""} key={key} href={"/admin/" + key}>{title}</Link>)}</nav>
    {section === "users" ? <Users /> : section === "access" ? <Access /> : section === "import" ? <><PilotPublish /><Import /></> : section === "materials" ? <div className="grid three">{[
      ["/library", t("Банк задач", "Problem bank")], ["/admin/courses", t("Курсы и теория", "Courses & theory")], ["/olympiads", t("Олимпиады", "Olympiads")],
    ].map(([href, title]) => <Link className="card" href={href} key={href}><h2>{title} ↗</h2></Link>)}</div> : <Overview />}
  </>;
}
function Overview() {
  const { t } = useLocale(), r = useResource<{ users: number; tasks: number; attempts: number; pendingReview: number }>("admin/status");
  return <><ErrorNotice error={r.error} />{r.data ? <div className="grid three">{[
    [r.data.users, t("Пользователей", "Users"), "/admin/users"], [r.data.tasks, t("Задач в банке", "Problems"), "/library"], [r.data.pendingReview, t("Работ на проверке", "Awaiting review"), "/teacher"],
  ].map(([value, label, href]) => <Link className="card" key={label} href={String(href)}><p className="muted">{label}</p><div className="metric">{value} ↗</div></Link>)}</div> : <Loading />}
    <section className="card" style={{ marginTop: 24 }}><h2>{t("Работа с платформой", "Manage the platform")}</h2><div className="grid two"><div><p>{t("Назначьте учителей зарегистрированным пользователям. Они смогут создать классы и выдать задания.", "Assign teacher roles to registered users so they can create classes and assignments.")}</p><Link className="button secondary" href="/admin/users">{t("Пользователи и роли", "Users & roles")}</Link></div><div><p>{t("Добавьте материалы, затем опубликуйте их в общем банке или назначьте классу.", "Add learning materials, then publish them in the library or assign them to a class.")}</p><Link className="button secondary" href="/teacher/tasks/new">{t("Добавить задачу", "Add a problem")}</Link></div></div></section></>;
}
function Users() {
  const { t } = useLocale(), [q, setQ] = useState(""), r = useResource<Actor[]>("admin/users?q=" + encodeURIComponent(q));
  const [recovery, setRecovery] = useState<{ token: string; username: string } | null>(null);
  return <div className="stack"><label>{t("Поиск по имени или логину", "Search by name or login")}<input value={q} onChange={e => setQ(e.target.value)} /></label><ErrorNotice error={r.error} />
    {recovery && <div className="notice"><strong>{t("Одноразовый код для ", "One-time code for ")}{recovery.username}</strong><p style={{ overflowWrap: "anywhere", userSelect: "all" }}>{recovery.token}</p><p>{t("Передайте его ученику после проверки личности. Код действует 60 минут и показывается только сейчас.", "Share it after verifying the student's identity. It is valid for 60 minutes and shown only now.")}</p><button className="secondary" onClick={() => setRecovery(null)}>{t("Скрыть код", "Hide code")}</button></div>}
    {r.data?.map(user => <section className="card" key={user.id}><div className="row spread"><div><h2>{user.displayName}</h2><p className="muted">{user.username}</p></div><ActionButton label={t("Восстановить доступ", "Recover access")} secondary action={async () => { const result = await api<{ token: string }>("admin/users/" + user.id + "/recovery", "POST"); setRecovery({ token: result.token, username: user.username }); }} /></div>
      <Form label={t("Сохранить права", "Save access")} done={r.refresh} submit={f => api("admin/users/" + user.id, "PATCH", { roles: f.getAll("roles"), status: str(f, "status") })}>
        <div className="row">{(["STUDENT", "TEACHER", "ADMIN"] as const).map(role => <label className="check" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={user.roles.some(r => r.role === role)} />{role === "STUDENT" ? t("Ученик", "Student") : role === "TEACHER" ? t("Учитель", "Teacher") : t("Администратор", "Administrator")}</label>)}</div>
        <label>{t("Состояние аккаунта", "Account status")}<select name="status" defaultValue={user.status}><option value="ACTIVE">{t("Активен", "Active")}</option><option value="BLOCKED">{t("Заблокирован", "Blocked")}</option><option value="ARCHIVED">{t("Архив", "Archived")}</option></select></label>
      </Form></section>)}</div>;
}
function Access() {
  const { t } = useLocale(), plans = useResource<Plan[]>("admin/plans"), users = useResource<Actor[]>("admin/users");
  const [createdAt] = useState(() => Date.now());
  const subs = useResource<Array<{ id: string; status: string; endsAt: string; plan: { name: string }; user: { username: string; displayName: string } }>>("admin/subscriptions");
  const [features, setFeatures] = useState([{ key: "practice.extended", title: t("Расширенная практика", "Extended practice"), limit: "" }]);
  return <div className="stack"><p className="notice">{t("Доступ выдаётся вручную. Онлайн-оплата не подключена. Тариф не изменяет роль пользователя.", "Access is granted manually. Online payments are not connected. A plan does not change a user's role.")}</p>
    <ErrorNotice error={plans.error || users.error || subs.error} /><div className="grid two"><section className="card"><h2>{t("Настроить тариф", "Configure a plan")}</h2><Form label={t("Сохранить тариф", "Save plan")} done={plans.refresh} submit={f => api("admin/plans", "POST", {
      name: str(f, "name"), active: f.has("active"), features: features.map(x => ({ key: x.key, title: x.title, usageLimit: x.limit ? Number(x.limit) : null })),
    })}><Field name="name" label={t("Название тарифа (существующее имя обновляет тариф)", "Plan name (reuse a name to update)")} />
      {features.map((feature, i) => <div className="stack" key={i}><label>{t("Код возможности", "Feature key")}<input value={feature.key} onChange={e => setFeatures(old => old.map((x, ix) => ix === i ? { ...x, key: e.target.value } : x))} /></label><label>{t("Название возможности", "Feature name")}<input value={feature.title} onChange={e => setFeatures(old => old.map((x, ix) => ix === i ? { ...x, title: e.target.value } : x))} /></label><label>{t("Лимит за срок подписки (пусто = без лимита)", "Limit per subscription period (empty = unlimited)")}<input type="number" min={1} value={feature.limit} onChange={e => setFeatures(old => old.map((x, ix) => ix === i ? { ...x, limit: e.target.value } : x))} /></label></div>)}
      <button className="secondary" type="button" onClick={() => setFeatures(old => [...old, { key: "", title: "", limit: "" }])}>{t("+ Возможность", "+ Feature")}</button>
      <label className="check"><input name="active" type="checkbox" defaultChecked />{t("Доступен для выдачи", "Available for grants")}</label></Form>
    </section><section className="card"><h2>{t("Выдать доступ", "Grant access")}</h2><Form label={t("Выдать доступ до указанной даты", "Grant access until this date")} done={subs.refresh} submit={f => api("admin/subscriptions", "POST", {
      userId: str(f, "userId"), planId: str(f, "planId"), startsAt: new Date(str(f, "startsAt")).toISOString(), endsAt: new Date(str(f, "endsAt")).toISOString(), reason: str(f, "reason"),
    })}><label>{t("Пользователь", "User")}<select name="userId" required><option value="">{t("Выберите пользователя", "Choose user")}</option>{users.data?.map(u => <option key={u.id} value={u.id}>{u.displayName} · {u.username}</option>)}</select></label>
      <label>{t("Тариф", "Plan")}<select name="planId" required><option value="">{t("Выберите тариф", "Choose plan")}</option>{plans.data?.filter(p => p.active).map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <Field name="startsAt" type="datetime-local" label={t("Начало", "Starts")} value={localDate(new Date(createdAt))} /><Field name="endsAt" type="datetime-local" label={t("Окончание", "Ends")} value={localDate(new Date(createdAt + 30 * 86400000))} /><Field name="reason" label={t("Основание выдачи", "Reason for grant")} /></Form>
    </section></div>
    <section className="card"><h2>{t("Тарифы", "Plans")}</h2>{plans.data?.map(p => <div className="item" key={p.id}><strong>{p.name}</strong> · {p.active ? t("доступен", "available") : t("закрыт для выдачи", "closed for grants")}<p className="muted">{p.features.map(f => f.feature.title + " (" + f.featureKey + ", " + (f.usageLimit ?? "∞") + ")").join(" · ")}</p></div>)}</section>
    <section className="card"><h2>{t("Выданный доступ", "Granted access")}</h2>{subs.data?.map(s => <div className="item row spread" key={s.id}><div><strong>{s.user.displayName} · {s.plan.name}</strong><p className="muted">{s.user.username} · <DateLabel value={s.endsAt} /> · {s.status}</p></div>{s.status === "ACTIVE" && <ActionButton label={t("Отозвать", "Revoke")} secondary action={() => api("admin/subscriptions/" + s.id + "/revoke", "POST")} onDone={subs.refresh} />}</div>)}</section>
  </div>;
}
function Import() {
  const { t } = useLocale(), r = useResource<Array<{ sourceProject: string; legacyId: string; importedAt: string }>>("admin/import");
  const status = useResource<{ users: number; tasks: number; attempts: number; migrations: unknown[] }>("admin/status");
  const [report, setReport] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  return <div className="grid two"><section className="card"><h2>{t("Импорт материалов", "Import materials")}</h2><p className="muted">{t("Загрузите небольшую файловую выгрузку maths4u, olymp или Arena: до 100 материалов, JSON до 2 МБ. Повторная загрузка не создаёт дубликаты.", "Upload a small file export from maths4u, olymp or Arena: up to 100 materials, JSON up to 2 MB. Repeating an import does not create duplicates.")}</p>
    <Form label={t("Импортировать файл", "Import file")} done={r.refresh} submit={async f => {
      const file = f.get("export"); if (!(file instanceof File) || file.size > 2 * 1024 * 1024) throw new Error("Invalid file");
      const input = JSON.parse(await file.text()); setReport(await api("admin/import", "POST", input));
    }}><label>{t("Файл выгрузки JSON", "JSON export file")}<input type="file" name="export" accept=".json,application/json" required /></label></Form>
    {report && <p className="notice" style={{ marginTop: 18 }}>{t("Добавлено", "Created")}: {report.created} · {t("Обновлено", "Updated")}: {report.updated} · {t("Без изменений", "Unchanged")}: {report.skipped}</p>}
    <ErrorNotice error={r.error} />{r.data?.slice(0, 15).map(row => <p className="item" key={row.sourceProject + row.legacyId}>{row.sourceProject} · {row.legacyId}</p>)}
  </section><section className="card"><h2>{t("Состояние платформы", "Platform status")}</h2><ErrorNotice error={status.error} />{status.data ? <><p className="notice">{t("База данных доступна. Обновления установлены.", "Database available. Updates installed.")}</p><p>{t("Пользователи", "Users")}: {status.data.users}</p><p>{t("Материалы", "Materials")}: {status.data.tasks}</p><p>{t("Попытки", "Attempts")}: {status.data.attempts}</p><p className="muted">{t("Оплата и AI-проверка пока не подключены.", "Payments and AI grading are not connected yet.")}</p></> : <Loading />}</section></div>;
}

