// ============================================================================
//  test/units.mjs — app/labLogic.js saf mantık birim testleri (framework'süz).
//  Çalıştır:  node test/units.mjs    (Docker/sunucu GEREKMEZ — saf fonksiyonlar)
//  Kapsam: filterVulns · pickRandomVuln · pickNextUnsolved · computeBadges
// ============================================================================
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VULNS } from "../app/labData.js";
import { filterVulns, pickRandomVuln, pickNextUnsolved, computeBadges, moduleProgress, roadmapStatus, matchRunningMachine, rankStudents, unreadCount } from "../app/labLogic.js";
import { ROADMAP } from "../app/academyData.js";
import { FLAGS } from "../lib/flags.js";
import { MACHINES } from "../lib/machines.js";
import { TOOL_LAB_ORDER, TOOL_LABS as TOOL_LABS_UI } from "../app/toolLabData.js";
import { TOOL_LABS as TOOL_LABS_MANIFEST, toolLabConsistency, targetPorts } from "../lib/toolLabs.js";
import { connToken, verifyConn } from "../lib/conncheck.js";
import { hostCandidates, portMapOf, rewriteCmd, discoveryScript, VM_GATEWAYS } from "../lib/netinfo.js";
import { allocVpnIp, clientConfText, peersEnvString, parseHandshakes, isConnected, peerKey } from "../lib/wireguard.js";
import { STEP_SLUGS, stepsFor, stepCount, publicSteps, checkStep, stepLabConsistency } from "../lib/steps.js";
import { publicQuiz, checkQuiz, hasQuiz, listQuizIds } from "../lib/quiz.js";
import { computeGamify } from "../app/gamifyData.js";

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`\x1b[32mPASS\x1b[0m ${name}`); }
  catch (e) { fail++; console.log(`\x1b[31mFAIL\x1b[0m ${name}\n   ${e && e.message ? e.message : e}`); }
}
const badge = (solved, title) => computeBadges(solved).find(b => b.t === title);
const fullSolve = () => Object.fromEntries(VULNS.map(v => [v.slug, ["low", "medium", "high"]]));

/* ───────── filterVulns ───────── */
t("filterVulns: filtresiz tüm zafiyetleri döner", () => {
  assert.equal(filterVulns(VULNS, {}, {}).length, VULNS.length);
});
t("filterVulns: 'command' araması command-injection'ı bulur", () => {
  const r = filterVulns(VULNS, { query: "command" }, {});
  assert.ok(r.some(v => v.slug === "command-injection"));
  assert.ok(r.every(v => `${v.name} ${v.scenario}`.toLowerCase().includes("command")));
});
t("filterVulns: arama büyük/küçük harf duyarsız", () => {
  assert.deepEqual(
    filterVulns(VULNS, { query: "BRUTE" }, {}).map(v => v.slug),
    filterVulns(VULNS, { query: "brute" }, {}).map(v => v.slug),
  );
  assert.ok(filterVulns(VULNS, { query: "BRUTE" }, {}).some(v => v.slug === "brute-force"));
});
t("filterVulns: grup filtresi yalnız o grubu döner", () => {
  const r = filterVulns(VULNS, { group: "auth" }, {});
  assert.ok(r.length > 0);
  assert.ok(r.every(v => v.group === "auth"));
  assert.equal(r.length, VULNS.filter(v => v.group === "auth").length);
});
t("filterVulns: status=unsolved boş ilerlemede hepsini döner", () => {
  assert.equal(filterVulns(VULNS, { status: "unsolved" }, {}).length, VULNS.length);
});
t("filterVulns: status=solved yalnız başlananları döner", () => {
  const solved = { "command-injection": ["low"] };
  const r = filterVulns(VULNS, { status: "solved" }, solved);
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, "command-injection");
});
t("filterVulns: status=full yalnız 3/3 çözülenleri döner", () => {
  const solved = { "sql-injection": ["low", "medium", "high"], "xss-reflected": ["low"] };
  const r = filterVulns(VULNS, { status: "full" }, solved);
  assert.deepEqual(r.map(v => v.slug), ["sql-injection"]);
});
t("filterVulns: query + group birlikte uygulanır", () => {
  const r = filterVulns(VULNS, { query: "injection", group: "core" }, {});
  assert.ok(r.length > 0);
  assert.ok(r.every(v => v.group === "core" && `${v.name} ${v.scenario}`.toLowerCase().includes("injection")));
});
t("filterVulns: eşleşme yoksa boş dizi", () => {
  assert.equal(filterVulns(VULNS, { query: "zzzqqqxx" }, {}).length, 0);
});

