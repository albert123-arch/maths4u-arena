import Link from "next/link";

const supportEmail = "support@maths4u.sbs";

export function AboutArena() {
  return <article className="card arena-about">
    <h1>About Maths4U Arena</h1>
    <p>Study Cambridge mathematics from Lower Secondary to A Level. Browse notes and worked examples, check your answers and practise with exam-style questions.</p>
    <p><Link href="/courses">Browse courses</Link> · <Link href="/for-teachers">Teaching tools</Link> · <a href="https://maths4u.sbs/">Maths4U main site ↗</a></p>
    <section id="contact">
      <h2>Contact</h2>
      <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or <Link href="/recover">get help signing in</Link>. Use <strong>Report an error</strong> on a question to send feedback about that question.</p>
    </section>
    <section id="privacy">
      <h2>Privacy</h2>
      <p>When you sign in, Arena uses a session cookie to keep you signed in. Your account stores your selected courses, progress and submissions so you can resume on another device. If you submit work for a class, the teacher responsible for the class can review it.</p>
      <p>When you browse as a guest, your last course, lesson and study progress are kept in your browser. Optional Google Analytics measures visits to the public home, course catalogue and question bank only after you allow visitor statistics. See <a href="/statistics.html">what visitor statistics collects and how to change your choice</a>.</p>
      <p>For questions about your data, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
    </section>
  </article>;
}
