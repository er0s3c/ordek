/* ============================================================================
   academyData.js — "Öğren / Akademi" sayfası için öğretici içerik.
   Her zafiyet için sade, öğretmen+öğrenci dostu açıklama:
     what     → Nedir?
     why      → Neden tehlikeli?
     daily    → Günlük hayatta nerede karşılaşırsın? (somut, yaşamdan)
     examples → Günlük hayattan kısa, somut karşılaşma örnekleri (madde madde)
     real     → Gerçek dünyada yaşanmış olay
     defense  → Nasıl korunulur?
   Pratik/payload/seviye davranışı labData.js + machines.js'ten gelir; burası teori.
   ============================================================================ */

export const CATEGORY_INTRO = {
  core: "İnjeksiyon ve klasik web zafiyetleri — bir saldırganın ilk denediği temel sınıf. Girdiğin her arama kutusu, her form, her URL parametresi bu zafiyetlerin yaşadığı yerdir.",
  auth: "Kimlik doğrulama & yetkilendirme hataları — 'sen kimsin' ve 'neye erişebilirsin' kontrollerinin kırılması. Hesabına giriş, parola sıfırlama, 'siparişlerim' gibi her yerde karşına çıkar.",
  modern: "Modern & sunucu-tarafı zafiyetler — Node.js ekosistemi ve iş mantığı hataları. API'ler, ödeme akışları, dosya yükleme ve şablonlar bu sınıfın yuvasıdır.",
};

