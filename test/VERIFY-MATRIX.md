# Doğrulama Matrisi — Faz 1 (gerçekçilik & doğruluk)

Bu belge, makinelerin/zafiyetlerin GERÇEKTEN çalıştığının Docker'da canlı doğrulamasını kaydeder.
Çalıştırma ortamı: Docker 29.5.x, Windows 11. İmajlar: `ordek-lab`, `ordek-attacker`, `ordek-target-*`.

## 1A — Nmap gerçek IP şeması  ✅ DOĞRULANDI

Oturum ağı artık sabit subnet + statik IP ile kuruluyor (`lib/docker.js`):
- subnet `10.13.37.0/24`, gateway `.1`, saldırgan `.5`, hedef `.10`, victim `.20`.

Canlı kanıt (gömülü saldırgan + web hedef):

| Adım | Komut | Sonuç |
|------|-------|-------|
| Statik IP | `docker inspect ... target` | `10.13.37.10` ✓ |
| Bağlantı | `ping -c2 10.13.37.10` (saldırgandan) | 2/2 paket, %0 kayıp ✓ |
| Servis keşfi | `nmap -sV 10.13.37.10` | `80/tcp open http` + `31337/tcp open Elite` ✓ |
| Tüm portlar | `nmap -p- 10.13.37.10` | tam 2 açık port (80, 31337) — adım cevabı "2" ile uyumlu ✓ |
| Flag | `nc 10.13.37.10 31337` | banner'da `ordek{...}` ✓ |

UI/adım metinleri `target` → `10.13.37.10` güncellendi (`toolLabData.js`, `steps.js`). Panel hedef IP'sini gösteriyor (`ToolLabPanel.jsx`).

## 1B — command-injection `ping` "operation not permitted" ✅ KÖK NEDEN + DÜZELTME DOĞRULANDI

**Kök neden:** `/bin/ping` üzerinde `cap_net_raw=ep` DOSYA yeteneği var. `--cap-drop ALL --security-opt no-new-privileges` altında dosya-yetenekli binary'nin exec'i kernel tarafından EPERM ile reddediliyor → `exec /bin/ping: operation not permitted` (program hiç çalışmıyor).

**Düzeltme (sandbox gevşemeden):**
1. Build-time: `/bin/ping`'ten dosya yeteneğini kaldır (`setcap cap_net_raw-ep`) — `Dockerfile`.
2. Runtime: yetkisiz ICMP datagram soketini aç — `--sysctl net.ipv4.ping_group_range=0 2147483647` — `lib/docker.js` (runArgs + target + attacker).

Canlı kanıt (`--cap-drop ALL --security-opt no-new-privileges` altında):

| Senaryo | Sonuç |
|---------|-------|
| ÖNCE (cap var, sysctl yok) | `exec /bin/ping: operation not permitted` ❌ |
| SONRA (cap silindi + sysctl) | `64 bytes from 127.0.0.1 ... 2 received, 0% packet loss` ✅ |

> Not: Egress kapalı (`--internal`) olduğundan `ping 8.8.8.8` cevapsızdır — bu gerçekçidir (izole ağ). `127.0.0.1` ve menzil IP'leri (`10.13.37.10`) gerçek ICMP cevabı verir.

## 1C — Tüm zafiyetlerin exploit matrisi

`test/level-matrix.mjs`: 29 web zafiyeti × low/medium/high dokümante exploit'i çalışan hedefe karşı dener ve INTENDED flag/no-flag sonucunu doğrular.

Çalıştırma:
```
# 1) tek hedef makineyi başlat (rebuild edilmiş ordek-lab imajı):
docker run -d --name ci-verify --cap-drop ALL --security-opt no-new-privileges \
  --sysctl "net.ipv4.ping_group_range=0 2147483647" -e LAB_MACHINE=command-injection \
  -p 127.0.0.1:3300:3000 ordek-lab:latest
# 2) matrisi koştur:
BASE=http://localhost:3300 node test/level-matrix.mjs
```

**Sonuç: 90/90 PASS** ✅ (rebuild edilmiş `ordek-lab` imajına karşı, `command-injection` makinesi).

- 29 web zafiyetinin tamamı × low/medium/high INTENDED davranışı veriyor (low/medium → flag, high → korumalı; ileri-bypass'lar kasıtlı flag).
- `flag-isolation panel-home`: ana sayfada flag sızıntısı yok ✓.
- command-injection canlı uç-nokta kanıtı (`/cmd`, low):
  - `ip=127.0.0.1` → gerçek ping çıktısı ("2 received") — **artık 'operation not permitted' YOK** ✓
  - `ip=127.0.0.1; id` → `uid=0(root)` ✓
  - `ip=127.0.0.1; cat /tmp/flag.txt` → `ordek{cmd_injection_shell_erisimi}` ✓
- Tek flaky kalem: `insecure-randomness/medium` (zaman-tabanlı token tahmini, saniye sınırı). Test penceresi ±4sn'ye genişletildi; yeniden koşumda 90/90.

> Tool labları (24) için canlı kanıt 1A bölümünde (nmap menzili). Diğer araçlar aynı menzil/imaj mekaniğini paylaşır.

## 2A — 10 YENİ WEB ZAFİYETİ ✅ 120/120 DOĞRULANDI

`test/level-matrix.mjs` artık 39 web zafiyeti × low/medium/high → **120/120 PASS** (rebuild edilmiş `ordek-lab`).
Yeni: xxe, nosql-injection, graphql-injection, ldap-injection, xpath-injection, http-parameter-pollution,
web-cache-poisoning, websocket-tampering, git-disclosure, jwt-alg-confusion. Her biri low/medium sömürülür,
high korumalı. Not: jwt-alg-confusion'da imza ELLE doğrulanıyor (jsonwebtoken v9 confusion'ı engeller).

