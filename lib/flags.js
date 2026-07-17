// ============================================================================
//  lib/flags.js — KANONIK FLAG'LERIN TEK KAYNAĞI (SUNUCU-ONLY).
//  ⚠ Bu dosyayı ASLA bir "use client" bileşenine import etme. Yalnızca server
//  route handler'ları (app/<slug>/route.js) ve API route'ları import etmeli.
//  Aksi halde flag'ler tarayıcı JS bundle'ına sızar.
//
//  slug -> canonical flag (app/api/flag doğrulaması + hedef sayfa banner'ları buradan okur)
// ============================================================================
export const FLAGS = {
  "command-injection": "ordek{cmd_injection_shell_erisimi}",
  "file-inclusion": "ordek{lfi_dizin_gezme}",
  "sql-injection": "ordek{sqli_union_dump}",
  "sql-injection-blind": "ordek{sqli_login_bypass_admin}",
  "xss-reflected": "ordek{reflected_xss_execution}",
  "xss-stored": "ordek{stored_xss_execution_persistent}",
  "brute-force": "ordek{brute_force_admin}",
  "user-enumeration": "ordek{user_enumeration}",
  "insecure-jwt": "ordek{jwt_signature_bypassed_admin}",
  "ssti": "ordek{ssti_rce}",
  "insecure-deserialization": "ordek{insecure_deserialization_rce}",
  "cors-misconfig": "ordek{cors_origin_bypassed_data_stolen}",
  "host-header-poisoning": "ordek{host_header_poisoning}",
  "mass-assignment": "ordek{mass_assignment_privilege_escalation}",
  "race-condition": "ordek{race_condition_toctou}",
  "business-logic": "ordek{business_logic_fiyat}",
  "redos": "ordek{redos_dos}",
  "idor-bola": "ordek{idor_baskasinin_siparisi_7c1a}",
  "mfa-bypass": "ordek{mfa_broken_logic_bypassed_3321}",
  "insecure-randomness": "ordek{insecure_randomness_predicted_1122}",
  "prototype-pollution": "ordek{prototype_pollution}",
  "server-side-pp-gadget": "ordek{pp_gadget_rce_achieved}",
  "open-redirect": "ordek{open_redirect}",
  "ssrf": "ordek{ssrf_ic_servis_ve_metadata_ele_gecirildi}",
  "csrf": "ordek{csrf_token_yok}",
  "clickjacking": "ordek{clickjacking_ui_redress}",
  "file-upload": "ordek{file_upload_webshell_rce}",
  "csv-injection": "ordek{csv_formula_injection}",
  "nmap-recon": "ordek{nmap_gizli_servis_kesfi_31337}",
  "metasploit-rce": "ordek{metasploit_meterpreter_session_acildi}",

  // ── Faz 2: 10 yeni web zafiyeti ──
  "xxe": "ordek{xxe_harici_varlik_dosya_okundu}",
  "nosql-injection": "ordek{nosql_operator_injection_auth_bypass}",
  "graphql-injection": "ordek{graphql_introspection_gizli_alan_sizdi}",
  "ldap-injection": "ordek{ldap_filtre_injection_auth_bypass}",
  "xpath-injection": "ordek{xpath_injection_kullanici_dump}",
  "http-parameter-pollution": "ordek{hpp_parametre_kirliligi_yetki_bypass}",
  "web-cache-poisoning": "ordek{web_cache_poisoning_xss_yayildi}",
  "websocket-tampering": "ordek{websocket_mesaj_manipulasyonu_admin}",
  "git-disclosure": "ordek{git_klasoru_ifsa_kaynak_kod_sizdi}",
  "jwt-alg-confusion": "ordek{jwt_alg_confusion_rs256_hs256}",

  // ── Gerçek araç labları (lib/toolLabs.js + app/toolLabData.js ile aynı slug) ──
  // Bazı flag'ler hedefe enjekte edilen GERÇEK sırdır (parola / WPA anahtarı /
  // session cookie) → öğrenci aracıyla yakalayıp birebir gönderir.
  // İçerik-only (noBox) lab: öğrenci kendi terminalinde base64'ü çözüp üretir.
  "tool-linux": "ordek{linux_temelleri_ustasi_2024}",
  "tool-nmap": "ordek{nmap_gizli_servis_31337_kesfedildi}",
  "tool-dnsrecon": "ordek{dns_zone_transfer_subdomain_sizdi}",
  "tool-theharvester": "ordek{osint_eposta_ve_subdomain_toplandi}",
  "tool-ffuf": "ordek{ffuf_gizli_yonetim_dizini_bulundu}",
  "tool-nikto": "ordek{nikto_sunucu_yanlis_yapilandirma}",
  "tool-smb": "ordek{smb_anonim_paylasimda_flag}",
  "tool-wpscan": "ordek{wpscan_zafiyetli_eklenti_ve_kullanici}",
  "tool-wireshark": "ordek{wireshark_http_duz_metin_P@rola_42}",
  "tool-tcpdump": "ordek{tcpdump_pcap_filtre_ile_yakalandi}",
  "tool-bettercap": "ordek{bettercap_arp_mitm_kimlik_calindi}",
  "tool-responder": "ordek{responder_netntlm_yakalandi_kirildi}",
  "tool-burp": "ordek{burp_repeater_ile_fiyat_manipule}",
  "tool-sqlmap": "ordek{sqlmap_otomatik_db_dump}",
  "tool-beef": "ordek{beef_kurban_tarayici_hooklandi}",
  "tool-hydra": "ordek{hydra_online_brute_force_basarili}",
  "tool-john": "ordek{john_shadow_hash_kirildi}",
  "tool-hashcat": "ordek{hashcat_ntlm_hash_kirildi}",
  "tool-aircrack": "ordek{aircrack_wpa2_anahtari_ducks2024}",
  "tool-metasploit": "ordek{metasploit_meterpreter_root_oturumu}",
  "tool-searchsploit": "ordek{searchsploit_public_exploit_rce}",
  "tool-msfvenom": "ordek{msfvenom_reverse_shell_baglandi}",
  "tool-setoolkit": "ordek{setoolkit_klon_sayfa_kimlik_topladi}",
  "tool-evilginx": "ordek{evilginx_oturum_cookie_2fa_calindi}",

  // ── Faz 2: 10 yeni araç ──
  "tool-nuclei": "ordek{nuclei_exposed_env_sizdi}",
  "tool-gobuster": "ordek{gobuster_gizli_dizin_bulundu}",
  "tool-whatweb": "ordek{whatweb_meta_generator_sizdi}",
  "tool-sslscan": "ordek{sslscan_zayif_tls_sertifika_sirri}",
  "tool-netexec": "ordek{netexec_smb_null_session_paylasim}",
  "tool-impacket": "ordek{impacket_smb_gizli_paylasim_dosyasi}",
  "tool-gitleaks": "ordek{gitleaks_git_gecmisi_sir_sizdi}",
  "tool-subfinder": "ordek{subfinder_gizli_subdomain_txt_kaydi}",
  "tool-commix": "ordek{commix_otomatik_cmd_injection_shell}",
  "tool-dalfox": "ordek{dalfox_otomatik_xss_dogrulandi}",
};