export const LEARN = {
  "brute-force": {
    what: "Bir hesabın parolasını otomatik deneme-yanılma ile bulmaya çalışmaktır. 'Credential stuffing' ise başka sitelerden sızmış e-posta/parola çiftlerini sırayla denemek; kullanıcı sayımı (enumeration) ise hangi kullanıcı adlarının/e-postaların gerçekten var olduğunu ayıklamaktır.",
    why: "Zayıf veya tekrar kullanılan parolalar + hız sınırı olmayan giriş formları = hesabın saatler içinde ele geçirilmesi. Bir hesabın düşmesi çoğu zaman e-posta, banka, sosyal medya gibi diğer hesaplara zincirlenir.",
    daily: "Her gün giriş yaptığın her yerde: e-posta, Instagram, oyun hesabı, internet bankacılığı, okul/iş portalı. 'Şifreni mi unuttun' ekranının 'Bu e-posta kayıtlı değil' demesi bile bir bilgi sızıntısıdır (enumeration).",
    examples: [
      "Aynı parolayı hem oyun sitende hem e-postanda kullanman — biri sızınca diğeri de düşer.",
      "Bir sitenin giriş ekranında 'kullanıcı yok' vs 'parola yanlış' farklı mesajları göstermesi.",
      "Wi‑Fi router veya kamera arayüzünde admin/admin gibi fabrika parolasının değiştirilmemiş olması.",
    ],
    real: "Sızan parola listeleriyle yapılan 'credential stuffing' saldırıları milyonlarca hesabı düşürdü (ör. büyük streaming ve oyun platformlarında yaşanan toplu hesap ele geçirmeler).",
    defense: "Hız sınırı + hesap kilitleme, CAPTCHA, jenerik 'kullanıcı adı veya parola hatalı' mesajı, çok faktörlü doğrulama (MFA) ve her yerde farklı, uzun parola (parola yöneticisi).",
  },
  "command-injection": {
    what: "Kullanıcı girdisinin doğrudan işletim sistemi kabuğuna (shell) geçirilip keyfi komut çalıştırılmasıdır. `ping <host>` gibi bir araca `8.8.8.8; rm -rf /` yazıp ek komut çalıştırmak tipik örnektir.",
    why: "Sunucuda tam kod yürütme (RCE) sağlar — saldırgan dosyaları okuyabilir, arka kapı bırakabilir, tüm sunucuyu ele geçirebilir. En kritik zafiyet sınıflarından biridir.",
    daily: "Genelde gözünün önündedir ama görünmez: ev/iş yönlendiricinin (router) arayüzündeki 'ping testi', NAS/kamera yönetim panelleri, web hosting kontrol panelleri, 'sunucu durumu' gösteren küçük IoT cihaz arayüzleri.",
    examples: [
      "Modem arayüzündeki 'ağ tanılama / ping' aracı.",
      "Bir NAS veya IP kameranın 'sistem komutu çalıştır' tarzı gizli ayarı.",
      "Web sitesi yapan bir panelin 'yedek al / sıkıştır' düğmesi arka planda shell komutu çağırıyorsa.",
    ],
    real: "Ev/ofis router'ları ve IoT cihazlarında bulunan komut enjeksiyonu açıkları, Mirai gibi botnet'lerin yüz binlerce cihazı ele geçirmesinin temel yollarından biriydi.",
    defense: "Shell'e hiç girdi vermeyin; komutu argüman dizisiyle (parametreli API) çağırın, kullanıcı girdisini katı bir allowlist'ten geçirin, mümkünse hiç sistem komutu çalıştırmayın.",
  },
  "csrf": {
    what: "Kullanıcının oturumu açıkken, başka bir sitenin onun tarayıcısı üzerinden, onun adına istek göndertmesidir. Kurban sadece kötü bir sayfayı ziyaret eder; arka planda kendi adına bir işlem tetiklenir.",
    why: "Kurban farkında olmadan para transferi, e-posta/parola değiştirme, ayar değiştirme gibi işlemler yaptırılabilir — üstelik gerçekten o kişinin oturumuyla yapıldığı için 'meşru' görünür.",
    daily: "Oturumun açık kaldığı her yer: internet bankacılığı, e-posta ayarları, sosyal medya profili, alışveriş sitesinde 'adresi değiştir'. Bir forumda/gömülü reklamda tıkladığın görünmez bir form bunu tetikleyebilir.",
    examples: [
      "Bankaya giriş yapmışken başka bir sekmede açtığın 'bedava hediye' sayfasının arka planda para transferi denemesi.",
      "Açık kalan e-posta oturumunda, kötü bir sayfanın 'yönlendirme adresi' eklemesi (tüm mailleri kopyalamak için).",
      "Forum oturumun açıkken bir resmin aslında profil/parola değiştirme isteği olması.",
    ],
    real: "Bankacılık ve yönetim panellerinde yıllarca klasik bir ayar/hesap ele geçirme yöntemi oldu; ev router'larında DNS ayarını değiştiren CSRF saldırıları yaygındı.",
    defense: "CSRF token (her formda gizli, doğrulanan bir değer), SameSite çerezleri ve Origin/Referer doğrulaması; kritik işlemlerde yeniden kimlik doğrulama.",
  },
  "file-inclusion": {
    what: "Kullanıcı girdisinin bir dosya yoluna eklenip sunucudaki istenmeyen dosyaların okunmasıdır (path traversal / LFI). `?page=hakkimizda` gibi bir parametreyi `?page=../../../../etc/passwd` yapmak tipik örnektir.",
    why: "Yapılandırma dosyaları, parola/anahtar dosyaları veya kaynak kodu sızabilir; bazı durumlarda yüklenen bir dosyayla birleşince kod yürütmeye (RCE) varır.",
    daily: "İçerik/sayfa/dil seçen URL'ler: `?page=`, `?lang=tr`, `?file=`, `?template=`, belge/fatura indirme bağlantıları (`download?file=...`), tema/eklenti yükleyen CMS'ler.",
    examples: [
      "Bir sitenin `site.com/?page=iletisim` adresindeki `page` değerini değiştirmen.",
      "Fatura/PDF indirme linkindeki dosya adını başka bir yola çevirmen.",
      "Dil seçici `?lang=` parametresinin doğrudan dosya adına dönüşmesi.",
    ],
    real: "PHP tabanlı eski CMS ve forum yazılımlarında `?page=` parametreleri yoluyla `/etc/passwd` ve yapılandırma dosyalarının okunması çok yaygın bir ihlal yoluydu.",
    defense: "Yolu normalize edip kök dizine hapsetme, dosya adı yerine sabit bir 'izinli sayfalar' listesi (allowlist) kullanma; kullanıcı girdisini asla doğrudan yola koymama.",
  },
  "sql-injection": {
    what: "Kullanıcı girdisinin SQL sorgusuna karışıp veritabanının manipüle edilmesidir. Arama kutusuna `' OR 1=1 --` yazıp sorgunun mantığını bozmak klasik örnektir.",
    why: "Tüm veritabanı okunabilir/değiştirilebilir/silinebilir; kullanıcı parolaları (hash'leri) çekilebilir, kimlik doğrulama atlatılabilir. Sızan verinin boyutu çoğu zaman devasadır.",
    daily: "Arama kutuları, ürün filtreleri, 'siparişlerim' listeleri, giriş formları, kupon/indirim kodu alanları — kısaca veritabanına soru soran her girdi alanı.",
    examples: [
      "E-ticaret sitesinde ürün arama veya kategori filtresi.",
      "Bir blogda `?id=42` ile yazı getiren adres.",
      "Üyelik girişi yapan bir formun arkasındaki sorgu.",
    ],
    real: "Yıllardır OWASP Top 10'da; sayısız büyük veri ihlalinin (telekom, perakende, devlet siteleri) kök nedeni SQL injection oldu.",
    defense: "Parametreli sorgular (prepared statements) ve ORM kullanımı; asla string birleştirmeyle sorgu kurma; en az yetki ilkesi; girdi doğrulama.",
  },
  "sql-injection-blind": {
    what: "Login ekranında SQL enjeksiyonu ile parola doğrulamasını atlayıp giriş yapmaktır (login bypass). Sonucu doğrudan görmediğin 'kör' (blind) varyantında ise veriyi doğru/yanlış veya gecikme cevaplarından bit bit çıkarırsın.",
    why: "Parolayı hiç bilmeden yönetici hesabına giriş sağlar; kör teknikle tüm veritabanı sabırla dışarı sızdırılabilir.",
    daily: "Her giriş ekranı: yönetici panelleri, küçük işletme web sitelerinin 'admin' girişi, eski kurumsal portallar, IoT cihaz yönetim sayfaları.",
    examples: [
      "Bir yönetim paneline parola alanına `' OR '1'='1` yazıp girebilmek.",
      "Giriş başarısında/başarısızlığında sayfanın farklı davranmasından bilgi sızması.",
      "Yanıt süresi (sleep) farkından veritabanı içeriğini tahmin etme.",
    ],
    real: "`' OR '1'='1` klasik login-bypass payload'ı on yıllardır birçok küçük site ve cihazda işe yaradı; kör SQLi otomatik araçlarla (sqlmap) tüm DB'leri çekmekte kullanıldı.",
    defense: "Parametreli sorgular, hata ve zamanlama farklarını sızdırmama, jenerik hata mesajları, giriş denemelerine hız sınırı.",
  },
  "xss-reflected": {
    what: "Sayfaya anında yansıtılan kullanıcı girdisinin (ör. arama terimi) tarayıcıda JavaScript olarak çalışmasıdır. Genellikle kurbana hazırlanmış bir bağlantı gönderilerek tetiklenir.",
    why: "Oturum çerezi çalma, kullanıcı adına işlem yapma, sahte giriş formu gösterip kimlik avı (phishing) ve klavye dinleme mümkün olur — hepsi güvendiğin sitenin içinde görünür.",
    daily: "Arama sonuç sayfaları ('… için sonuçlar'), hata sayfaları, URL'den gelen 'merhaba <isim>' karşılamaları, kampanya/takip linkleri.",
    examples: [
      "Bir sitenin arama kutusuna yazdığın metnin sonuç sayfasında olduğu gibi görünmesi.",
      "E-postayla gelen 'şu linke tıkla' bağlantısının URL'sinde gizli script olması.",
      "'Sayfa bulunamadı: <yazdığın şey>' diyen hata sayfaları.",
    ],
    real: "Arama kutuları ve URL parametreleri üzerinden çok yaygın; birçok büyük sitede çerez/oturum çalmaya yönelik reflected XSS açıkları raporlandı.",
    defense: "Çıktı kodlama (HTML-encode), Content-Security-Policy (CSP), güvenli şablon motorları ve çerezlerde HttpOnly bayrağı.",
  },
  "xss-stored": {
    what: "Zararlı script'in sunucuda kalıcı olarak saklanıp (yorum, profil, mesaj) o içeriği gören her ziyaretçide çalışmasıdır (kalıcı XSS).",
    why: "Tek bir payload tüm kullanıcıları etkiler; kendi kendine yayılan 'XSS solucanlarına' dönüşebilir. En tehlikeli XSS türüdür.",
    daily: "Başkalarının yazdığını gördüğün her yer: yorumlar, ürün değerlendirmeleri, forum gönderileri, sosyal medya profili/biyografi, destek talebi (ticket), sohbet mesajları, kullanıcı adı.",
    examples: [
      "Bir ürün yorumuna bırakılan ve sayfayı açan herkeste çalışan gizli script.",
      "Profil 'hakkımda' alanına gömülen, profilini ziyaret edeni etkileyen kod.",
      "Destek talebine yazılan ve paneli açan çalışanın tarayıcısında çalışan payload.",
    ],
    real: "Eski Myspace'teki 'Samy' solucanı 20 saatte 1 milyondan fazla profili kalıcı XSS ile etkiledi; yorum/profil alanları hâlâ klasik hedeftir.",
    defense: "Hem kaydederken hem ekrana basarken temizleme (sanitization), CSP ve güvenli zengin-metin kütüphaneleri.",
  },
  "insecure-jwt": {
    what: "Oturum/rol bilgisi taşıyan JWT token'ların zayıf doğrulanmasıdır: `alg:none` kabul etmek, zayıf bir HMAC secret kullanmak ya da imzayı hiç kontrol etmemek.",
    why: "Saldırgan kendi token'ını 'admin' olarak imzalar/değiştirir ve yetki yükseltir — sunucu ona inanır.",
    daily: "Mobil uygulamalar ve modern web sitelerinde 'beni hatırla' oturumları, API erişim token'ları, tek-oturum-açma (SSO) akışları çoğunlukla JWT kullanır.",
    examples: [
      "Bir mobil uygulamanın isteklerinde taşıdığı `Authorization: Bearer ...` token'ı.",
      "Tarayıcıda `localStorage`'da duran ve içinde `\"role\":\"user\"` yazan token.",
      "Süresi dolmuş ama hâlâ kabul edilen bir oturum token'ı.",
    ],
    real: "`alg:none` ve zayıf/sızmış HMAC secret'ları çok sayıda gerçek API'de bulundu; saldırganların yönetici yetkisine yükselmesine yol açtı.",
    defense: "Algoritmayı sunucuda sabitle (allowlist), güçlü ve gizli secret, imza + son kullanma (exp) doğrulaması, hassas veriyi token'a koymama.",
  },
  "cors-misconfig": {
    what: "Tarayıcının çapraz-origin (farklı site) erişim kuralının (CORS) gevşek ayarlanmasıdır — ör. her origin'e izin verip üstüne kimlik bilgisi (cookie) paylaşmak.",
    why: "Kötü niyetli bir site, kurbanın oturumuyla hassas API verisini okuyabilir (profil, bakiye, mesajlar). Veri sessizce çalınır.",
    daily: "Tek bir frontend'in birçok API'ye konuştuğu modern uygulamalar; 'api.site.com' ile 'site.com' arasındaki çağrılar; üçüncü-parti widget/entegrasyonlar.",
    examples: [
      "Bir bankacılık/e-ticaret API'sinin tüm sitelere veri okumaya izin vermesi.",
      "Açık oturumun varken kötü bir sayfanın senin adına API'den profilini çekmesi.",
      "Test için açılıp unutulan `Access-Control-Allow-Origin: *` ayarı.",
    ],
    real: "`Access-Control-Allow-Origin: *` + `credentials` kombinasyonu ya da Origin'i körü körüne yansıtma, birçok şirketin hata ödül (bug bounty) raporlarında veri sızıntısına yol açtı.",
    defense: "Origin'leri tam eşleşmeli bir allowlist'le kontrol et; `credentials` yalnızca güvenilen, açıkça listelenmiş origin'lerde; '*' ile credentials'ı birlikte kullanma.",
  },
  "mass-assignment": {
    what: "İstek gövdesindeki tüm alanların nesneye körü körüne yazılıp, kullanıcının görmemesi gereken gizli alanların (role, isAdmin, balance) da güncellenmesidir.",
    why: "Kullanıcı, normal bir 'profili güncelle' isteğine `\"role\":\"admin\"` ekleyerek kendi yetkisini yükseltebilir veya bakiyesini değiştirebilir.",
    daily: "Profil/ayar güncelleme ekranları, 'hesabımı düzenle', kayıt formları, mobil uygulamaların ayar API'leri — istemcinin gönderdiği JSON'a güvenildiği her yer.",
    examples: [
      "'Profilimi güncelle' isteğine gizlice `isAdmin: true` eklemek.",
      "Sepet/sipariş isteğine `discount: 90` veya `price: 0` alanı eklemek.",
      "Kayıt formuna normalde olmayan `accountType: premium` alanı sokuşturmak.",
    ],
    real: "GitHub 2012'de ünlü bir mass-assignment olayı yaşadı: bir araştırmacı kendini bir deponun katılımcısı olarak ekleyebildi.",
    defense: "Alan allowlist'i (yalnızca beklenen alanları al), DTO/şema doğrulaması, hassas alanları istemciden hiç kabul etmeme.",
  },
  "idor-bola": {
    what: "Nesne kimliğini (ID) değiştirerek başkasına ait kayıtlara erişmektir; sahiplik/yetki kontrolünün eksikliğidir. `?orderId=1001`'i `1002` yapıp başkasının siparişini görmek tipik örnektir.",
    why: "Tek bir sayıyı artırarak binlerce kullanıcının verisi toplu halde sızdırılabilir — fatura, mesaj, sağlık kaydı, kimlik bilgisi.",
    daily: "URL'de veya uygulama isteğinde numara/uuid gördüğün her yer: 'siparişlerim', faturalar, mesaj kutusu, profil sayfaları, indirilen belgeler, kargo takip.",
    examples: [
      "Faturanın adresindeki numarayı bir artırınca başkasının faturasının açılması.",
      "Mesaj/sohbet linkindeki id'yi değiştirip başkasının mesajını görmek.",
      "Mobil uygulamada 'profil?user=123' isteğindeki numarayı değiştirmek.",
    ],
    real: "API'lerde en yaygın zafiyet (OWASP API Top 10 #1: BOLA). Çok sayıda fintech, sağlık ve kargo uygulamasında milyonlarca kaydın sızmasına yol açtı.",
    defense: "Her istekte sahiplik/yetki kontrolü (kaydın owner_id'si = oturumdaki kullanıcı mı?); tahmin edilemez kimlikler (UUID) tek başına yeterli değildir, yetki şart.",
  },
  "mfa-bypass": {
    what: "İkinci doğrulama adımının (SMS/uygulama kodu, 2FA) bir mantık hatasıyla atlanmasıdır: kodun yanıtta sızması, adımın URL'den geçilmesi, kodun deneme sınırının olmaması.",
    why: "Parola ele geçse bile koruması beklenen ikinci faktör devre dışı kalır; saldırgan tam erişim elde eder.",
    daily: "Bankacılık, e-posta ve sosyal medyada 'tek seferlik kod' adımı; iş uygulamalarında 'doğrulama kodu girin' ekranı; ödeme onayları.",
    examples: [
      "Kod ekranını adres çubuğundan atlayıp doğrudan panele gidebilmek.",
      "Sunucu yanıtında doğrulama kodunun (developer araçlarında) görünmesi.",
      "4 haneli kodu sınırsız deneyebilmek (0000–9999 brute force).",
    ],
    real: "Birçok platformda 2FA kodunun deneme sınırının olmaması veya akış adımının atlanması, hesap ele geçirmelere yol açtı; ödeme onaylarında benzer mantık hataları görüldü.",
    defense: "Durumu sunucuda tut, her adımı sunucuda zorla, kodu asla istemciye sızdırma, kod denemelerine sıkı hız sınırı ve kısa ömür uygula.",
  },
  "insecure-randomness": {
    what: "Tahmin edilebilir (ardışık/zaman tabanlı veya zayıf rastgelelikle üretilen) token'larla parola sıfırlama, davet, oturum gibi akışların kırılmasıdır.",
    why: "Saldırgan bir sonraki token'ı/linki tahmin edip başkasının hesabını sıfırlayabilir veya ele geçirebilir.",
    daily: "'Parolanı sıfırla' e-postalarındaki linkler, davet/onay bağlantıları, kupon/hediye kodu üreten sistemler, 'tek kullanımlık' bağlantılar.",
    examples: [
      "Parola sıfırlama linkindeki token'ın sıralı bir sayı olması (123 → 124).",
      "Davet kodlarının zamana göre kolayca tahmin edilebilmesi.",
      "Kampanya kuponlarının belli bir desende üretilmesi.",
    ],
    real: "Zayıf rastgelelikle üretilen parola sıfırlama ve oturum token'ları, çeşitli platformlarda hesap ele geçirmeye yol açtı.",
    defense: "Kriptografik rastgelelik (crypto.randomBytes), yeterince uzun token, kısa ömür ve tek kullanımlık olma; token'ı hesapla eşleştirme.",
  },
  "ssrf": {
    what: "Sunucunun, kullanıcının verdiği URL'e istek atmasını sağlayıp iç ağ/metadata servislerine erişmektir. Bir 'link önizleme' veya 'görseli URL'den getir' özelliği tipik kapıdır.",
    why: "Dışarı kapalı iç servislere, yönetim panellerine ve bulut kimlik bilgilerine (metadata 169.254.169.254) sızıntıya yol açar; tüm bulut hesabı ele geçirilebilir.",
    daily: "URL yapıştırdığın özellikler: link önizleme (sohbet/sosyal medya), 'profil fotoğrafını URL'den al', webhook ayarları, PDF/HTML'den görsel çekme, 'site sağlık kontrolü' araçları.",
    examples: [
      "Bir uygulamaya avatar olarak resim URL'si vermen.",
      "Sohbet uygulamasının yapıştırılan linke önizleme çıkarması.",
      "Bir entegrasyon/webhook'a istediğin adresi girebilmen.",
    ],
    real: "2019 Capital One ihlali bir SSRF + bulut metadata zinciriydi; 100 milyondan fazla kişinin verisi etkilendi.",
    defense: "URL allowlist, iç IP/metadata adreslerini engelleme, DNS-rebinding korumaları, isteği yapan servise en az yetki.",
  },
  "prototype-pollution": {
    what: "JavaScript'te derin birleştirme (merge) sırasında `__proto__` anahtarıyla `Object.prototype`'ın kirletilmesidir; bu, uygulamadaki tüm nesnelerin davranışını değiştirir.",
    why: "Uygulama genelinde beklenmedik değerler doğar; yetki yükseltme, güvenlik kontrollerini atlama, DoS ve bazı durumlarda RCE'ye zincirlenir.",
    daily: "Doğrudan görünmez ama her gün kullandığın Node.js tabanlı sitelerin/araçların altında çalışır: ayar/konfigürasyon birleştiren API'ler, JSON kabul eden form ve eklenti sistemleri.",
    examples: [
      "Bir API'ye gönderilen JSON'a `\"__proto__\": {\"isAdmin\": true}` eklenmesi.",
      "Kullanıcı ayarlarını mevcut ayarlarla birleştiren bir uygulama.",
      "Eski sürüm popüler kütüphaneleri kullanan bir web aracı.",
    ],
    real: "lodash, jQuery ve birçok popüler kütüphanede geçmişte bulundu; geniş bağımlılık zincirleri nedeniyle binlerce uygulamayı etkiledi.",
    defense: "`__proto__`/`constructor`/`prototype` anahtarlarını reddet, güvenli merge kullan, `Object.create(null)` veya `Map`, şema doğrulaması.",
  },
  "server-side-pp-gadget": {
    what: "Sunucuda kirletilen prototype'ın bir 'gadget' (ör. `NODE_OPTIONS`, çocuk süreç seçenekleri) üzerinden kod yürütmeye dönüşmesidir — prototype pollution'ın tam RCE'ye yükseltilmesi.",
    why: "Görece 'sessiz' bir kirletme açığını, sunucuda komut çalıştırmaya çeviren ölümcül bir zincir oluşturur.",
    daily: "Son kullanıcı bunu doğrudan görmez; arka uçta JSON işleyen, alt süreç (child process) çalıştıran veya şablon/derleme yapan Node.js servislerinin riskidir.",
    examples: [
      "JSON kabul edip arka planda bir komut/alt süreç çalıştıran bir API.",
      "Kullanıcı ayarını birleştirip ardından dosya işleyen bir servis.",
      "Eklenti/şablon derleyen bir build sunucusu.",
    ],
    real: "Araştırmacılar, prototype pollution'ı `child_process` spawn opsiyonları gibi gadget'larla birleştirerek gerçek uygulamalarda RCE gösterdi.",
    defense: "Prototype kirlenmesini en baştan engelle; güvenilmeyen veriyi spawn/exec/şablon seçeneklerine asla taşıma; bağımlılıkları güncel tut.",
  },
  "ssti": {
    what: "Kullanıcı girdisinin sunucu-tarafı şablon motorunda (EJS, Jinja, Twig…) şablon kodu olarak işlenmesidir. `{{7*7}}` → `49` görmek klasik kanıttır.",
    why: "Şablon ifadeleri çoğu motorda sunucuda kod yürütmeye (RCE) varır; sunucu tümüyle ele geçirilebilir.",
    daily: "Kullanıcının metin/şablon girebildiği yerler: e-posta/bildirim şablonu düzenleyiciler, 'imza' alanları, rapor/fatura şablonları, kişiselleştirilmiş mesaj ('Merhaba {{ad}}') özellikleri.",
    examples: [
      "Pazarlama aracında 'Merhaba {{isim}}' tipi şablon düzenleme.",
      "Fatura/sertifika şablonunu kullanıcının özelleştirebilmesi.",
      "Bir form yanıtının e-posta gövdesine şablon olarak gömülmesi.",
    ],
    real: "Jinja2/Twig/Pebble gibi motorlarda ünlü SSTI→RCE zincirleri bulundu; pazarlama ve rapor araçlarında gerçek ihlallere yol açtı.",
    defense: "Kullanıcıya şablon yapısı girdirme; yalnızca veri bağla (sandbox/data-binding), mantığı şablondan ayır, otomatik kaçış (escaping) kullan.",
  },
  "insecure-deserialization": {
    what: "Güvenilmeyen serialize verinin (node-serialize, Java/PHP nesneleri) geri yüklenip içine gömülü kodun/nesnenin çalışmasıdır.",
    why: "Sunucuda kod yürütme (RCE) ve nesne enjeksiyonu sağlar; çerez/önbellek/dosya gibi 'masum' görünen verilerden gelebilir.",
    daily: "Doğrudan görünmez; arka planda serialize veri taşıyan çerezler, 'sepeti içe aktar/dışa aktar', kaydedilmiş oturumlar, mesaj kuyrukları ve önbellek katmanlarının riskidir.",
    examples: [
      "Base64'lü bir çerezin aslında serialize edilmiş bir nesne olması.",
      "'Sepetini dışa aktar / içe aktar' gibi durum taşıyan özellikler.",
      "İki servis arasında serialize nesne taşıyan mesaj kuyruğu.",
    ],
    real: "node-serialize ve Java/PHP deserialize açıkları (ör. Apache Commons Collections zinciri) birçok kurumsal sistemde RCE'ye yol açtı.",
    defense: "Yalnızca JSON.parse + şema doğrulaması; fonksiyon/kod taşıyan formatları asla deserialize etme; veriyi imzala/şifrele.",
  },
  "open-redirect": {
    what: "Yönlendirme parametresinin (`?next=`, `?redirect=`, `?url=`) doğrulanmadan dış bir adrese gitmesine izin verilmesidir.",
    why: "Güvenilir bir alan adını kimlik avı/oturum çalma için 'sıçrama tahtası' yapar; kurban tanıdık siteye tıklar, sahte siteye düşer.",
    daily: "Giriş sonrası 'kaldığın yere dön' yönlendirmeleri, e-posta kampanya/tıklama-takip linkleri, 'devam et', 'çıkışta şuraya git' bağlantıları, QR kodları.",
    examples: [
      "`login?next=...` linkindeki adresin dış bir siteye çevrilmesi.",
      "E-postadaki 'tıklama-takip' linkinin başka yere yönlendirebilmesi.",
      "Güvenilir alan adıyla başlayıp sahte siteye giden uzun bir URL.",
    ],
    real: "Phishing kampanyaları meşru alan adlarını kötüye kullanmak için open redirect'leri sıkça kullandı; büyük servislerde defalarca raporlandı.",
    defense: "Yalnızca yerel (aynı site) yollara izin (allowlist); mutlak/şema-bağımsız (`//evil.com`) URL'leri reddet; yönlendirme hedefini sabit listeyle eşleştir.",
  },
  "host-header-poisoning": {
    what: "Sunucunun gelen `Host`/`X-Forwarded-Host` başlığına güvenip ör. parola sıfırlama linkini bu başlığa göre kurmasıdır.",
    why: "Zehirlenmiş başlık, kurbana giden linki saldırganın alan adına çevirir; kurban tıklayınca sıfırlama token'ı saldırgana gider.",
    daily: "Parola sıfırlama / e-posta doğrulama bağlantıları, 'linkli giriş' (magic link) e-postaları, önbellek anahtarlarının URL'e göre kurulduğu siteler.",
    examples: [
      "Parola sıfırlama mailindeki linkin alan adının değiştirilebilmesi.",
      "Doğrulama e-postasındaki bağlantının saldırgan sitesine işaret etmesi.",
      "Web önbelleğinin (cache) zehirlenip yanlış içerik sunması.",
    ],
    real: "Parola sıfırlama e-postalarının Host header ile zehirlenmesi, birden çok platformda hesap ele geçirmeye yol açtı; web cache poisoning ile birleşti.",
    defense: "Linkleri sabit/yapılandırılmış alan adından kur; gelen Host başlığına güvenme; izinli host listesi.",
  },
  "race-condition": {
    what: "Eşzamanlı isteklerin 'oku-kontrol-et-yaz' penceresini (TOCTOU) sömürerek tek kullanımlık bir işlemi birden çok kez yaptırmaktır.",
    why: "Tek kuponun/bakiyenin/limitin çok kez kullanılması gibi finansal ve mantıksal ihlallere yol açar.",
    daily: "Tek kullanımlık kuponlar, hediye/banka kartı bakiyesi, 'son 1 ürün' stoğu, puan/iade işlemleri, çekiliş/etkinlik katılımı — aynı anda iki kez tıkladığında.",
    examples: [
      "Tek kullanımlık indirim kuponunu çok hızlı, eşzamanlı kullanıp birden çok kez uygulatmak.",
      "Hediye kartı bakiyesini iki istekle aynı anda harcamak (çift harcama).",
      "Son kalan stoğu aynı anda iki kişiye sattırmak.",
    ],
    real: "Hediye kartı/kupon ve bakiye 'çift harcama' sömürüleri birçok e-ticaret ve fintech sisteminde gerçek para kaybına yol açtı.",
    defense: "Atomik işlemler, veritabanı kilidi/transaction, koşullu güncelleme (etkilenen satır sayısı), idempotency anahtarları.",
  },
  "business-logic": {
    what: "Fiyat/adet/indirim gibi değerlerin istemciden alınıp sunucuda doğrulanmamasıyla iş kurallarının manipüle edilmesidir.",
    why: "Ödeme tutarını düşürme, negatif adetle 'iade' kazanma, indirimleri üst üste bindirme gibi doğrudan parasal istismarlar olur.",
    daily: "Online alışveriş sepetleri, ödeme akışları, abonelik/yükseltme satın alımları, rezervasyon ve bilet sistemleri, puan/sadakat programları.",
    examples: [
      "Ödeme isteğinde ürün fiyatını 1500 yerine 0.01 göndermek.",
      "Adet alanına negatif değer girip bakiyeye para eklemek.",
      "Aynı indirim kodunu birden çok kez veya birlikte uygulatmak.",
    ],
    real: "E-ticaret sepetlerinde istemciden gelen fiyata güvenme hatası, birçok mağazada 'neredeyse bedava' alışverişlere yol açtı.",
    defense: "Kritik değerleri (fiyat, stok, indirim) her zaman sunucuda hesapla; negatif/sınır-dışı girdileri reddet; iş kurallarını sunucuda zorla.",
  },
  "redos": {
    what: "Kötü tasarlanmış bir düzenli ifadenin (regex), özel hazırlanmış bir girdiyle saniyelerce/dakikalarca CPU harcamasıdır (katastrofik geri izleme).",
    why: "Tek bir istekle sunucuyu kilitleyip hizmet dışı bırakma (DoS) mümkün olur; tüm kullanıcılar etkilenir.",
    daily: "Form doğrulamaları: e-posta/telefon/şifre güç kontrolü, arama filtreleri, kullanıcı girdisini regex'le tarayan her alan; log işleyen sistemler.",
    examples: [
      "Kayıt formundaki e-posta doğrulama regex'ine uzun, hileli bir metin yapıştırmak.",
      "Bir arama/filtre alanının arka planda zayıf bir regex çalıştırması.",
      "Yorum/log içeriğini regex'le tarayan bir sistemi bir girdiyle kilitlemek.",
    ],
    real: "Cloudflare'in 2019'daki küresel kesintisi bir ReDoS (kötü bir regex) kaynaklıydı; Stack Overflow da benzer bir kesinti yaşadı.",
    defense: "Doğrusal/güvenli regex'ler, girdi uzunluğu limiti, RE2 gibi backtracking yapmayan motorlar, zaman aşımı.",
  },
  "clickjacking": {
    what: "Hedef sayfanın şeffaf bir iframe'e gömülüp, kullanıcının farkında olmadan üstteki gerçek bir butona tıklatılmasıdır (UI redress).",
    why: "Kullanıcıya istemediği hassas işlemleri (yetki verme, takip etme, satın alma, ayar değiştirme) yaptırır — kendi tıklamasıyla.",
    daily: "Sosyal medyada 'beğen/takip et', tek tıkla satın alma/onay, yetki verme (OAuth 'izin ver') ekranları, banka/ayar onayları — cazip bir 'oyun oyna / ödül kazan' sayfasının ardına gizlenebilir.",
    examples: [
      "'Tıkla ve kazan' oyununun altına gizlenmiş bir 'Takip Et' butonu.",
      "Görünmez bir çerçevede 'izin ver' (OAuth) ekranına tıklatılman.",
      "Sahte bir butonun arkasında gerçek bir 'satın al/onayla' işlemi.",
    ],
    real: "Sosyal medyada 'likejacking' kampanyaları milyonlarca istem dışı beğeni/paylaşım üretti.",
    defense: "`X-Frame-Options: DENY` ve CSP `frame-ancestors 'none'`; hassas işlemlerde ek onay.",
  },
  "file-upload": {
    what: "Dosya yükleme doğrulamasının zayıflığıyla çalıştırılabilir bir dosyanın (webshell) yüklenip sunucuda çalıştırılmasıdır.",
    why: "Sunucuda kod yürütme (RCE) ve kalıcı erişim sağlar; tek bir 'profil fotoğrafı' alanı tüm sunucuyu düşürebilir.",
    daily: "Dosya yüklediğin her yer: profil fotoğrafı, CV/belge yükleme, destek talebine ek, ürün görseli, ödev/teslim sistemleri, mesaj eki.",
    examples: [
      "Profil fotoğrafı yerine `.php`/`.js` uzantılı bir dosya yüklemek.",
      "Dosya adını veya MIME türünü değiştirip kontrolü atlatmak.",
      "Ödev teslim sistemine çalıştırılabilir bir dosya yüklemek.",
    ],
    real: "PHP/JSP webshell yüklemeleri, içerik yönetim sistemleri ve forumlarda klasik sunucu ele geçirme yöntemidir.",
    defense: "Magic-byte/MIME doğrulama, uzantı allowlist, çalıştırılamayan depoda saklama, rastgele dosya adı, ayrı (statik) sunucudan servis etme.",
  },
  "csv-injection": {
    what: "Dışa aktarılan CSV hücrelerine formül (`=`, `+`, `-`, `@` ile başlayan) enjekte edilip, dosyayı açan kişinin Excel/Sheets'inde çalışmasıdır (formula injection).",
    why: "Veri sızıntısı veya kurbanın makinesinde komut yürütmeye (özellikle eski Excel/DDE ile) yol açabilir; saldırgan veriyi yazar, başkası açınca tetiklenir.",
    daily: "Form/kayıt verilerinin admin tarafından 'Excel'e aktar' ile indirildiği her yer: anketler, başvuru formları, e-ticaret sipariş/müşteri listeleri, iletişim formları, katılımcı listeleri.",
    examples: [
      "Bir iletişim formundaki 'ad' alanına `=HYPERLINK(...)` yazmak.",
      "Ankete `=cmd|...` gibi bir formülle cevap verip yöneticinin Excel'inde tetiklemek.",
      "Sipariş notuna formül koyup raporu açan çalışanı hedeflemek.",
    ],
    real: "Kullanıcı verisinin yöneticiye CSV olarak aktarıldığı panellerde sık görülür; raporları açan çalışanların makinelerini hedefleyen gerçek vakalar raporlandı.",
    defense: "Tehlikeli ön ekleri (`= + - @`) `'` ile nötrle, hücreleri tırnakla, içeriği doğrula; mümkünse güvenli bir dışa aktarım kütüphanesi kullan.",
  },
};