/* ───────── pickRandomVuln ───────── */
t("pickRandomVuln: rnd=0 ilk öğeyi verir", () => {
  assert.equal(pickRandomVuln(VULNS, () => 0).id, VULNS[0].id);
});
t("pickRandomVuln: rnd≈1 son öğeyi verir", () => {
  assert.equal(pickRandomVuln(VULNS, () => 0.9999).id, VULNS[VULNS.length - 1].id);
});
t("pickRandomVuln: sonuç her zaman listeden bir üye", () => {
  for (const r of [0, 0.33, 0.5, 0.75, 0.999]) {
    const v = pickRandomVuln(VULNS, () => r);
    assert.ok(VULNS.includes(v));
  }
});
t("pickRandomVuln: boş liste null", () => {
  assert.equal(pickRandomVuln([], () => 0), null);
});

/* ───────── pickNextUnsolved ───────── */
t("pickNextUnsolved: boş ilerlemede ilk zafiyet", () => {
  assert.equal(pickNextUnsolved(VULNS, {}).id, VULNS[0].id);
});
t("pickNextUnsolved: ilki tamsa ikinciye geçer", () => {
  const solved = { [VULNS[0].slug]: ["low", "medium", "high"] };
  assert.equal(pickNextUnsolved(VULNS, solved).id, VULNS[1].id);
});
t("pickNextUnsolved: kısmi çözülmüş (2/3) yine seçilir", () => {
  const solved = { [VULNS[0].slug]: ["low", "medium"] };
  assert.equal(pickNextUnsolved(VULNS, solved).id, VULNS[0].id);
});
t("pickNextUnsolved: hepsi tamsa null", () => {
  assert.equal(pickNextUnsolved(VULNS, fullSolve()), null);
});

/* ───────── computeBadges ───────── */
t("computeBadges: boş ilerlemede tüm rozetler kapalı", () => {
  assert.ok(computeBadges({}).every(b => b.on === false));
});
t("computeBadges: ilk flag 'İlk Kan'ı açar", () => {
  assert.equal(badge({ "command-injection": ["low"] }, "İlk Kan").on, true);
});
t("computeBadges: tüm çekirdek çözülünce 'Çekirdek Avcısı' açılır", () => {
  const core = VULNS.filter(v => v.group === "core");
  const solved = Object.fromEntries(core.map(v => [v.slug, ["low"]]));
  assert.equal(badge(solved, "Çekirdek Avcısı").on, true);
  assert.equal(badge(solved, "Modern Usta").on, false);
});
t("computeBadges: hepsi tamsa 'Efsane' + 'Yarı Yol' açılır", () => {
  const all = computeBadges(fullSolve());
  assert.equal(all.find(b => b.t === "Efsane").on, true);
  assert.equal(all.find(b => b.t === "Yarı Yol").on, true);
});

/* ───────── moduleProgress (akademi modül ilerlemesi) ───────── */
const theoryMod = ROADMAP.find(m => m.type === "theory");
const labsMod = ROADMAP.find(m => m.type === "labs");
const allRead = (m) => Object.fromEntries((m.lessons || []).map(l => [l.id, true]));

t("moduleProgress: teori modülü boş readLessons'da tamamlanmamış", () => {
  const p = moduleProgress(theoryMod, { solved: {}, readLessons: {} });
  assert.equal(p.done, 0);
  assert.equal(p.complete, false);
  assert.equal(p.total, theoryMod.lessons.length);
});
t("moduleProgress: teori modülü tüm dersler okununca tamamlanır", () => {
  const p = moduleProgress(theoryMod, { solved: {}, readLessons: allRead(theoryMod) });
  assert.equal(p.done, p.total);
  assert.equal(p.complete, true);
});
t("moduleProgress: lab modülünde bir flag çözmek bir dersi tamamlar", () => {
  const slug = labsMod.lessons[0].slug;
  const p = moduleProgress(labsMod, { solved: { [slug]: ["low"] }, readLessons: {} });
  assert.equal(p.done, 1);
  assert.equal(p.complete, false);
});
t("moduleProgress: lab modülü teori okumayla tamamlanmaz (flag gerekir)", () => {
  const p = moduleProgress(labsMod, { solved: {}, readLessons: allRead(labsMod) });
  assert.equal(p.done, 0);
});

