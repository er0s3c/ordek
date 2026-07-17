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

import { VULNS } from "./labData.js";
import { TOOL_LABS as TOOL_LABS_UI, TOOL_LAB_ORDER } from "./toolLabData.js";

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
  "nmap-recon": {
    what: "nmap (Network Mapper) bir hedefte hangi portların açık ve arkasında hangi servis/sürümün çalıştığını bulan keşif aracıdır. Bu lab, standart taramanın gözden kaçırdığı yüksek bir porttaki (31337) gizli servisi 'tüm portları tara' (`-p-`) ile keşfetmeye odaklanır.",
    why: "Keşif (recon) saldırının ilk adımıdır: 'nereye saldırabilirim'i gösterir. Yalnızca yaygın portlara bakmak unutulmuş bir yönetim panelini/servisi kaçırmana neden olur — saldırgan tam port taraması yapar, sen yapmazsan açık görünmez kalır.",
    daily: "Bir kurumun internete açık her sunucusu: web (80/443), SSH (22), veritabanı (3306/5432), beklenmedik yüksek portlardaki test/yönetim servisleri. Saldırganlar internet çapında sürekli port taraması yapar.",
    examples: [
      "Varsayılan tarama yalnız 80/443 gösterir; `-p-` ile 31337'deki gizli servis ortaya çıkar.",
      "Eski bir servis sürümü (banner) bilinen bir CVE'ye işaret eder.",
      "Beklenmedik açık bir port = unutulmuş bir yönetim arayüzü olabilir.",
    ],
    real: "İnternete yanlışlıkla açık bırakılan yönetim/veritabanı portları (yüksek portlarda dahil) sayısız veri sızıntısının başlangıç noktası oldu; Shodan gibi servisler bu portları sürekli endeksler.",
    defense: "Yalnızca gerekli portları aç (firewall/security group), gereksiz servisleri kapat, yüksek portlardaki yönetim servislerini VPN/iç ağ arkasına al, banner sürüm bilgisini sınırla.",
  },
  "metasploit-rce": {
    what: "Metasploit, bilinen açıkları sömürmek için hazır 'exploit' ve 'payload' modülleri sunan bir çatıdır. Bu lab, zafiyetli bir yönetim servisine (OrdekAdmin 1.0) karşı bir exploit modülü mantığıyla komut çalıştırıp (RCE) meterpreter oturumu açmayı simüle eder.",
    why: "Tespit edilen bir zafiyete uygun hazır exploit + payload, keşiften tam erişime (shell/meterpreter) giden yolu standartlaştırır. Yamasız/varsayılan-yapılandırmalı servisler bu tür modüllerle saniyeler içinde düşebilir.",
    daily: "İç ağlardaki eski/yamasız servisler, varsayılan kimlik bilgileriyle bırakılmış yönetim panelleri, sızan token'lar — kurumsal sızma testlerinin ve gerçek saldırıların ortak hedefleri.",
    examples: [
      "Eski bir servis sürümüne karşı hazır bir exploit modülü çalıştırmak (use → set RHOSTS → run).",
      "Banner'da/yapılandırmada sızan varsayılan yönetim token'ıyla zayıf yetki kontrolünü atlamak.",
      "meterpreter oturumuyla hedefte dosya gezme/komut çalıştırma.",
    ],
    real: "EternalBlue (MS17-010) gibi Metasploit modülleriyle silahlandırılan açıklar, WannaCry/NotPetya dahil dünya çapında yıkıcı saldırılara zemin hazırladı.",
    defense: "Sistemleri güncel/yamalı tut, varsayılan kimlik bilgilerini değiştir, gereksiz servisleri kapat, en az ayrıcalık + ağ segmentasyonu uygula, IDS/IPS ile exploit trafiğini tespit et.",
  },
};

/* ============================================================================
   ROADMAP — "Öğren / Akademi" eğitim yol haritası (sıralı modüller).
   type "theory" → dersler okunarak (readLessons) tamamlanır.
   type "labs"   → her ders bir zafiyete bağlıdır; flag çözülünce tamamlanır.
   Ders şekli: { id, title, body:[paragraf...], examples?:[...], cmd?:[...], key? }
   labLogic.moduleProgress/roadmapStatus bu yapıyı okur. Burada FLAG YOK (teori).
   ============================================================================ */
