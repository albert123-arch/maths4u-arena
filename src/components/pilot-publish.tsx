"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Form, useLocale } from "./ui";

type Report = { created: number; updated: number; skipped: number; courses: string[] };
export function PilotPublish() {
  const { t } = useLocale(), [progress, setProgress] = useState(""), [report, setReport] = useState<Report | null>(null);
  return <section className="card" style={{ marginBottom: 24 }}><h2>{t("Публикация проверенного пилота", "Publish the reviewed pilot")}</h2>
    <p>{t("36 задач maths4u, 20 задач olymp RU/EN, теория и 37 изображений. Баллы olymp предварительные: материалы предназначены для обучения.", "36 maths4u problems, 20 olymp problems in RU/EN, theory and 37 images. Olymp scores are provisional; these materials are for learning.")}</p>
    <p className="muted">{t("Распакуйте maths4u-pilot.zip и выберите bundle.json и изображения из assets. Принимается только проверенная версия пакета. Перед публикацией должна быть готова резервная копия базы и приватных файлов.", "Extract maths4u-pilot.zip, then select bundle.json and the images in assets. Only the reviewed package is accepted. Back up the database and private files before publishing.")}</p>
    <Form label={t("Проверить и опубликовать пилот", "Verify and publish pilot")} submit={async f => {
      setReport(null); setProgress(t("Проверка пакета…", "Checking package…"));
      const file = f.get("pilotBundle");
      if (!(file instanceof File) || file.size > 2 * 1024 * 1024) throw new Error("INVALID_INPUT");
      const bundle = JSON.parse(await file.text());
      const checked = await api<{ missing: string[] }>("admin/import/pilot/check", "POST", bundle);
      const files = f.getAll("pilotAssets").filter((x): x is File => x instanceof File && x.size > 0);
      const selected = checked.missing.map(key => {
        const asset = (bundle.assets as { key: string; file: string; size: number }[]).find(a => a.key === key)!;
        const image = files.find(x => x.name === asset.file.split("/").pop());
        if (!image || image.size !== asset.size) throw new Error("PILOT_IMAGES_REQUIRED");
        return { key, image };
      });
      for (const [i, { key, image }] of selected.entries()) {
        setProgress(t("Загрузка изображений", "Uploading images") + ` ${i + 1}/${selected.length}`);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("FILE_READ_FAILED")); reader.readAsDataURL(image);
        });
        await api("admin/import/pilot/asset", "POST", { bundle, key, base64 });
      }
      setProgress(t("Сохранение структуры и материалов…", "Saving structure and materials…"));
      setReport(await api<Report>("admin/import/pilot/publish", "POST", bundle));
      setProgress(t("Пилот опубликован. Повторное применение сохраняет импорт без дубликатов.", "Pilot published. Reapplying the package preserves the import without duplicates."));
    }}>
      <label>{t("Пакет пилота bundle.json", "Pilot bundle.json")}<input name="pilotBundle" type="file" accept=".json,application/json" required /></label>
      <label>{t("Изображения пилота (assets)", "Pilot images (assets)")}<input name="pilotAssets" type="file" accept=".png,image/png" multiple /></label>
    </Form>
    {progress && <p role="status">{progress}</p>}
    {report && <div className="notice"><p>{t("Добавлено", "Created")}: {report.created} · {t("Обновлено", "Updated")}: {report.updated} · {t("Без изменений", "Unchanged")}: {report.skipped}</p>
      {report.courses.map(href => <p key={href}><Link href={href}>{href}</Link></p>)}
    </div>}
  </section>;
}