/* ───────── roadmapStatus (sıralı kilit + override) ───────── */
t("roadmapStatus: boş ilerlemede yalnız ilk modül açık", () => {
  const st = roadmapStatus(ROADMAP, { solved: {}, readLessons: {} });
  assert.equal(st[0].unlocked, true);
  assert.equal(st[0].complete, false);
  assert.equal(st[1].unlocked, false);
});
t("roadmapStatus: ilk modül tamamlanınca ikincisi açılır, üçüncü kapalı", () => {
  const st = roadmapStatus(ROADMAP, { solved: {}, readLessons: allRead(ROADMAP[0]) });
  assert.equal(st[0].complete, true);
  assert.equal(st[1].unlocked, true);
  assert.equal(st[2].unlocked, false);
});
t("roadmapStatus: override sıralı kilidi bypass eder (sınıf modu)", () => {
  const target = ROADMAP[3].id;
  const st = roadmapStatus(ROADMAP, { solved: {}, readLessons: {}, overrides: { unlocked: [target] } });
  assert.equal(st[0].unlocked, true);          // ilk daima açık
  assert.equal(st[1].unlocked, false);         // listede yok → kapalı
  assert.equal(st[3].unlocked, true);          // override ile açık
});
t("roadmapStatus: override null ise otomatik kilide döner", () => {
  const auto = roadmapStatus(ROADMAP, { solved: {}, readLessons: {} });
  const same = roadmapStatus(ROADMAP, { solved: {}, readLessons: {}, overrides: { unlocked: null } });
  assert.deepEqual(same.map(s => s.unlocked), auto.map(s => s.unlocked));
});

/* ───────── katalog tutarlılığı (slug = labData/machines/flags ortak anahtar) ───────── */
t("katalog: her VULNS slug'ı MACHINES + FLAGS içinde tanımlı", () => {
  for (const v of VULNS) {
    assert.ok(MACHINES[v.slug], `MACHINES eksik: ${v.slug}`);
    assert.ok(FLAGS[v.slug], `FLAGS eksik: ${v.slug}`);
  }
});
t("katalog: nmap-recon ve metasploit-rce modülleri eklendi", () => {
  for (const s of ["nmap-recon", "metasploit-rce"]) {
    assert.ok(VULNS.some(v => v.slug === s), `VULNS eksik: ${s}`);
    assert.ok(MACHINES[s], `MACHINES eksik: ${s}`);
    assert.ok(/^ordek\{.+\}$/.test(FLAGS[s] || ""), `FLAGS biçimi hatalı: ${s}`);
  }
});
t("katalog: tüm FLAGS tekil ve ordek{...} biçiminde", () => {
  const vals = Object.values(FLAGS);
  assert.equal(new Set(vals).size, vals.length); // tekrar yok
  assert.ok(vals.every(f => /^ordek\{.+\}$/.test(f)));
});

/* ───────── matchRunningMachine (flag çözülünce oto-kapanma hedefi) ───────── */
t("matchRunningMachine: slug+level eşleşen makineyi bulur", () => {
  const ms = [{ id: "a", slug: "sql-injection", level: "low" }, { id: "b", slug: "nmap-recon", level: "medium" }];
  assert.equal(matchRunningMachine(ms, "nmap-recon", "medium").id, "b");
});
t("matchRunningMachine: eşleşme yoksa null", () => {
  assert.equal(matchRunningMachine([{ id: "a", slug: "x", level: "low" }], "y", "low"), null);
  assert.equal(matchRunningMachine([], "x", "low"), null);
  assert.equal(matchRunningMachine(null, "x", "low"), null);
});
t("matchRunningMachine: level verilmezse slug yeterli", () => {
  assert.equal(matchRunningMachine([{ id: "a", slug: "x", level: "high" }], "x").id, "a");
});

/* ───────── unreadCount (bildirim rozeti) ───────── */
t("unreadCount: okunmamış bildirimleri sayar", () => {
  assert.equal(unreadCount([{ read: false }, { read: true }, { read: false }]), 2);
  assert.equal(unreadCount([]), 0);
  assert.equal(unreadCount(null), 0);
});

/* ───────── rankStudents (skor tablosu) ───────── */
t("rankStudents: count azalan + eşitlikte ada göre + yarışma sırası", () => {
  const r = rankStudents([{ name: "ali", count: 1 }, { name: "bora", count: 3 }, { name: "can", count: 3 }]);
  assert.deepEqual(r.map(x => x.name), ["bora", "can", "ali"]);
  assert.deepEqual(r.map(x => x.rank), [1, 1, 3]);
});
t("rankStudents: boş giriş boş çıktı", () => {
  assert.deepEqual(rankStudents([]), []);
});

