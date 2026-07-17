// ============================================================================
//  scripts/academy-images.manifest.mjs
//  Akademi görsel üretim manifesti. gen-academy-images.mjs bunu okur.
//  id  = public/academy/<id>.png dosya adı (modül id → hero, ders id → diyagram).
//  Ortak stil (izometrik/neon-yeşil) gen-academy-images.mjs içinde EKLENİR;
//  buradaki prompt yalnız KONUYU anlatır. aspect: hero "3:2", ders "4:3".
//  Yeni görsel eklemek için diziye satır ekle, sonra `npm run academy:images`.
// ============================================================================

const hero = (id, prompt) => ({ id, aspect: "3:2", prompt });
const lesson = (id, prompt) => ({ id, aspect: "4:3", prompt });

export const MANIFEST = [
  // ── Modül hero görselleri (timeline düğümü) ──
  hero("temel-kavramlar", "A glowing browser window connected to a server by request/response arrows, foundational web concepts"),
  hero("araclar", "An isometric Linux terminal console with a command prompt and toolbox of hacking tools"),
  hero("ag-modelleri", "A vertical stack of seven glowing translucent layers forming the OSI network model"),
  hero("protokoller", "Interconnected protocol nodes labeled by icons (packets, DNS globe, handshake) wired together"),
  hero("sunucular", "A rack of glowing servers with open ports as little doors, each a network service"),
  hero("sifreleme", "A padlock made of light over an encrypted tunnel, key pair and certificate shield"),
  hero("bilgi-toplama", "A magnifying glass scanning a network map, reconnaissance and OSINT theme"),
  hero("ag-zafiyetleri", "A network with an intercepted traffic line, man-in-the-middle and weak-service theme"),
  hero("web-uygulama", "A web application dashboard riddled with glowing red bug icons, web vulnerabilities"),

  // ── Temel Kavramlar dersleri ──
  lesson("tk-web", "Client browser and server exchanging an HTTP request and response across the internet, with a DNS lookup step"),
  lesson("tk-http", "An HTTP request anatomy: method, status code, headers and a cookie traveling between client and server"),
  lesson("tk-devtools", "Browser developer tools panel showing the network tab, requests, cookies and console"),
  lesson("tk-zafiyet", "Untrusted user input flowing into a system across a trust boundary, attack-surface concept"),
  lesson("tk-etik", "A legal contract and shield representing ethical hacking scope and authorization in an isolated lab"),

  // ── Linux & Terminal dersleri ──
  lesson("ar-linux", "A Linux command-line terminal with pipes connecting commands, curl sending an HTTP request"),
  lesson("ar-araclar-not", "A toolbox where each hacking tool (scanner, sniffer, brute-forcer) is its own separate module"),

  // ── Ağ Modelleri dersleri ──
  lesson("agm-osi", "The OSI model as seven labeled stacked layers from Physical at the bottom to Application at the top"),
  lesson("agm-katmanlar", "Each OSI layer shown with its own device: cable, switch, router, ports, encryption and an app"),
  lesson("agm-tcpip", "The four-layer TCP/IP model mapped beside the seven-layer OSI model with connecting arrows"),
  lesson("agm-kapsulleme", "Data encapsulation as nested envelopes: application data wrapped by TCP, IP and Ethernet headers"),
  lesson("agm-saldiri", "Defense-in-depth shields placed at different network layers, attacker choosing a layer to strike"),

  // ── Çekirdek Protokoller dersleri ──
  lesson("pr-ip-icmp", "An IP packet routed across networks and an ICMP ping echo bouncing back from a host"),
  lesson("pr-tcp-udp", "The TCP three-way handshake (SYN, SYN-ACK, ACK) beside a fast connectionless UDP packet"),
  lesson("pr-dns", "A DNS resolution chain turning a domain name into an IP address through root, TLD and authoritative servers"),
  lesson("pr-dhcp-arp", "A device joining a LAN getting an IP via DHCP, and an ARP broadcast mapping IP to a MAC address"),
  lesson("pr-http", "An HTTP request and response cycle wrapped inside a TLS lock for HTTPS"),

  // ── Uygulama Protokolleri & Sunucular dersleri ──
  lesson("su-istemci-sunucu", "A reverse proxy in front of web servers (Apache, Nginx) routing client requests to app servers"),
  lesson("su-uzak-erisim", "Remote access shells: an encrypted SSH terminal, a Windows RDP desktop and a warning on plaintext Telnet"),
  lesson("su-dosya-transfer", "File transfer services FTP, SFTP and SMB shown as glowing folders moving between machines"),
  lesson("su-eposta", "Email flow with SMTP sending and IMAP/POP3 retrieving mail between mail servers and clients"),
  lesson("su-port-haritasi", "A server tower whose open ports are labeled doors mapping to services like web, SSH and database"),

  // ── Şifreleme & TLS dersleri ──
  lesson("sf-temel", "Symmetric encryption with one shared key beside asymmetric encryption with a public/private key pair"),
  lesson("sf-hash", "A one-way hash function turning data into a fixed-length fingerprint, integrity check theme"),
  lesson("sf-tls", "A TLS handshake establishing a secure encrypted channel between a browser and a server"),
  lesson("sf-sertifika-pki", "A certificate chain of trust from a website certificate up to an intermediate and root CA"),
  lesson("sf-https-hata", "An HTTPS padlock with warning signs: expired certificate, mixed content and missing HSTS"),

  // ── Bilgi Toplama dersleri ──
  lesson("bt-pasif", "Passive OSINT reconnaissance gathering data from public sources without touching the target"),
  lesson("bt-aktif", "Active scanning sending probes to a target, mapping open ports and services, leaving traces"),
  lesson("bt-icerik", "Web content discovery uncovering hidden directories, backup files and admin panels via fuzzing"),
  lesson("bt-parmizi", "Technology fingerprinting reading server headers, cookies and error pages to identify software versions"),

  // ── Ağ Zafiyetleri dersleri ──
  lesson("ag-temel", "Network fundamentals: IP addresses as devices and ports as service doors, TCP vs UDP"),
  lesson("ag-mitm", "A man-in-the-middle attacker intercepting unencrypted traffic on a shared network, defeated by HTTPS"),
  lesson("ag-zayifservis", "Weak services with default credentials: exposed admin panels and unpatched servers"),
  lesson("ag-segment", "Network segmentation isolating internal systems, an SSRF request bridging to the internal network"),
];

export default MANIFEST;
