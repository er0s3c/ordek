# Güvenlik & Sorumlu Kullanım

## ⚠️ Bu proje kasıtlı olarak zafiyetlidir

ördek-lab, siber güvenlik eğitimi için **bilerek savunmasız** bırakılmış bir web
uygulamasıdır. SQL injection, komut enjeksiyonu, SSRF, RCE'ye kadar varan onlarca
gerçek zafiyet içerir. Bu, bir hata değil; projenin **amacıdır**.

## Kurallar

- ✅ **Yalnızca izole/yetkili eğitim ortamında** çalıştırın (kendi makineniz, sınıf
  içi LAN, izole sanal ağ).
- ❌ **ASLA internete veya güvenilmeyen bir ağa açmayın.** Açık bir ördek-lab
  örneği, saldırganlar için hazır bir RCE hedefidir.
- ❌ Üretim sistemlerinin yanında veya hassas veri içeren makinelerde çalıştırmayın.
- ✅ Öğrendiğiniz teknikleri **yalnızca açık izniniz olan** sistemlerde uygulayın.

### Sınıf modu hakkında

Sınıf modu, birçok öğrencinin tek bir panel sunucusuna bağlandığı paylaşımlı bir
kurulumdur. Bu sunucu kasıtlı zafiyetli hedefler barındırdığından **yalnızca izole
bir sınıf/LAN ağında** dağıtın. Panel hesapları (öğretmen/öğrenci) gerçek kimlik
doğrulaması kullanır (scrypt + imzalı çerez) ve laboratuvarın kasıtlı zafiyetli
veritabanından **ayrıdır**; yine de bu, lab'ı internete açmayı güvenli kılmaz.

## Zafiyet bildirimi

Bu depodaki **kasıtlı** lab zafiyetlerini bildirmenize gerek yoktur.
Ancak **kurulum/altyapı** ile ilgili (kasıt dışı) bir güvenlik sorunu bulursanız —
örneğin panel kimlik doğrulamasında, oturum yönetiminde veya sınıf izolasyonunda —
lütfen bir **issue** açın veya benim ile iletişime geçin.