/* ───────── academy: gerçek araç labları (type:"tool" modülleri) ───────── */
t("academy: her araç AYRI bir type:'tool' modülü (≥20, setoolkit+evilginx dahil)", () => {
  const toolMods = ROADMAP.filter(m => m.type === "tool");
  assert.ok(toolMods.length >= 20, `en az 20 araç modülü olmalı (var: ${toolMods.length})`);
  const ids = toolMods.map(m => m.id);
  for (const slug of TOOL_LAB_ORDER) assert.ok(ids.includes(slug), `araç modülü eksik: ${slug}`);
  assert.ok(ids.includes("tool-setoolkit"), "setoolkit modülü eksik");
  assert.ok(ids.includes("tool-evilginx"), "evilginx3 modülü eksik");
  // her tool modülü tek bir laba (slug) bağlı
  for (const m of toolMods) assert.equal((m.lessons || [])[0] && m.lessons[0].slug, m.id);
});
t("academy: eski ar-nmap/ar-metasploit teori dersleri kaldırıldı", () => {
  const ids = ROADMAP.flatMap(m => (m.lessons || []).map(l => l.id));
  assert.ok(!ids.includes("ar-nmap") && !ids.includes("ar-metasploit"), "eski araç teori dersleri hâlâ var");
});
t("tool labs: her slug FLAGS + UI + manifest'te tutarlı; flag tekil & ordek{...}", () => {
  assert.deepEqual(toolLabConsistency(), [], "tool lab tutarsızlığı");
  const seen = new Set();
  for (const slug of TOOL_LAB_ORDER) {
    assert.ok(TOOL_LABS_UI[slug], `UI metadata eksik: ${slug}`);
    // noBox (içerik-only) lablar Docker manifesti gerektirmez.
    if (!TOOL_LABS_UI[slug].noBox) assert.ok(TOOL_LABS_MANIFEST[slug], `manifest eksik: ${slug}`);
    assert.ok(FLAGS[slug] && /^ordek\{.+\}$/.test(FLAGS[slug]), `flag biçimi/eksik: ${slug}`);
    assert.ok(!seen.has(FLAGS[slug]), `flag tekil değil: ${slug}`);
    seen.add(FLAGS[slug]);
  }
});
t("tool labs: bridge modu — her dinleyen hedef imajının yayımlanacak portu tanımlı (victim hariç)", () => {
  const VICTIM = process.env.TARGET_VICTIM_IMAGE || "ordek-victim-bot:latest";
  for (const slug of Object.keys(TOOL_LABS_MANIFEST)) {
    for (const tg of (TOOL_LABS_MANIFEST[slug].targets || [])) {
      if (tg.image === VICTIM) continue; // victim-bot port açmaz (giden trafik)
      const ps = targetPorts(tg.image);
      assert.ok(ps.length > 0, `port tanımı yok: ${slug} → ${tg.image}`);
      for (const p of ps) assert.ok(Number.isInteger(p.port) && /^(tcp|udp)$/.test(p.proto), `geçersiz port: ${tg.image}`);
    }
  }
});
t("conncheck: token deterministik + biçim; verifyConn yanlış/eksik değeri reddeder", () => {
  const a = connToken("abc123"), a2 = connToken("abc123"), b = connToken("xyz789");
  assert.equal(a, a2, "aynı machineToken aynı token üretmeli (deterministik)");
  assert.notEqual(a, b, "farklı machineToken farklı token");
  assert.match(a, /^ordek-net\{[A-Za-z0-9]{12}\}$/, "token biçimi ordek-net{12 alnum}");
  assert.equal(verifyConn("abc123", a), true, "doğru token kabul edilmeli");
  assert.equal(verifyConn("abc123", " " + a + " "), true, "boşluklar kırpılmalı");
  assert.equal(verifyConn("abc123", b), false, "başka token reddedilmeli");
  assert.equal(verifyConn("abc123", "ordek-net{kisa}"), false, "yanlış uzunluk reddedilmeli");
  assert.equal(verifyConn("abc123", ""), false, "boş değer reddedilmeli");
  assert.equal(verifyConn("", a), false, "machineToken yoksa reddedilmeli");
});

