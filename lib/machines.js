// ============================================================================
//  lib/machines.js — TryHackMe-tarzi "makine" katalogu (CLIENT-SAFE METADATA).
//  Backend endpoint'i olan zafiyetler icin: slug -> { name, endpoint, story, objectives }
//  ⚠ FLAG'LER BURADA TUTULMAZ. Kanonik flag'ler yalnizca sunucu-only lib/flags.js'te.
//     (Bu dosya client bilesenlerine import edildigi icin flag iceremez.)
//  Her makine baslatildiginda ayni imaj env ile calisir: LAB_MACHINE=<slug>, LAB_FORCE_LEVEL=<level>
//  (slug'lar app/labData.js ile ayni)
// ============================================================================
export const MACHINES = {
  "command-injection": {
    name: "Command Injection",
    endpoint: { method: "POST", path: "/api/ping", kind: "json", sample: '{"host":"8.8.8.8; id"}' },
    story: "Şirketin ağ ekibi, hedef bir IP'ye ping atan basit bir tanı aracını iç portala koymuş. Girdi doğrudan kabuğa (shell) gidiyor. Görevin: aracı bir komut yürütme zafiyetine çevirip sunucuda kod çalıştırmak.",
    objectives: ["Ping aracının girdiyi nasıl işlediğini anla", "Zincirleme operatörlerle (`;` `|` `%0a`) ek komut çalıştır", "Sunucudaki gizli flag dosyasını oku"],
  },
  "file-inclusion": {
    name: "File Inclusion (LFI)",
    endpoint: { method: "GET", path: "/api/read", kind: "query", sample: "file=../../../../etc/passwd" },
    story: "Bir 'sayfa görüntüleyici' kullanıcı girdisini dosya yoluna ekliyor. Dizin gezerek (path traversal) sunucudan hassas dosyaları okumayı dene.",
    objectives: ["`?file=` parametresini manipüle et", "`/etc/passwd`'i oku", "Medium'da `....//` ile naif filtreyi atlat"],
  },
  "sql-injection": {
    name: "SQL Injection",
    endpoint: { method: "GET", path: "/api/product", kind: "query", sample: "id=0 UNION SELECT id,username,password,role FROM User" },
    story: "Ürün arama endpoint'i, ID'yi doğrudan SQL sorgusuna gömüyor. Error-based + UNION ile veritabanından kullanıcı parolalarını (MD5) çek; sqlmap pratiği yap.",
    objectives: ["Tek tırnak ile SQL hatasını tetikle", "UNION ile users tablosunu dump et", "admin MD5 hash'ini kır (hashcat/rockyou)"],
  },
  "sql-injection-blind": {
    name: "SQL Injection (Login Bypass)",
    endpoint: { method: "POST", path: "/sqli-blind", kind: "json", sample: "username=admin&password=' OR '1'='1" },
    story: "Bu sayfa bir Yönetim Paneli giriş ekranıdır. Parola kısmına SQL Injection (Login Bypass) teknikleri kullanarak yönetici (admin) hesabına şifresiz giriş yap.",
    objectives: ["Parola doğrulamasını SQL cümlesi manipüle ederek atlat", "Medium seviyede kara listeyi `||` gibi yöntemlerle bypass et", "Admin dashboard'una erişerek flag animasyonunu tetikle"],
  },
  "xss-reflected": {
    name: "XSS (Reflected)",
    endpoint: { method: "GET", path: "/xss-ref", kind: "query", sample: "q=<img src=x onerror=showFlag()>" },
    story: "Arama terimi ürün sayfasında temizlenmeden (encode edilmeden) HTML içine yansıyor. Bir JS payload'u ile tarayıcıda kod çalıştırıp arka plandaki bayrağı (flag) göster.",
    objectives: ["`<script>showFlag()</script>` ile yansiyan XSS tetikle", "Medium'da `<script>` filtresini `onerror` veya `<svg>` ile atlat", "Sayfadaki animasyonlu XSS bayrağını ortaya çıkar"],
  },
  "xss-stored": {
    name: "XSS (Stored)",
    endpoint: { method: "POST", path: "/xss-stored", kind: "json", sample: "comment=<script>showFlag()</script>" },
    story: "Kullanıcıların bıraktığı yorumlar veritabanına kaydedilir ve sayfaya giren herkese gösterilir. Zararlı bir JavaScript yorumu bırakarak sisteme giren herkesin tarayıcısında kod çalıştır.",
    objectives: ["Veritabanına kalıcı olarak XSS payload'ı kaydet", "Medium seviyede `<script>` filtresini atlatarak kalıcı hasar bırak", "Sayfayı her yenilediğinde XSS bayrağının (showFlag) tetiklendiğini gör"],
  },
  "brute-force": {
    name: "Brute Force",
    endpoint: { method: "POST", path: "/api/login", kind: "json", sample: '{"username":"admin","password":"password"}' },
    story: "Giriş panelinde oran sınırı zayıf. Bir sözlük saldırısıyla (rockyou) admin parolasını kır.",
    objectives: ["Hydra/Intruder ile sözlük saldırısı", "admin parolasını bul", "Medium'da gecikme/limitin neden yetersiz olduğunu gör"],
  },
  "user-enumeration": {
    name: "Account Enumeration",
    endpoint: { method: "POST", path: "/api/login", kind: "json", sample: '{"username":"admin","password":"x"}' },
    story: "Giriş yanıtı, kullanıcının var olup olmadığını sızdırıyor (farklı mesaj/süre). Geçerli kullanıcıları listele.",
    objectives: ["Hata mesajı farkını tespit et", "Geçerli kullanıcı adlarını topla", "High'da neden sızmadığını gözle"],
  },
  "insecure-jwt": {
    name: "Insecure JWT",
    endpoint: { method: "POST", path: "/jwt", kind: "form", sample: "token=eyJhbGciOiJub25l...&action=verify" },
    story: "Kullanıcı rolleri ve yetkileri JWT içerisinde tutuluyor. Hedefiniz standart bir kullanıcının token'ını manipüle edip sistemde `admin` yetkilerine sahip olmak.",
    objectives: ["`alg: none` zafiyetini sömürerek imzasız admin token'ı oluştur", "Medium seviyesinde zayıf anahtarı (secret123) hashcat/john ile kır", "Kendine geçerli bir admin token imzala"],
  },
  "ssti": {
    name: "SSTI — Template Injection",
    endpoint: { method: "POST", path: "/api/template", kind: "json", sample: '{"tpl":"<%= 7*7 %>"}' },
    story: "Şablon önizleme özelliği kullanıcı girdisini EJS ile render ediyor. `7*7=49` ile doğrula, sonra sunucuda komut çalıştır.",
    objectives: ["`<%= 7*7 %>` ile SSTI doğrula", "`child_process` ile RCE'ye yüksel", "Medium kara liste bypass'ını dene"],
  },
  "insecure-deserialization": {
    name: "Insecure Deserialization",
    endpoint: { method: "POST", path: "/api/cart/import", kind: "raw", sample: '{"x":"_$$ND_FUNC$$_function(){return require(\'child_process\').execSync(\'id\').toString()}()"}' },
    story: "'Sepeti içeri aktar' özelliği node-serialize ile güvensiz deserialize yapıyor. IIFE payload'ı ile kod çalıştır.",
    objectives: ["node-serialize IIFE payload'ı hazırla", "Sunucuda komut çalıştır", "Medium imza filtresini atlat"],
  },
  "cors-misconfig": {
    name: "CORS Misconfiguration",
    endpoint: { method: "GET", path: "/cors", kind: "query", sample: "" },
    story: "`/cors?action=api` endpoint'i hassas profili dönüyor ve Origin'i yansıtıyor. Başka bir origin'den (`evil.com` veya `evilordek-store.com`) istek attırıp verileri (Flag) çalmaya çalış.",
    objectives: ["Attacker arayüzünden sahte Origin ile fetch isteği at", "Medium seviyesinde `.endswith()` filtresini (ordek-store.com) atlat", "API'den dönen gizli veriyi oku"],
  },
  "host-header-poisoning": {
    name: "Host Header Poisoning",
    endpoint: { method: "POST", path: "/host", kind: "json", sample: '{"email":"test@test.com"}' },
    story: "Şifre sıfırlama tokeni oluşturulurken Host header'ı kullanılıyor. Araya girip token'ı çal.",
    objectives: ["Host başlığını değiştir", "Sıfırlama linkinde yansımayı gör", "Medium rotası bypass'ını dene"],
  },
  "mass-assignment": {
    name: "Mass Assignment",
    endpoint: { method: "POST", path: "/mass", kind: "json", sample: '{"bio":"hey", "role":"admin"}' },
    story: "Profil güncelleme işleminde, sunucu istemciden gelen JSON gövdesindeki tüm alanları doğrudan veritabanına yazar. Gizli `role` veya `isAdmin` alanlarını manipüle edip yetkini yükselt.",
    objectives: ["Giden JSON isteğine müdahale et", "role=admin veya isAdmin=true ekleyerek yetkini yükselt", "Admin ayrıcalıklarına sahip olduğunu doğrula"],
  },
  "race-condition": {
    name: "Race Condition / TOCTOU",
    endpoint: { method: "POST", path: "/api/coupon", kind: "json", sample: '{"code":"WELCOME50"}' },
    story: "Tek kullanımlık kupon kontrol+düşme işlemi atomik değil. Eş zamanlı isteklerle kuponu birden çok kez kullan.",
    objectives: ["Eş zamanlı istek gönder (Turbo Intruder)", "Kuponun >1 kez uygulandığını gör", "High'ın neden atomik olduğunu anla"],
  },
  "business-logic": {
    name: "Business Logic — Fiyat",
    endpoint: { method: "POST", path: "/api/checkout", kind: "json", sample: '{"productId":1,"price":0.01,"qty":1}' },
    story: "Ödeme akışı fiyatı istemciden alıyor. Fiyatı/adedi manipüle ederek bedavaya/eksiye satın al.",
    objectives: ["`price`'i 0.01 yap", "Negatif `qty` ile iade istismarı", "High'da fiyatın sunucudan geldiğini gör"],
  },
  "redos": {
    name: "ReDoS",
    endpoint: { method: "POST", path: "/api/validate", kind: "json", sample: '{"v":"aaaaaaaaaaaaaaaaaaaaaaaaaaa!"}' },
    story: "Bir doğrulama regex'i katastrofik geri izlemeye açık. Tek bir istekle event loop'u kilitleyip DoS yarat. (Dikkat: makineyi kasıtlı yavaşlatır!)",
    objectives: ["Katastrofik girdiyi oluştur", "Yanıt süresinin üstel arttığını gör", "High'ın lineer doğrulamasını karşılaştır"],
  },
  "idor-bola": {
    name: "BOLA / IDOR",
    endpoint: { method: "GET", path: "/idor", kind: "query", sample: "?orderId=1002" },
    story: "Sipariş geçmişi sayfası URL'deki `orderId` parametresi ile faturaları getiriyor. Ancak sahiplik (Authorization) kontrolü yapılmıyor. ID'yi değiştirerek başka bir kullanıcının (admin'in) siparişindeki gizli bayrağı (Flag) ele geçir.",
    objectives: ["Sana ait olmayan `1001` numaralı siparişin URL'ine git", "Veritabanındaki sahiplik açığından faydalan", "Adminin faturasındaki bayrağı ele geçir"],
  },
  "mfa-bypass": {
    name: "2FA / MFA Bypass",
    endpoint: { method: "GET", path: "/mfa", kind: "query", sample: "?page=login" },
    story: "Admin kullanıcısının parolasını ele geçirdin ancak sistemde MFA (Çok Faktörlü Doğrulama) var. Login sonrasında senden maile giden 4 haneli kodu istiyor. Uygulama mantığındaki hataları (Bilgi İfşası veya State Bypass) kullanarak bu aşamayı atlat.",
    objectives: ["Network sekmesindeki JSON yanıtını incele", "MFA sayfasını adres çubuğundan atlayıp Dashboard'a git", "MFA'yı başarılı şekilde atlatıp gizli bayrağı al"],
  },
  "insecure-randomness": {
    name: "Insecure Randomness",
    endpoint: { method: "GET", path: "/reset", kind: "query", sample: "" },
    story: "Parola sıfırlama (Forgot Password) portalındasınız. Kendinize ('hacker@ordek.com') ve hedefinize ('admin@ordek.com') parola sıfırlama kodları talep edebilirsiniz. Hedefin kodu mailine gider, ancak kod üretimindeki Zayıf Rastgelelik (Insecure Randomness) zafiyetlerini kullanarak admin'in tokenini tahmin edin ve parolasını ele geçirin.",
    objectives: ["Kendi hesabınıza ('hacker') token isteyip 'Giden Kutusu'ndan okuyun", "Token'ın ardışık (sayısal) veya zaman bazlı örüntüsünü tespit edin", "Ardından hemen 'admin' için token isteyip örüntüyü kullanarak doğru tokeni tahmin edin ve parolayı sıfırlayın"],
  },
  "prototype-pollution": {
    name: "Prototype Pollution",
    endpoint: { method: "POST", path: "/prototype-router", kind: "json", sample: '{"__proto__":{"isAdmin":true}}' },
    story: "Ayarlar endpoint'i güvensiz `merge` kullanıyor. `__proto__` ile Object prototype'ını kirletip yetki yüksel.",
    objectives: ["`__proto__` ile kirletme yap", "`isAdmin` bayrağının taştığını gör", "Medium'da `constructor.prototype` ile atlat"],
  },
  "server-side-pp-gadget": {
    name: "Server-Side PP → Gadget",
    endpoint: { method: "POST", path: "/pp-gadget", kind: "json", sample: '{"__proto__":{"NODE_OPTIONS":"--require /tmp/evil.js"}}' },
    story: "Prototype kirletildikten sonra, arka planda çalışan bir işlemi (gadget) tetikleyerek sunucuda kod çalıştır.",
    objectives: ["Object.prototype kirlet", "Gadget'ı tetikle", "Flag dosyasını veya çıktısını elde et"],
  },
  "open-redirect": {
    name: "Open Redirect",
    endpoint: { method: "GET", path: "/api/redirect", kind: "query", sample: "next=//evil.com" },
    story: "Giriş sonrası `next` parametresi doğrulanmadan yönlendiriliyor. Kurbanı dış bir siteye yönlendir.",
    objectives: ["`next=https://evil.com` dene", "Medium'da `//evil.com` ile bypass", "High'ın yerel-yol allowlist'ini gör"],
  },
  "ssrf": {
    name: "SSRF (İç Servis & Metadata)",
    endpoint: { method: "POST", path: "/ssrf-router", kind: "json", sample: '{"url":"http://169.254.169.254/latest/meta-data/"}' },
    story: "Sunucu, verilen URL'den bir web sitesi önizlemesi getiriyor. İç kaynaklara (metadata/iç servis) istek attırıp SSRF yap.",
    objectives: ["Sunucuyu iç bir adrese yönlendir", "Cloud metadata/iç servisi oku", "Medium IP filtresini bypass et"],
  },
  "csrf": {
    name: "CSRF",
    endpoint: { method: "POST", path: "/api/profile", kind: "json", sample: '{"bio":"hacked"}' },
    story: "Profil güncelleme anti-CSRF token kullanmıyor. Kurbana otomatik gönderilen bir istekle profilini değiştir.",
    objectives: ["Token olmadan isteğin kabul edildiğini gör", "Bir CSRF PoC sayfası kur", "High'da token doğrulamasını gözle"],
  },
  "clickjacking": {
    name: "Clickjacking (UI Redress)",
    endpoint: { method: "GET", path: "/clickjacking", kind: "query", sample: "" },
    story: "Hassas bir admin işlemi (rol yükseltme) çerçeve (iframe) korumasından yoksun. Şeffaf bir iframe + decoy ile kurbana fark ettirmeden hassas butona tıklatmayı (UI redress) göster.",
    objectives: ["Hedef paneli bir iframe'e göm", "Frame koruması (X-Frame-Options / frame-ancestors) eksikliğini doğrula", "Clickjacking PoC'unu çalıştırıp flag'i al"],
  },
  "file-upload": {
    name: "File Upload (Webshell)",
    endpoint: { method: "POST", path: "/upload", kind: "form", sample: "shell.js" },
    story: "Profil fotoğrafı yükleme alanı uzantı/MIME doğrulamasını ihmal ediyor. Çalıştırılabilir bir dosya (webshell) yükleyip sunucuda kod çalıştırmayı dene.",
    objectives: ["Resim yerine .js/.php uzantılı dosya yükle", "Medium'da istemci-tarafı MIME kontrolünü atlat", "Yüklenen webshell'i tetikleyip flag'i al"],
  },
  "csv-injection": {
    name: "CSV / Formula Injection",
    endpoint: { method: "POST", path: "/csv-injection", kind: "form", sample: "=HYPERLINK(...)" },
    story: "Kullanıcı adları admin tarafından CSV olarak dışa aktarılıyor. Hücreye formül enjekte ederek (= + - @) admin Excel'de açınca komut/veri sızıntısı tetikle.",
    objectives: ["İsim alanına =HYPERLINK / =cmd payload'ı gir", "CSV dışa aktarımında kaçırılmadığını gör", "High'da ' ön eki ile nötrlenmeyi gözle"],
  },
};

export const MACHINE_SLUGS = Object.keys(MACHINES);