## 2B — 10 YENİ ARAÇ LABI ✅ (hedef tarafı doğrulandı; saldırgan imajı deploy'da derlenir)

Tutarlılık: `node test/units.mjs` 49/49 (flags+UI+manifest+steps her yeni araçta hizalı, flag tekil).

Hedef tarafı canlı kanıt (ordek-target-web / -tls smoke test):
| Araç | Hedef mekanizması | Sonuç |
|------|-------------------|-------|
| tool-nuclei | web `/.env` → SECRET=flag | ✅ |
| tool-whatweb | web `<meta generator>`=flag | ✅ (format() brace-escape fix) |
| tool-dalfox | web `/search?q=` yansır + kaynak yorumunda flag | ✅ |
| tool-commix | web `/ping?host=` komut enjeksiyonu (`;cat /tmp/ci_flag.txt`) | ✅ gerçek RCE |
| tool-sslscan | yeni `ordek-target-tls` sertifika OU=flag | ✅ |
| tool-gobuster | web `/admin/flag.txt` (mevcut) | ✅ |
| tool-netexec / impacket | smb `/srv/public/flag.txt` (mevcut) | ✅ mekanizma |
| tool-subfinder | dns `flag.ordek.lab TXT` (mevcut) | ✅ mekanizma |
| tool-gitleaks | saldırgan loot: git geçmişine sızıp silinen sır | entrypoint case eklendi |

CLI araçları (nuclei, sslscan, netexec/cme, impacket, gitleaks, subfinder, commix, dalfox) Kali saldırgan
imajına eklendi (`docker/attacker/Dockerfile` best-effort apt). **Deploy adımı:** `docker compose --profile build build attacker target-tls`
(çok-GB Kali imajı bu oturumda yeniden derlenmedi; gobuster/whatweb zaten kuruluydu).

## 2C — TASARIM SİSTEMİ KATMANI ✅ (palet + butonlar KORUNDU)

`lib/ui-css.js` tek kaynağına eklenen ≥10 yenilik (renk değişkenleri ve `.kbtn/.primary/...` butonlar dokunulmadı):
1. 4px tabanlı **boşluk ölçeği** (`--sp-1..--sp-8`). 2. **Tipografi ölçeği** (`.h2–.h5`, `.text-xs/sm/lg/mono`).
3. **Erişilebilirlik**: tüm interaktif öğelerde `:focus-visible` halkası (`--focus`); fare odağında değil.
4. `--ink-faint` kontrastı WCAG AA için açıldı. 5. **badge** (durum/sayı). 6. **stat-card** (dashboard).
7. **progress ring** (conic SVG mask). 8. **divider**. 9. **tabs**. 10. **empty-state**. 11. **skeleton** (genel).
12. **tooltip**. 13. **modal/diyalog**. 14. **toast yığını**. 15. **ağ topolojisi** mini-diyagramı (saldırgan↔hedef IP).
16. **responsive app-shell** (dar ekranda sidebar→çekmece, grid tek sütun).

Topoloji diyagramı `app/ToolLabPanel.jsx`'e bağlandı (1A IP şemasını görselleştirir: kali .5 ↔ hedef .10/.20).
Doğrulama: `node test/ui-regression.mjs` 8/8 (korunan tüm sınıflar yerinde) + rebuild (`next build`) başarılı +
level-matrix 120/120 (paylaşılan CSS değişikliği hiçbir lab sayfasını bozmadı). Not: yeni primitive'lerin
(modal/toast/tabs/stat-card) sayfa-sayfa JSX'e geniş uygulanması doğal devam adımıdır.

## 1D — Sınıf modu hata düzeltmeleri ✅ TEST EDİLDİ

`node test/classroom-units.mjs` → 15/15 PASS (önceki 9 + 6 yeni regresyon):
- `resolveHelpRequest` helpId'siz çağrı artık hiçbir isteği kapatmıyor (HIGH bug fix).
- `resolveAllHelpRequests` açık niyetle hepsini kapatıyor.
- `getMessagesFor` limit/before sayfalama.
- `logAudit`/`getAudit` denetim kaydı.
- `pruneClassData` yetim veri temizliği.
- `validId` PP/abuse id reddi.
- broadcast tek atomik yazım; tüm yazımlar atomik (tmp + rename).