/* ───────── adım motoru (lib/steps.js) — Bandit-tarzı soru/cevap ───────── */
t("steps: stepLabConsistency boş (her lab tutarlı; son adım flag; flag-olmayan accept'li)", () => {
  assert.deepEqual(stepLabConsistency(), []);
});
t("steps: tool-linux & tool-nmap adım setine sahip; son adım isFlag", () => {
  for (const s of ["tool-linux", "tool-nmap"]) {
    const qs = stepsFor(s);
    assert.ok(qs && qs.length >= 2, `adım yok: ${s}`);
    assert.equal(qs[qs.length - 1].isFlag, true, `son adım flag değil: ${s}`);
  }
});
t("steps: UI interactive=true olan tool lab'ın STEP_LABS karşılığı var (ve tersi)", () => {
  for (const slug of TOOL_LAB_ORDER) {
    if (TOOL_LABS_UI[slug] && TOOL_LABS_UI[slug].interactive) assert.ok(stepsFor(slug), `STEP_LABS eksik: ${slug}`);
  }
  for (const slug of STEP_SLUGS) {
    if (slug.startsWith("tool-")) assert.ok(TOOL_LABS_UI[slug] && TOOL_LABS_UI[slug].interactive, `UI interactive değil: ${slug}`);
  }
});
t("steps: tool-olmayan her STEP_LABS slug'ı geçerli bir VULNS slug'ıdır (yazım hatası yakalar)", () => {
  const vulnSlugs = new Set(VULNS.map((v) => v.slug));
  for (const slug of STEP_SLUGS) {
    if (!slug.startsWith("tool-")) assert.ok(vulnSlugs.has(slug), `STEP_LABS slug VULNS'te yok: ${slug}`);
  }
});
t("steps: 29 web zafiyetinin tamamı adım setine sahip (MachinePanel hepsinde gösterir)", () => {
  for (const v of VULNS) assert.ok(stepsFor(v.slug), `STEP_LABS eksik: ${v.slug}`);
});
t("steps: publicSteps cevap (accept) SIZDIRMAZ + gating uygular", () => {
  const total = stepCount("tool-nmap");
  const p0 = publicSteps("tool-nmap", 0);            // hiç çözülmemiş → yalnız ilk soru
  assert.equal(p0.length, 1);
  assert.equal(p0[0].solved, false);
  const p2 = publicSteps("tool-nmap", 2);            // 2 çözülmüş → 2 solved + 1 current
  assert.equal(p2.length, 3);
  assert.deepEqual(p2.map((q) => q.solved), [true, true, false]);
  const pAll = publicSteps("tool-nmap", total);      // hepsi çözülmüş
  assert.equal(pAll.length, total);
  assert.ok(pAll.every((q) => q.solved === true));
  for (const q of [...p0, ...p2, ...pAll]) assert.ok(!("accept" in q), "accept cevabı sızdı!");
});
t("steps: checkStep doğru/yanlış ayırır; normalize eder; flag adımı FLAGS ile", () => {
  assert.equal(checkStep("tool-nmap", 2, "31337"), true);   // gizli port
  assert.equal(checkStep("tool-nmap", 2, "8080"), false);
  assert.equal(checkStep("tool-linux", 0, "  ORDEK "), true); // whoami=ordek (trim+lower)
  const last = stepCount("tool-nmap") - 1;
  assert.equal(checkStep("tool-nmap", last, FLAGS["tool-nmap"]), true);
  assert.equal(checkStep("tool-nmap", last, "ordek{yanlis}"), false);
  assert.equal(checkStep("tool-nmap", 999, "x"), false);      // aralık dışı
});

/* ───────── stepProgress (dosya deposu) — izole tmp dizinde ───────── */
{
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ordek-steps-"));
  process.env.LAB_DATA_DIR = TMP;
  const { getStep, setStep } = await import("../lib/stepProgress.js");
  t("stepProgress: oku/yaz round-trip + yalnız ileri; kullanıcı izole", () => {
    assert.equal(getStep(null, "tool-nmap"), 0);
    assert.equal(setStep(null, "tool-nmap", 2), 2);
    assert.equal(getStep(null, "tool-nmap"), 2);
    assert.equal(setStep(null, "tool-nmap", 1), 2);   // geri sarmaz
    assert.equal(getStep(null, "tool-nmap"), 2);
    setStep("s_test", "tool-nmap", 1);                // öğrenci ayrı alan
    assert.equal(getStep("s_test", "tool-nmap"), 1);
    assert.equal(getStep(null, "tool-nmap"), 2);      // global etkilenmez
  });
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
}

/* ───────── akademi: yeni ağ/protokol/sunucu/şifreleme modülleri (A1) ───────── */
t("academy: 4 yeni teori modülü ROADMAP'te var (ag-modelleri/protokoller/sunucular/sifreleme)", () => {
  const ids = new Set(ROADMAP.map(m => m.id));
  for (const id of ["ag-modelleri", "protokoller", "sunucular", "sifreleme"]) assert.ok(ids.has(id), `modül eksik: ${id}`);
  // her biri teori + en az 4 ders
  for (const id of ["ag-modelleri", "protokoller", "sunucular", "sifreleme"]) {
    const m = ROADMAP.find(x => x.id === id);
    assert.equal(m.type, "theory");
    assert.ok((m.lessons || []).length >= 4, `az ders: ${id}`);
  }
});

