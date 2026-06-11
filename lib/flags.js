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
};
