"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Select } from "./controls";
import { Empty, Loading } from "./ui";
import { programmes, requestArchive, Status, useArchive, type Grants } from "./exam-archive-navigation";
import styles from "./exam-archive.module.css";

export function ManageArchiveAccess({ revision }: { revision: number }) {
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [duration, setDuration] = useState("7");
  const [all, setAll] = useState(false);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [asOf, setAsOf] = useState(() => Date.now());
  const grants = useArchive<Grants>("/grants?" + new URLSearchParams({ q: query }), revision + reload);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setQuery(String(data.get("query") ?? "").trim());
    setUserId("");
  }

  async function changeGrant(id: string, method: "PUT" | "DELETE", payload?: object) {
    setPending(true);
    setMessage("");
    try {
      await requestArchive("/grants/" + encodeURIComponent(id), { method, body: payload ? JSON.stringify(payload) : undefined });
      setMessage(method === "DELETE" ? "Archive access revoked." : "Archive access saved.");
      setAsOf(Date.now());
      setReload(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change access.");
    } finally {
      setPending(false);
    }
  }

  function saveExpiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const days = Number(duration);
    const at = days ? new Date(Date.now() + days * 86_400_000) : new Date(String(fields.get("expiresAt") ?? ""));
    const syllabuses = fields.getAll("syllabuses").map(String);
    if (!userId || !Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) {
      setMessage("Choose a user and a future expiry.");
      return;
    }
    if (!all && !syllabuses.length) {
      setMessage("Select at least one programme or choose all programmes.");
      return;
    }
    void changeGrant(userId, "PUT", { expiresAt: at.toISOString(), syllabuses: all ? [] : syllabuses });
  }

  return <div className={styles.access}>
    <section className="card">
      <h2>Give access</h2>
      <form className={styles.findUser} onSubmit={search}>
        <label htmlFor="archive-user-search">Find a user</label>
        <Input id="archive-user-search" name="query" type="search" autoComplete="off" maxLength={100} />
        <Button type="submit">Search</Button>
      </form>
      {grants?.error ? <Status error={grants.error} /> : !grants?.value ? <Loading /> : <>
        <form className={styles.grantForm} onSubmit={saveExpiry}>
          <label>User<Select value={userId} onChange={event => setUserId(event.target.value)} required>
            <option value="">Choose an account</option>{grants.value.users.map(user => <option key={user.id} value={user.id}>{user.displayName} ({user.username})</option>)}
          </Select></label>
          <label>Access duration<Select value={duration} onChange={event => setDuration(event.target.value)}>
            <option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option><option value="0">Use the custom expiry</option>
          </Select></label>
          {duration === "0" && <label>Custom expiry (local time)<Input type="datetime-local" name="expiresAt" required /></label>}
          <fieldset><legend>Programmes</legend>
            <label><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} /> All programmes</label>
            {programmes.map(programme => <label key={programme.code}><input type="checkbox" name="syllabuses" value={programme.code} disabled={all} /> {programme.code} {programme.title}</label>)}
          </fieldset>
          <Button type="submit" variant="primary" disabled={!userId || pending}>Save access</Button>
        </form>
      </>}
      {message && <p role="status">{message}</p>}
    </section>
    <section className="card">
      <h2>Archive grants</h2>
      {grants?.error ? <Status error={grants.error} /> : !grants?.value ? <Loading /> : !grants.value.grants.length ? <Empty>No grants to show.</Empty> : <ul className={styles.grants}>
        {grants.value.grants.map(grant => {
          const expiry = new Date(grant.expiresAt);
          const status = grant.revokedAt ? "Revoked" : expiry.getTime() <= asOf ? "Expired" : "Active";
          return <li key={grant.userId}>
            <div><strong>{grant.displayName}</strong><small>{grant.username} · {status} · {grant.syllabuses.length ? grant.syllabuses.join(", ") : "All programmes"}</small>
              <small>Expires {expiry.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</small>
            </div>
            {status === "Active" && <Button type="button" disabled={pending} onClick={() => void changeGrant(grant.userId, "DELETE")}>Revoke</Button>}
          </li>;
        })}
      </ul>}
    </section>
  </div>;
}