/* ───────── quiz (lib/quiz.js) — cevap SUNUCU-ONLY ───────── */
t("quiz: publicQuiz cevabı (answer) ve açıklamayı (explain) SIZDIRMAZ", () => {
  for (const id of listQuizIds()) {
    const pq = publicQuiz(id);
    assert.ok(pq && Array.isArray(pq.questions) && pq.questions.length > 0, `quiz boş: ${id}`);
    for (const q of pq.questions) {
      assert.ok(!("answer" in q), `answer sızdı: ${id}`);
      assert.ok(!("explain" in q), `explain sızdı: ${id}`);
      assert.ok(Array.isArray(q.choices) && q.choices.length >= 2);
    }
  }
});
t("quiz: checkQuiz doğru puanlar + her quiz'in answer indeksi geçerli", () => {
  for (const id of listQuizIds()) {
    const pq = publicQuiz(id);
    const n = pq.questions.length;
    // tüm cevapları yanlış (her soruda son şıkkı seç değil — indeks dışı emniyetli)
    const allWrong = checkQuiz(id, pq.questions.map(q => -1));
    assert.equal(allWrong.total, n);
    assert.ok(allWrong.score >= 0 && allWrong.score <= 100);
  }
  assert.equal(hasQuiz("yok-boyle-modul"), false);
  assert.equal(publicQuiz("yok-boyle-modul"), null);
});
t("quiz: tamamı doğru = %100 geçer", () => {
  const id = listQuizIds()[0];
  // doğru indeksleri checkQuiz'in results.correct'inden öğren (publicQuiz vermez)
  const probe = checkQuiz(id, []);
  const right = probe.results.map(r => r.correct);
  const full = checkQuiz(id, right);
  assert.equal(full.score, 100);
  assert.equal(full.passed, true);
});

/* ───────── gamify (app/gamifyData.js) — saf XP/seviye/rozet ───────── */
t("gamify: XP hesabı deterministik (flag×seviye + ders + quiz + seri)", () => {
  const g = computeGamify({ solved: { sqli: ["low", "high"] }, lessonsRead: 2, quizScores: { x: 80, y: 50 }, streak: 3 });
  // low(10)+high(25) + 2 ders×5 + 1 geçen quiz×25 + 3 seri×8 = 35+10+25+24 = 94
  assert.equal(g.xp, 94);
  assert.equal(g.flagCount, 2);
  assert.equal(g.streak, 3);
});
t("gamify: rozetler eşiklere göre açılır", () => {
  const none = computeGamify({});
  assert.ok(none.badges.every(b => !b.on));
  const g = computeGamify({ solved: { a: ["high"] }, lessonsRead: 10, quizScores: { m: 100 }, streak: 7 });
  const on = new Set(g.badges.filter(b => b.on).map(b => b.t));
  assert.ok(on.has("İlk Kan") && on.has("Zorlu Avcı") && on.has("Akademisyen") && on.has("Tam Not") && on.has("7 Gün Seri"));
});
t("gamify: seviye XP ile yükselir", () => {
  assert.equal(computeGamify({}).level, 1);
  const hi = computeGamify({ solved: Object.fromEntries(VULNS.slice(0, 20).map(v => [v.slug, ["low", "medium", "high"]])) });
  assert.ok(hi.level >= 2, "yüksek XP'de seviye artmadı");
});

