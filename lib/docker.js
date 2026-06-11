// ============================================================================
//  lib/docker.js — SUNUCU-ONLY Docker orkestrasyon yardımcıları.
//  Panel, docker.sock üzerinden her zafiyet+seviye için izole hedef konteyner
//  başlatır. Sınıf modunda her makine `ordek-lab.student=<userId>` etiketiyle
//  başlatılır → öğretmen kimin hangi makineyi çalıştırdığını görebilir.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MACHINES, MACHINE_SLUGS } from "@/lib/machines";

const pexec = promisify(execFile);
const IMAGE = process.env.MACHINE_IMAGE || "ordek-lab:latest";
export const LEVELS = ["low", "medium", "high"];

export async function docker(args, timeout = 60000) {
  const { stdout } = await pexec("docker", args, { timeout });
  return stdout.trim();
}

// Docker label değeri güvenli karakterlere indirgenir (virgül parse'ı bozulmasın).
const safeLabel = (s) => String(s || "").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);

function parseLine(line) {
  const [id, ports, labels, status] = line.split("\t");
  const g = (re) => (labels.match(re) || [])[1] || null;
  const slug = g(/ordek-lab\.slug=([^,]+)/);
  const level = g(/ordek-lab\.level=([^,]+)/);
  const studentId = g(/ordek-lab\.student=([^,]+)/);
  const studentName = g(/ordek-lab\.studentname=([^,]+)/);
  const port = (ports.match(/:(\d+)->3000\/tcp/) || [])[1] || null;
  return {
    id, slug, level, studentId, studentName, port, status,
    url: port ? `http://localhost:${port}` : null,
    name: slug && MACHINES[slug] ? MACHINES[slug].name : slug,
  };
}

export async function listMachines() {
  const fmt = "{{.ID}}\t{{.Ports}}\t{{.Labels}}\t{{.Status}}";
  const out = await docker(["ps", "--filter", "label=ordek-lab.machine=1", "--format", fmt], 15000);
  return out ? out.split("\n").map(parseLine) : [];
}

function runArgs({ slug, level, studentId, studentName }) {
  const args = [
    "run", "-d", "--rm",
    "--label", "ordek-lab.machine=1",
    "--label", `ordek-lab.slug=${slug}`,
    "--label", `ordek-lab.level=${level}`,
  ];
  if (studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
  if (studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
  args.push("-e", `LAB_MACHINE=${slug}`, "-e", `LAB_FORCE_LEVEL=${level}`, "-p", "0:3000", IMAGE);
  return args;
}

async function hostPort(id) {
  return docker(["inspect", "--format", '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', id], 15000);
}

// Aynı slug+level (+student) için eskisini kaldır → deep-freeze taze başlangıç
export async function startMachine({ slug, level, studentId, studentName }) {
  const filters = ["ps", "-q", "--filter", `label=ordek-lab.slug=${slug}`, "--filter", `label=ordek-lab.level=${level}`];
  if (studentId) filters.push("--filter", `label=ordek-lab.student=${safeLabel(studentId)}`);
  const existing = await docker(filters, 15000);
  if (existing) { for (const cid of existing.split("\n")) await docker(["rm", "-f", cid], 20000).catch(() => {}); }
  const id = await docker(runArgs({ slug, level, studentId, studentName }), 60000);
  const port = await hostPort(id);
  return { id, slug, level, port, url: `http://localhost:${port}`, status: "starting", name: MACHINES[slug].name };
}

export async function stopMachine(id) {
  await docker(["rm", "-f", id], 25000);
  return { ok: true, stopped: id };
}

export async function restartMachine({ id, slug, level, studentId, studentName }) {
  await docker(["rm", "-f", id], 25000).catch(() => {});
  const nid = await docker(runArgs({ slug, level, studentId, studentName }), 60000);
  const port = await hostPort(nid);
  return { id: nid, slug, level, port, url: `http://localhost:${port}`, status: "starting" };
}

export { MACHINE_SLUGS };
