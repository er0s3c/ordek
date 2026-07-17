// Hafif toast bildirimleri — herhangi bir client bileşeninden çağrılır; <Toaster/> dinler.
export function toast(msg, type = "ok") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ordek-toast", { detail: { msg, type } }));
  }
}
