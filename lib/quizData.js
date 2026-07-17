// ============================================================================
//  lib/quizData.js — SUNUCU-ONLY modül testleri (CEVAPLAR burada).
//  flags.js/steps.js gibi: doğru cevap (answer) ve açıklama (explain) ASLA
//  istemci paketine girmez. İstemci yalnız lib/quiz.publicQuiz() çıktısını
//  (soru + şıklar, cevapsız) /api/quiz üzerinden alır.
//
//  Şekil: { [moduleId]: { title, pass, questions: [{ q, choices[], answer, explain }] } }
//   answer = choices içindeki doğru şıkkın indeksi (0 tabanlı).
//   pass   = geçme yüzdesi (varsayılan 70).
// ============================================================================

export const QUIZZES = {
  "temel-kavramlar": {
    title: "Temel Kavramlar Testi",
    pass: 70,
    questions: [
      {
        q: "Bir web isteğinde alan adını (ornek.com) IP adresine çeviren sistem hangisidir?",
        choices: ["HTTP", "DNS", "TCP", "TLS"],
        answer: 1,
        explain: "DNS (Domain Name System) insan-okunur alan adlarını IP adreslerine çevirir.",
      },
      {
        q: "Aşağıdaki HTTP durum kodlarından hangisi 'yetkisiz/erişim yok' anlamına gelir?",
        choices: ["200", "301", "403", "500"],
        answer: 2,
        explain: "403 (Forbidden) erişimin reddedildiğini belirtir; 200 başarı, 301 yönlendirme, 500 sunucu hatasıdır.",
      },
      {
        q: "Oturumunu (kim olduğunu) tarayıcıda çoğunlukla ne taşır?",
        choices: ["URL parametresi", "Çerez (cookie)", "Sayfa başlığı", "CSS dosyası"],
        answer: 1,
        explain: "Oturum kimliği genelde bir çerezde taşınır; çalınırsa hesap ele geçebilir.",
      },
      {
        q: "Güvenlik açısından temel kural nedir?",
        choices: [
          "Sunucudan gelen veri her zaman tehlikelidir",
          "Kullanıcıdan gelen HER veri güvenilmezdir",
          "Sadece form verisi kontrol edilmelidir",
          "HTTPS kullanılırsa girdi kontrolü gereksizdir",
        ],
        answer: 1,
        explain: "URL, form, başlık, çerez, dosya adı — kullanıcıdan gelen her girdi güvenilmez kabul edilmelidir.",
      },
      {
        q: "F12 ile açılan Geliştirici Araçları'nda her isteği, başlığı ve çerezi hangi sekme gösterir?",
        choices: ["Console", "Network", "Sources", "Performance"],
        answer: 1,
        explain: "Network sekmesi tüm istek/yanıtları, başlıkları ve çerezleri listeler.",
      },
    ],
  },
  "ag-modelleri": {
    title: "Ağ Modelleri Testi",
    pass: 70,
    questions: [
      {
        q: "OSI modelinde kaç katman vardır?",
        choices: ["4", "5", "7", "8"],
        answer: 2,
        explain: "OSI 7 katmandan oluşur: Fiziksel, Veri Bağı, Ağ, Taşıma, Oturum, Sunum, Uygulama.",
      },
      {
        q: "IP yönlendirmesi OSI'nin hangi katmanında gerçekleşir?",
        choices: ["2. katman (Veri Bağı)", "3. katman (Ağ)", "4. katman (Taşıma)", "7. katman (Uygulama)"],
        answer: 1,
        explain: "IP ve yönlendirme 3. katman (Ağ) işidir; yönlendiriciler burada çalışır.",
      },
      {
        q: "TCP/IP modeli kaç katmandan oluşur?",
        choices: ["4", "5", "6", "7"],
        answer: 0,
        explain: "TCP/IP 4 katmanlıdır: Ağ Erişimi, İnternet, Taşıma, Uygulama.",
      },
      {
        q: "Her katmanın veriye kendi başlığını eklemesi işlemine ne denir?",
        choices: ["Segmentasyon", "Kapsülleme (encapsulation)", "Yönlendirme", "Çözümleme"],
        answer: 1,
        explain: "Kapsülleme: veri her katmanda yeni bir başlıkla sarılır (segment→paket→çerçeve).",
      },
      {
        q: "Bir SQL injection ya da XSS hangi OSI katmanının zafiyetidir?",
        choices: ["2. katman", "3. katman", "4. katman", "7. katman (Uygulama)"],
        answer: 3,
        explain: "Web uygulama zafiyetleri 7. katman (Uygulama) seviyesinde yaşar.",
      },
    ],
  },
  "protokoller": {
    title: "Çekirdek Protokoller Testi",
    pass: 70,
    questions: [
      {
        q: "TCP bağlantısı hangi adımlarla kurulur (3'lü el sıkışma)?",
        choices: ["ACK → SYN → FIN", "SYN → SYN-ACK → ACK", "GET → POST → ACK", "PING → PONG → ACK"],
        answer: 1,
        explain: "3'lü el sıkışma: istemci SYN, sunucu SYN-ACK, istemci ACK gönderir.",
      },
      {
        q: "Aşağıdakilerden hangisi bağlantısız ve hızlı (onaysız) bir taşıma protokolüdür?",
        choices: ["TCP", "UDP", "TLS", "HTTP"],
        answer: 1,
        explain: "UDP bağlantısızdır; onay/sıra yoktur. DNS, video akışı ve oyunlar UDP'yi sever.",
      },
      {
        q: "'ping' komutu hangi protokolü kullanır?",
        choices: ["ICMP", "ARP", "DHCP", "SMTP"],
        answer: 0,
        explain: "ping, ICMP echo request/reply ile bir hostun ayakta olup olmadığını yoklar.",
      },
      {
        q: "Bir cihaz ağa girdiğinde IP adresini otomatik olarak hangi protokolden alır?",
        choices: ["DNS", "ARP", "DHCP", "ICMP"],
        answer: 2,
        explain: "DHCP, cihaza IP, ağ geçidi ve DNS bilgisini verir (DORA süreci).",
      },
      {
        q: "ARP ne işe yarar?",
        choices: [
          "Alan adını IP'ye çevirir",
          "IP adresini yerel ağdaki MAC adresine eşler",
          "E-posta gönderir",
          "Trafiği şifreler",
        ],
        answer: 1,
        explain: "ARP, yerel ağda bir IP'nin hangi MAC adresine ait olduğunu bulur — MITM'in zemini.",
      },
    ],
  },
  "sunucular": {
    title: "Uygulama Protokolleri & Sunucular Testi",
    pass: 70,
    questions: [
      {
        q: "Aşağıdaki uzaktan erişim protokollerinden hangisi trafiği DÜZ METİN gönderir (tehlikeli)?",
        choices: ["SSH", "Telnet", "RDP over TLS", "HTTPS"],
        answer: 1,
        explain: "Telnet (23) her şeyi düz metin gönderir; parola ağda açıkça görünür. SSH şifrelidir.",
      },
      {
        q: "Windows dosya/yazıcı paylaşımı için kullanılan ve çok istismar edilen protokol hangisidir?",
        choices: ["FTP", "SMB", "SMTP", "DNS"],
        answer: 1,
        explain: "SMB (445) Windows paylaşımıdır; EternalBlue gibi açıklarla ünlüdür.",
      },
      {
        q: "SSH varsayılan olarak hangi portta çalışır?",
        choices: ["21", "22", "80", "3389"],
        answer: 1,
        explain: "SSH 22/TCP portunu kullanır; RDP 3389, FTP 21, HTTP 80.",
      },
      {
        q: "E-posta GÖNDERMEK için kullanılan protokol hangisidir?",
        choices: ["IMAP", "POP3", "SMTP", "HTTP"],
        answer: 2,
        explain: "SMTP e-postayı gönderir/taşır; IMAP ve POP3 okumak/indirmek içindir.",
      },
      {
        q: "Güvenlikte 'saldırı yüzeyini küçültmek' ne anlama gelir?",
        choices: [
          "Daha hızlı sunucu kullanmak",
          "Gereksiz servisleri/portları kapatmak",
          "Tüm portları açmak",
          "Parolaları kısa tutmak",
        ],
        answer: 1,
        explain: "Gereksiz servis ve portları kapatmak saldırganın ulaşabileceği kapı sayısını azaltır.",
      },
    ],
  },
  "sifreleme": {
    title: "Şifreleme & TLS Testi",
    pass: 70,
    questions: [
      {
        q: "Şifreleyen ve çözen tarafın AYNI anahtarı kullandığı şifreleme türü hangisidir?",
        choices: ["Asimetrik", "Simetrik", "Hash", "Base64"],
        answer: 1,
        explain: "Simetrik şifrelemede (ör. AES) tek bir ortak anahtar kullanılır; hızlıdır.",
      },
      {
        q: "Hash fonksiyonunun (SHA-256) temel özelliği nedir?",
        choices: [
          "Anahtarla geri çevrilebilir",
          "Tek yönlüdür, geri çevrilemez",
          "Veriyi şifreler ve gizler",
          "Her seferinde farklı çıktı üretir",
        ],
        answer: 1,
        explain: "Hash tek yönlüdür; çıktıdan girdiye dönülemez. Bütünlük ve parola saklamada kullanılır.",
      },
      {
        q: "HTTPS, HTTP'yi hangi protokolle sarar?",
        choices: ["SSH", "TLS", "ARP", "FTP"],
        answer: 1,
        explain: "HTTPS = HTTP + TLS; trafiği şifreli bir kanalda taşır.",
      },
      {
        q: "Bir sunucunun açık anahtarına neden güveniriz?",
        choices: [
          "Çünkü güvenilir bir Sertifika Otoritesi (CA) imzalamıştır",
          "Çünkü HTTP kullanır",
          "Çünkü parolası vardır",
          "Çünkü hızlıdır",
        ],
        answer: 0,
        explain: "Sertifika, kök CA'ya kadar uzanan bir güven zinciriyle (PKI) doğrulanır.",
      },
      {
        q: "Tarayıcıdaki kilit simgesi neyi GARANTİ eder?",
        choices: [
          "Sitenin iyi niyetli olduğunu",
          "Sadece kanalın şifreli olduğunu",
          "Sitenin virüssüz olduğunu",
          "Parolanın güçlü olduğunu",
        ],
        answer: 1,
        explain: "Kilit yalnız 'kanal şifreli' demektir; bir oltalama sitesi de HTTPS kullanabilir.",
      },
    ],
  },
};

export default QUIZZES;