export const ROADMAP = [
  {
    id: "temel-kavramlar", icon: "🌱", name: "Temel Kavramlar", type: "theory",
    intro: "Her şeyin temeli: web nasıl çalışır, HTTP nedir, tarayıcı araçlarını nasıl kullanırsın ve 'zafiyet' tam olarak ne demek. Buradan başla.",
    lessons: [
      {
        id: "tk-web", title: "İnternet ve Web Nasıl Çalışır?",
        body: [
          "Web, istemci (tarayıcın) ile sunucu arasında bir konuşmadır. Tarayıcı bir adres (URL) ister, sunucu da bir cevap (genelde HTML sayfası) döner. Arada DNS, insan-okunur adı (ornek.com) sunucunun IP adresine çevirir.",
          "Bir bağlantıya tıkladığında tarayıcı bir HTTP isteği gönderir; sunucu bunu işler, veritabanına bakar, sonucu HTML/JSON olarak geri yollar. Güvenlik açıkları çoğunlukla bu 'istek → işleme → cevap' zincirinin sunucu tarafında saklıdır.",
        ],
        examples: [
          "Adres çubuğuna ornek.com yazınca: önce DNS ile IP bulunur, sonra o IP'ye HTTP isteği gider.",
          "Bir formu doldurup 'Gönder'e basmak = sunucuya bir POST isteği.",
          "Sayfadaki her resim, CSS ve JS dosyası ayrı birer istektir.",
        ],
        key: "Web = istemci ile sunucu arasında istek/cevap; açıklar genelde sunucu tarafındadır.",
      },
      {
        id: "tk-http", title: "HTTP'yi Tanı: Metod, Durum Kodu, Başlık, Çerez",
        body: [
          "Her HTTP isteğinin bir metodu vardır: GET (veri al), POST (veri gönder), PUT/DELETE (güncelle/sil). Sunucu yanıtı bir durum koduyla gelir: 200 (tamam), 301/302 (yönlendirme), 401/403 (yetkisiz), 404 (yok), 500 (sunucu hatası).",
          "Başlıklar (headers) isteğe/yanıta eklenen ek bilgilerdir (Content-Type, Authorization, Cookie...). Çerezler (cookie) sunucunun tarayıcıda sakladığı küçük verilerdir; oturumunu (kim olduğunu) çoğunlukla bir çerez taşır.",
        ],
        examples: [
          "Giriş yapınca aldığın oturum çerezi seni tanıtır — çalınırsa hesabın ele geçer.",
          "401/403 = 'sen giremezsin'; 500 = sunucu bir şeyi beceremedi (çoğu zaman ipucu sızdırır).",
          "Authorization: Bearer <token> başlığı API'lerde kimliğini taşır.",
        ],
        key: "HTTP'nin metod/durum kodu/başlık/çerez dörtlüsünü okuyabilmek hem saldırının hem savunmanın temelidir.",
      },
      {
        id: "tk-devtools", title: "Tarayıcı Geliştirici Araçları (DevTools)",
        body: [
          "F12 ile açılan Geliştirici Araçları bir saldırganın en yakın dostudur. 'Network' sekmesi her isteği ve yanıtı, başlıkları, çerezleri gösterir. 'Console' ile sayfada JavaScript çalıştırır, 'Application' ile çerez/localStorage içeriğini görürsün.",
          "Çoğu 'gizli' bilgi aslında tarayıcıda durur: gizlenmiş form alanları, HTML yorumları, API yanıtındaki fazladan alanlar. DevTools bunları görünür kılar.",
        ],
        examples: [
          "Network sekmesinde bir login isteğini seçip gönderilen parolayı/çerezi görebilirsin.",
          "Application → Cookies'ten oturum çerezini okuyup değiştirebilirsin.",
          "Bir butonun 'disabled' olması güvenlik değildir — Console'dan kaldırılabilir.",
        ],
        key: "DevTools (F12) ile her istek, çerez ve gizli alan görünür hale gelir.",
      },
      {
        id: "tk-zafiyet", title: "Zafiyet Nedir? Saldırı Yüzeyi & Güven Sınırı",
        body: [
          "Zafiyet, bir sistemin beklenmedik bir girdiyle istenmeyen biçimde davranmasıdır. Temel kural: kullanıcıdan gelen HER veri (URL parametresi, form, başlık, çerez, dosya adı) güvenilmezdir. Saldırı yüzeyi, bu güvenilmez verinin sisteme girdiği tüm noktalardır.",
          "Güvenlik üç şeyi korur (CIA): Gizlilik (yetkisiz görülmemeli), Bütünlük (izinsiz değiştirilmemeli), Erişilebilirlik (hizmet ayakta kalmalı). Çoğu zafiyet, girdinin 'veri' yerine 'komut/kod' olarak yorumlanmasından doğar.",
        ],
        examples: [
          "Arama kutusuna yazdığın metin koda dönüşürse → injection.",
          "URL'deki ?id=5'i ?id=6 yapınca başkasının verisi geliyorsa → yetkilendirme açığı.",
          "Tek bir kullanıcı girdisi bile tüm sunucuyu düşürebilir.",
        ],
        key: "Kullanıcıdan gelen her şey güvenilmezdir; açıklar 'veri'nin 'komut' sanılmasından doğar.",
      },
      {
        id: "tk-etik", title: "Etik ve Yasal Çerçeve",
        body: [
          "Bu labda öğrendiğin teknikler güçlüdür ve izinsiz kullanıldığında suçtur. Test yalnızca senin sahip olduğun ya da yazılı izin aldığın sistemlerde yapılır. ördek-lab izole bir ortamdır: hedefler kendi makinende, internetsiz çalışır.",
          "Profesyonel sızma testinde kapsam (scope), izin belgesi ve sorumlu açıklama (responsible disclosure) şarttır. 'Yapabiliyor olmak', 'yapmaya iznin olduğu' anlamına gelmez.",
        ],
        examples: [
          "CTF/lab ortamı = serbest; başkasının sitesi = yasak.",
          "Bir açık bulduğunda sahibine sorumlu biçimde bildirmek doğru yoldur.",
          "Bug bounty programları, izinli test için yasal bir çerçeve sunar.",
        ],
        key: "Yalnızca izinli/izole sistemlerde test et — yapabilmek, izin değildir.",
      },
    ],
  },
  {
    id: "araclar", icon: "🛠️", name: "Linux & Terminal Temelleri", type: "theory",
    intro: "Saldırı araçlarının yaşadığı yer: Linux komut satırı. Önce terminali tanı; ardından her saldırı aracını AYRI bir modülde, gerçek hedeflerde yaparak öğreneceksin.",
    lessons: [
      {
        id: "ar-linux", title: "Linux Komut Satırı Temelleri",
        body: [
          "Güvenlik araçlarının çoğu Linux terminalinde yaşar. Dosya gezinme (ls, cd, pwd), okuma (cat, less), arama (grep, find) ve ağ (curl, wget) komutları temel cephanedir. curl, bir HTTP isteğini elle göndermenin en hızlı yoludur — tarayıcısız.",
          "Borular (|) bir komutun çıktısını diğerine bağlar; yönlendirme (>) çıktıyı dosyaya yazar. Bu mantık payload üretmekten log ayıklamaya kadar her yerde işine yarar.",
        ],
        cmd: [
          "curl -i http://hedef:3000/        # yanıtı başlıklarla iste",
          "curl -X POST -d 'user=admin&pass=123' http://hedef/login",
          "grep -ri 'flag' .                 # klasörde 'flag' ara",
        ],
        examples: [
          "curl ile bir API'ye tarayıcı olmadan istek atıp ham JSON'u görmek.",
          "cat /etc/passwd → LFI açığında okumayı hedeflediğin klasik dosya.",
          "Bir başlığı elle değiştirmek tarayıcıda zordur, curl -H ile kolaydır.",
        ],
        key: "curl + temel Linux komutları, isteği elle kurup ham yanıtı görmek için şarttır.",
      },
      {
        id: "ar-araclar-not", title: "Saldırı Araçları — Artık Ayrı Modüller",
        body: [
          "nmap, Burp Suite, Wireshark, Hydra, Metasploit ve 18+ araç artık birer TEORİ dersi değil; her biri kendi AYRI modülünde, gerçek araç ikilileriyle ve izole zafiyetli Docker hedefleriyle gelir. O modüllerde gerçek bir saldırgan kutusunda (tarayıcı terminali) aracı kendi elinle çalıştırıp flag'i yakalarsın.",
          "Yol haritasında aşağıdaki araç modüllerine in: 📡 Nmap, 🦈 Wireshark, 🐉 Hydra, 🎯 Metasploit, 🎣 SET, 😈 Evilginx3 ve diğerleri.",
        ],
        key: "Her araç = ayrı bir modül + gerçek ikili + zafiyetli hedef makine. Aşağıdaki araç modüllerinde 'yaparak' öğren.",
      },
    ],
  },
  {
    id: "kali-kurulum", icon: "🐉", name: "Kali VM Kurulumu & Laba Bağlanma", type: "theory",
    intro: "Saldırı araçları senin KENDİ Kali Linux makinende çalışır. Bu modülde VirtualBox/VMware ile Kali'yi kurar, ağ modunu seçer ve araç laboratuvarlarındaki izole hedeflere nasıl bağlanacağını öğrenirsin. Bağlantı tek tıkla otomatik kurulur — sen sadece adresi yazarsın.",
    lessons: [
      {
        id: "kk-kurulum", title: "Kali Linux'u VirtualBox / VMware'e Kurmak",
        body: [
          "Araç labları (Nmap, Hydra, Metasploit…) gerçek araç ikililerini SENİN makinende çalıştırmanı ister. En yaygın yol: bir sanallaştırma yazılımıyla (VirtualBox — ücretsiz, ya da VMware Workstation Player) bir Kali Linux sanal makinesi (VM) çalıştırmak. Kali'nin resmi sitesi hazır VirtualBox/VMware imajları sunar — indir, içe aktar (Import/Open), aç. Kurulumla uğraşmadan birkaç dakikada hazır olur.",
          "Panel (ördek-lab) Windows'ta Docker Desktop üzerinde çalışır ve her lab için izole bir zafiyetli hedef konteyner başlatır. Sen bu hedefe, Kali VM'inin terminalinden saldırırsın. İki dünya (Windows host + Kali VM) arasındaki köprü, VM'in 'ağ modu'dur — bir sonraki derste.",
        ],
        examples: [
          "Kali resmi 'Virtual Machines' imajını indir → VirtualBox'ta File ▸ Import Appliance.",
          "Varsayılan kullanıcı genelde kali / kali'dir (ilk girişte değiştir).",
          "VM'e en az 2 vCPU + 4 GB RAM ver; araçlar (özellikle Metasploit) RAM sever.",
        ],
        key: "Araçlar senin Kali VM'inde çalışır; panel hedefi Docker'da açar. VirtualBox/VMware hazır Kali imajıyla dakikalar içinde başla.",
      },
      {
        id: "kk-ag-modu", title: "VM Ağ Modu: NAT, Köprü (Bridged), Host-Only",
        body: [
          "Sanal makinenin Windows host'a ve hedefe ulaşabilmesi için doğru ağ modunu seçmelisin. Üç temel mod vardır: NAT (VM internete host üzerinden çıkar; host'a sabit bir ağ geçidi adresinden ulaşır), Bridged/Köprü (VM yerel ağda host gibi kendi IP'sini alır), Host-Only (yalnız host ile VM arasında özel bir ağ).",
          "ördek-lab hedefleri Windows host'taki Docker'da portlarını yayımlar; yani Kali'den Windows host IP'sine + yayımlanan porta bağlanırsın. En kolay ve en garanti yol VirtualBox + NAT: host her zaman sabit 10.0.2.2 adresindedir. Bridged kullanırsan host'un yerel ağ IP'sini (ipconfig → IPv4) kullanırsın. Hangi modda olursan ol, panel sana doğru portları gösterir.",
        ],
        examples: [
          "VirtualBox NAT → Windows host = 10.0.2.2 (sabit, ezberle).",
          "VirtualBox Host-Only → host = 192.168.56.1 (varsayılan).",
          "Bridged → Windows'ta `ipconfig` ile IPv4 adresini öğren (ör. 192.168.1.34).",
        ],
        key: "NAT en kolayı (host = 10.0.2.2). Bridged'de host'un LAN IP'sini ipconfig ile bul. Panel portları zaten gösterir.",
      },
      {
        id: "kk-baglan", title: "Laba Bağlanmak: Otomatik Port Yayımı",
        body: [
          "Bir araç labında '▸ Hedefi Başlat'a bastığında panel, izole hedefi başlatır ve servis portlarını (ör. http 80, ssh 22, smb 445) otomatik olarak host'a yayımlar — senin hiçbir ağ ayarı yapmana, macvlan/IP girmene gerek YOKTUR. Panel sana 'YAYIMLANAN SERVİSLER' altında her servisin host portunu, üstte de bir bağlantı topolojisi (Kali VM → Windows Host → Hedef) gösterir.",
          "Bağlanmak için: Kali terminalinde aracı çalıştırırken hedef olarak Windows host IP'sini (NAT'ta 10.0.2.2) ve panelde gösterilen portu kullanırsın. Örneğin web hedefi için `curl -i http://10.0.2.2:80/`, SSH hedefi için `ssh ordek@10.0.2.2 -p 22`. Panel her lab için tam örnek komutu da hazır verir; 'kopyala' deyip IP'yi kendininkiyle değiştirmen yeterli.",
          "Emin değil misin? Bu modülün altındaki 🔌 BAĞLANTI TESTİ ile VM'inin laba gerçekten erişip erişmediğini hemen doğrula: bir hedef başlat, çıkan curl komutunu Kali'nde çalıştır, dönen token'ı yapıştır. Yeşil onay = ağın çalışıyor; kırmızı = adım adım sorun giderme.",
        ],
        examples: [
          "Panel: 'http → :80', 'ssh → :22' gibi çipler gösterir; o portu kullan.",
          "Nmap ile keşif: `nmap -p- 10.0.2.2` host'ta açık (yayımlanmış) portları bulur.",
          "Bağlanamıyorsan: VM ağ modunu (NAT?), Windows güvenlik duvarını ve doğru host IP'sini kontrol et.",
        ],
        key: "Hedefi başlat → panel portları otomatik yayımlar → Kali'den host IP:port'a bağlan. Ağ ayarı yok, kopyala-yapıştır komutla başla.",
      },
      {
        id: "kk-vpn", title: "VPN ile Bağlanma (TryHackMe Tarzı — Önerilen)",
        body: [
          "En temiz yol — TryHackMe'deki gibi: bir kez VPN'e bağlan, sonra TÜM zafiyetli makinelere gerçek IP'leriyle doğrudan eriş. Bu modülün altındaki 🔒 VPN paneli sana özel bir WireGuard config'i (ordek-vpn.conf) üretir. Port yayımı / host IP tahmini derdi kalmaz: hedef artık 10.13.37.10 gibi gerçek bir adreste durur ve `nmap -p- 10.13.37.10` tam olarak HEDEFİN portlarını verir (Windows host'unun 135/445/3000 portları DEĞİL).",
          "Nasıl çalışır: Panel WireGuard sunucusunu (ordek-wg) başlatır ve sana tünelde sabit bir VPN IP'si atar — bu IP panelde anında görünür. Kali'de `sudo apt install -y wireguard` ile WireGuard'ı kur, indirdiğin config'i `sudo wg-quick up ./ordek-vpn.conf` ile kaldır. Bağlanınca panel 'bağlı' (yeşil) gösterir. VM ağ modu NAT ise endpoint olarak 10.0.2.2'yi, bridged ise host'un LAN IP'sini seç (panel aday adresleri listeler).",
          "Bağlandıktan sonra herhangi bir araç labında '▸ Hedefi Başlat' de; panel hedefin VPN IP'sini gösterir, sen de Kali'den doğrudan o IP'ye saldırırsın — her makine için yeniden bağlanmana gerek yok. (Sınıf modunda her öğrenci yalnızca kendi hedeflerine erişir.) VPN sunucusu kurulamazsa sistem otomatik olarak port-yayımı (bridge) moduna düşer; o durumda bir önceki ders geçerlidir.",
        ],
        examples: [
          "İndir: panelde '⬇ WireGuard config indir' → ordek-vpn.conf.",
          "Bağlan: `sudo wg-quick up ./ordek-vpn.conf`  (kapat: `sudo wg-quick down ./ordek-vpn.conf`).",
          "Doğrula: panelde 'SENİN VPN IP'N' + 'bağlı' yeşil rozeti; sonra `nmap -p- <hedef-ip>`.",
        ],
        key: "Bir kez VPN'e bağlan → tüm hedeflere gerçek IP'leriyle eriş. Config indir, wg-quick up, panelde VPN IP'n + hedef IP otomatik görünür.",
      },
    ],
  },
  {
    id: "ag-modelleri", icon: "🪜", name: "Ağ Modelleri (OSI & TCP/IP)", type: "theory",
    intro: "Ağ trafiğini katmanlara bölerek anlamak: OSI'nin 7 katmanı, TCP/IP'nin 4 katmanı ve verinin her katmanda nasıl paketlendiği. Bir saldırının ya da savunmanın hangi katmanda olduğunu bilmek her şeyi netleştirir.",
    lessons: [
      {
        id: "agm-osi", title: "OSI Modeli: 7 Katmana Genel Bakış",
        body: [
          "OSI (Open Systems Interconnection) modeli, ağ iletişimini 7 katmana böler: 1) Fiziksel, 2) Veri Bağı, 3) Ağ, 4) Taşıma, 5) Oturum, 6) Sunum, 7) Uygulama. Her katman bir altındakinin hizmetini kullanır ve bir üstündekine hizmet verir. Amaç, karmaşık iletişimi yönetilebilir parçalara ayırmaktır.",
          "OSI bir 'referans modeldir' — gerçek internet TCP/IP ile çalışır ama OSI ortak bir dil sunar. Bir mühendis '2. katman sorunu' dediğinde herkes anahtarlama/MAC seviyesini, '7. katman saldırısı' dendiğinde uygulama seviyesini anlar.",
        ],
        examples: [
          "Bir kablo arızası = 1. katman (Fiziksel); yanlış MAC tablosu = 2. katman (Veri Bağı).",
          "IP yönlendirme = 3. katman; port/oturum güvenilirliği = 4. katman (TCP).",
          "Bir XSS ya da SQLi = 7. katman (Uygulama) zafiyetidir.",
        ],
        key: "OSI 7 katman, iletişimi Fiziksel'den Uygulama'ya doğru soyutlar; sorunu 'hangi katman' diye konumlamayı sağlar.",
      },
      {
        id: "agm-katmanlar", title: "Katman Katman: Her Katman Ne Yapar?",
        body: [
          "Aşağıdan yukarı: Fiziksel (1) bitleri kablo/radyo üzerinden taşır. Veri Bağı (2) aynı yerel ağda MAC adresleriyle çerçeve (frame) taşır; anahtarlar burada çalışır. Ağ (3) IP ile farklı ağlar arası yönlendirme yapar; yönlendiriciler buradadır. Taşıma (4) TCP/UDP ile uçtan uca teslimi ve portları yönetir.",
          "Yukarıda: Oturum (5) konuşmaları açıp kapatır, Sunum (6) şifreleme/biçim/kodlama (TLS, JPEG) ile ilgilenir, Uygulama (7) ise kullanıcının gördüğü protokoldür (HTTP, DNS, SMTP). Saldırı yüzeyi her katmanda farklıdır.",
        ],
        examples: [
          "ARP zehirlenmesi 2. katmanda, IP sahteciliği 3. katmanda olur.",
          "TLS aslında Sunum (6) işidir; TCP üstünde, HTTP altında oturur.",
          "Port tarama 4. katmanı (TCP/UDP) yoklar; içerik keşfi 7. katmanı.",
        ],
        key: "Her katmanın kendi adresi/birimi ve kendi saldırıları vardır: MAC↔çerçeve(2), IP↔paket(3), port↔segment(4).",
      },
      {
        id: "agm-tcpip", title: "TCP/IP Modeli: Gerçek İnternetin 4 Katmanı",
        body: [
          "İnternet pratikte TCP/IP (DoD) modeliyle çalışır ve 4 katmana sahiptir: Ağ Erişimi (OSI 1-2), İnternet (OSI 3, IP), Taşıma (OSI 4, TCP/UDP), Uygulama (OSI 5-7, HTTP/DNS/...). OSI'nin üst üç katmanı burada tek 'Uygulama' katmanında birleşir.",
          "Yani OSI öğretir, TCP/IP çalıştırır. İkisini eşleştirebilmek, bir aracın (Wireshark gibi) sana gösterdiği katmanları okumanı sağlar.",
        ],
        examples: [
          "Wireshark bir HTTP isteğini: Ethernet(2) → IP(3) → TCP(4) → HTTP(7) olarak katman katman gösterir.",
          "TCP/IP'nin 'İnternet' katmanı = OSI 3 = IP adresleri.",
          "OSI 5/6/7 → TCP/IP'de tek 'Uygulama' katmanı.",
        ],
        key: "TCP/IP = 4 katman (Ağ Erişimi, İnternet, Taşıma, Uygulama); OSI'nin pratiğe inmiş halidir.",
      },
      {
        id: "agm-kapsulleme", title: "Kapsülleme (Encapsulation) ve PDU'lar",
        body: [
          "Veri gönderilirken her katman bir başlık ekler: Uygulama verisi → TCP başlığı eklenir (segment) → IP başlığı eklenir (paket) → Ethernet başlığı eklenir (çerçeve) → bitlere dönüşür. Alıcıda tam tersi olur (decapsulation): her katman kendi başlığını soyar. Bu katman birimlerine PDU (Protocol Data Unit) denir.",
          "Saldırgan için bu şu demek: bir veriyi değiştirmek için doğru katmandaki başlığı/yükü hedeflemelisin. Bir flag IP paketinin yükünde mi, TCP portunda mı, yoksa HTTP gövdesinde mi saklı — kapsüllemeyi bilmek bunu okutur.",
        ],
        examples: [
          "PDU adları: bit(1) → çerçeve(2) → paket(3) → segment(4) → veri(7).",
          "Her başlık bir 'zarf'tır; iç içe zarflar gibi düşün.",
          "VPN, tüm paketi yeni bir başlıkla yeniden kapsüller (tünelleme).",
        ],
        key: "Kapsülleme = her katmanın veriye kendi başlığını eklemesi; PDU isimleri katmanı ele verir.",
      },
      {
        id: "agm-saldiri", title: "Modeller Saldırı/Savunmaya Nasıl Yansır?",
        body: [
          "Katmanlı düşünmek hem saldırıyı hem savunmayı düzenler. Savunma 'derinlemesine' kurulur: 3. katmanda güvenlik duvarı, 4. katmanda port filtresi, 6. katmanda TLS, 7. katmanda WAF. Bir katman delinse diğeri durdurur.",
          "Saldırgan da katman seçer: alt katmanlar (2-3) yerel ağ erişimi ister (ARP/MITM), üst katmanlar (7) uzaktan internet üzerinden vurulur (web zafiyetleri). Bu labdaki çoğu hedef 7. katmandadır; ağ modülleri ise alt katmanların resmini verir.",
        ],
        examples: [
          "DDoS 3/4. katmanı (bant genişliği/SYN) ya da 7. katmanı (HTTP flood) hedefleyebilir.",
          "Savunmada 'defense in depth' = her katmanda ayrı önlem.",
          "Bir CVE'nin hangi katmanı vurduğunu bilmek etkisini kestirtir.",
        ],
        key: "Katman düşüncesi savunmayı 'derinlemesine' kurar, saldırıda doğru katmanı seçtirir.",
      },
    ],
  },
  {
    id: "protokoller", icon: "📡", name: "Çekirdek Protokoller", type: "theory",
    intro: "İnternetin konuştuğu diller. IP paketleri taşır, TCP/UDP teslim eder, DNS isim çözer, DHCP/ARP yerel ağı ayakta tutar, HTTP ise web'i konuşturur. Bunları tanımak trafiği okumanın anahtarıdır.",
    lessons: [
      {
        id: "pr-ip-icmp", title: "IP & ICMP: Paketler ve 'ping'",
        body: [
          "IP (Internet Protocol) her cihaza bir adres verir ve paketleri kaynaktan hedefe yönlendirir — ama teslimi garanti etmez (best-effort). IPv4 adresleri 192.168.1.10 gibi 4 sayıdır; IPv6 daha uzun ve hexadecimaldir. ICMP ise IP'nin 'haberci' protokolüdür: ulaşılamayan hedef, zaman aşımı ve ünlü 'ping' (echo request/reply) ICMP ile çalışır.",
          "Saldırgan ICMP ile bir hostun ayakta olup olmadığını anlar (host discovery); savunmacı bazen ICMP'yi kapatarak ağı 'sessiz' yapar.",
        ],
        cmd: [
          "ping hedef                # ICMP echo ile ayakta mı?",
          "traceroute hedef          # paketin geçtiği yönlendiriciler (TTL+ICMP)",
        ],
        examples: [
          "ping yanıt veriyorsa host genelde ayakta (ICMP açıksa).",
          "TTL değeri kaç yönlendiriciden geçtiğini ve OS tahminini verir.",
          "IP teslimi garanti etmez; güvenilirliği TCP ekler.",
        ],
        key: "IP adresler+yönlendirir (garantisiz); ICMP tanılama/keşif taşır (ping, traceroute).",
      },
      {
        id: "pr-tcp-udp", title: "TCP vs UDP ve 3'lü El Sıkışma",
        body: [
          "TCP bağlantılı ve güvenilirdir: veri sıralı, kayıpsız ve onaylı gelir. Bir bağlantı 3'lü el sıkışmayla açılır: istemci SYN → sunucu SYN-ACK → istemci ACK. Web (HTTP), e-posta, SSH hep TCP kullanır. UDP ise bağlantısız ve hızlıdır; onay/sıra yoktur — DNS, video akışı, oyunlar UDP sever.",
          "Bu fark taramayı belirler: nmap TCP'de SYN tarama yapar (yarım el sıkışma), UDP'de yanıtsızlık 'açık|filtreli' belirsizliği yaratır. El sıkışmayı bilmek SYN flood gibi saldırıları da açıklar.",
        ],
        cmd: [
          "nmap -sS hedef            # TCP SYN (yarım açık) tarama",
          "nmap -sU hedef            # UDP tarama (yavaş, belirsiz)",
        ],
        examples: [
          "3'lü el sıkışma: SYN → SYN-ACK → ACK, sonra veri akar.",
          "SYN flood = el sıkışmayı yarıda bırakıp kaynak tüketme saldırısı.",
          "DNS sorgusu tek UDP paketiyle gidip gelir — hızlı ama güvencesiz.",
        ],
        key: "TCP=güvenilir/bağlantılı (3'lü el sıkışma), UDP=hızlı/bağlantısız; protokol seçimi servisi ele verir.",
      },
      {
        id: "pr-dns", title: "DNS: İsimden IP'ye",
        body: [
          "DNS (Domain Name System) internetin telefon rehberidir: ornek.com gibi insan-okunur adı 93.184.216.34 gibi bir IP'ye çevirir. Tarayıcı önce yerel önbelleğe, sonra çözümleyici (resolver) sunucuya sorar; o da kök → TLD (.com) → yetkili sunucu zincirini izler. Kayıt tipleri: A (IPv4), AAAA (IPv6), MX (e-posta), CNAME (takma ad), TXT (doğrulama).",
          "DNS keşifte altındır: alt alan adları (subdomain) saldırı yüzeyini büyütür. DNS güvenliğindeki zaaflar (cache poisoning, subdomain takeover) ciddi sonuç doğurur.",
        ],
        cmd: [
          "nslookup ornek.com",
          "dig ornek.com ANY +noall +answer",
        ],
        examples: [
          "MX kaydı bir kurumun e-posta sağlayıcısını ele verir.",
          "Unutulmuş bir CNAME → subdomain takeover riski.",
          "TXT kayıtları SPF/DKIM ve bazen iç bilgi sızdırır.",
        ],
        key: "DNS ad→IP çevirir; kayıt tipleri (A/MX/CNAME/TXT) ve alt alan adları keşif için altın değerindedir.",
      },
      {
        id: "pr-dhcp-arp", title: "DHCP & ARP: Yerel Ağın Sıvası",
        body: [
          "Bir cihaz ağa girince IP'yi nereden alır? DHCP'den. DHCP sunucusu cihaza IP, ağ geçidi, DNS ve kira süresi verir (DORA: Discover, Offer, Request, Ack). ARP ise IP'yi yerel ağdaki MAC adresine eşler: 'Bu IP kimde?' diye yayın yapar, sahibi MAC'iyle yanıtlar.",
          "İkisi de güven temellidir ve bu yüzden istismara açıktır: sahte DHCP sunucusu trafiği kendine yönlendirir; ARP zehirlenmesi (ARP spoofing) saldırganı 'ortadaki adam' yapar — bu, 7. modüldeki MITM'in temelidir.",
        ],
        cmd: [
          "arp -a                    # yerel IP↔MAC tablosu",
          "ip addr / ipconfig        # DHCP'den alınan adresi gör",
        ],
        examples: [
          "ARP spoofing: saldırgan 'ağ geçidi benim' diyerek trafiği dinler.",
          "Sahte (rogue) DHCP, kurbanlara kendi DNS'ini dayatır.",
          "DORA: cihaz Discover yayını yapar, sunucu Offer döner.",
        ],
        key: "DHCP yerel IP dağıtır (DORA), ARP IP↔MAC eşler; ikisi de güvene dayanır → MITM'in zemini.",
      },
      {
        id: "pr-http", title: "HTTP/HTTPS: Web'in Protokolü",
        body: [
          "HTTP, istemci ile web sunucusu arasındaki istek/yanıt protokolüdür. İstek bir metod (GET/POST...), yol, başlıklar ve gövdeden; yanıt bir durum kodu (200/301/404/500), başlıklar ve gövdeden oluşur. HTTP durumsuzdur (stateless): sunucu seni hatırlamak için çerez/oturum kullanır. HTTPS, HTTP'yi TLS ile sarar — aynı protokol, ama şifreli kanalda.",
          "Web zafiyetlerinin neredeyse hepsi bu istek/yanıt akışında yaşar. Başlıkları, çerezleri ve durum kodlarını okuyabilmek hem saldırının hem savunmanın 7. katman temelidir.",
        ],
        cmd: [
          "curl -i https://hedef/      # yanıtı başlıklarla iste",
          "curl -X POST -d 'a=1' https://hedef/api",
        ],
        examples: [
          "302 + Location başlığı → açık yönlendirme (open redirect) riski.",
          "Set-Cookie başlığındaki bayraklar (HttpOnly/Secure) çerez güvenliğini belirler.",
          "500 hata gövdesi sık sık iç dosya yolu/yığın izi sızdırır.",
        ],
        key: "HTTP=metod+yol+başlık+gövde / durum kodu; HTTPS=TLS'le sarılmış HTTP. Web açıklarının sahnesi burası.",
      },
    ],
  },
  {
    id: "sunucular", icon: "🖧", name: "Uygulama Protokolleri & Sunucular", type: "theory",
    intro: "Servislerin yaşadığı yer. Web sunucuları, uzaktan erişim, dosya transferi ve e-posta protokolleri — her açık port arkasında bir oda olan bir kapıdır. Hangi servisin hangi portta konuştuğunu bilmek saldırı yüzeyini haritalar.",
    lessons: [
      {
        id: "su-istemci-sunucu", title: "İstemci–Sunucu Mimarisi & Web Sunucuları",
        body: [
          "İnternetin temel deseni istemci–sunucudur: istemci (tarayıcı, mobil uygulama, curl) ister, sunucu sürekli dinler ve yanıtlar. Web sunucuları HTTP isteklerini karşılayan yazılımlardır: Apache, Nginx ve IIS en yaygınlarıdır. Çoğu zaman önde bir 'ters vekil' (reverse proxy, ör. Nginx) durur ve arkadaki uygulama sunucusuna (Node, PHP-FPM, Tomcat) yük dağıtır.",
          "Saldırgan için sunucu yazılımı ve sürümü kritik bilgidir: Server başlığı, hata sayfaları ve varsayılan dosyalar (ör. Apache'nin /server-status'u) teknolojiyi ve bilinen CVE'leri ele verir.",
        ],
        cmd: [
          "curl -I http://hedef/       # Server başlığı ve teknoloji",
          "whatweb http://hedef/       # sunucu/teknoloji parmak izi",
        ],
        examples: [
          "Server: nginx/1.18 → bilinen sürüm → bilinen açık eşlemesi.",
          "Reverse proxy yanlış yapılandırması SSRF/host-header açar.",
          "Açık /server-status iç IP ve istekleri sızdırabilir.",
        ],
        key: "İstemci ister, sunucu (Apache/Nginx/IIS) yanıtlar; sunucu adı/sürümü bilinen açıklara köprüdür.",
      },
      {
        id: "su-uzak-erisim", title: "Uzaktan Erişim: SSH, RDP, Telnet",
        body: [
          "Bir sunucuyu uzaktan yönetmek için kabuk gerekir. SSH (22/TCP) şifreli, modern standarttır; parola yerine anahtar tabanlı kimlik doğrulama önerilir. RDP (3389/TCP) Windows'un grafik masaüstü erişimidir. Telnet (23/TCP) ise SSH'ın atasıdır ama her şeyi DÜZ METİN gönderir — parolan ağda açıkça görünür, bu yüzden ölü kabul edilir.",
          "Bu servisler saldırganın baş hedefidir: açık SSH/RDP + zayıf parola = kaba kuvvetle (Hydra) doğrudan kabuk. Telnet görmek tek başına ciddi bir bulgudur.",
        ],
        cmd: [
          "ssh kullanici@hedef",
          "hydra -l admin -P liste.txt ssh://hedef",
        ],
        examples: [
          "Açık 22 + admin/admin → tam sistem ele geçirme.",
          "Telnet (23) açıksa trafik dinlemeyle parola çalınır.",
          "RDP'ye internetten açık erişim fidye yazılımının 1 numaralı kapısıdır.",
        ],
        key: "SSH(22) şifreli kabuk, RDP(3389) Windows masaüstü, Telnet(23) düz metin (tehlikeli); hepsi kaba kuvvet hedefi.",
      },
      {
        id: "su-dosya-transfer", title: "Dosya Transferi: FTP, SFTP, SMB",
        body: [
          "Dosya taşımanın klasik yolları. FTP (21/TCP) eskidir ve kimlik bilgilerini düz metin gönderir; ayrıca 'anonim FTP' sık sık açık unutulur. SFTP (SSH üzerinden, 22) şifrelidir ve FTP'nin güvenli halefidir. SMB (445/TCP) Windows dosya/yazıcı paylaşımıdır — kurumsal ağların kalbi ve en çok istismar edilen servislerden biri (EternalBlue, açık paylaşımlar).",
          "Bu servisler veri sızıntısının ana kaynağıdır: anonim FTP'de yedekler, kimlik doğrulamasız SMB paylaşımlarında hassas dosyalar bulunur.",
        ],
        cmd: [
          "ftp hedef                 # anonim/zayıf giriş dene",
          "smbclient -L //hedef -N   # kimliksiz paylaşım listesi",
        ],
        examples: [
          "Anonim FTP'de unutulmuş bir DB yedeği = tüm veri.",
          "Açık SMB paylaşımında düz metin parola dosyaları.",
          "SMBv1 (EternalBlue) = uzaktan kod çalıştırma klasiği.",
        ],
        key: "FTP(21) düz metin/anonim riski, SFTP şifreli halef, SMB(445) Windows paylaşımı = büyük saldırı yüzeyi.",
      },
      {
        id: "su-eposta", title: "E-posta: SMTP, IMAP, POP3",
        body: [
          "E-posta üç protokolle yürür. SMTP (25/587) e-postayı GÖNDERİR ve sunucular arasında taşır. IMAP (143/993) postayı sunucuda tutar ve birden çok cihazdan senkron erişim verir. POP3 (110/995) ise postayı indirip sunucudan siler (eski tarz). 993/995/587 sürümleri TLS ile şifrelidir.",
          "Saldırgan için SMTP açık röle (open relay) spam/oltalama için altın madenidir; ayrıca SMTP başlıkları (Received, SPF/DKIM/DMARC) sahteciliği ve iç sunucu adlarını ele verir. Kimlik avı (phishing) çoğu zaman buradan başlar.",
        ],
        cmd: [
          "nc hedef 25               # SMTP banner + komut denemesi",
          "swaks --to a@b --server hedef   # SMTP test (röle?)",
        ],
        examples: [
          "Açık röle SMTP = istediğin adına e-posta gönderebilme.",
          "Received başlıkları iç sunucu adlarını/IP'leri sızdırır.",
          "Zayıf SPF/DMARC = kolay alan adı sahteciliği (spoofing).",
        ],
        key: "SMTP(gönderir), IMAP(senkron tutar), POP3(indirip siler); açık röle ve zayıf SPF/DMARC oltalamanın kapısı.",
      },
      {
        id: "su-port-haritasi", title: "Servis–Port Haritası & Güvenlik",
        body: [
          "Portlar servisleri ayırır: bir sunucuda aynı anda 80'de web, 22'de SSH, 3306'da MySQL çalışabilir. 'Bilinen portlar' (0-1023) standart servisleri taşır. Bir hedefi anlamanın ilk adımı port haritasını çıkarmaktır: hangi kapılar açık, arkalarında hangi yazılım/sürüm var.",
          "Güvenlik ilkesi 'saldırı yüzeyini küçültmek'tir: gereksiz servisleri kapat, yönetim portlarını internete açma, varsayılan parolaları değiştir. Her açık port bir risktir; kapalı port saldıramayacağın kapıdır.",
        ],
        cmd: [
          "nmap -sV -p- hedef        # tüm portlar + servis/sürüm",
          "ss -tulpn                 # yerelde dinleyen servisler",
        ],
        examples: [
          "80/443=web, 22=SSH, 21=FTP, 25=SMTP, 53=DNS, 3306=MySQL, 3389=RDP, 445=SMB.",
          "İnternete açık 3306 (MySQL) = doğrudan veritabanı saldırısı.",
          "Saldırı yüzeyini küçültmek = gereksiz portları kapatmak.",
        ],
        key: "Port = servis kapısı; port-servis-sürüm haritası saldırının başlangıcı, gereksiz portu kapatmak savunmanın temeli.",
      },
    ],
  },
  {
    id: "sifreleme", icon: "🔐", name: "Şifreleme & TLS/Sertifikalar", type: "theory",
    intro: "Trafiği gözden ve kurcalamadan koruyan matematik. Simetrik/asimetrik şifreleme, hash, TLS el sıkışması ve sertifikaların güven zinciri — HTTPS'in kilidinin arkasında bunlar var.",
    lessons: [
      {
        id: "sf-temel", title: "Şifrelemenin Temeli: Simetrik & Asimetrik",
        body: [
          "Şifreleme, veriyi yalnız anahtarı olanın okuyabileceği hale getirir. Simetrik şifrelemede (AES) şifreleyen ve çözen AYNI anahtarı kullanır — hızlıdır ama anahtarı karşıya güvenli iletmek sorundur. Asimetrik şifrelemede (RSA, ECC) bir çift anahtar vardır: açık anahtarla şifrelenen yalnız özel anahtarla çözülür (ve tersi imzalama için).",
          "Pratikte ikisi birlikte kullanılır: asimetrik şifreleme küçük bir 'oturum anahtarı'nı güvenle paylaşmak için, sonra hızlı simetrik şifreleme asıl veri için. TLS tam olarak bunu yapar.",
        ],
        examples: [
          "AES (simetrik) = hızlı, büyük veri için; tek anahtar.",
          "RSA/ECC (asimetrik) = anahtar değişimi ve imza için; çift anahtar.",
          "Açık anahtarla şifrele → yalnız özel anahtar çözer.",
        ],
        key: "Simetrik=tek anahtar/hızlı, asimetrik=çift anahtar/anahtar değişimi; TLS ikisini birleştirir.",
      },
      {
        id: "sf-hash", title: "Hash & Bütünlük",
        body: [
          "Hash fonksiyonu (SHA-256 gibi) herhangi bir veriyi sabit uzunlukta, tek yönlü bir parmak izine çevirir. Aynı girdi hep aynı çıktıyı verir; girdiyi en ufak değişiklik çıktıyı tamamen değiştirir; çıktıdan girdiye dönülemez. Bu yüzden hash, bütünlük (veri değişmiş mi?) ve parola saklama için kullanılır — parolalar düz değil, 'salt'lı hash olarak tutulmalıdır.",
          "Şifreleme ile karıştırma: şifreleme geri çevrilebilir (anahtarla), hash çevrilemez. MD5/SHA-1 artık kırık kabul edilir; çakışma (collision) üretilebildiği için imza/güvenlikte kullanılmaz.",
        ],
        cmd: [
          "sha256sum dosya.iso       # bütünlük doğrulama",
          "echo -n 'parola' | sha256sum",
        ],
        examples: [
          "İndirilen ISO'nun SHA-256'sı yayınlananla aynıysa dosya bozulmamış/değiştirilmemiştir.",
          "Parolalar salt+bcrypt/argon2 ile saklanmalı, düz metin asla.",
          "MD5 çakışmaları üretilebildiği için güvenlikte ölüdür.",
        ],
        key: "Hash = tek yönlü parmak izi (bütünlük + parola saklama); şifrelemeden farkı GERİ ÇEVRİLEMEZ olması.",
      },
      {
        id: "sf-tls", title: "TLS El Sıkışması: HTTPS Nasıl Kurulur",
        body: [
          "HTTPS, HTTP'yi TLS ile sarar. TLS el sıkışması şöyle işler: istemci 'merhaba' der ve desteklediği şifre paketlerini (cipher suites) yollar; sunucu sertifikasını (açık anahtarını) sunar; istemci sertifikayı doğrular ve asimetrik şifreyle bir oturum anahtarı üzerinde anlaşılır; bundan sonra trafik hızlı simetrik şifreyle akar. Modern TLS 1.3 bunu tek tur yapıp hızlandırır.",
          "Sonuç: gizlilik (dinleyen çöp görür), bütünlük (değiştiren yakalanır) ve kimlik (sertifika sunucunun gerçekliğini kanıtlar). Bir önceki ağ modülündeki MITM saldırısı, TLS doğru kurulduğunda etkisiz kalır.",
        ],
        examples: [
          "TLS 1.3 el sıkışmayı kısaltır ve eski/zayıf şifreleri eler.",
          "El sıkışmada anlaşılan oturum anahtarı asıl veriyi simetrik şifreler.",
          "Sertifika doğrulanmazsa 'güvenli değil' uyarısı = olası MITM.",
        ],
        key: "TLS el sıkışması: sertifika doğrula → oturum anahtarı üzerinde anlaş → simetrik şifreli kanal. Gizlilik+bütünlük+kimlik.",
      },
      {
        id: "sf-sertifika-pki", title: "Sertifikalar, CA ve PKI",
        body: [
          "Bir sunucunun açık anahtarına neden güveniriz? Çünkü onu güvenilir bir Sertifika Otoritesi (CA) imzalamıştır. Sertifika, alan adını + açık anahtarı + CA imzasını taşır. Tarayıcı, işletim sistemiyle gelen 'kök CA' listesine güvenir; sunucu sertifikası bu köke kadar uzanan bir güven zinciriyle doğrulanır. Buna PKI (Public Key Infrastructure) denir.",
          "Let's Encrypt gibi otoriteler ücretsiz, otomatik sertifika verir. Sertifikanın süresi dolarsa, alan adı uyuşmazsa ya da kök güvenilmezse tarayıcı uyarır — bu uyarılar çoğu zaman bir yapılandırma hatasını ya da MITM denemesini işaret eder.",
        ],
        cmd: [
          "openssl s_client -connect hedef:443   # sertifika zincirini gör",
          "echo | openssl x509 -noout -dates     # geçerlilik tarihleri",
        ],
        examples: [
          "Güven zinciri: site sertifikası → ara CA → kök CA (OS/tarayıcıda gömülü).",
          "Let's Encrypt 90 günlük ücretsiz sertifikaları otomatik yeniler.",
          "Kendinden imzalı (self-signed) sertifika zincire bağlanmaz → uyarı.",
        ],
        key: "Sertifika = alan adı+açık anahtar+CA imzası; PKI güven zinciriyle (kök CA'ya kadar) doğrular.",
      },
      {
        id: "sf-https-hata", title: "HTTPS Güveni & Yaygın Hatalar",
        body: [
          "HTTPS güçlüdür ama yanlış kurulursa yanıltıcıdır. Yaygın hatalar: süresi dolmuş ya da alan adıyla uyuşmayan sertifika; karışık içerik (HTTPS sayfanın HTTP kaynak yüklemesi); zayıf/eski TLS sürümleri (TLS 1.0/1.1); HSTS başlığının olmaması (saldırgan HTTP'ye düşürebilir — SSL stripping). Kilit simgesi 'site iyi niyetli' demez; yalnız 'kanal şifreli' demektir — bir oltalama sitesi de HTTPS kullanabilir.",
          "Savunma: güçlü TLS yapılandırması, HSTS, sertifika geçerliliğini izleme; saldırı tarafında ise yanlış yapılandırmalar (zayıf şifre paketi, sızan iç adlar) keşif sırasında not edilir.",
        ],
        cmd: [
          "sslscan hedef             # desteklenen TLS sürüm/şifreleri",
          "curl -I https://hedef | grep -i strict-transport",
        ],
        examples: [
          "Kilit ≠ güvenli site; oltalama siteleri de HTTPS kullanır.",
          "HSTS yoksa SSL stripping ile HTTP'ye düşürme mümkün.",
          "TLS 1.0/1.1 ve zayıf şifreler keşifte zafiyet olarak işaretlenir.",
        ],
        key: "Kilit yalnız 'şifreli kanal' demek; HSTS yokluğu/zayıf TLS/sertifika uyuşmazlığı gerçek risklerdir.",
      },
    ],
  },
  {
    id: "bilgi-toplama", icon: "🔍", name: "Bilgi Toplama", type: "theory",
    intro: "Saldırıdan önce keşif. Hedef hakkında ne kadar çok bilirsen, saldırı yüzeyi o kadar netleşir.",
    lessons: [
      {
        id: "bt-pasif", title: "Pasif Keşif (OSINT)",
        body: [
          "Pasif keşif, hedefe hiç dokunmadan açık kaynaklardan bilgi toplamaktır (OSINT). WHOIS kayıtları, DNS, sosyal medya, iş ilanları, GitHub'a sızmış anahtarlar, Google'da özel 'dork' sorguları... Hedef senin onu izlediğini fark etmez.",
          "Amaç: alan adları, alt alan adları, e-posta formatları, kullanılan teknolojiler ve sızmış kimlik bilgilerini bulmak.",
        ],
        examples: [
          "site:ornek.com filetype:pdf gibi Google dork'larıyla gizli dosyalar.",
          "Sızdırılmış parola veritabanlarında kurum e-postalarını aramak.",
          "GitHub'da yanlışlıkla yüklenmiş API anahtarı/şifre bulmak.",
        ],
        key: "Pasif keşif hedefe dokunmadan açık kaynaklardan bilgi toplar — sessiz ama güçlü.",
      },
      {
        id: "bt-aktif", title: "Aktif Keşif (Tarama)",
        body: [
          "Aktif keşifte hedefe doğrudan istek gönderirsin: port tarama (nmap), servis tespiti, banner okuma. Bu, açık kapıları ve arkalarındaki yazılımları haritalar — ama iz bırakır (loglara düşersin).",
          "Pasiften aktife geçiş, 'hedef nedir'den 'hedefte ne çalışıyor'a geçiştir.",
        ],
        cmd: [
          "nmap -sV hedef",
          "curl -I http://hedef     # yanıt başlıkları / banner",
        ],
        examples: [
          "Açık 8080 portunda unutulmuş bir test paneli bulmak.",
          "Banner'dan sunucu yazılımı ve sürümünü öğrenmek.",
          "Aktif tarama izinsizse yasal sorun yaratır.",
        ],
        key: "Aktif keşif hedefe istek atıp açık servisleri haritalar; etkilidir ama iz bırakır.",
      },
      {
        id: "bt-icerik", title: "Web İçerik Keşfi",
        body: [
          "Bir web uygulamasının görünmeyen kısımlarını bulmak: gizli dizinler, yedek dosyalar, yönetim panelleri, /admin, /backup, .git klasörleri. robots.txt ve sitemap.xml çoğu zaman 'gizlenmek istenen' yolları ele verir. gobuster/ffuf gibi araçlar bir kelime listesiyle var olan yolları hızla dener.",
        ],
        cmd: [
          "ffuf -u http://hedef/FUZZ -w wordlist.txt",
          "curl http://hedef/robots.txt",
        ],
        examples: [
          "robots.txt içindeki 'Disallow: /admin' aslında /admin'i işaret eder.",
          "config.php.bak gibi unutulmuş yedekler kaynak kodu sızdırır.",
          "Açıkta kalan /.git klasöründen tüm kaynak kodu indirilebilir.",
        ],
        key: "İçerik keşfi gizli dizin/dosya/panelleri bulur; robots.txt ipucu verir, fuzzing'le yollar denenir.",
      },
      {
        id: "bt-parmizi", title: "Teknoloji Parmak İzi",
        body: [
          "Hedefin hangi teknolojileri kullandığını tespit etmek saldırıyı yönlendirir. HTTP yanıt başlıkları (Server, X-Powered-By), çerez adları, hata sayfaları, JavaScript dosyaları ve HTML yorumları teknolojiyi ve sürümü ele verir.",
          "Bilinen sürüm → bilinen açık (CVE) eşlemesi yapabilirsin.",
        ],
        examples: [
          "X-Powered-By: Express → Node.js arka uç.",
          "Bir hata sayfasının yığın izi (stack trace) framework'ü ve dosya yollarını sızdırır.",
          "JS dosyalarındaki API uç noktaları gizli işlevleri açığa çıkarır.",
        ],
        key: "Başlık/çerez/hata sayfası teknolojiyi ve sürümü ele verir — bu da bilinen açıklara köprüdür.",
      },
    ],
  },
  {
    id: "ag-zafiyetleri", icon: "🌐", name: "Ağ Zafiyetleri", type: "theory",
    intro: "Uygulamanın altındaki katman: ağ. Trafik nasıl akar, nerede dinlenebilir ve zayıf servisler nasıl sömürülür.",
    lessons: [
      {
        id: "ag-temel", title: "Ağ Temelleri: IP, Port, TCP/UDP",
        body: [
          "Her cihazın bir IP adresi, her servisin bir port numarası vardır (web 80/443, SSH 22, MySQL 3306). TCP güvenilir/bağlantılı, UDP hızlı/bağlantısızdır. İki uç bir 'el sıkışma' ile konuşmaya başlar.",
          "Saldırgan için port = kapı, servis = kapının arkasındaki oda. Hangi kapıların açık olduğunu bilmek saldırı yüzeyini tanımlar.",
        ],
        examples: [
          "Açık 22 (SSH) → uzaktan kabuk denemesi; 3306 (MySQL) → DB erişimi.",
          "Kapalı port bağlantıyı reddeder; filtreli port sessiz kalır (güvenlik duvarı).",
          "Aynı sunucuda birçok servis = birçok potansiyel giriş.",
        ],
        key: "IP = cihaz, port = servis kapısı; açık portları bilmek saldırı yüzeyini tanımlar.",
      },
      {
        id: "ag-mitm", title: "Şifresiz Trafik & MITM",
        body: [
          "HTTP, FTP, Telnet gibi protokoller veriyi şifrelemeden gönderir. Aynı ağdaki bir saldırgan (ortadaki adam — MITM) bu trafiği Wireshark'la dinleyip parola ve çerezleri çalabilir, hatta değiştirebilir. HTTPS (TLS) trafiği şifreleyerek bunu engeller.",
          "Açık Wi-Fi ağları MITM için ideal ortamdır; bu yüzden hassas işlemler her zaman HTTPS üzerinden yapılmalıdır.",
        ],
        examples: [
          "Kafe Wi-Fi'sında HTTP ile giriş = parola düz metin gider.",
          "Çalınan oturum çerezi ile parolasız hesaba girmek (session hijacking).",
          "HTTPS'in kilidi: trafik şifreli, dinleyen sadece çöp görür.",
        ],
        key: "Şifresiz protokollerde trafik dinlenip çalınabilir (MITM); çözüm HTTPS/TLS.",
      },
      {
        id: "ag-zayifservis", title: "Zayıf Servisler & Varsayılan Kimlik Bilgileri",
        body: [
          "Birçok ihlal karmaşık bir exploit değil, basit bir ihmaldir: değiştirilmemiş fabrika parolaları (admin/admin), açıkta kalan yönetim panelleri, güncellenmemiş eski servisler. Router, kamera, veritabanı ve IoT cihazları sık sık varsayılan kimlik bilgileriyle internete açık kalır.",
        ],
        examples: [
          "Açık bir MongoDB/Redis'in kimlik doğrulaması olmadan internete bakması.",
          "Kamera/router arayüzünde admin/admin'in çalışması.",
          "Eski, yamasız bir servis sürümünün bilinen bir CVE'ye sahip olması.",
        ],
        key: "Varsayılan parolalar ve güncellenmemiş açık servisler en kolay ihlal yoludur.",
      },
      {
        id: "ag-segment", title: "Segmentasyon & İç Ağ (SSRF'ye köprü)",
        body: [
          "Ağ segmentasyonu, iç sistemleri (veritabanları, yönetim servisleri, bulut metadata uçları) dış dünyadan ayırır. Ama bir web sunucusu kandırılıp iç ağa istek atmaya zorlanabilir — buna SSRF (Server-Side Request Forgery) denir. Dışarıdan ulaşılamayan 169.254.169.254 gibi iç adresler, sunucu üzerinden erişilebilir hale gelir.",
          "Bu, ağ katmanı ile web uygulama katmanını birbirine bağlar: bir sonraki modülde SSRF'yi pratikte sömüreceksin.",
        ],
        examples: [
          "Web sunucusunu bulut metadata servisine (169.254.169.254) istek atmaya zorlayıp kimlik bilgisi çalmak.",
          "Dışarıya kapalı bir iç admin paneline sunucu üzerinden ulaşmak.",
          "İç ağ tarama: SSRF ile iç servisleri port tarar gibi yoklamak.",
        ],
        key: "Segmentasyon iç sistemleri ayırır; SSRF web sunucusunu iç ağa köprü yapıp bunu deler.",
      },
    ],
  },
  // ── Gerçek araç labları: her araç AYRI bir ana modül (gerçek ikili + izole zafiyetli hedef) ──
  ...TOOL_LAB_ORDER.map((slug) => {
    const tl = TOOL_LABS_UI[slug];
    return {
      id: slug, icon: tl.icon, name: tl.name, type: "tool", intro: tl.intro,
      lessons: [{ id: slug, slug, title: tl.name }],
    };
  }),
  {
    id: "web-uygulama", icon: "🐛", name: "Web Uygulama Zafiyetleri", type: "labs",
    intro: "Teori bitti — şimdi gerçek hedefler. Her zafiyeti aç, teorisini oku ve izole Docker hedefinde sömür. Bir lapın flag'ini yakalayınca o ders tamamlanır.",
    lessons: VULNS.map((v) => ({ id: v.slug, slug: v.slug, vulnId: v.id, title: v.name, group: v.group })),
  },
];