/* ───────── AĞ KEŞFİ (lib/netinfo.js) — Kali↔hedef adres öğrenme ───────── */
t("netinfo: hostCandidates tespit edileni öne alır, ağ geçitlerini ekler, tekilleştirir", () => {
  const c = hostCandidates(["192.168.1.50"]);
  assert.equal(c[0].ip, "192.168.1.50", "bridged LAN IP ilk sırada olmalı");
  const ips = c.map(x => x.ip);
  assert.ok(ips.includes("10.0.2.2") && ips.includes("192.168.56.1"), "VM ağ geçitleri eklenmeli");
  assert.equal(new Set(ips).size, ips.length, "tekrar olmamalı");
});
t("netinfo: hostCandidates docker/iç IP'leri (172.x, 10.13.37.x, 127.x) ELER", () => {
  const ips = hostCandidates(["172.17.0.1", "10.13.37.5", "127.0.0.1", "169.254.1.1", "192.168.1.7"]).map(x => x.ip);
  assert.ok(!ips.some(ip => /^172\.|^127\.|^169\.254\.|^10\.13\.37\./.test(ip)), "iç IP sızdı");
  assert.ok(ips.includes("192.168.1.7"), "geçerli LAN IP düşürülmemeli");
});
t("netinfo: detected'taki 10.0.2.2 ağ geçidiyle çiftlenmez (tekil)", () => {
  const ips = hostCandidates(["10.0.2.2"]).map(x => x.ip);
  assert.equal(ips.filter(ip => ip === "10.0.2.2").length, 1);
  assert.deepEqual(VM_GATEWAYS.map(g => g.ip), ["10.0.2.2", "192.168.56.1"]);
});
t("netinfo: portMapOf yalnız atanmış (host!=null) portları haritalar", () => {
  const m = portMapOf([{ container: 80, host: 54321 }, { container: 31337, host: null }, { container: 443, host: 55000 }]);
  assert.deepEqual(m, { "80": 54321, "443": 55000 });
});
t("netinfo: portMapOf çift-protokollü portta (DNS 53 tcp+udp) TCP'yi tercih eder", () => {
  // sıra udp önce gelse bile tcp kazanmalı (AXFR/connection-refused bug'ı)
  const m = portMapOf([{ container: 53, host: 46512, proto: "udp" }, { container: 53, host: 44875, proto: "tcp" }]);
  assert.equal(m["53"], 44875, "TCP portu seçilmeli");
  const m2 = portMapOf([{ container: 53, host: 44875, proto: "tcp" }, { container: 53, host: 46512, proto: "udp" }]);
  assert.equal(m2["53"], 44875, "sıra ters olsa da TCP korunmalı");
});
t("netinfo: rewriteCmd test/prod modu (boş portMap) yalnız HOST'u değiştirir, portu KORUR", () => {
  // test modu: iç IP olduğu gibi
  assert.equal(rewriteCmd("nc 10.13.37.10 31337", { ip: "10.13.37.10", portMap: {} }), "nc 10.13.37.10 31337");
  // prod modu: target → gerçek LAN IP, portlar gerçek
  assert.equal(rewriteCmd("nc target 6200", { ip: "192.168.1.50", portMap: {} }), "nc 192.168.1.50 6200");
  assert.equal(rewriteCmd("curl -i http://target/", { ip: "192.168.1.50", portMap: {} }), "curl -i http://192.168.1.50/");
});
t("netinfo: rewriteCmd bridge modu — host + yayımlanan portu birlikte yazar", () => {
  const web = { ip: "10.0.2.2", portMap: { "80": 54321, "31337": 54322 } };
  assert.equal(rewriteCmd("nc 10.13.37.10 31337", web), "nc 10.0.2.2 54322");
  assert.equal(rewriteCmd("nmap -sV -p31337 10.13.37.10", web), "nmap -sV -p54322 10.0.2.2");
  assert.equal(rewriteCmd("curl -i http://target/", web), "curl -i http://10.0.2.2:54321/");
  assert.equal(rewriteCmd("curl http://target/robots.txt", web), "curl http://10.0.2.2:54321/robots.txt");
  // tls/sslscan: açık :443 → yayımlanan port
  assert.equal(rewriteCmd("sslscan 10.13.37.10:443", { ip: "10.0.2.2", portMap: { "443": 55000 } }), "sslscan 10.0.2.2:55000");
});
t("netinfo: rewriteCmd dns/smb — port bayrağı olmayan protokollere -p ekler (dig +tcp)", () => {
  // dig AXFR TCP ister → +tcp + TCP host portu (UDP portuna gidince connection refused olurdu)
  assert.equal(rewriteCmd("dig @target ordek.lab AXFR", { ip: "10.0.2.2", portMap: { "53": 44875 } }), "dig +tcp -p 44875 @10.0.2.2 ordek.lab AXFR");
  assert.equal(rewriteCmd("smbclient -L //target -N", { ip: "10.0.2.2", portMap: { "445": 55400, "139": 55401 } }), "smbclient -L //10.0.2.2 -p 55400 -N");
});
t("netinfo: rewriteCmd metindeki port-OLMAYAN sayıları (min-rate 2000, 2.2.8) bozmaz", () => {
  const web = { ip: "10.0.2.2", portMap: { "80": 54321, "31337": 54322 } };
  assert.equal(rewriteCmd("nmap -p- --min-rate 2000 10.13.37.10", web), "nmap -p- --min-rate 2000 10.0.2.2");
  // 80 anahtarı "8080"/"2000" içindeki rakamları yakalamamalı
  assert.equal(rewriteCmd("curl http://target:8080/", { ip: "10.0.2.2", portMap: { "80": 54321 } }), "curl http://10.0.2.2:8080/");
});
t("netinfo: rewriteCmd ip yoksa komutu aynen bırakır", () => {
  assert.equal(rewriteCmd("nmap 10.13.37.10", {}), "nmap 10.13.37.10");
  assert.equal(rewriteCmd("nmap 10.13.37.10", { ip: "" }), "nmap 10.13.37.10");
});
t("netinfo: discoveryScript token + adayları + panel portunu + /api/netinfo içerir", () => {
  const s = discoveryScript({ candidates: [{ ip: "10.0.2.2" }, { ip: "192.168.56.1" }], port: 54321, panelPort: 3000, token: "abc-123" });
  assert.ok(s.includes("10.0.2.2") && s.includes("192.168.56.1"), "adaylar eksik");
  assert.ok(s.includes("P=54321"), "yoklanacak port eksik");
  assert.ok(s.includes("/api/netinfo") && s.includes(":3000"), "geri-bildirim adresi eksik");
  assert.ok(s.includes("abc-123"), "token eksik");
  assert.ok(s.includes("nc -z"), "bağlanabilirlik yoklaması eksik");
  // exit 0 etkileşimli terminali KAPATMASIN → tümü alt-kabuk ( … ) içinde olmalı.
  assert.ok(s.trim().startsWith("(") && s.trim().endsWith(")"), "alt-kabuk sarmalı yok (exit terminali kapatır)");
});

/* ───────── WireGuard VPN (lib/wireguard.js) — saf yardımcılar ───────── */
t("wireguard: allocVpnIp boşta .2; aynı öğrenciye sabit; kullanılanı atlar", () => {
  assert.equal(allocVpnIp({}, "s1", "10.13.38."), "10.13.38.2");
  const peers = { s1: { vpnIp: "10.13.38.2" } };
  assert.equal(allocVpnIp(peers, "s1", "10.13.38."), "10.13.38.2", "var olan korunmalı");
  assert.equal(allocVpnIp(peers, "s2", "10.13.38."), "10.13.38.3", "ilk boşu vermeli");
});
t("wireguard: allocVpnIp tahsisi deterministik + tekil (çakışma yok)", () => {
  const peers = {};
  const ips = [];
  for (const id of ["a", "b", "c", "d"]) { const ip = allocVpnIp(peers, id, "10.13.38."); peers[id] = { vpnIp: ip }; ips.push(ip); }
  assert.deepEqual(ips, ["10.13.38.2", "10.13.38.3", "10.13.38.4", "10.13.38.5"]);
  assert.equal(new Set(ips).size, ips.length);
});
t("wireguard: clientConfText geçerli .conf üretir (Interface/Peer/Endpoint/AllowedIPs/keepalive)", () => {
  const c = clientConfText({ clientPriv: "PRIV=", vpnIp: "10.13.38.5", serverPub: "PUB=", endpoint: "10.0.2.2", port: 51820, labSubnet: "10.13.37.0/24", tunSubnet: "10.13.38.0/24" });
  assert.match(c, /\[Interface\]/);
  assert.match(c, /PrivateKey = PRIV=/);
  assert.match(c, /Address = 10\.13\.38\.5\/32/);
  assert.match(c, /\[Peer\]/);
  assert.match(c, /PublicKey = PUB=/);
  assert.match(c, /Endpoint = 10\.0\.2\.2:51820/);
  assert.match(c, /AllowedIPs = 10\.13\.37\.0\/24, 10\.13\.38\.0\/24/);
  assert.match(c, /PersistentKeepalive = 25/);
});
t("wireguard: peersEnvString eksik kayıtları eler, 'pub=ip,pub=ip' üretir", () => {
  const s = peersEnvString({ a: { clientPub: "PA", vpnIp: "10.13.38.2" }, b: { clientPub: "PB", vpnIp: "10.13.38.3" }, c: { vpnIp: "10.13.38.4" } });
  assert.equal(s, "PA=10.13.38.2,PB=10.13.38.3");
});
t("wireguard: parseHandshakes 'pub\\tepoch' satırlarını ayrıştırır, çöpü atar", () => {
  const hs = parseHandshakes("PUBA\t1700000000\nPUBB\t0\ngarbage line\nPUBC\tabc");
  assert.equal(hs.PUBA, 1700000000);
  assert.equal(hs.PUBB, 0);
  assert.ok(!("PUBC" in hs), "sayı olmayan ts atlanmalı");
});
t("wireguard: isConnected 180sn penceresi", () => {
  const now = 2000000;
  assert.equal(isConnected(now - 10, now), true);
  assert.equal(isConnected(now - 200, now), false);
  assert.equal(isConnected(0, now), false);
});
t("wireguard: peerKey studentId yoksa 'solo'", () => {
  assert.equal(peerKey("s_abc"), "s_abc");
  assert.equal(peerKey(null), "solo");
  assert.equal(peerKey(undefined), "solo");
});

console.log(`\n${pass} geçti, ${fail} başarısız.`);
process.exit(fail ? 1 : 0);
